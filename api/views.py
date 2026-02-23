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
    """
    GET /api/sessions/streak/?tz=Asia/Kolkata
    Returns { streak: int, studied_today: bool }

    Dates are computed in the user's local timezone (defaults to UTC).
    A session at 23:00 UTC+5:30 correctly counts as local Monday, not UTC Tuesday.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        tz_name = request.query_params.get('tz', 'UTC')
        try:
            tz = ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            tz = ZoneInfo('UTC')

        sessions = StudySession.objects.filter(user=request.user)
        # Convert created_at to local date
        unique_dates = sorted(
            {s.created_at.astimezone(tz).date() for s in sessions},
            reverse=True
        )
        today = datetime.now(tz).date()
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
    GET /api/reports/weekly/?week=YYYY-WW&tz=Asia/Kolkata
    Filters sessions by local date within Mon–Sun of the specified week.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        tz_name = request.query_params.get('tz', 'UTC')
        try:
            tz = ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            tz = ZoneInfo('UTC')

        week_str = request.query_params.get('week')
        try:
            if week_str:
                monday = datetime.strptime(f'{week_str}-1', '%G-%V-%u').date()
            else:
                local_today = datetime.now(tz).date()
                monday = local_today - timedelta(days=local_today.weekday())
        except (ValueError, TypeError):
            return Response({'error': 'Invalid week format. Use YYYY-WW (e.g. 2026-08).'}, status=400)

        sunday = monday + timedelta(days=6)

        # Filter sessions by converting created_at to local date
        all_sessions = StudySession.objects.filter(user=request.user)
        sessions = [
            s for s in all_sessions
            if monday <= s.created_at.astimezone(tz).date() <= sunday
        ]

        total_duration_seconds = sum(s.duration_seconds for s in sessions)
        unique_subjects_count = len({s.subject_id for s in sessions if s.subject_id})
        session_count = len(sessions)
        days_studied = len({s.created_at.astimezone(tz).date() for s in sessions})

        # Topics marked mastered within this week (local date)
        topics_mastered_count = Topic.objects.filter(
            subject__user=request.user,
            status='mastered',
        ).count()
        # Refine: only those updated in this local week
        topics_mastered_count = sum(
            1 for t in Topic.objects.filter(
                subject__user=request.user,
                status='mastered',
            )
            if monday <= t.updated_at.astimezone(tz).date() <= sunday
        )

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
