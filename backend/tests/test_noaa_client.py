from typing import Any

import pytest
import requests

from clients.noaa_swpc_client import (
    NoaaSwpcClient,
    NoaaSwpcClientError,
)


SAMPLE_RECORD = {
    "time_tag": "2026-08-03T15:00:00",
    "Kp": 1.67,
    "a_running": 6,
    "station_count": 8,
}

SOLAR_WIND_SAMPLE_RECORD = {
    "time_tag": "2026-08-26T00:39:07",
    "active": True,
    "source": "SOLAR1",
    "proton_speed": 326.42,
    "proton_temperature": 33643,
    "proton_density": 3.8,
}


class FakeResponse:
    def __init__(
        self,
        payload: Any,
        status_code: int = 200,
        json_error: Exception | None = None,
    ):
        self.payload = payload
        self.status_code = status_code
        self.json_error = json_error

    def raise_for_status(self) -> None:
        if self.status_code < 400:
            return

        response = requests.Response()
        response.status_code = self.status_code
        response.url = (
            "https://example.test/noaa"
        )

        raise requests.HTTPError(
            f"{self.status_code} response",
            response=response,
        )

    def json(self) -> Any:
        if self.json_error is not None:
            raise self.json_error

        return self.payload


class FakeSession:
    def __init__(
        self,
        response: FakeResponse,
    ):
        self.response = response
        self.requested_url: str | None = None
        self.requested_timeout: int | None = None

    def get(
        self,
        url: str,
        timeout: int,
    ) -> FakeResponse:
        self.requested_url = url
        self.requested_timeout = timeout

        return self.response


class SequenceSession:
    """
    Returns a different response per attempt, so retry
    behaviour can be observed.
    """

    def __init__(
        self,
        responses: list[FakeResponse],
    ):
        self.responses = responses
        self.call_count = 0

    def get(
        self,
        url: str,
        timeout: int,
    ) -> FakeResponse:
        response = self.responses[
            self.call_count
        ]

        self.call_count += 1

        return response


class FailingSession:
    def __init__(self):
        self.call_count = 0

    def get(
        self,
        url: str,
        timeout: int,
    ) -> FakeResponse:
        self.call_count += 1

        raise requests.ConnectionError(
            "Network unavailable"
        )


class RecordingSleep:
    """
    Stands in for time.sleep so tests never wait.
    """

    def __init__(self):
        self.delays: list[float] = []

    def __call__(
        self,
        seconds: float,
    ) -> None:
        self.delays.append(seconds)


def test_client_returns_valid_records() -> None:
    fake_session = FakeSession(
        FakeResponse([SAMPLE_RECORD])
    )

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=fake_session,
    )

    result = (
        client.fetch_planetary_k_index()
    )

    assert result.http_status_code == 200
    assert result.records == [SAMPLE_RECORD]

    assert (
        fake_session.requested_url
        == "https://example.test/noaa"
    )

    assert (
        fake_session.requested_timeout
        == 5
    )


def test_client_rejects_http_failure() -> None:
    session = SequenceSession(
        [
            FakeResponse(
                payload=None,
                status_code=503,
            )
        ]
        * 3
    )

    sleep = RecordingSleep()

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=2,
        retry_backoff_seconds=0.5,
        sleep=sleep,
    )

    with pytest.raises(
        NoaaSwpcClientError
    ) as captured_error:
        client.fetch_planetary_k_index()

    assert (
        captured_error.value.http_status_code
        == 503
    )

    # One initial attempt plus two retries.
    assert session.call_count == 3


def test_client_rejects_invalid_json() -> None:
    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=FakeSession(
            FakeResponse(
                payload=None,
                json_error=ValueError(
                    "Invalid JSON"
                ),
            )
        ),
    )

    with pytest.raises(
        NoaaSwpcClientError,
        match="not valid JSON",
    ):
        client.fetch_planetary_k_index()


def test_client_rejects_non_array_payload() -> None:
    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=FakeSession(
            FakeResponse(
                {
                    "unexpected": "object",
                }
            )
        ),
    )

    with pytest.raises(
        NoaaSwpcClientError,
        match="must be a JSON array",
    ):
        client.fetch_planetary_k_index()


def test_client_converts_network_error() -> None:
    session = FailingSession()

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=2,
        sleep=RecordingSleep(),
    )

    with pytest.raises(
        NoaaSwpcClientError,
        match="request failed",
    ):
        client.fetch_planetary_k_index()

    assert session.call_count == 3

def test_client_returns_solar_wind_records(
) -> None:
    fake_session = FakeSession(
        FakeResponse(
            [SOLAR_WIND_SAMPLE_RECORD]
        )
    )

    client = NoaaSwpcClient(
        solar_wind_url=(
            "https://example.test/solar-wind"
        ),
        timeout_seconds=5,
        session=fake_session,
    )

    result = client.fetch_solar_wind()

    assert result.http_status_code == 200

    assert result.records == [
        SOLAR_WIND_SAMPLE_RECORD
    ]

    assert (
        fake_session.requested_url
        == "https://example.test/solar-wind"
    )

    assert (
        fake_session.requested_timeout
        == 5
    )

# -------------------------------------------------
# Retry behaviour
#
# Retries exist for transient upstream failures only.
# A deterministic failure must not be retried, or the
# client just burns the timeout budget before
# reporting the same error.
# -------------------------------------------------

def test_client_retries_transient_failure_then_succeeds(
) -> None:
    session = SequenceSession(
        [
            FakeResponse(
                payload=None,
                status_code=503,
            ),
            FakeResponse(
                payload=None,
                status_code=503,
            ),
            FakeResponse([SAMPLE_RECORD]),
        ]
    )

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=2,
        sleep=RecordingSleep(),
    )

    result = (
        client.fetch_planetary_k_index()
    )

    assert result.records == [SAMPLE_RECORD]
    assert session.call_count == 3


def test_client_does_not_retry_client_error(
) -> None:
    session = SequenceSession(
        [
            FakeResponse(
                payload=None,
                status_code=404,
            )
        ]
    )

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=2,
        sleep=RecordingSleep(),
    )

    with pytest.raises(
        NoaaSwpcClientError
    ) as captured_error:
        client.fetch_planetary_k_index()

    assert (
        captured_error.value.http_status_code
        == 404
    )

    assert session.call_count == 1


def test_client_retries_rate_limiting(
) -> None:
    session = SequenceSession(
        [
            FakeResponse(
                payload=None,
                status_code=429,
            ),
            FakeResponse([SAMPLE_RECORD]),
        ]
    )

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=2,
        sleep=RecordingSleep(),
    )

    result = (
        client.fetch_planetary_k_index()
    )

    assert result.records == [SAMPLE_RECORD]
    assert session.call_count == 2


def test_client_does_not_retry_malformed_payload(
) -> None:
    """
    A body that is not JSON will not become JSON on a
    second attempt.
    """

    session = SequenceSession(
        [
            FakeResponse(
                payload=None,
                json_error=ValueError(
                    "Invalid JSON"
                ),
            )
        ]
    )

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=2,
        sleep=RecordingSleep(),
    )

    with pytest.raises(
        NoaaSwpcClientError,
        match="not valid JSON",
    ):
        client.fetch_planetary_k_index()

    assert session.call_count == 1


def test_client_backs_off_exponentially(
) -> None:
    session = FailingSession()

    sleep = RecordingSleep()

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=3,
        retry_backoff_seconds=0.5,
        sleep=sleep,
    )

    with pytest.raises(
        NoaaSwpcClientError
    ):
        client.fetch_planetary_k_index()

    assert sleep.delays == [0.5, 1.0, 2.0]


def test_retries_can_be_disabled(
) -> None:
    session = FailingSession()

    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=session,
        max_retries=0,
        sleep=RecordingSleep(),
    )

    with pytest.raises(
        NoaaSwpcClientError
    ):
        client.fetch_planetary_k_index()

    assert session.call_count == 1
