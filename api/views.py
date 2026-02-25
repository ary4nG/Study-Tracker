import io

from django.contrib.auth import logout
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta, date, datetime
from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from pypdf import PdfReader

from .models import Subject, Topic, StudySession
from .serializers import SubjectSerializer, TopicSerializer, StudySessionSerializer
from .ai_parser import parse_syllabus_with_ai


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


class AIParseSyllabusView(APIView):
    """
    POST /api/subjects/{id}/ai-parse-syllabus/

    Accepts a PDF file via multipart/form-data (field name: 'file').
    Extracts the text from the PDF, sends it to Google Gemini (gemini-2.0-flash-lite,
    free tier), and bulk-creates Topic objects with AI-assigned difficulty ratings.

    Returns the list of created Topic objects.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, subject_id):
        subject = get_object_or_404(Subject, pk=subject_id, user=request.user)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'No file uploaded. Send a PDF under the \'file\' field.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file type
        filename = uploaded_file.name.lower()
        if not filename.endswith('.pdf'):
            return Response(
                {'error': 'Only PDF files are supported.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract text from PDF
        try:
            reader = PdfReader(io.BytesIO(uploaded_file.read()))
            pages_text = [page.extract_text() or '' for page in reader.pages]
            raw_text = '\n'.join(pages_text).strip()
        except Exception as exc:
            return Response(
                {'error': f'Could not read PDF: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not raw_text:
            return Response(
                {'error': 'The PDF appears to be empty or image-only (no extractable text).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Send to Gemini
        try:
            parsed_topics = parse_syllabus_with_ai(raw_text)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        if not parsed_topics:
            return Response(
                {'error': 'AI could not extract any topics from the provided PDF.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # Bulk create Topic objects
        topics = Topic.objects.bulk_create([
            Topic(subject=subject, name=item['name'], difficulty=item['difficulty'])
            for item in parsed_topics
        ])

        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RecommendTopicView(APIView):
    """
    GET /api/subjects/{id}/recommend-topic/

    Returns a single recommended Topic for the student to focus on next.

    Algorithm (no external AI required — pure heuristic):
      1. Exclude mastered topics.
      2. Prioritise "in_progress" over "not_started" (finish what you started).
      3. Within each group, rank easy → medium → hard (build momentum, avoid overwhelm).
      4. Use syllabus insertion order as the final tiebreaker (natural order matters).

    Returns 200 with the topic, or 204 No Content if all topics are mastered / none exist.
    """
    permission_classes = [IsAuthenticated]

    # Difficulty score: lower = higher priority (easy first)
    DIFFICULTY_SCORE = {'easy': 0, 'medium': 1, 'hard': 2}
    # Status score: lower = higher priority (in_progress first)
    STATUS_SCORE = {'in_progress': 0, 'not_started': 1}

    def get(self, request, subject_id):
        subject = get_object_or_404(Subject, pk=subject_id, user=request.user)

        candidates = list(
            Topic.objects.filter(subject=subject)
            .exclude(status='mastered')
            .order_by('id')  # syllabus order as base
        )

        if not candidates:
            return Response(status=status.HTTP_204_NO_CONTENT)

        def score(topic: Topic):
            status_rank = self.STATUS_SCORE.get(topic.status, 2)
            difficulty_rank = self.DIFFICULTY_SCORE.get(topic.difficulty, 1)
            return (status_rank, difficulty_rank)

        recommended = min(candidates, key=score)
        serializer = TopicSerializer(recommended)
        return Response(serializer.data, status=status.HTTP_200_OK)
