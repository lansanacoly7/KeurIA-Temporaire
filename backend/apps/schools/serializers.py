import re

from rest_framework import serializers

from .models import School

HEX_COLOR = re.compile(r'#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?')


class PublicSchoolSerializer(serializers.ModelSerializer):
    """Habillage public d'une école : aucune donnée interne (e-mail du créateur…)."""

    primaryColor = serializers.CharField(source='primary_color')
    secondaryColor = serializers.CharField(source='secondary_color')
    accentColor = serializers.CharField(source='accent_color')

    class Meta:
        model = School
        fields = ['name', 'slug', 'motto', 'primaryColor', 'secondaryColor', 'accentColor']
