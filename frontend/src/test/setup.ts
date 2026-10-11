import "@testing-library/jest-dom/vitest";

import {
  cleanup,
} from "@testing-library/react";

import {
  afterEach,
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

afterEach(() => {
  cleanup();
});
