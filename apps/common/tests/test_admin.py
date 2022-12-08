import pytest

from ..admin import prettify_json_field


@pytest.mark.parametrize("input", (None, {}, {"foo": "bar"}, {"foo": {"bar": "bizz"}}, True, []))
def test_prettify_json_field(input):
    output = prettify_json_field(input)
    assert isinstance(output, str)
    assert len(output)
    # minimal way to show some formatting happened and not just string conversion
    assert str(input) != output
