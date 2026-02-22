from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status


class UserDetailViewTests(APITestCase):
    """Tests for GET /api/auth/user/"""

    def setUp(self):
        self.url = '/api/auth/user/'
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
        )

    def test_user_detail_returns_403_when_unauthenticated(self):
        """
        AC: Protected endpoints block anonymous users.
        DRF SessionAuthentication returns 403 (not 401) for unauthenticated
        requests — this is documented DRF behaviour.
        """
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_detail_returns_user_data_when_authenticated(self):
        """AC: Returns correct user profile fields when logged in."""
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['id'], self.user.id)
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['email'], 'test@example.com')
        self.assertIn('name', data)
        self.assertIn('avatar_url', data)

    def test_user_detail_post_not_allowed(self):
        """GET only endpoint — POST should return 405."""
        self.client.force_login(self.user)
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class LogoutViewTests(APITestCase):
    """Tests for POST /api/auth/logout/"""

    def setUp(self):
        self.url = '/api/auth/logout/'
        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
        )

    def test_logout_requires_authentication(self):
        """
        AC: Unauthenticated logout is blocked.
        DRF SessionAuthentication returns 403 for unauthenticated requests.
        """
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_clears_session(self):
        """AC: After logout, subsequent requests are blocked (session cleared)."""
        self.client.force_login(self.user)

        # Verify we're logged in
        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Logout
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.json())

        # Session is gone — DRF returns 403
        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_get_not_allowed(self):
        """POST only endpoint — GET should return 405."""
        self.client.force_login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
