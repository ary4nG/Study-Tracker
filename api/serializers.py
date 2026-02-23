from rest_framework import serializers
from .models import Subject, Topic, StudySession


class SubjectSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    mastered_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'description', 'color',
            'topic_count', 'mastered_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_topic_count(self, obj):
        try:
            return obj.topics.count()
        except Exception:
            return 0

    def get_mastered_count(self, obj):
        try:
            return obj.topics.filter(status='mastered').count()
        except Exception:
            return 0


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'subject', 'name', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudySessionSerializer(serializers.ModelSerializer):
    # Read-only denormalized fields so frontend doesn't need extra lookups
    subject_name = serializers.SerializerMethodField()
    topic_name = serializers.SerializerMethodField()

    class Meta:
        model = StudySession
        fields = [
            'id', 'subject', 'topic',
            'subject_name', 'topic_name',
            'start_time', 'end_time', 'duration_seconds',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'subject_name', 'topic_name', 'created_at']

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else None
