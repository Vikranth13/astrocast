import "./ui.css";

type EmptyStateProps = {
  message?: string;
};

const DEFAULT_MESSAGE =
  "There is nothing to show yet.";

function EmptyState({
  message,
}: EmptyStateProps) {
  return (
    <div className="ui-state ui-state-empty">
      <p>{message ?? DEFAULT_MESSAGE}</p>
    </div>
  );
}

export default EmptyState;
