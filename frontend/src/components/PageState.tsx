import type {
  ReactNode,
} from "react";

import EmptyState from "./ui/EmptyState";
import ErrorState from "./ui/ErrorState";
import LoadingState from "./ui/LoadingState";

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

function PageState({
  status,
  loadingMessage,
  errorMessage,
  emptyMessage,
  children,
}: PageStateProps) {
  if (status === "loading") {
    return (
      <LoadingState
        message={loadingMessage}
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        message={errorMessage}
      />
    );
  }

  if (status === "empty") {
    return (
      <EmptyState
        message={emptyMessage}
      />
    );
  }

  return <>{children}</>;
}

export default PageState;
