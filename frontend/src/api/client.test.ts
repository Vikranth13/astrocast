import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  API_BASE_URL,
  ApiRequestError,
  apiGet,
  buildApiUrl,
  resolveApiBaseUrl,
} from "./client";


const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});


function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

async function captureError(
  request: Promise<unknown>
): Promise<ApiRequestError> {
  try {
    await request;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected the request to fail.");
}


describe("resolveApiBaseUrl", () => {
  it("falls back to the local backend when nothing is configured", () => {
    expect(
      resolveApiBaseUrl(undefined)
    ).toBe("http://localhost:8000");

    expect(
      resolveApiBaseUrl("   ")
    ).toBe("http://localhost:8000");
  });

  it("strips trailing slashes so paths join cleanly", () => {
    expect(
      resolveApiBaseUrl("https://api.astrocast.test//")
    ).toBe("https://api.astrocast.test");
  });
});


describe("buildApiUrl", () => {
  it("joins the base URL and path", () => {
    expect(
      buildApiUrl("/api/space-weather/current")
    ).toBe(
      `${API_BASE_URL}/api/space-weather/current`
    );
  });

  it("encodes query parameters", () => {
    const url = new URL(
      buildApiUrl(
        "/forecast",
        {
          city: "São Paulo & Rio",
        }
      )
    );

    expect(
      url.searchParams.get("city")
    ).toBe("São Paulo & Rio");
  });

  it("leaves out unset parameters and keeps real values", () => {
    const url = new URL(
      buildApiUrl(
        "/api/space-weather/alerts",
        {
          severity: "G2",
          type: null,
          status: undefined,
          source: "",
          limit: 25,
        }
      )
    );

    expect(
      [...url.searchParams.keys()]
    ).toEqual([
      "severity",
      "limit",
    ]);

    expect(
      url.searchParams.get("limit")
    ).toBe("25");
  });
});


describe("apiGet", () => {
  it("requests the built URL and returns the parsed body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        count: 0,
        alerts: [],
      })
    );

    const body = await apiGet(
      "/api/space-weather/alerts",
      {
        params: {
          limit: 5,
        },
        fallbackMessage: "Failed.",
      }
    );

    expect(body).toEqual({
      count: 0,
      alerts: [],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/space-weather/alerts?limit=5`
    );
  });

  it("uses the message and code from the backend error envelope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "not_found",
            message: "No location found for city: Atlantis",
            details: null,
          },
        },
        404
      )
    );

    const error = await captureError(
      apiGet(
        "/forecast",
        {
          fallbackMessage: "Failed to fetch forecast.",
        }
      )
    );

    expect(error.message).toBe(
      "No location found for city: Atlantis"
    );

    expect(error.code).toBe("not_found");
    expect(error.status).toBe(404);
    expect(error.details).toBeNull();
  });

  it("keeps validation details from a 422 response", async () => {
    const details = [
      {
        loc: ["query", "severity"],
        msg: "Input should be 'G1', 'G2', 'G3'",
      },
    ];

    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "validation_error",
            message: "Request validation failed.",
            details,
          },
        },
        422
      )
    );

    const error = await captureError(
      apiGet(
        "/api/space-weather/alerts",
        {
          fallbackMessage: "Failed.",
        }
      )
    );

    expect(error.code).toBe("validation_error");
    expect(error.details).toEqual(details);
  });

  it("falls back when a failed response is not the standard envelope", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        "<html><body>Bad Gateway</body></html>",
        {
          status: 502,
        }
      )
    );

    const error = await captureError(
      apiGet(
        "/forecast",
        {
          fallbackMessage: "Failed to fetch forecast.",
        }
      )
    );

    expect(error.message).toBe(
      "Failed to fetch forecast."
    );

    expect(error.code).toBe("unexpected_response");
    expect(error.status).toBe(502);
  });

  it("reports a network failure when no response arrives", async () => {
    fetchMock.mockRejectedValue(
      new TypeError("Failed to fetch")
    );

    const error = await captureError(
      apiGet(
        "/api/space-weather/current",
        {
          fallbackMessage: "Failed.",
        }
      )
    );

    expect(error.code).toBe("network_error");
    expect(error.status).toBeNull();

    expect(error.message).toMatch(
      /could not be reached/
    );
  });

  it("reports a successful response whose body is not JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        "not json",
        {
          status: 200,
        }
      )
    );

    const error = await captureError(
      apiGet(
        "/api/space-weather/current",
        {
          fallbackMessage: "Failed.",
        }
      )
    );

    expect(error.code).toBe("invalid_response");
    expect(error.status).toBe(200);
  });
});
