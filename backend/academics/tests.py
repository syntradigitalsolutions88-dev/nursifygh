from django.test import TestCase

# Create your tests here.


import json
from unittest.mock import patch
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

TEST_HOSTS = list(
    dict.fromkeys(
        [*(getattr(settings, "ALLOWED_HOSTS", []) or []), "localhost", "127.0.0.1", "testserver"]
    )
)


class _FakeHTTPResponse:
    def __init__(self, payload: dict):
        self._raw = json.dumps(payload).encode("utf-8")

    def read(self) -> bytes:
        return self._raw

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@override_settings(ALLOWED_HOSTS=TEST_HOSTS)
class TutorCoachViewTests(APITestCase):
    ENDPOINT = "/api/academics/tutor/"

    def setUp(self):
        User = get_user_model()
        if hasattr(User, "USERNAME_FIELD") and User.USERNAME_FIELD == "email":
            self.user = User.objects.create_user(
                email="student@nursifygh.test",
                password="StrongTestPassword123!",
            )
        else:
            self.user = User.objects.create_user(
                username="nursify_student",
                password="StrongTestPassword123!",
            )

    def test_requires_authentication(self):
        res = self.client.post(self.ENDPOINT, {"prompt": "Explain osmosis"}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_rejects_empty_prompt(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(self.ENDPOINT, {"prompt": "   "}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch.dict("os.environ", {"LLM_API_KEY": "", "GROQ_API_KEY": ""}, clear=False)
    def test_fallback_chemistry_biology_and_typo_normalization(self):
        self.client.force_authenticate(user=self.user)

        chem_res = self.client.post(
            self.ENDPOINT,
            {"prompt": "Acids, bases, pH and bicarbonate buffer system"},
            format="json",
        )
        self.assertEqual(chem_res.status_code, status.HTTP_200_OK)
        self.assertFalse(chem_res.data.get("live_llm_used"))
        self.assertIn("Chemistry", chem_res.data.get("framework", ""))

        typo_res = self.client.post(
            self.ENDPOINT,
            {"prompt": "cadio blood flow and MgSO4 toxicity signs"},
            format="json",
        )
        self.assertEqual(typo_res.status_code, status.HTTP_200_OK)
        self.assertFalse(typo_res.data.get("live_llm_used"))
        self.assertIn("Obstetric", typo_res.data.get("framework", ""))

    @patch("urllib.request.urlopen")
    @patch.dict(
        "os.environ",
        {
            "LLM_API_KEY": "test-live-key",
            "LLM_API_URL": "https://example.test/v1/chat/completions",
            "LLM_MODEL": "gpt-4o-mini",
        },
        clear=False,
    )
    def test_uses_live_llm_when_configured(self, mock_urlopen):
        mock_urlopen.return_value = _FakeHTTPResponse(
            {
                "choices": [
                    {"message": {"content": "Glycolysis splits glucose into two pyruvate molecules."}}
                ]
            }
        )
        self.client.force_authenticate(user=self.user)

        res = self.client.post(self.ENDPOINT, {"prompt": "Explain glycolysis"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("live_llm_used"))
        self.assertIn("Glycolysis", res.data.get("reply", ""))
        mock_urlopen.assert_called_once()

    @patch("urllib.request.urlopen", side_effect=TimeoutError("upstream timeout"))
    @patch.dict(
        "os.environ",
        {
            "LLM_API_KEY": "test-live-key",
            "LLM_API_URL": "https://example.test/v1/chat/completions",
            "LLM_MODEL": "gpt-4o-mini",
        },
        clear=False,
    )
    def test_falls_back_gracefully_on_llm_error(self, mock_urlopen):
        self.client.force_authenticate(user=self.user)

        res = self.client.post(self.ENDPOINT, {"prompt": "Explain cellular respiration"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data.get("live_llm_used"))
        self.assertTrue(bool(res.data.get("reply")))
        mock_urlopen.assert_called_once()
