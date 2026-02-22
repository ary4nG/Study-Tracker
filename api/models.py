from django.db import models
from django.conf import settings


class Subject(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subjects',
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    color = models.CharField(max_length=7, default='#2563EB')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.name}"


class Topic(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('mastered', 'Mastered'),
    ]

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='topics',  # activates topic_count in SubjectSerializer
    )
    name = models.CharField(max_length=500)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='not_started',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.subject.name} — {self.name}"
