import type {
  ErrorResponse,
} from "./types/errors";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

const NETWORK_ERROR_MESSAGE =
  "The AstroCast server could not be reached. Check that the backend is running, then try again.";

const INVALID_RESPONSE_MESSAGE =
  "The AstroCast server sent a response that could not be read.";

const CANCELLED_MESSAGE =
  "The request was cancelled because a newer one replaced it.";

// Failures that might succeed if the same request is made again: the
// server or a source it depends on was unreachable or failed, or the
// reply could not be read. A missing record (not_found) or a rejected
// input (validation_error) would fail the same way every time, so those
// are left out.
const RETRYABLE_ERROR_CODES = new Set([
  "network_error",
  "unexpected_response",
  "invalid_response",
  "internal_error",
  "service_unavailable",
  "upstream_unavailable",
  "upstream_timeout",
]);

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type QueryParams = Record<string, QueryValue>;

type ApiRequestErrorInit = {
  message: string;
  status: number | null;
  code: string;
  details?: unknown;
};

// One error type for every failed request. code is the backend's
// machine-readable error code when the response carried the standard
// envelope, or one of network_error, unexpected_response,
// invalid_response, and cancelled when it did not. status is null when
// no response arrived at all.
export class ApiRequestError extends Error {
  readonly status: number | null;

  readonly code: string;

  readonly details: unknown;

  constructor({
    message,
    status,
    code,
    details = null,
  }: ApiRequestErrorInit) {
    super(message);

    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function resolveApiBaseUrl(
  configured: string | undefined
): string {
  const baseUrl =
    configured?.trim() || DEFAULT_API_BASE_URL;

  return baseUrl.replace(/\/+$/, "");
}

// Set VITE_API_BASE_URL in frontend/.env to point the app at a backend
// somewhere other than the local default.
export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL
);

// Empty values are left out rather than sent as empty strings, so an
// unset filter means "no filter" to the backend instead of failing its
// validation.
export function buildApiUrl(
  path: string,
  params: QueryParams = {}
): string {
  const query = new URLSearchParams();

  for (const [name, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    query.append(name, String(value));
  }

  const queryString = query.toString();

  return queryString
    ? `${API_BASE_URL}${path}?${queryString}`
    : `${API_BASE_URL}${path}`;
}

function isErrorResponse(
  body: unknown
): body is ErrorResponse {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const { error } = body as {
    error?: unknown;
  };

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message } = error as {
    code?: unknown;
    message?: unknown;
  };

  return (
    typeof code === "string" &&
    typeof message === "string"
  );
}

async function readErrorResponse(
  response: Response,
  fallbackMessage: string
): Promise<ApiRequestError> {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    // A proxy or a crashed server can answer with HTML or an empty body.
  }

  if (isErrorResponse(body)) {
    return new ApiRequestError({
      message: body.error.message,
      status: response.status,
      code: body.error.code,
      details: body.error.details ?? null,
    });
  }

  return new ApiRequestError({
    message: fallbackMessage,
    status: response.status,
    code: "unexpected_response",
  });
}

// What every client function accepts. Aborting the signal cancels the
// request, for example when a newer search replaces it.
export type RequestOptions = {
  signal?: AbortSignal;
};

export type ApiRequestOptions = RequestOptions & {
  params?: QueryParams;
  // Shown only when a failed response does not carry the standard error
  // envelope. Otherwise the backend's own message is used.
  fallbackMessage: string;
};

type ApiMethod =
  | "GET"
  | "DELETE";

function cancelledError(): ApiRequestError {
  return new ApiRequestError({
    message: CANCELLED_MESSAGE,
    status: null,
    code: "cancelled",
  });
}

// True when a request was cancelled on purpose. Callers ignore these:
// nobody is waiting for the answer any more.
export function isCancelled(
  error: unknown
): boolean {
  return (
    error instanceof ApiRequestError
    && error.code === "cancelled"
  );
}

// True when asking again could plausibly work. An error that did not come
// from the API client is treated as retryable, since its cause is unknown.
export function isRetryable(
  error: unknown
): boolean {
  if (!(error instanceof ApiRequestError)) {
    return true;
  }

  return RETRYABLE_ERROR_CODES.has(error.code);
}

// The only place in the application that calls fetch. Every method
// shares the same error handling, so a failed delete reads exactly like
// a failed read.
async function apiRequest<T>(
  method: ApiMethod,
  path: string,
  {
    params,
    fallbackMessage,
    signal,
  }: ApiRequestOptions
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(
      buildApiUrl(path, params),
      signal
        ? {
          method,
          signal,
        }
        : {
          method,
        }
    );
  } catch {
    // fetch rejects the same way for a cancelled request and a dropped
    // connection. The signal says which one it was.
    if (signal?.aborted) {
      throw cancelledError();
    }

    throw new ApiRequestError({
      message: NETWORK_ERROR_MESSAGE,
      status: null,
      code: "network_error",
    });
  }

  if (!response.ok) {
    throw await readErrorResponse(
      response,
      fallbackMessage
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    // Cancelling while the body is still arriving also lands here.
    if (signal?.aborted) {
      throw cancelledError();
    }

    throw new ApiRequestError({
      message: INVALID_RESPONSE_MESSAGE,
      status: response.status,
      code: "invalid_response",
    });
  }
}

export function apiGet<T>(
  path: string,
  options: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(
    "GET",
    path,
    options
  );
}

export function apiDelete<T>(
  path: string,
  options: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(
    "DELETE",
    path,
    options
  );
}
