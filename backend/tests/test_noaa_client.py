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


class FailingSession:
    def get(
        self,
        url: str,
        timeout: int,
    ) -> FakeResponse:
        raise requests.ConnectionError(
            "Network unavailable"
        )


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
    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=FakeSession(
            FakeResponse(
                payload=None,
                status_code=503,
            )
        ),
    )

    with pytest.raises(
        NoaaSwpcClientError
    ) as captured_error:
        client.fetch_planetary_k_index()

    assert (
        captured_error.value.http_status_code
        == 503
    )


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
    client = NoaaSwpcClient(
        planetary_k_index_url=(
            "https://example.test/noaa"
        ),
        timeout_seconds=5,
        session=FailingSession(),
    )

    with pytest.raises(
        NoaaSwpcClientError,
        match="request failed",
    ):
        client.fetch_planetary_k_index()

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