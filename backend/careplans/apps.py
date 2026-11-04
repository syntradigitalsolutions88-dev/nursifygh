"""App configuration for the careplans app."""

from django.apps import AppConfig


class CareplansConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "careplans"
    verbose_name = "Nursing Care Plans (NCP)"