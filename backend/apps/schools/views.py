from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


from .models import School
from .serializers import PublicSchoolSerializer


class PublicSchoolView(APIView):
    """GET /api/schools/<slug> — habillage public d'un espace école."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        # Une école suspendue n'a plus de page publique.
        school = get_object_or_404(School, slug=slug, suspended_at__isnull=True)
        return Response({"school": PublicSchoolSerializer(school).data})
