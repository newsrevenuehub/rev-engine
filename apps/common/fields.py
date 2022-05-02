from rest_framework import serializers


class SerializedOnReadElsePk(serializers.PrimaryKeyRelatedField):
    # hat-tip: https://stackoverflow.com/a/52246232
    def __init__(self, **kwargs):
        self.serializer = kwargs.pop("serializer", None)
        if all([self.serializer is not None, not issubclass(self.serializer, serializers.Serializer)]):
            raise TypeError('"serializer" is not a valid serializer class')
        super().__init__(**kwargs)

    def use_pk_only_optimization(self):
        return False if self.serializer else True

    def to_representation(self, instance):
        if self.serializer:
            return self.serializer(instance, context=self.context).data
        return super().to_representation(instance)
