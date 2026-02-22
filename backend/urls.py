"""
URL configuration for SyllabusTrackingApp backend.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),  # GitHub OAuth endpoints
    path('api/', include('api.urls')),           # App API endpoints
]
