"""URL configuration for the academics app."""

from django.urls import path

from .views import (
    CourseDetailView,
    CourseListView,
    QuizHistoryView,
    QuizSubmitView,
)

app_name = "academics"

urlpatterns = [
    path("courses/", CourseListView.as_view(), name="course-list"),
    path("courses/<uuid:id>/", CourseDetailView.as_view(), name="course-detail"),
    path("quizzes/submit/", QuizSubmitView.as_view(), name="quiz-submit"),
    path("quizzes/history/", QuizHistoryView.as_view(), name="quiz-history"),
]