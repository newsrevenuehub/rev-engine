from rest_framework import serializers


class E2ETestRunSerializer(serializers.Serializer):
    tests = serializers.ListField(child=serializers.CharField())
    commit_sha = serializers.CharField()
