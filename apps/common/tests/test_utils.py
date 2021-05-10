from apps.common.utils import normalize_slug


DEFAULT_MAX_SLUG_LENGTH = 50


def test_normalize_slug_name_only():
    assert len(normalize_slug("A name")) == 6
    assert len(normalize_slug(f"{'x' * 60}")) == DEFAULT_MAX_SLUG_LENGTH


def test_slug_with_supplied_slug():
    assert normalize_slug(name="No Name", slug="A Name") == "a-name"


def test_slug_with_name():
    assert (normalize_slug(name="A name not slug")) == "a-name-not-slug"


def test_custom_length_allowed():
    assert len(normalize_slug(f"{'x' * 60}", max_length=70)) == 60


def test_custom_length_enforced():
    assert len(normalize_slug(f"{'x' * 80}", max_length=70)) == 70
