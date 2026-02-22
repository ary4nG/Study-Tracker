from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import UserDetailView, LogoutView, SubjectViewSet, TopicViewSet, ParseSyllabusView

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'topics', TopicViewSet, basename='topic')

urlpatterns = [
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('subjects/<int:subject_id>/parse-syllabus/', ParseSyllabusView.as_view(), name='parse-syllabus'),
    path('', include(router.urls)),
]
