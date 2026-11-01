from rest_framework import serializers
from .models import AgeTrack, Module, Lesson, LessonContent, Character


def _voice_base_url(lesson_id: str) -> str:
    lid = lesson_id or ''
    if lid.startswith('ep'):
        mod = lid.split('-')[0]
        return f"/audio/palou/ecole79/{mod}/{lid}"
    if lid.startswith('p'):
        mod_num = int(lid.split('-')[0][1:]) if lid.split('-')[0][1:].isdigit() else 1
        return f"/audio/palou/lecons/m{mod_num:02d}/{lid}"
    if lid.startswith('ea'):
        mod = lid.split('-')[0]
        return f"/audio/palou/ecole1012/{mod}/{lid}"
    if lid.startswith('a'):
        mod = lid.split('-')[0]
        return f"/audio/palou/1012/{mod}/{lid}"
    if lid.startswith('ec'):
        mod = lid.split('-')[0]
        return f"/audio/palou/ecole1315/{mod}/{lid}"
    if lid.startswith('c'):
        mod = lid.split('-')[0]
        return f"/audio/palou/1315/{mod}/{lid}"
    return f"/audio/palou/lecons/{lid}"


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
