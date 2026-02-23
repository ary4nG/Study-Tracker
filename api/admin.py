from django.contrib.admin import site
from .models import Subject, Topic, StudySession

site.register(Subject)
site.register(Topic)
site.register(StudySession)
