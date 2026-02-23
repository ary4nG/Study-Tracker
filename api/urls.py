from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserDetailView, LogoutView,
    SubjectViewSet, TopicViewSet, SessionViewSet,
    StreakView, WeeklyReportView, ParseSyllabusView,
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'topics', TopicViewSet, basename='topic')
router.register(r'sessions', SessionViewSet, basename='session')

urlpatterns = [
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('subjects/<int:subject_id>/parse-syllabus/', ParseSyllabusView.as_view(), name='parse-syllabus'),
    # Static paths before router to avoid PK conflicts
    path('sessions/streak/', StreakView.as_view(), name='session-streak'),
    path('reports/weekly/', WeeklyReportView.as_view(), name='weekly-report'),
    path('', include(router.urls)),
]
