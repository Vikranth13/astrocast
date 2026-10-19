import type {
  ErrorResponse,
} from "./types/errors";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

const NETWORK_ERROR_MESSAGE =
  "The AstroCast server could not be reached. Check that the backend is running, then try again.";

const INVALID_RESPONSE_MESSAGE =
  "The AstroCast server sent a response that could not be read.";

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
// envelope, or one of network_error, unexpected_response, and
// invalid_response when it did not. status is null when no response
// arrived at all.
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

export type ApiGetOptions = {
  params?: QueryParams;
  // Shown only when a failed response does not carry the standard error
  // envelope. Otherwise the backend's own message is used.
  fallbackMessage: string;
};

// The only place in the application that calls fetch.
export async function apiGet<T>(
  path: string,
  {
    params,
    fallbackMessage,
  }: ApiGetOptions
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(
      buildApiUrl(path, params)
    );
  } catch {
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
    throw new ApiRequestError({
      message: INVALID_RESPONSE_MESSAGE,
      status: response.status,
      code: "invalid_response",
    });
  }
}
