import {
  useState,
} from "react";

import ErrorState from "../ui/ErrorState";

import "./observe.css";

type ClearHistoryControlProps = {
  onConfirm: () => Promise<void>;
};

// Clearing deletes the shared history for good, so the button only asks
// first. Focus moves to Cancel, so pressing Enter by habit backs out
// instead of deleting.
function ClearHistoryControl({
  onConfirm,
}: ClearHistoryControlProps) {
  const [isConfirming, setIsConfirming] =
    useState(false);

  const [isClearing, setIsClearing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleConfirm() {
    setIsClearing(true);
    setErrorMessage("");

    try {
      await onConfirm();

      setIsConfirming(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The history could not be cleared."
      );
    } finally {
      setIsClearing(false);
    }
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        className="ui-button-secondary clear-history"
        onClick={() => setIsConfirming(true)}
      >
        Clear history
      </button>
    );
  }

  return (
    <div
      className="clear-history-confirm"
      role="group"
      aria-label="Confirm clearing the search history"
    >
      <p>
        Clear every recent search and earlier check? This cannot
        be undone, and it clears the history for everyone using this
        AstroCast server.
      </p>

      <div className="clear-history-actions">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isClearing}
        >
          {isClearing
            ? "Clearing..."
            : "Yes, clear history"}
        </button>

        <button
          type="button"
          className="ui-button-secondary"
          onClick={() => {
            setIsConfirming(false);
            setErrorMessage("");
          }}
          disabled={isClearing}
          autoFocus
        >
          Cancel
        </button>
      </div>

      {errorMessage && (
        <ErrorState message={errorMessage} />
      )}
    </div>
  );
}

export default ClearHistoryControl;
