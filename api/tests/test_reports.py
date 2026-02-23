from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Subject, Topic, StudySession


class WeeklyReportAPITests(APITestCase):
    """Tests for GET /api/reports/weekly/"""

    def setUp(self):
        self.url = '/api/reports/weekly/'
        self.user = User.objects.create_user(username='report_user', password='pass')
        self.subject = Subject.objects.create(user=self.user, name='Maths')
        self.topic = Topic.objects.create(subject=self.subject, name='Calculus')

    def _make_session(self, days_ago=0, duration=3600, subject=None):
        """Helper: create a session with created_at offset by days_ago."""
        now = timezone.now()
        s = StudySession.objects.create(
            user=self.user,
            subject=subject or self.subject,
            start_time=now - timezone.timedelta(days=days_ago, hours=1),
            end_time=now - timezone.timedelta(days=days_ago),
            duration_seconds=duration,
        )
        if days_ago != 0:
            s.created_at = now - timezone.timedelta(days=days_ago)
            s.save()
        return s

    # ── Current week ──────────────────────────────────────────────────────────

    def test_weekly_report_current_week(self):
        """AC: Stats correctly summed for current week sessions."""
        self.client.force_login(self.user)
        # Two sessions today — guaranteed to be in the current week
        self._make_session(days_ago=0, duration=3600)
        self._make_session(days_ago=0, duration=1800)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['session_count'], 2)
        self.assertEqual(data['total_duration_seconds'], 5400)
        self.assertEqual(data['unique_subjects_count'], 1)
        self.assertIn('week_start', data)
        self.assertIn('week_end', data)
        self.assertGreaterEqual(data['days_studied'], 1)


    # ── Week isolation ────────────────────────────────────────────────────────

    def test_weekly_report_isolation(self):
        """AC: Sessions from a different week don't appear in this week's report."""
        self.client.force_login(self.user)

        # Session this week
        self._make_session(days_ago=0, duration=3600)
        # Session 14 days ago (2 weeks ago — outside the current week)
        self._make_session(days_ago=14, duration=1800)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Only the current-week session should count
        self.assertEqual(data['session_count'], 1)
        self.assertEqual(data['total_duration_seconds'], 3600)

    # ── Auth ──────────────────────────────────────────────────────────────────

    def test_unauthenticated_cannot_access_weekly_report(self):
        """AC: Unauthenticated access returns 403."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
