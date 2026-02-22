from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Subject, Topic


class ParseSyllabusTests(APITestCase):
    """Tests for POST /api/subjects/{id}/parse-syllabus/"""

    def setUp(self):
        self.user = User.objects.create_user(username='student', password='pass')
        self.other_user = User.objects.create_user(username='other', password='pass')
        self.subject = Subject.objects.create(user=self.user, name='Maths')
        self.url = f'/api/subjects/{self.subject.id}/parse-syllabus/'

    def test_parse_syllabus_creates_topics(self):
        """AC: Posting 3 topic names creates 3 Topic objects in the DB."""
        self.client.force_login(self.user)
        payload = {'topics': ['Calculus', 'Linear Algebra', 'Statistics']}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Topic.objects.filter(subject=self.subject).count(), 3)

    def test_parse_syllabus_returns_created_topics(self):
        """AC: Response includes all created topic objects with correct names."""
        self.client.force_login(self.user)
        topics = ['Derivatives', 'Integration', 'Limits']
        response = self.client.post(self.url, {'topics': topics}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        names = [t['name'] for t in response.json()]
        self.assertListEqual(sorted(names), sorted(topics))

    def test_parse_syllabus_rejects_other_users_subject(self):
        """AC: Posting to another user's subject returns 404 — data isolation."""
        other_subject = Subject.objects.create(user=self.other_user, name='Physics')
        self.client.force_login(self.user)
        url = f'/api/subjects/{other_subject.id}/parse-syllabus/'
        response = self.client.post(url, {'topics': ['Optics']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_parse_syllabus_requires_topics_field(self):
        """AC: Missing or empty topics list returns 400."""
        self.client.force_login(self.user)
        # No topics field
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Empty list
        response = self.client.post(self.url, {'topics': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_parse_syllabus_filters_blank_names(self):
        """Blank or whitespace-only names are silently skipped."""
        self.client.force_login(self.user)
        payload = {'topics': ['  ', '', 'Valid Topic', '   ']}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Valid Topic')

    def test_topic_count_updates_after_parse(self):
        """AC: topic_count on subject reflects real count after bulk create."""
        self.client.force_login(self.user)
        self.client.post(self.url, {'topics': ['A', 'B', 'C']}, format='json')

        response = self.client.get(f'/api/subjects/{self.subject.id}/')
        self.assertEqual(response.json()['topic_count'], 3)

    def test_unauthenticated_cannot_parse(self):
        """Unauthenticated access returns 403."""
        response = self.client.post(self.url, {'topics': ['X']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
