"""
Shared test setup.

No test may reach the real PostgreSQL database. A route that asks for a
session gets one that fails every query as if the database were down,
unless the test installs its own. Tests that need stored data supply a
fake session, as the outage tests in test_error_handling.py do.
"""

import pytest
from sqlalchemy.exc import OperationalError

import main
from database import get_db


class UnavailableDatabase:
    """
    A session whose every operation fails like a lost connection.
    """

    def __getattr__(self, name):
        def fail(*args, **kwargs):
            raise OperationalError(
                "test session",
                None,
                ConnectionError(
                    "Tests do not use the real database."
                ),
            )

        return fail


def unavailable_database():
    yield UnavailableDatabase()


@pytest.fixture(autouse=True)
def keep_tests_off_the_real_database():
    main.app.dependency_overrides[
        get_db
    ] = unavailable_database

    yield

    main.app.dependency_overrides.pop(
        get_db,
        None,
    )
