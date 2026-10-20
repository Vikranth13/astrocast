import "@testing-library/jest-dom/vitest";

import {
  cleanup,
} from "@testing-library/react";

import {
  afterEach,
  beforeEach,
  vi,
} from "vitest";

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom does not implement scrolling. The app shell scrolls to the top
// on navigation, so give tests a silent stand-in they can spy on.
Object.defineProperty(
  window,
  "scrollTo",
  {
    value: () => {},
    writable: true,
  }
);

// No test may reach the network, where a real server could answer. A
// test that needs a response mocks the API module or stubs fetch itself,
// which replaces this guard for that test.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(
      new TypeError("Network access is disabled in tests.")
    ))
  );
});

afterEach(() => {
  cleanup();

  vi.unstubAllGlobals();
});
