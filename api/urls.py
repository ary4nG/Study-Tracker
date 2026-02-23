from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserDetailView, LogoutView,
    SubjectViewSet, TopicViewSet, SessionViewSet,
    StreakView, ParseSyllabusView,
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'topics', TopicViewSet, basename='topic')
router.register(r'sessions', SessionViewSet, basename='session')

urlpatterns = [
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('subjects/<int:subject_id>/parse-syllabus/', ParseSyllabusView.as_view(), name='parse-syllabus'),
    # Must come BEFORE router.urls so DRF doesn't mistake 'streak' for a session PK
    path('sessions/streak/', StreakView.as_view(), name='session-streak'),
    path('', include(router.urls)),
]
