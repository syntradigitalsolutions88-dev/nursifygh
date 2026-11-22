from django.urls import path

from .cases_views import (
    ClinicalCaseDetailView,
    ClinicalCaseListView,
    SubmitCaseStageView,
)

from .tutor_views import TutorCoachView

from .revision_views import (
    FlashcardListCreateView,
    FlashcardReviewUpdateView,
    FlashcardStatsView,
    SyncWeakQuizCardsView,
)

from .views import (
    CourseDetailView,
    CourseListView,
    MockExamSubmitView,
    MockExamView,
    MySubmissionsView,
    PastPaperExtractView,
    PastPaperSaveView,
    QuizHistoryView,
    QuizSubmitView,
    WeakAreasView,
    LeaderboardView, # <-- ADD THIS
)

app_name = "academics"

urlpatterns = [
    path("courses/", CourseListView.as_view(), name="course-list"),
    path("courses/<uuid:id>/", CourseDetailView.as_view(), name="course-detail"),
    path("quizzes/submit/", QuizSubmitView.as_view(), name="quiz-submit"),
    path("quizzes/history/", QuizHistoryView.as_view(), name="quiz-history"),
    path("quizzes/mock-exam/", MockExamView.as_view(), name="mock-exam"),
    path("quizzes/mock-exam/submit/", MockExamSubmitView.as_view(), name="mock-exam-submit"),
    path("past-paper/extract/", PastPaperExtractView.as_view(), name="past-paper-extract"),
    path("past-paper/save/", PastPaperSaveView.as_view(), name="past-paper-save"),
    path("my-submissions/", MySubmissionsView.as_view(), name="my-submissions"),
    path("weak-areas/", WeakAreasView.as_view(), name="weak-areas"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("flashcards/", FlashcardListCreateView.as_view(), name="flashcard-list-create"),
    path("flashcards/review/", FlashcardReviewUpdateView.as_view(), name="flashcard-review"),
    path("flashcards/sync-weak/", SyncWeakQuizCardsView.as_view(), name="flashcard-sync-weak"),
    path("flashcards/stats/", FlashcardStatsView.as_view(), name="flashcard-stats"),
    path("cases/", ClinicalCaseListView.as_view(), name="clinical-case-list"),
    path("cases/<uuid:case_id>/", ClinicalCaseDetailView.as_view(), name="clinical-case-detail"),
    path("cases/<uuid:case_id>/answer/", SubmitCaseStageView.as_view(), name="clinical-case-answer"),
    path("tutor/", TutorCoachView.as_view(), name="tutor-coach"),
]
