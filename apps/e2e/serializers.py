from rest_framework import serializers

from apps.e2e import TESTS


class E2ETestRunSerializer(serializers.Serializer):
    tests = serializers.ListField(child=serializers.ChoiceField(choices=TESTS.keys()), allow_empty=False, required=True)
    commit_sha = serializers.CharField(required=False)
