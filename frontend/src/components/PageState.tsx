import type {
  ReactNode,
} from "react";

import "./PageState.css";

export type PageStatus =
  | "loading"
  | "error"
  | "empty"
  | "ready";

type PageStateProps = {
  status: PageStatus;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  children?: ReactNode;
};

const DEFAULT_LOADING_MESSAGE =
  "Loading...";

const DEFAULT_ERROR_MESSAGE =
  "Something went wrong.";

const DEFAULT_EMPTY_MESSAGE =
  "There is nothing to show yet.";

function PageState({
  status,
  loadingMessage,
  errorMessage,
  emptyMessage,
  children,
}: PageStateProps) {
  if (status === "loading") {
    return (
      <div
        className="page-state page-state-loading"
        role="status"
        aria-live="polite"
      >
        <p>
          {loadingMessage
            ?? DEFAULT_LOADING_MESSAGE}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="page-state page-state-error"
        role="alert"
      >
        <p>
          {errorMessage
            ?? DEFAULT_ERROR_MESSAGE}
        </p>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="page-state page-state-empty">
        <p>
          {emptyMessage
            ?? DEFAULT_EMPTY_MESSAGE}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default PageState;
