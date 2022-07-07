from contextlib import contextmanager


class RedisMock:
    def __init__(self):
        self._data = {}

    def set(self, key, data, *args, **kwargs):
        self._data[key] = data

    def get(self, key):
        return self._data.get(key)

    @contextmanager
    def lock(self, *args, **kwargs):
        yield True
