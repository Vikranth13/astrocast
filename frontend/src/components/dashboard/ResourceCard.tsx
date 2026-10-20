import type {
  ReactNode,
} from "react";

import PageState from "../PageState";

import Card from "../ui/Card";

import type {
  ApiResource,
} from "../../hooks/useApiResource";

type ResourceCardProps<T> = {
  title: string;
  resource: ApiResource<T>;
  loadingMessage: string;
  idleMessage?: string;
  emptyMessage?: string;
  isEmpty?: (data: T) => boolean;
  className?: string;
  children: (data: T) => ReactNode;
};

// Holds a card's place while its own data source loads, fails, or comes
// back empty, keeping the card's title so the layout does not jump. Once
// the data is ready, the card itself takes over.
function ResourceCard<T>({
  title,
  resource,
  loadingMessage,
  idleMessage,
  emptyMessage,
  isEmpty,
  className,
  children,
}: ResourceCardProps<T>) {
  if (
    resource.status === "ready"
    && !isEmpty?.(resource.data)
  ) {
    return <>{children(resource.data)}</>;
  }

  return (
    <Card className={className}>
      <div className="ui-stack">
        <span className="ui-eyebrow">
          {title}
        </span>

        {resource.status === "idle" && (
          <PageState
            status="empty"
            emptyMessage={idleMessage}
          />
        )}

        {resource.status === "loading" && (
          <PageState
            status="loading"
            loadingMessage={loadingMessage}
          />
        )}

        {resource.status === "error" && (
          <PageState
            status="error"
            errorMessage={resource.message}
          />
        )}

        {resource.status === "ready" && (
          <PageState
            status="empty"
            emptyMessage={emptyMessage}
          />
        )}
      </div>
    </Card>
  );
}

export default ResourceCard;
