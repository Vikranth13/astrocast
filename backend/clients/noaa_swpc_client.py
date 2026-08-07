from dataclasses import dataclass
from typing import Any

import requests

from config import settings


@dataclass(frozen=True)
class NoaaFetchResult:
    """
    Successful result from one NOAA SWPC HTTP request.
    """

    records: list[dict[str, Any]]
    http_status_code: int


class NoaaSwpcClientError(RuntimeError):
    """
    Raised when NOAA cannot be reached or returns
    an unusable response.
    """

    def __init__(
        self,
        message: str,
        http_status_code: int | None = None,
    ):
        super().__init__(message)

        self.http_status_code = http_status_code


class NoaaSwpcClient:
    """
    HTTP client for NOAA Space Weather Prediction
    Center products.
    """

    def __init__(
        self,
        planetary_k_index_url: str | None = None,
        timeout_seconds: int | None = None,
        session: requests.Session | None = None,
    ):
        self.planetary_k_index_url = (
            planetary_k_index_url
            or settings.noaa_planetary_k_index_url
        )

        self.timeout_seconds = (
            timeout_seconds
            or settings.noaa_request_timeout_seconds
        )

        self.session = session or requests.Session()

    def fetch_planetary_k_index(
        self,
    ) -> NoaaFetchResult:
        """
        Fetch observed NOAA planetary K-index data.
        """

        try:
            response = self.session.get(
                self.planetary_k_index_url,
                timeout=self.timeout_seconds,
            )

            response.raise_for_status()

        except requests.exceptions.RequestException as error:
            status_code = None

            if error.response is not None:
                status_code = (
                    error.response.status_code
                )

            raise NoaaSwpcClientError(
                message=(
                    "NOAA planetary K-index request "
                    f"failed: {error}"
                ),
                http_status_code=status_code,
            ) from error

        try:
            payload = response.json()

        except ValueError as error:
            raise NoaaSwpcClientError(
                message=(
                    "NOAA planetary K-index response "
                    "was not valid JSON."
                ),
                http_status_code=response.status_code,
            ) from error

        if not isinstance(payload, list):
            raise NoaaSwpcClientError(
                message=(
                    "NOAA planetary K-index response "
                    "must be a JSON array."
                ),
                http_status_code=response.status_code,
            )

        records: list[dict[str, Any]] = []

        for index, item in enumerate(payload):
            if not isinstance(item, dict):
                raise NoaaSwpcClientError(
                    message=(
                        "NOAA planetary K-index "
                        f"record {index} was not "
                        "a JSON object."
                    ),
                    http_status_code=(
                        response.status_code
                    ),
                )

            records.append(item)

        return NoaaFetchResult(
            records=records,
            http_status_code=response.status_code,
        )