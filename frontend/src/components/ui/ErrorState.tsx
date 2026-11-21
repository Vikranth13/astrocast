import "./ui.css";

type ErrorStateProps = {
  message?: string;
  // Offered only when trying again could help. A missing record or a
  // rejected input would fail the same way every time.
  onRetry?: () => void;
};

const DEFAULT_MESSAGE =
  "Something went wrong.";

function ErrorState({
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="ui-state ui-state-error"
      role="alert"
    >
      <p>{message ?? DEFAULT_MESSAGE}</p>

      {onRetry && (
        <button
          type="button"
          className="ui-button-secondary ui-retry"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
