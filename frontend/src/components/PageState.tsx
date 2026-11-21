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
  onRetry?: () => void;
  children?: ReactNode;
};

function PageState({
  status,
  loadingMessage,
  errorMessage,
  emptyMessage,
  onRetry,
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
        onRetry={onRetry}
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
