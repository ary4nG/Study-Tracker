from django.contrib.auth import logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets

from .models import Subject
from .serializers import SubjectSerializer


class UserDetailView(APIView):
    """
    GET /api/auth/user/
    Returns the currently authenticated user's profile data.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        avatar_url = ''
        try:
            social_account = user.socialaccount_set.filter(provider='github').first()
            if social_account:
                avatar_url = social_account.extra_data.get('avatar_url', '')
        except Exception:
            pass

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user.get_full_name() or user.username,
            'avatar_url': avatar_url,
        })


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Logs out the current user and clears the session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Successfully logged out.'})


class SubjectViewSet(viewsets.ModelViewSet):
    """
    CRUD for subjects. Automatically scoped to the authenticated user.
    GET/POST  /api/subjects/
    GET/PATCH/DELETE  /api/subjects/{id}/
    """
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # CRITICAL: always filter by user — data isolation
        return Subject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Auto-assign user on create — never trust client-supplied user_id
        serializer.save(user=self.request.user)
