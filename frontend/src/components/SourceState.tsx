import type {
  ReactNode,
} from "react";

import ErrorState from "./ui/ErrorState";
import LoadingState from "./ui/LoadingState";

import type {
  ApiResource,
} from "../hooks/useApiResource";

type SourceStateProps<T> = {
  resource: ApiResource<T>;
  loadingMessage: string;
  children: (data: T) => ReactNode;
};

// Shows one data source's loading or error message in place of its
// content, so each section of a page waits for, and fails with, its own
// request only.
function SourceState<T>({
  resource,
  loadingMessage,
  children,
}: SourceStateProps<T>) {
  if (resource.status === "ready") {
    return <>{children(resource.data)}</>;
  }

  if (resource.status === "error") {
    return <ErrorState message={resource.message} />;
  }

  return <LoadingState message={loadingMessage} />;
}

export default SourceState;
