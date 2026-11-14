from django.urls import path

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
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"), # <-- ADD THIS
]