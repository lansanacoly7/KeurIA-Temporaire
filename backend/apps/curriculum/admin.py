from django.contrib import admin
from .models import AgeTrack, Module, Lesson, LessonContent, TeacherGuide


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ('order', 'lesson_id', 'title', 'lesson_type', 'minutes', 'xp', 'stars')
    ordering = ('order',)


class LessonContentInline(admin.StackedInline):
    model = LessonContent
    extra = 0
    can_delete = False


@admin.register(AgeTrack)
class AgeTrackAdmin(admin.ModelAdmin):
    list_display = ('key', 'label', 'name', 'order', 'module_count')
    list_editable = ('order',)
    search_fields = ('key', 'label', 'name')

    def module_count(self, obj):
        return obj.modules.count()
    module_count.short_description = 'Mondes'


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('world_id', 'title', 'track', 'icon', 'color', 'order', 'lesson_count')
    list_filter = ('track', 'color')
    list_editable = ('order',)
    search_fields = ('world_id', 'title', 'description')
    inlines = [LessonInline]

    def lesson_count(self, obj):
        return obj.lessons.count()
    lesson_count.short_description = 'Leçons'


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('lesson_id', 'title', 'module', 'lesson_type', 'minutes', 'xp', 'order', 'has_content')
    list_filter = ('module__track', 'lesson_type')
    list_editable = ('order', 'lesson_type', 'xp', 'minutes')
    search_fields = ('lesson_id', 'title')
    inlines = [LessonContentInline]

    def has_content(self, obj):
        return hasattr(obj, 'content') and obj.content is not None
    has_content.boolean = True
    has_content.short_description = 'Contenu riche'


@admin.register(LessonContent)
class LessonContentAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'skill', 'updated_at')
    search_fields = ('lesson__lesson_id', 'lesson__title', 'skill', 'mission')


@admin.register(TeacherGuide)
class TeacherGuideAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'updated_at')
    search_fields = ('lesson__lesson_id', 'lesson__title')
    autocomplete_fields = ('lesson',)
