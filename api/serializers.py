from rest_framework import serializers
from .models import Subject, Topic, StudySession


class SubjectSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'name', 'description', 'color', 'topic_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_topic_count(self, obj):
        try:
            return obj.topics.count()
        except Exception:
            return 0


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'subject', 'name', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySession
        fields = [
            'id', 'subject', 'topic',
            'start_time', 'end_time', 'duration_seconds',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
