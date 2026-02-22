from django.contrib.auth import logout
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Topic
from .serializers import SubjectSerializer, TopicSerializer


class UserDetailView(APIView):
    """GET /api/auth/user/ — returns the authenticated user's profile."""
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
    """POST /api/auth/logout/ — clears the Django session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Successfully logged out.'})


class SubjectViewSet(viewsets.ModelViewSet):
    """CRUD for subjects, scoped to authenticated user."""
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TopicViewSet(viewsets.ModelViewSet):
    """
    CRUD for topics, user-scoped via double-underscore Subject FK.
    GET/POST /api/topics/
    GET/PATCH/DELETE /api/topics/{id}/
    Optional filter: GET /api/topics/?subject={id}
    """
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Double-underscore traversal ensures user only sees their own topics
        qs = Topic.objects.filter(subject__user=self.request.user)
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs

    def perform_create(self, serializer):
        # Validate ownership before creating — prevents cross-user topic injection
        subject_id = self.request.data.get('subject')
        subject = get_object_or_404(Subject, pk=subject_id, user=self.request.user)
        serializer.save(subject=subject)


class ParseSyllabusView(APIView):
    """POST /api/subjects/{subject_id}/parse-syllabus/ — bulk-creates topics."""
    permission_classes = [IsAuthenticated]

    def post(self, request, subject_id):
        subject = get_object_or_404(Subject, pk=subject_id, user=request.user)

        topic_names = request.data.get('topics', [])
        if not topic_names or not isinstance(topic_names, list):
            return Response(
                {'error': 'topics must be a non-empty list'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned = [n.strip() for n in topic_names if isinstance(n, str) and n.strip()]
        if not cleaned:
            return Response(
                {'error': 'No valid topic names provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        topics = Topic.objects.bulk_create([
            Topic(subject=subject, name=name) for name in cleaned
        ])

        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
