"""
Global exception handling for the AstroCast API.

Routes and services raise ordinary exceptions. This
module is the single place that decides what those
become on the wire, so the error contract cannot drift
between endpoints.

Internal failures are deliberately opaque to the
client. The traceback is logged on the server and the
caller receives a generic message.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import (
    HTTPException as StarletteHTTPException,
)

from clients.noaa_swpc_client import (
    NoaaSwpcClientError,
)
from schemas.errors import ApiError, ErrorResponse
from services.noaa_ingestion_service import (
    NoaaIngestionDatabaseError,
    NoaaIngestionError,
    NoaaIngestionExternalError,
)


logger = logging.getLogger(__name__)


STATUS_CODE_TO_ERROR_CODE = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
    500: "internal_error",
    502: "upstream_unavailable",
    503: "service_unavailable",
    504: "upstream_timeout",
}

DEFAULT_CLIENT_ERROR_CODE = "bad_request"

DEFAULT_SERVER_ERROR_CODE = "internal_error"

INTERNAL_ERROR_MESSAGE = (
    "An unexpected internal error occurred."
)

UPSTREAM_ERROR_MESSAGE = (
    "An upstream space-weather source could not be "
    "reached. Previously stored data is still "
    "available."
)

INGESTION_UPSTREAM_MESSAGE = (
    "The ingestion run could not reach NOAA. The "
    "attempt was recorded in the fetch log, and "
    "previously stored data is still available."
)


def error_code_for_status(
    status_code: int,
) -> str:
    """
    Map an HTTP status code to a stable error code.
    """

    known_code = STATUS_CODE_TO_ERROR_CODE.get(
        status_code
    )

    if known_code is not None:
        return known_code

    if status_code < 500:
        return DEFAULT_CLIENT_ERROR_CODE

    return DEFAULT_SERVER_ERROR_CODE


def build_error_response(
    status_code: int,
    message: str,
    code: str | None = None,
    details: object | None = None,
) -> JSONResponse:
    """
    Render the standard error envelope.
    """

    payload = ErrorResponse(
        error=ApiError(
            code=(
                code
                or error_code_for_status(
                    status_code
                )
            ),
            message=message,
            details=details,
        )
    )

    return JSONResponse(
        status_code=status_code,
        content=payload.model_dump(),
    )


def register_exception_handlers(
    app: FastAPI,
) -> None:
    """
    Attach every AstroCast exception handler to the
    application.
    """

    @app.exception_handler(
        StarletteHTTPException
    )
    async def handle_http_exception(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        """
        Convert raised HTTPExceptions, including the
        ones FastAPI raises itself, into the standard
        envelope.
        """

        return build_error_response(
            status_code=exc.status_code,
            message=str(exc.detail),
        )

    @app.exception_handler(
        RequestValidationError
    )
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """
        Report rejected query parameters and request
        bodies, keeping the per-field detail that
        makes a 422 actionable.
        """

        return build_error_response(
            status_code=422,
            code="validation_error",
            message=(
                "Request validation failed."
            ),
            details=jsonable_encoder(
                exc.errors()
            ),
        )

    @app.exception_handler(
        NoaaIngestionExternalError
    )
    async def handle_ingestion_external_error(
        request: Request,
        exc: NoaaIngestionExternalError,
    ) -> JSONResponse:
        """
        An ingestion run could not reach NOAA.

        The fetch log has already recorded the
        failure by the time this runs.
        """

        # The underlying exception carries connection
        # internals and library object reprs. Those
        # belong in the log, not in a response from an
        # unauthenticated endpoint.
        logger.warning(
            "NOAA ingestion failed upstream: %s",
            exc,
        )

        return build_error_response(
            status_code=502,
            code="upstream_unavailable",
            message=INGESTION_UPSTREAM_MESSAGE,
        )

    @app.exception_handler(
        NoaaSwpcClientError
    )
    async def handle_noaa_client_error(
        request: Request,
        exc: NoaaSwpcClientError,
    ) -> JSONResponse:
        """
        A NOAA request failed outside the ingestion
        service. Stored data is unaffected.
        """

        logger.warning(
            "NOAA request failed: %s",
            exc,
        )

        return build_error_response(
            status_code=502,
            code="upstream_unavailable",
            message=UPSTREAM_ERROR_MESSAGE,
        )

    @app.exception_handler(
        NoaaIngestionDatabaseError
    )
    async def handle_ingestion_database_error(
        request: Request,
        exc: NoaaIngestionDatabaseError,
    ) -> JSONResponse:
        """
        Ingestion reached NOAA but could not persist
        the result.
        """

        logger.exception(
            "NOAA ingestion database failure",
        )

        return build_error_response(
            status_code=500,
            code="database_error",
            message=str(exc),
        )

    @app.exception_handler(
        NoaaIngestionError
    )
    async def handle_ingestion_error(
        request: Request,
        exc: NoaaIngestionError,
    ) -> JSONResponse:
        """
        Any other ingestion failure.
        """

        logger.exception(
            "NOAA ingestion failure",
        )

        return build_error_response(
            status_code=500,
            message=str(exc),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """
        Last resort.

        The traceback is logged. The client is told
        only that something went wrong, so internal
        details never leak into an API response.
        """

        logger.exception(
            "Unhandled error on %s %s",
            request.method,
            request.url.path,
        )

        return build_error_response(
            status_code=500,
            message=INTERNAL_ERROR_MESSAGE,
        )
