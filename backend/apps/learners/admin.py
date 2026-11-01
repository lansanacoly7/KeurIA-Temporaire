from django.contrib import admin
from .models import LearnerProfile

@admin.register(LearnerProfile)
class LearnerProfileAdmin(admin.ModelAdmin):
    list_display = ('nickname', 'learner', 'owner_email', 'learner_email', 'age_track', 'created_at')
    list_filter = ('age_track',)
    search_fields = ('nickname', 'owner_email', 'learner_email')
