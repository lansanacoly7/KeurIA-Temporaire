from django.contrib import admin
from .models import School

@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_by_email', 'created_at')
    search_fields = ('name', 'slug', 'created_by_email')
    prepopulated_fields = {'slug': ('name',)}
