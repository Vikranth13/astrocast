import "./ui.css";

type ErrorStateProps = {
  message?: string;
};

const DEFAULT_MESSAGE =
  "Something went wrong.";

function ErrorState({
  message,
}: ErrorStateProps) {
  return (
    <div
      className="ui-state ui-state-error"
      role="alert"
    >
      <p>{message ?? DEFAULT_MESSAGE}</p>
    </div>
  );
}

export default ErrorState;
