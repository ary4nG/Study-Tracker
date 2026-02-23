from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Subject, Topic


class TopicAPITests(APITestCase):
    """Tests for /api/topics/ — CRUD and user-scoped data isolation."""

    def setUp(self):
        self.url = '/api/topics/'
        self.user_a = User.objects.create_user(username='user_a', password='pass')
        self.user_b = User.objects.create_user(username='user_b', password='pass')
        self.subject_a = Subject.objects.create(user=self.user_a, name='Maths')
        self.subject_b = Subject.objects.create(user=self.user_b, name='Physics')
        self.topic_a = Topic.objects.create(subject=self.subject_a, name='Calculus')
        self.topic_b = Topic.objects.create(subject=self.subject_b, name='Optics')

    # ─── Data isolation ───────────────────────────────────────────────────────

    def test_list_topics_filtered_by_user(self):
        """User A only sees their own topics, not User B's."""
        self.client.force_login(self.user_a)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data.get('results', data)
        names = [t['name'] for t in results]
        self.assertIn('Calculus', names)
        self.assertNotIn('Optics', names)

    def test_subject_filter_parameter(self):
        """GET /api/topics/?subject=X only returns topics for that subject."""
        extra = Topic.objects.create(subject=self.subject_a, name='Algebra')
        self.client.force_login(self.user_a)
        response = self.client.get(f'{self.url}?subject={self.subject_a.id}')
        data = response.json()
        results = data.get('results', data)
        names = [t['name'] for t in results]
        self.assertIn('Calculus', names)
        self.assertIn('Algebra', names)

    # ─── Create ───────────────────────────────────────────────────────────────

    def test_create_topic_on_own_subject(self):
        """AC: Can create a topic on own subject."""
        self.client.force_login(self.user_a)
        payload = {'subject': self.subject_a.id, 'name': 'Linear Algebra'}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['name'], 'Linear Algebra')

    def test_cannot_create_topic_on_other_users_subject(self):
        """AC: Cannot inject a topic into another user's subject → 404."""
        self.client.force_login(self.user_a)
        payload = {'subject': self.subject_b.id, 'name': 'Injection'}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ─── Update ───────────────────────────────────────────────────────────────

    def test_update_topic_name(self):
        """AC: PATCH updates the topic name."""
        self.client.force_login(self.user_a)
        url = f'{self.url}{self.topic_a.id}/'
        response = self.client.patch(url, {'name': 'Advanced Calculus'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['name'], 'Advanced Calculus')

    def test_update_topic_status(self):
        """AC: PATCH status cycles through not_started → in_progress → mastered."""
        self.client.force_login(self.user_a)
        url = f'{self.url}{self.topic_a.id}/'
        # not_started → in_progress
        resp = self.client.patch(url, {'status': 'in_progress'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()['status'], 'in_progress')
        self.topic_a.refresh_from_db()
        self.assertEqual(self.topic_a.status, 'in_progress')
        # in_progress → mastered
        resp = self.client.patch(url, {'status': 'mastered'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()['status'], 'mastered')


    def test_cannot_update_other_users_topic(self):
        """Data isolation: cannot PATCH another user's topic."""
        self.client.force_login(self.user_a)
        url = f'{self.url}{self.topic_b.id}/'
        response = self.client.patch(url, {'name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ─── Delete ───────────────────────────────────────────────────────────────

    def test_delete_topic(self):
        """AC: DELETE removes the topic."""
        self.client.force_login(self.user_a)
        url = f'{self.url}{self.topic_a.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Topic.objects.filter(id=self.topic_a.id).exists())

    def test_cannot_delete_other_users_topic(self):
        """Data isolation: cannot DELETE another user's topic."""
        self.client.force_login(self.user_a)
        url = f'{self.url}{self.topic_b.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ─── Auth ─────────────────────────────────────────────────────────────────

    def test_unauthenticated_cannot_access_topics(self):
        """AC: Unauthenticated access returns 403."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
