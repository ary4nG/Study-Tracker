from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import UserDetailView, LogoutView, SubjectViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')

urlpatterns = [
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('', include(router.urls)),
]
