"""
Vues API pour le Studio de Contenus pédagogiques (Super Admin).
"""
from rest_framework import status
from rest_framework.response import Response
from .views import AdminView, ok
from . import curriculum_service as cs


class StudioTracksView(AdminView):
    """GET /api/superadmin/curriculum/tracks : liste des parcours, mondes et leçons."""
    def get(self, request):
        return ok(cs.list_curriculum_studio())


class StudioModuleSaveView(AdminView):
    """POST /api/superadmin/curriculum/modules : créer ou modifier un module."""
    def post(self, request):
        try:
            result = cs.save_module(request.user, request.data)
            return ok(result, status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StudioLessonDetailView(AdminView):
    """
    GET /api/superadmin/curriculum/lessons/<str:lesson_id>
    PATCH /api/superadmin/curriculum/lessons/<str:lesson_id>
    DELETE /api/superadmin/curriculum/lessons/<str:lesson_id>
    """
    def get(self, request, lesson_id):
        return ok(cs.get_lesson_detail(lesson_id))

    def patch(self, request, lesson_id):
        try:
            data = dict(request.data)
            data['id'] = lesson_id
            result = cs.save_lesson(request.user, data)
            return ok(result, status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, lesson_id):
        return ok(cs.delete_lesson(request.user, lesson_id))


class StudioLessonCreateView(AdminView):
    """POST /api/superadmin/curriculum/lessons : créer une nouvelle leçon."""
    def post(self, request):
        try:
            result = cs.save_lesson(request.user, request.data)
            return ok(result, status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StudioLessonReorderView(AdminView):
    """POST /api/superadmin/curriculum/lessons/<str:lesson_id>/reorder : monter ou descendre une leçon."""
    def post(self, request, lesson_id):
        try:
            return ok(cs.reorder_lesson(request.user, lesson_id, request.data.get('direction', 'up')))
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StudioLessonDuplicateView(AdminView):
    """POST /api/superadmin/curriculum/lessons/<str:lesson_id>/duplicate : dupliquer une leçon."""
    def post(self, request, lesson_id):
        return ok(cs.duplicate_lesson(request.user, lesson_id), status.HTTP_201_CREATED)

