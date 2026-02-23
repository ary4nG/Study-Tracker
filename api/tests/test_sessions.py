from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Subject, Topic, StudySession


class SessionAPITests(APITestCase):
    """Tests for POST/GET /api/sessions/ — session logging."""

    def setUp(self):
        self.url = '/api/sessions/'
        self.user_a = User.objects.create_user(username='user_a', password='pass')
        self.user_b = User.objects.create_user(username='user_b', password='pass')
        self.subject = Subject.objects.create(user=self.user_a, name='Maths')
        self.topic = Topic.objects.create(subject=self.subject, name='Calculus')

        now = timezone.now()
        self.valid_payload = {
            'subject': self.subject.id,
            'topic': self.topic.id,
            'start_time': (now.replace(second=0, microsecond=0) - timezone.timedelta(minutes=30)).isoformat(),
            'end_time': now.replace(second=0, microsecond=0).isoformat(),
            'duration_seconds': 1800,
            'notes': 'Covered derivatives.',
        }

    # ── Create ────────────────────────────────────────────────────────────────

    def test_create_session_saves_correctly(self):
        """AC: POST saves session with all fields in DB."""
        self.client.force_login(self.user_a)
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StudySession.objects.filter(user=self.user_a).count(), 1)
        session = StudySession.objects.get(user=self.user_a)
        self.assertEqual(session.duration_seconds, 1800)
        self.assertEqual(session.subject, self.subject)
        self.assertEqual(session.topic, self.topic)

    def test_create_session_without_topic(self):
        """topic is optional — session saves with topic=null."""
        self.client.force_login(self.user_a)
        payload = {**self.valid_payload, 'topic': None}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(StudySession.objects.get(user=self.user_a).topic)

    # ── Data isolation ─────────────────────────────────────────────────────────

    def test_list_sessions_scoped_to_user(self):
        """AC: Each user only sees their own sessions."""
        subject_b = Subject.objects.create(user=self.user_b, name='Physics')
        now = timezone.now()
        StudySession.objects.create(
            user=self.user_a, subject=self.subject,
            start_time=now - timezone.timedelta(hours=1), end_time=now,
            duration_seconds=3600,
        )
        StudySession.objects.create(
            user=self.user_b, subject=subject_b,
            start_time=now - timezone.timedelta(hours=1), end_time=now,
            duration_seconds=3600,
        )
        self.client.force_login(self.user_a)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['subject'], self.subject.id)

    # ── Method restrictions ────────────────────────────────────────────────────

    def test_cannot_delete_session(self):
        """Sessions are append-only — DELETE not allowed."""
        self.client.force_login(self.user_a)
        self.client.post(self.url, self.valid_payload, format='json')
        session = StudySession.objects.get(user=self.user_a)
        response = self.client.delete(f'{self.url}{session.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    # ── Auth ──────────────────────────────────────────────────────────────────

    def test_unauthenticated_cannot_access_sessions(self):
        """AC: Unauthenticated access returns 403."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Streak ─────────────────────────────────────────────────────────────────

    def test_streak_calculated_correctly(self):
        """AC: Consecutive calendar days build streak; a gap resets it."""
        self.client.force_login(self.user_a)
        now = timezone.now()

        # Sessions on 3 consecutive days (today, yesterday, 2 days ago)
        for days_ago in [0, 1, 2]:
            s = StudySession.objects.create(
                user=self.user_a, subject=self.subject,
                start_time=now - timezone.timedelta(days=days_ago, hours=1),
                end_time=now - timezone.timedelta(days=days_ago),
                duration_seconds=3600,
            )
            # Force created_at to the correct historical date
            s.created_at = now - timezone.timedelta(days=days_ago)
            s.save()

        response = self.client.get('/api/sessions/streak/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['streak'], 3)
        self.assertTrue(data['studied_today'])

        # Add a session 5 days ago (creates a gap) — streak should still be 3
        old = StudySession.objects.create(
            user=self.user_a, subject=self.subject,
            start_time=now - timezone.timedelta(days=5),
            end_time=now - timezone.timedelta(days=5),
            duration_seconds=1800,
        )
        old.created_at = now - timezone.timedelta(days=5)
        old.save()
        response2 = self.client.get('/api/sessions/streak/')
        self.assertEqual(response2.json()['streak'], 3)  # gap at day 3 stops the count


    # ── Filters ───────────────────────────────────────────────────────────────

    def test_filter_sessions_by_subject(self):
        """AC: ?subject=X returns only sessions for that subject."""
        other_subject = Subject.objects.create(user=self.user_a, name='Physics')
        now = timezone.now()
        self.client.force_login(self.user_a)
        self.client.post(self.url, self.valid_payload, format='json')  # Maths session
        self.client.post(self.url, {
            **self.valid_payload,
            'subject': other_subject.id, 'topic': None,
        }, format='json')  # Physics session
        response = self.client.get(f'{self.url}?subject={self.subject.id}')
        data = response.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['subject'], self.subject.id)

    def test_filter_sessions_by_days(self):
        """AC: ?days=7 returns only sessions created in the last 7 days."""
        now = timezone.now()
        self.client.force_login(self.user_a)
        # Recent session (today)
        StudySession.objects.create(
            user=self.user_a, subject=self.subject,
            start_time=now - timezone.timedelta(hours=1), end_time=now,
            duration_seconds=3600,
        )
        # Old session (30 days ago — out of filter range)
        old_session = StudySession.objects.create(
            user=self.user_a, subject=self.subject,
            start_time=now - timezone.timedelta(days=30), end_time=now - timezone.timedelta(days=30),
            duration_seconds=3600,
        )
        old_session.created_at = now - timezone.timedelta(days=30)
        old_session.save()
        response = self.client.get(f'{self.url}?days=7')
        data = response.json()
        results = data.get('results', data)
        # Only the recent session should appear
        ids = [r['id'] for r in results]
        self.assertNotIn(old_session.id, ids)

