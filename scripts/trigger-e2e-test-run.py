#!/usr/bin/env python3
"""Trigger an E2E test run on the review app server."""

import logging
import os

import requests

AUTH_URL=f"{os.environ["SITE_URL"]}/api/v1/token/"
E2E_URL=f"{os.environ["SITE_URL"]}/api/v1/e2e/"
USERNAME=os.environ["REVIEW_APP_USERNAME"]
PASSWORD=os.environ["REVIEW_APP_PASSWORD"]
GH_TOKEN=os.environ["GITHUB_TOKEN"]
COMMIT_SHA=os.environ["HEROKU_SLUG_COMMIT"]
E2E_TESTS=["contribution_checkout"]

logger = logging.getLogger(__name__)


def authenticate_session(session: requests.Session) -> requests.Session:
    """Authenticate with the review app server and return the token."""
    logger.info("Authenticating with the review app server")
    response = requests.post(
        AUTH_URL,
        json={"username": USERNAME, "password": PASSWORD},
    )
    response.raise_for_status()
    session.headers["Authorization"] = f"Bearer {response.json()["token"]}"
    session.cookies = response.cookies
    return session


def trigger_e2e_test_run(session: requests.Session, tests: list[str] = E2E_TESTS, commit_sha: str = COMMIT_SHA, github_token: str = GH_TOKEN) -> requests.Response:
    """Trigger the E2E test run on the review app server."""
    logger.info("Triggering E2E test run with tests: %s", tests)
    response = session.post(
        E2E_URL,
        json={"commit_sha": commit_sha, "github_token": github_token, "tests": tests},
    )
    response.raise_for_status()
    return response

def main():
    """Auth then trigger E2E test run."""
    # TODO - Cache authenticate value so don't have to reauth per test run?
    session = authenticate_session(requests.Session())
    response = trigger_e2e_test_run(session)
    response.raise_for_status()
    logger.info("E2E test run triggered successfully")

    

