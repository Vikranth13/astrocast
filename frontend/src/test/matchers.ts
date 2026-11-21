import {
  expect,
} from "vitest";

// The options every client call receives from a page: a signal the page
// can abort when the request is no longer wanted. Asserting it proves the
// request can be cancelled, not only that it was made.
export const WITH_SIGNAL = expect.objectContaining({
  signal: expect.any(AbortSignal),
});
