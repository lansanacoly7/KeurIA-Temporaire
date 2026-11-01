from rest_framework import serializers


class EnrollSerializer(serializers.Serializer):
    students = serializers.ListField(
        child=serializers.DictField()
    )
