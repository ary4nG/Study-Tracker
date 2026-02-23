from django.contrib.auth import logout
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta, date, datetime
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Topic, StudySession
from .serializers import SubjectSerializer, TopicSerializer, StudySessionSerializer


class UserDetailView(APIView):
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
            'id': user.id, 'username': user.username,
            'email': user.email,
            'name': user.get_full_name() or user.username,
            'avatar_url': avatar_url,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Successfully logged out.'})


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TopicViewSet(viewsets.ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Topic.objects.filter(subject__user=self.request.user)
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs

    def perform_create(self, serializer):
        subject_id = self.request.data.get('subject')
        subject = get_object_or_404(Subject, pk=subject_id, user=self.request.user)
        serializer.save(subject=subject)


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = StudySession.objects.filter(user=self.request.user)
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        days = self.request.query_params.get('days')
        if days:
            try:
                cutoff = timezone.now() - timedelta(days=int(days))
                qs = qs.filter(created_at__gte=cutoff)
            except (ValueError, TypeError):
                pass
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StreakView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = StudySession.objects.filter(user=request.user)
        unique_dates = sorted({s.created_at.date() for s in sessions}, reverse=True)
        today = date.today()
        studied_today = today in unique_dates
        streak = 0
        check = today if studied_today else today - timedelta(days=1)
        for d in unique_dates:
            if d == check:
                streak += 1
                check -= timedelta(days=1)
            elif d < check:
                break
        return Response({'streak': streak, 'studied_today': studied_today})


class WeeklyReportView(APIView):
    """
    GET /api/reports/weekly/             → current week
    GET /api/reports/weekly/?week=YYYY-WW → specified ISO week
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        week_str = request.query_params.get('week')
        try:
            if week_str:
                # ISO week format: '2026-08' → Monday of that week
                monday = datetime.strptime(f'{week_str}-1', '%G-%V-%u').date()
            else:
                today = date.today()
                monday = today - timedelta(days=today.weekday())
        except (ValueError, TypeError):
            return Response({'error': 'Invalid week format. Use YYYY-WW (e.g. 2026-08).'}, status=400)

        sunday = monday + timedelta(days=6)

        # Sessions in this week (created_at date falls within Mon–Sun)
        sessions = StudySession.objects.filter(
            user=request.user,
            created_at__date__gte=monday,
            created_at__date__lte=sunday,
        )

        total_duration_seconds = sum(s.duration_seconds for s in sessions)
        unique_subjects_count = sessions.values('subject').distinct().count()
        session_count = sessions.count()
        days_studied = sessions.values_list('created_at__date', flat=True).distinct().count()

        # Topics marked mastered within this week
        topics_mastered_count = Topic.objects.filter(
            subject__user=request.user,
            status='mastered',
            updated_at__date__gte=monday,
            updated_at__date__lte=sunday,
        ).count()

        return Response({
            'week_start': monday.isoformat(),
            'week_end': sunday.isoformat(),
            'total_duration_seconds': total_duration_seconds,
            'session_count': session_count,
            'unique_subjects_count': unique_subjects_count,
            'topics_mastered_count': topics_mastered_count,
            'days_studied': days_studied,
        })


class ParseSyllabusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, subject_id):
        subject = get_object_or_404(Subject, pk=subject_id, user=request.user)
        topic_names = request.data.get('topics', [])
        if not topic_names or not isinstance(topic_names, list):
            return Response({'error': 'topics must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)
        cleaned = [n.strip() for n in topic_names if isinstance(n, str) and n.strip()]
        if not cleaned:
            return Response({'error': 'No valid topic names provided'}, status=status.HTTP_400_BAD_REQUEST)
        topics = Topic.objects.bulk_create([Topic(subject=subject, name=name) for name in cleaned])
        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
