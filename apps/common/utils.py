def normalize_slug(slug, to_length=50):
    """Returns a string of len <= a supplied length.
    :param slug:
    :param to_length:
    :return: str
    """
    if not slug:
        return ""
    if len(slug) > to_length:
        slug = slug[:to_length].rstrip("-")
    return slug
