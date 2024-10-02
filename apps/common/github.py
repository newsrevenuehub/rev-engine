from django.conf import settings

from github import Auth, Github


def get_github_client() -> Github:
    """Return a GitHub client."""
    auth = Auth.Token(settings.GITHUB_TOKEN)
    return Github(auth=auth)
