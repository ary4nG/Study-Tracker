"""
Tests for the new AI PDF Syllabus Parser endpoint.

All tests mock the Gemini API call so they run without any network access
or a real API key.
"""

from io import BytesIO
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Subject, Topic


def _make_pdf_bytes(text: str = "Unit 1\n1. Introduction\n2. Variables\n3. Loops") -> bytes:
    """
    Create a minimal but valid single-page PDF containing the given text.
    Uses only Python stdlib so it works in tests without extra libs.
    """
    import struct
    # Minimal PDF — not pretty but pypdf can read it
    stream = text.encode('latin-1', errors='replace')
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
    )
    stream_obj = b"BT /F1 12 Tf 50 750 Td (" + stream + b") Tj ET"
    pdf += (
        b"4 0 obj\n<< /Length " + str(len(stream_obj)).encode() + b" >>\nstream\n"
        + stream_obj + b"\nendstream\nendobj\n"
        b"xref\n0 5\n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\n"
        b"startxref\n0\n%%EOF\n"
    )
    return pdf


MOCK_TOPICS = [
    {'name': 'Introduction', 'difficulty': 'easy'},
    {'name': 'Variables', 'difficulty': 'easy'},
    {'name': 'Loops', 'difficulty': 'medium'},
]


class AIParseSyllabusTests(APITestCase):
    """Tests for POST /api/subjects/{id}/ai-parse-syllabus/"""

    def setUp(self):
        self.user = User.objects.create_user(username='aiuser', password='pass')
        self.other_user = User.objects.create_user(username='other_ai', password='pass')
        self.subject = Subject.objects.create(user=self.user, name='Programming 101')
        self.url = f'/api/subjects/{self.subject.id}/ai-parse-syllabus/'

    # ------------------------------------------------------------------
    # Happy path
    # ------------------------------------------------------------------

    @patch('api.views.parse_syllabus_with_ai', return_value=MOCK_TOPICS)
    @patch('api.views.PdfReader')
    def test_ai_parse_creates_topics_with_difficulty(self, mock_reader, mock_ai):
        """
        A valid PDF upload should create topics with correct difficulty values.
        """
        # Make PdfReader return a page with extractable text
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Unit 1\n1. Introduction\n2. Variables\n3. Loops"
        mock_reader.return_value.pages = [mock_page]

        self.client.force_login(self.user)
        pdf_file = BytesIO(_make_pdf_bytes())
        pdf_file.name = 'syllabus.pdf'

        response = self.client.post(
            self.url, {'file': pdf_file}, format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(len(data), 3)
        names = [t['name'] for t in data]
        self.assertIn('Introduction', names)
        # Verify difficulty field is present and valid
        for topic in data:
            self.assertIn(topic['difficulty'], ['easy', 'medium', 'hard'])

    @patch('api.views.parse_syllabus_with_ai', return_value=MOCK_TOPICS)
    @patch('api.views.PdfReader')
    def test_topics_are_saved_to_db(self, mock_reader, mock_ai):
        """Created topics should persist in the database."""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "some text"
        mock_reader.return_value.pages = [mock_page]

        self.client.force_login(self.user)
        pdf_file = BytesIO(_make_pdf_bytes())
        pdf_file.name = 'syllabus.pdf'

        self.client.post(self.url, {'file': pdf_file}, format='multipart')
        self.assertEqual(Topic.objects.filter(subject=self.subject).count(), 3)

    # ------------------------------------------------------------------
    # Auth & ownership
    # ------------------------------------------------------------------

    def test_unauthenticated_returns_403(self):
        """Unauthenticated access should be rejected."""
        pdf_file = BytesIO(_make_pdf_bytes())
        pdf_file.name = 'syllabus.pdf'
        response = self.client.post(self.url, {'file': pdf_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_users_subject_returns_404(self):
        """Users cannot parse syllabi into another user's subject."""
        other_subject = Subject.objects.create(user=self.other_user, name='Other')
        url = f'/api/subjects/{other_subject.id}/ai-parse-syllabus/'
        self.client.force_login(self.user)
        pdf_file = BytesIO(_make_pdf_bytes())
        pdf_file.name = 'syllabus.pdf'
        response = self.client.post(url, {'file': pdf_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def test_missing_file_returns_400(self):
        """Request with no file field should return 400."""
        self.client.force_login(self.user)
        response = self.client.post(self.url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())

    def test_non_pdf_file_returns_400(self):
        """Uploading a non-PDF file should return 400."""
        self.client.force_login(self.user)
        txt_file = BytesIO(b"This is not a PDF")
        txt_file.name = 'syllabus.txt'
        response = self.client.post(self.url, {'file': txt_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('PDF', response.json()['error'])

    # ------------------------------------------------------------------
    # AI service errors
    # ------------------------------------------------------------------

    @patch('api.views.PdfReader')
    def test_missing_api_key_returns_400(self, mock_reader):
        """If GEMINI_API_KEY is not set, the endpoint returns 400 with a helpful message."""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "some text"
        mock_reader.return_value.pages = [mock_page]

        self.client.force_login(self.user)
        pdf_file = BytesIO(_make_pdf_bytes())
        pdf_file.name = 'syllabus.pdf'

        with patch('api.views.parse_syllabus_with_ai', side_effect=ValueError("GEMINI_API_KEY is not configured.")):
            response = self.client.post(self.url, {'file': pdf_file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('api.views.PdfReader')
    def test_ai_service_error_returns_502(self, mock_reader):
        """If the Gemini API fails, the endpoint returns 502."""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "some text"
        mock_reader.return_value.pages = [mock_page]

        self.client.force_login(self.user)
        pdf_file = BytesIO(_make_pdf_bytes())
        pdf_file.name = 'syllabus.pdf'

        with patch('api.views.parse_syllabus_with_ai', side_effect=RuntimeError("Gemini API error")):
            response = self.client.post(self.url, {'file': pdf_file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
