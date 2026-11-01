import json
from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from .glossary import build_glossary
from .media import serve_asset as serve_media_asset
from .models import AgeTrack, Character, ContentVersion, Module, Lesson
from .serializers import (
    AgeTrackSerializer,
    CharacterSerializer,
    LessonDetailSerializer,
    ModuleSerializer,
)
from .tracks import can_open_lesson
from .versions import live_version


def media_view(request, asset_id, stamp):
    """GET /api/media/<id>/<empreinte> : image ou vidéo du studio, publique et gardée un an par le navigateur."""
    return serve_media_asset(request, asset_id, stamp)


class PublicReadView(APIView):
    """Le contenu pédagogique est public (lecture seule)."""

    permission_classes = [AllowAny]


class AgeTrackListView(PublicReadView):
    """
    GET /api/curriculum/tracks/
    Renvoie la liste complète des parcours par tranche d'âge avec leurs mondes et leçons.
    """
    def get(self, request):
        tracks = AgeTrack.objects.prefetch_related('modules__lessons').all()
        serializer = AgeTrackSerializer(tracks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CurriculumOverviewView(PublicReadView):
    """
    GET /api/curriculum/overview/
    Renvoie un dictionnaire structuré indexé par clé ('7-9', '10-12', '13-15')
    directement compatible avec le state client frontend.
    """
    def get(self, request):
        tracks = AgeTrack.objects.prefetch_related('modules__lessons').all()
        data = {}
        for track in tracks:
            serializer = AgeTrackSerializer(track)
            data[track.key] = serializer.data
        return Response(data, status=status.HTTP_200_OK)


class AgeTrackDetailView(PublicReadView):
    """
    GET /api/curriculum/tracks/<str:key>/
    Renvoie le détail d'un parcours spécifique (ex: '7-9').
    """
    def get(self, request, key):
        track = get_object_or_404(
            AgeTrack.objects.prefetch_related('modules__lessons'),
            key=key
        )
        serializer = AgeTrackSerializer(track)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ModuleDetailView(PublicReadView):
    """
    GET /api/curriculum/modules/<str:world_id>/
    Renvoie le détail d'un module/monde (ex: 'p1') avec ses leçons.
    """
    def get(self, request, world_id):
        module = get_object_or_404(
            Module.objects.prefetch_related('lessons'),
            world_id=world_id
        )
        serializer = ModuleSerializer(module)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GlossaryView(PublicReadView):
    """
    GET /api/curriculum/glossary/
    Renvoie les mots du dictionnaire, par ordre alphabétique. Un élève ne reçoit que les mots des leçons qu'il a terminées
    (plus le nombre de mots restant à découvrir) : voir apps/curriculum/glossary.py.
    """
    def get(self, request):
        return Response(build_glossary(request.user), status=status.HTTP_200_OK)


class Content79ListView(PublicReadView):
    """
    GET /api/curriculum/content79/
    Leçons 7-9 dont le contenu a été modifié dans le studio : {identifiant: numéro de version en ligne}. Les autres leçons
    restent celles du site (fichiers frontend/content/parcours79).
    """
    def get(self, request):
        now = timezone.now()
        live = {}
        for version in ContentVersion.objects.filter(kind=ContentVersion.KIND_LESSON79, discarded_at__isnull=True,
                                                     publish_at__lte=now).defer('content').order_by('publish_at', 'number'):
            live[version.key] = version
        return Response({key: {'version': v.number, 'source': v.source} for key, v in live.items()
                         if v.source != ContentVersion.SOURCE_IMPORT})


class Content79View(PublicReadView):
    """
    GET /api/curriculum/content79/<str:lesson_id>/
    Contenu en ligne d'une leçon 7-9 modifiée dans le studio ; 404 si la leçon n'a pas été modifiée (le site garde alors son contenu d'origine).
    """
    def get(self, request, lesson_id):
        if not can_open_lesson(request.user, '7-9'):
            return Response({'error': "Cette leçon n'appartient pas à ton parcours."}, status=status.HTTP_403_FORBIDDEN)

        version = live_version(ContentVersion.KIND_LESSON79, lesson_id)
        if version is None or version.source == ContentVersion.SOURCE_IMPORT:
            return Response({'error': 'Contenu d\'origine.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'version': version.number, 'content': version.content}, status=status.HTTP_200_OK)


class LessonDetailView(PublicReadView):
    """
    GET /api/curriculum/lessons/<str:lesson_id>/
    Renvoie une leçon avec son contenu pédagogique complet (mission, quiz, activités).
    """
    def get(self, request, lesson_id):
        lesson = get_object_or_404(
            Lesson.objects.select_related('module__track', 'content'),
            lesson_id=lesson_id
        )
        if not can_open_lesson(request.user, lesson.module.track.key):
            return Response({'error': "Cette leçon n'appartient pas à ton parcours."}, status=status.HTTP_403_FORBIDDEN)

        serializer = LessonDetailSerializer(lesson)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CharacterListView(PublicReadView):
    """
    GET /api/curriculum/characters/?track=10-12&module=a1
    Renvoie les personnages du parcours avec nom, rôle, avatar, identifiant de voix et module.
    Si ?module= est fourni, renvoie les personnages rattachés à ce module ainsi que les personnages principaux (module vide ou non défini).
    """
    def get(self, request):
        track_key = request.query_params.get('track', '10-12')
        module_param = request.query_params.get('module')
        characters = Character.objects.filter(track__key=track_key)
        if module_param:
            characters = characters.filter(
                models.Q(module=module_param) | models.Q(module='') | models.Q(module__isnull=True)
            )
        characters = characters.order_by('order', 'character_id')
        serializer = CharacterSerializer(characters, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LessonFicheView(APIView):
    """
    GET /api/curriculum/fiche/<str:lesson_id>/
    Renvoie la fiche pédagogique d'une leçon (réservée aux enseignants, directeurs d'école et administrateurs).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        user = request.user
        allowed_roles = {User.ROLE_TEACHER, User.ROLE_SCHOOL_ADMIN, User.ROLE_ADMIN}
        if not (user.is_superuser or user.is_staff or user.role in allowed_roles):
            return Response(
                {'error': "Accès réservé aux enseignants et à la direction d'école."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lesson = get_object_or_404(Lesson, lesson_id=lesson_id)
        guide = getattr(lesson, 'teacher_guide', None)
        if guide:
            fiche_obj = {
                'objectifs': guide.essential,
                'deroule': guide.unplugged.get('steps', []) if isinstance(guide.unplugged, dict) else [],
                'materiel': guide.unplugged.get('materials', []) if isinstance(guide.unplugged, dict) else [],
                'reponses': guide.ask_them,
                'attention': guide.common_mistakes,
            }
            data = {
                'lesson_id': lesson.lesson_id,
                'title': lesson.title,
                'fiche': fiche_obj,
                **fiche_obj,
            }
            return Response(data, status=status.HTTP_200_OK)

        # Chercher dans la version en ligne de ContentVersion (parcours école uniquement)
        for kind in ('lesson79ecole', 'lesson1012ecole', 'lesson1315ecole'):
            cv = live_version(kind, lesson_id)
            if cv and isinstance(cv.content, dict) and 'fiche' in cv.content:
                fiche_obj = cv.content['fiche']
                data = {
                    'lesson_id': lesson_id,
                    'title': lesson.title,
                    'fiche': fiche_obj,
                    **fiche_obj,
                }
                return Response(data, status=status.HTTP_200_OK)

        from apps.curriculum.parcours79 import TRACK_CONFIGS
        for _trk, tcfg in TRACK_CONFIGS.items():
            if not tcfg.get('school'):
                continue
            cdir = tcfg.get('content_dir')
            if cdir and cdir.exists():
                for jfile in cdir.glob(tcfg.get('file_glob', '*.json')):
                    try:
                        jdata = json.loads(jfile.read_text(encoding='utf-8'))
                        for les in jdata.get('lessons', []):
                            if les.get('id') == lesson_id and 'fiche' in les:
                                fiche_obj = les['fiche']
                                data = {
                                    'lesson_id': lesson_id,
                                    'title': les.get('title', lesson.title),
                                    'fiche': fiche_obj,
                                    **fiche_obj,
                                }
                                return Response(data, status=status.HTTP_200_OK)
                    except Exception:
                        continue

        return Response({'error': "Fiche introuvable pour cette leçon."}, status=status.HTTP_404_NOT_FOUND)
