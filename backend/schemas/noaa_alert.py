from pydantic import BaseModel, Field


class NoaaAlertRecord(BaseModel):
    """
    Raw structured fields returned by NOAA
    alerts.json.
    """

    product_id: str = Field(
        min_length=1,
    )

    issue_datetime: str = Field(
        min_length=1,
    )

    message: str = Field(
        min_length=1,
    )