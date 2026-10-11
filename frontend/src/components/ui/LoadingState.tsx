import "./ui.css";

type LoadingStateProps = {
  message?: string;
};

const DEFAULT_MESSAGE = "Loading...";

function LoadingState({
  message,
}: LoadingStateProps) {
  return (
    <div
      className="ui-state ui-state-loading"
      role="status"
      aria-live="polite"
    >
      <p>{message ?? DEFAULT_MESSAGE}</p>
    </div>
  );
}

export default LoadingState;
