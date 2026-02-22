from rest_framework import serializers
from .models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'name', 'description', 'color', 'topic_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_topic_count(self, obj):
        # Topics model added in Story 1.3 via related_name='topics'
        # Return 0 safely until then
        try:
            return obj.topics.count()
        except Exception:
            return 0
