from rest_framework import serializers
from .models import AgeTrack, Module, Lesson, LessonContent, Character


def _voice_base_url(lesson_id: str) -> str:
    from .tracks import track_of_lesson
    from .parcours79 import TRACK_CONFIGS
    lid = lesson_id or ''
    track = track_of_lesson(lid)
    cfg = TRACK_CONFIGS.get(track, TRACK_CONFIGS['7-9'])
    base = cfg.get('voice_base_url', '/audio/palou/lecons')
    mod_raw = lid.split('-')[0] if '-' in lid else lid
    if track == '7-9' and mod_raw.startswith('p') and mod_raw[1:].isdigit():
        mod_sub = f"m{int(mod_raw[1:]):02d}"
    else:
        mod_sub = mod_raw
    return f"{base}/{mod_sub}/{lid}"


class LessonContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonContent
        fields = [
            'id',
            'mission',
            'objectives',
            'discover',
            'example',
            'activity',
            'remember',
            'vocabulary',
            'challenge',
            'skill',
            'questions',
            'steps',
        ]


class LessonSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='lesson_id')
    type = serializers.CharField(source='lesson_type')
    has_content = serializers.SerializerMethodField()
    voice_base_url = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'numeric_id',
            'title',
            'type',
            'minutes',
            'xp',
            'stars',
            'order',
            'has_content',
            'voice_base_url',
        ]

    numeric_id = serializers.IntegerField(source='id', read_only=True)

    def get_has_content(self, obj):
        return hasattr(obj, 'content') and obj.content is not None

    def get_voice_base_url(self, obj):
        return _voice_base_url(obj.lesson_id)


class LessonDetailSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='lesson_id')
    type = serializers.CharField(source='lesson_type')
    module_id = serializers.CharField(source='module.world_id', read_only=True)
    module_title = serializers.CharField(source='module.title', read_only=True)
    track_key = serializers.CharField(source='module.track.key', read_only=True)
    content = LessonContentSerializer(read_only=True)
    voice_base_url = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'numeric_id',
            'module_id',
            'module_title',
            'track_key',
            'title',
            'type',
            'minutes',
            'xp',
            'stars',
            'order',
            'content',
            'voice_base_url',
        ]

    numeric_id = serializers.IntegerField(source='id', read_only=True)

    def get_voice_base_url(self, obj):
        return _voice_base_url(obj.lesson_id)


class ModuleSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='world_id')
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = [
            'id',
            'numeric_id',
            'icon',
            'title',
            'description',
            'color',
            'order',
            'lieu',
            'video_arrivee',
            'video_depart',
            'lessons',
        ]

    numeric_id = serializers.IntegerField(source='id', read_only=True)


class CharacterSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='character_id')
    voiceId = serializers.CharField(source='voice_id')

    class Meta:
        model = Character
        fields = [
            'id',
            'name',
            'role',
            'avatar',
            'voiceId',
            'module',
            'order',
        ]


class AgeTrackSerializer(serializers.ModelSerializer):
    worlds = ModuleSerializer(source='modules', many=True, read_only=True)
    characters = CharacterSerializer(many=True, read_only=True)

    class Meta:
        model = AgeTrack
        fields = [
            'key',
            'label',
            'name',
            'tagline',
            'accent',
            'order',
            'video_ouverture',
            'worlds',
            'characters',
        ]
