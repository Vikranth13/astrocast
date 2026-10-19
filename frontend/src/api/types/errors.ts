// Mirrors backend/schemas/errors.py. Every non-success response from the
// API uses this envelope, whichever route or exception produced it.

export type ApiError = {
  code: string;
  message: string;
  details: unknown;
};

export type ErrorResponse = {
  error: ApiError;
};
