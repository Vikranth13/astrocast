"""
Standard AstroCast API error contract.

Every error response the API returns uses this shape,
so clients can branch on a stable machine-readable
code instead of parsing prose.
"""

from typing import Any

from pydantic import BaseModel


class ApiError(BaseModel):
    """
    One error, described for both people and code.
    """

    code: str

    message: str

    details: Any | None = None


class ErrorResponse(BaseModel):
    """
    Envelope returned for every non-success response.
    """

    error: ApiError
