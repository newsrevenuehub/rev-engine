from django.utils.text import slugify


def normalize_slug(name, slug="", max_length=50):
    """Returns a string of length less than or equal to the max_length.
    :param name: str:  a character string that can be slugified.
    :param slug: str:  a slug value.
    :param max_length: int: maximum length of slug.
    :return: str
    """
    slug = slugify(slug, allow_unicode=True)
    if not slug:
        slug = slugify(name, allow_unicode=True)

    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")
    return slug
