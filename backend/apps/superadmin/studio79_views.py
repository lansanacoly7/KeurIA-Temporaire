"""Routes /api/superadmin/studio79/… et /api/superadmin/media : réservées au rôle admin (équipe kEur IA)."""
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.throttling import UserRateThrottle

from apps.curriculum import catalog, media
from apps.curriculum.models import MediaAsset
from apps.scolaire.errors import ApiError

from . import studio79, studio_items
from .services import _page, audit
from .views import AdminView, ok

MEDIA_PAGE_SIZE = 40
UPLOAD_LIMIT_MESSAGE = 'Trop d\'envois de fichiers en peu de temps : réessayez dans une minute.'


class MediaUploadThrottle(UserRateThrottle):
    """La médiathèque est un atelier, pas un dépôt : 30 envois par minute et par administrateur."""

    scope = 'studio_media'
    rate = '30/min'


class Studio79LessonsView(AdminView):
    """GET : les 40 leçons du parcours 7-9 et leur état."""

    def get(self, request):
        return ok(studio79.list_lessons())


class Studio79LessonView(AdminView):
    """GET : une leçon (contenu en ligne, brouillon, publication en attente, historique, problèmes à corriger)."""

    def get(self, request, lesson_id):
        return ok(studio79.get_lesson(lesson_id))


class Studio79DraftView(AdminView):
    """PUT : enregistre le brouillon. DELETE : l'écarte."""

    def put(self, request, lesson_id):
        return ok(studio79.save_draft(request.user, lesson_id, request.data.get('content'), request.data.get('note', '')))

    def delete(self, request, lesson_id):
        studio79.discard_draft(request.user, lesson_id)
        return ok({'ok': True})


class Studio79ValidateView(AdminView):
    """POST {content} : contrôle un contenu sans l'enregistrer."""

    def post(self, request, lesson_id):
        return ok({'issues': studio79.validate(lesson_id, request.data.get('content'))})


class Studio79PublishView(AdminView):
    """POST {acknowledge} : programme la mise en ligne du brouillon (après le délai de sécurité)."""

    def post(self, request, lesson_id):
        return ok(studio79.publish(request.user, lesson_id, acknowledge=bool(request.data.get('acknowledge'))))


class Studio79CancelView(AdminView):
    """POST : annule la publication en attente."""

    def post(self, request, lesson_id):
        return ok(studio79.cancel_pending(request.user, lesson_id))


class Studio79RollbackView(AdminView):
    """POST {number} : remet en ligne une ancienne version, tout de suite."""

    def post(self, request, lesson_id):
        return ok(studio79.rollback(request.user, lesson_id, request.data.get('number')))


class MediaLibraryView(AdminView):
    """GET : la médiathèque avec recherche, filtres et métriques de stockage. POST : envoie une image ou vidéo."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_throttles(self):
        # La lecture de la médiathèque n'est pas limitée : c'est l'envoi qui l'est (voir MediaUploadThrottle).
        return [MediaUploadThrottle()] if self.request.method == 'POST' else []

    def throttled(self, request, wait):
        # Message français plutôt que celui, anglais, que DRF met par défaut dans une 429.
        raise ApiError(UPLOAD_LIMIT_MESSAGE, status.HTTP_429_TOO_MANY_REQUESTS)

    def get(self, request):
        kind = request.query_params.get('kind')
        query = (request.query_params.get('q') or '').strip()
        usage = request.query_params.get('usage')

        assets = MediaAsset.objects.defer('data')
        if kind in (MediaAsset.KIND_IMAGE, MediaAsset.KIND_VIDEO):
            assets = assets.filter(kind=kind)

        if query:
            q_filter = Q(name__icontains=query) | Q(alt__icontains=query)
            if query.isdigit():
                q_filter |= Q(pk=int(query))
            assets = assets.filter(q_filter)

        all_usages = media.find_all_media_usages()
        if usage == 'used':
            assets = assets.filter(pk__in=all_usages.keys())
        elif usage == 'unused':
            assets = assets.exclude(pk__in=all_usages.keys())

        total = assets.count()
        page = _page(request.query_params.get('page'))
        page_size = MEDIA_PAGE_SIZE
        try:
            custom_size = int(request.query_params.get('pageSize', 0))
            if 1 <= custom_size <= 100:
                page_size = custom_size
        except ValueError:
            pass

        rows = assets[(page - 1) * page_size: page * page_size]
        return ok({
            'results': [media.asset_payload(a, all_usages.get(a.pk, [])) for a in rows],
            'total': total,
            'page': page,
            'pageSize': page_size,
            'storage': media.get_storage_stats(),
        })

    def post(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            raise ApiError('Aucun fichier reçu : choisissez une image ou une vidéo.')
        alt = request.data.get('alt', '')
        asset = media.create_asset(upload, request.user, alt=alt)
        audit(request.user, 'studio_media_envoye', f'Média envoyé au studio : {asset.name or asset.kind} ({asset.size // 1024} Ko)')
        return ok(media.asset_payload(asset, usages=[]), status.HTTP_201_CREATED)


class MediaAssetDetailView(AdminView):
    """GET : détail d'un média avec ses utilisations. PATCH/PUT : métadonnées (nom, texte alternatif). DELETE : suppression si inutilisé."""

    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, pk: int):
        asset = get_object_or_404(MediaAsset.objects.defer('data'), pk=pk)
        usages = media.get_asset_usages(asset.pk)
        return ok(media.asset_payload(asset, usages))

    def patch(self, request, pk: int):
        name = request.data.get('name')
        alt = request.data.get('alt')
        asset = media.update_asset_metadata(pk, name=name, alt=alt)
        usages = media.get_asset_usages(asset.pk)
        audit(request.user, 'studio_media_modifie', f'Média #{pk} modifié (alt: {asset.alt[:50]})')
        return ok(media.asset_payload(asset, usages))

    def put(self, request, pk: int):
        return self.patch(request, pk)

    def delete(self, request, pk: int):
        ok_deleted, msg = media.delete_asset_if_unused(pk, request.user)
        audit(request.user, 'studio_media_supprime', f'Média #{pk} supprimé')
        return ok({'ok': True, 'id': pk, 'message': msg})


class Studio79CatalogView(AdminView):
    """GET : le catalogue complet (modules et leçons). PUT : sauvegarde le brouillon. DELETE : écarte le brouillon."""

    def get(self, request):
        return ok(catalog.get_catalog_overview('7-9'))

    def put(self, request):
        return ok(catalog.save_catalog_draft(request.user, '7-9', request.data.get('content'), request.data.get('note', '')))

    def delete(self, request):
        return ok(catalog.discard_catalog_draft(request.user, '7-9'))


class Studio79CatalogPublishView(AdminView):
    """POST : programme ou applique la mise en ligne du catalogue."""

    def post(self, request):
        return ok(catalog.publish_catalog(
            request.user, '7-9',
            note=request.data.get('note', ''),
            delay_minutes=request.data.get('delayMinutes'),
            immediate=bool(request.data.get('immediate')),
        ))


class Studio79CatalogCancelView(AdminView):
    """POST : annule la publication programmée du catalogue."""

    def post(self, request):
        return ok(catalog.cancel_pending_catalog(request.user, '7-9'))


class Studio79CatalogRollbackView(AdminView):
    """POST {number} : restaure une ancienne version du catalogue."""

    def post(self, request):
        return ok(catalog.rollback_catalog(request.user, '7-9', request.data.get('number')))


class Studio79CatalogLessonCreateView(AdminView):
    """POST {moduleId, title} : crée une nouvelle leçon dans un module."""

    def post(self, request):
        return ok(catalog.create_lesson(request.user, request.data.get('moduleId'), request.data.get('title', 'Nouvelle leçon')))


class Studio79CatalogLessonDeleteView(AdminView):
    """DELETE : supprime une leçon si aucune progression élève n'existe, sinon 409."""

    def delete(self, request, lesson_id):
        return ok(catalog.delete_or_hide_lesson(request.user, lesson_id))


class Studio79CatalogLessonHideView(AdminView):
    """POST : bascule l'état masqué/affiché d'une leçon."""

    def post(self, request, lesson_id):
        return ok(catalog.toggle_hide_lesson(request.user, lesson_id))


class Studio79CatalogLessonDuplicateView(AdminView):
    """POST : duplique une leçon dans le même module."""

    def post(self, request, lesson_id):
        return ok(catalog.duplicate_lesson(request.user, lesson_id))


class Studio79CatalogModuleCreateView(AdminView):
    """POST {title, description, color, icon} : crée un nouveau module."""

    def post(self, request):
        return ok(catalog.create_module(
            request.user,
            title=request.data.get('title', 'Nouveau module'),
            description=request.data.get('description', ''),
            color=request.data.get('color', 'sun'),
            icon=request.data.get('icon', '🌟'),
        ))


class Studio79CatalogReorderView(AdminView):
    """POST {type: 'lessons'|'modules', ...} : réordonne les leçons d'un module ou les modules."""

    def post(self, request):
        if request.data.get('type') == 'modules':
            return ok(catalog.reorder_modules(request.user, request.data.get('moduleIds', [])))
        return ok(catalog.reorder_lessons(request.user, request.data.get('moduleId'), request.data.get('lessonIds', [])))


# ─── Vues Studio Items (T22 : Énigmes, Défis, Devoirs, Activités) ────────────

class StudioItemsListView(AdminView):
    """GET : liste tous les éléments d'un type (riddle, daily_challenge, mission, activity)."""

    def get(self, request, kind):
        return ok(studio_items.list_items(kind))


class StudioItemDetailView(AdminView):
    """GET : détail d'un élément (brouillon, en ligne, en attente, historique)."""

    def get(self, request, kind, key):
        return ok(studio_items.get_item(kind, key))


class StudioItemDraftView(AdminView):
    """PUT : enregistre le brouillon. DELETE : l'écarte."""

    def put(self, request, kind, key):
        return ok(studio_items.save_draft(request.user, kind, key, request.data.get('content'), request.data.get('note', '')))

    def delete(self, request, kind, key):
        return ok(studio_items.discard_draft(request.user, kind, key))


class StudioItemPublishView(AdminView):
    """POST : programme ou applique la publication d'un élément."""

    def post(self, request, kind, key):
        return ok(studio_items.publish(
            request.user, kind, key,
            note=request.data.get('note', ''),
            delay_minutes=request.data.get('delayMinutes'),
            immediate=bool(request.data.get('immediate')),
            acknowledge=bool(request.data.get('acknowledge')),
        ))


class StudioItemCancelView(AdminView):
    """POST : annule la publication programmée d'un élément."""

    def post(self, request, kind, key):
        return ok(studio_items.cancel_pending(request.user, kind, key))


class StudioItemRollbackView(AdminView):
    """POST {number} : restaure une ancienne version."""

    def post(self, request, kind, key):
        return ok(studio_items.rollback(request.user, kind, key, request.data.get('number')))


class StudioItemValidateView(AdminView):
    """POST {content} : valide un contenu sans l'enregistrer."""

    def post(self, request, kind, key):
        return ok({'issues': studio_items.validate_item(kind, key, request.data.get('content'))})


class StudioItemCreateView(AdminView):
    """POST {initialData} : crée un nouvel élément avec son brouillon."""

    def post(self, request, kind):
        return ok(studio_items.create_item(request.user, kind, request.data.get('initialData') or request.data), status.HTTP_201_CREATED)


class StudioItemToggleActiveView(AdminView):
    """POST : active ou désactive un élément."""

    def post(self, request, kind, key):
        return ok(studio_items.toggle_active(request.user, kind, key))

