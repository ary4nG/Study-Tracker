from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Subject


class SubjectAPITests(APITestCase):
    """Tests for /api/subjects/ — CRUD and data isolation."""

    def setUp(self):
        self.url = '/api/subjects/'
        self.user_a = User.objects.create_user(username='user_a', password='pass')
        self.user_b = User.objects.create_user(username='user_b', password='pass')

        # User A has one subject
        self.subject_a = Subject.objects.create(
            user=self.user_a,
            name='Mathematics',
            description='Calculus and Algebra',
            color='#2563EB',
        )

    # ─── Data Isolation ───────────────────────────────────────────────────────

    def test_list_subjects_returns_only_own(self):
        """AC: User A only sees their own subjects, not User B's."""
        Subject.objects.create(user=self.user_b, name='Physics')

        self.client.force_login(self.user_a)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json().get('results', response.json())
        names = [s['name'] for s in results]
        self.assertIn('Mathematics', names)
        self.assertNotIn('Physics', names)

    # ─── Create ───────────────────────────────────────────────────────────────

    def test_create_subject_sets_user_automatically(self):
        """AC: Posted subject is owned by the authenticated user, not arbitrary."""
        self.client.force_login(self.user_a)
        payload = {'name': 'Chemistry', 'description': 'Organic chem', 'color': '#16A34A'}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['name'], 'Chemistry')
        # Verify ownership in DB
        created = Subject.objects.get(id=data['id'])
        self.assertEqual(created.user, self.user_a)

    def test_create_subject_requires_name(self):
        """Name field is required."""
        self.client.force_login(self.user_a)
        response = self.client.post(self.url, {'description': 'No name'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ─── Update ───────────────────────────────────────────────────────────────

    def test_update_subject_name(self):
        """AC: PATCH updates the subject name."""
        self.client.force_login(self.user_a)
        detail_url = f'{self.url}{self.subject_a.id}/'
        response = self.client.patch(detail_url, {'name': 'Advanced Maths'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['name'], 'Advanced Maths')
        self.subject_a.refresh_from_db()
        self.assertEqual(self.subject_a.name, 'Advanced Maths')

    def test_user_cannot_update_another_users_subject(self):
        """Data isolation: User B cannot update User A's subject."""
        self.client.force_login(self.user_b)
        detail_url = f'{self.url}{self.subject_a.id}/'
        response = self.client.patch(detail_url, {'name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ─── Delete ───────────────────────────────────────────────────────────────

    def test_delete_subject_removes_it(self):
        """AC: Deleting a subject removes it from the list."""
        self.client.force_login(self.user_a)
        detail_url = f'{self.url}{self.subject_a.id}/'
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Subject.objects.filter(id=self.subject_a.id).exists())

    def test_user_cannot_delete_another_users_subject(self):
        """Data isolation: User B cannot delete User A's subject."""
        self.client.force_login(self.user_b)
        detail_url = f'{self.url}{self.subject_a.id}/'
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ─── Auth ─────────────────────────────────────────────────────────────────

    def test_unauthenticated_cannot_access_subjects(self):
        """AC: Unauthenticated requests are blocked."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ─── Serializer fields ────────────────────────────────────────────────────

    def test_subject_response_includes_topic_count(self):
        """topic_count field is present and returns 0 before Topic model exists."""
        self.client.force_login(self.user_a)
        response = self.client.get(f'{self.url}{self.subject_a.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('topic_count', response.json())
        self.assertEqual(response.json()['topic_count'], 0)
