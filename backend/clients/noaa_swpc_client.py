import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import requests

from config import settings


# Transient conditions worth a second attempt. A 4xx
# other than 429, malformed JSON, or a wrong payload
# shape is deterministic: retrying only burns the
# timeout budget and delays the error.
RETRYABLE_STATUS_CODES = frozenset(
    {429, 500, 502, 503, 504}
)


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
        alerts_url: str | None = None,
        solar_wind_url: str | None = None,
        max_retries: int | None = None,
        retry_backoff_seconds: float | None = None,
        sleep: Callable[[float], None] | None = None,
    ):
        self.planetary_k_index_url = (
            planetary_k_index_url
            or settings.noaa_planetary_k_index_url
        )

        self.alerts_url = (
            alerts_url
            or settings.noaa_alerts_url
        )

        self.timeout_seconds = (
            timeout_seconds
            or settings.noaa_request_timeout_seconds
        )

        self.solar_wind_url = (
            solar_wind_url
            or settings.noaa_solar_wind_url
        )

        self.session = session or requests.Session()

        self.max_retries = (
            max_retries
            if max_retries is not None
            else settings.noaa_max_retries
        )

        self.retry_backoff_seconds = (
            retry_backoff_seconds
            if retry_backoff_seconds is not None
            else settings.noaa_retry_backoff_seconds
        )

        # Injected so tests do not wait in real time.
        self.sleep = sleep or time.sleep

    def _is_retryable(
        self,
        error: Exception,
        status_code: int | None,
    ) -> bool:
        """
        Decide whether a failed request is worth
        another attempt.
        """

        if isinstance(
            error,
            (
                requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
            ),
        ):
            return True

        return (
            status_code
            in RETRYABLE_STATUS_CODES
        )

    def _request_with_retries(
        self,
        url: str,
        product_name: str,
    ):
        """
        Perform the HTTP request, retrying transient
        failures with exponential backoff.

        Raises NoaaSwpcClientError once the failure is
        not retryable or the attempts are exhausted,
        reporting the status code of the final
        attempt.
        """

        attempt = 0

        while True:
            try:
                response = self.session.get(
                    url,
                    timeout=self.timeout_seconds,
                )

                response.raise_for_status()

                return response

            except requests.exceptions.RequestException as error:
                status_code = None

                if error.response is not None:
                    status_code = (
                        error.response.status_code
                    )

                exhausted = (
                    attempt >= self.max_retries
                )

                if exhausted or not self._is_retryable(
                    error,
                    status_code,
                ):
                    raise NoaaSwpcClientError(
                        message=(
                            f"NOAA {product_name} "
                            f"request failed: {error}"
                        ),
                        http_status_code=status_code,
                    ) from error

                attempt += 1

                self.sleep(
                    self.retry_backoff_seconds
                    * (2 ** (attempt - 1))
                )

    def _fetch_json_array(
        self,
        url: str,
        product_name: str,
    ) -> NoaaFetchResult:
        response = self._request_with_retries(
            url=url,
            product_name=product_name,
        )

        try:
            payload = response.json()

        except ValueError as error:
            raise NoaaSwpcClientError(
                message=(
                    f"NOAA {product_name} response "
                    "was not valid JSON."
                ),
                http_status_code=response.status_code,
            ) from error

        if not isinstance(payload, list):
            raise NoaaSwpcClientError(
                message=(
                    f"NOAA {product_name} response "
                    "must be a JSON array."
                ),
                http_status_code=response.status_code,
            )

        records: list[dict[str, Any]] = []

        for index, item in enumerate(payload):
            if not isinstance(item, dict):
                raise NoaaSwpcClientError(
                    message=(
                        f"NOAA {product_name} "
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

    def fetch_planetary_k_index(
        self,
    ) -> NoaaFetchResult:
        """
        Fetch observed NOAA planetary K-index data.
        """

        return self._fetch_json_array(
            url=self.planetary_k_index_url,
            product_name="planetary K-index",
        )

    def fetch_alerts(
        self,
    ) -> NoaaFetchResult:
        """
        Fetch NOAA SWPC alert notifications.
        """

        return self._fetch_json_array(
            url=self.alerts_url,
            product_name="alerts",
        )

    def fetch_solar_wind(
        self,
    ) -> NoaaFetchResult:
        """
        Fetch NOAA real-time solar-wind plasma data.
        """

        return self._fetch_json_array(
            url=self.solar_wind_url,
            product_name="solar wind",
        )