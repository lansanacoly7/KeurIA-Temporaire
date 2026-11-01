from django.contrib import admin
from .models import Progress, QuizAttempt, DailyUsage

@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'owner_email', 'lesson_id', 'age_track', 'xp', 'score', 'completed_at')
    list_filter = ('age_track', 'completed_at')
    search_fields = ('owner_email', 'lesson_id')

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'owner_email', 'quiz_id', 'score', 'created_at')
    search_fields = ('owner_email', 'quiz_id')

@admin.register(DailyUsage)
class DailyUsageAdmin(admin.ModelAdmin):
    list_display = ('user', 'owner_email', 'usage_date', 'age_track', 'minutes', 'lessons', 'quizzes', 'games')
    list_filter = ('usage_date', 'age_track')
    search_fields = ('owner_email',)
