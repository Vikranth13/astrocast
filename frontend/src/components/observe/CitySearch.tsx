import {
  useId,
  type FormEvent,
} from "react";

import "./observe.css";

type CitySearchProps = {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

// The city search used by both Observe Tonight and the Dashboard. It is a
// real form, so Enter submits it without a key handler.
function CitySearch({
  value,
  isLoading,
  onChange,
  onSubmit,
}: CitySearchProps) {
  const inputId = useId();

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    onSubmit();
  }

  return (
    <form
      className="observe-search"
      role="search"
      onSubmit={handleSubmit}
    >
      <label
        htmlFor={inputId}
        className="visually-hidden"
      >
        City
      </label>

      <input
        id={inputId}
        type="text"
        placeholder="Enter city name..."
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />

      <button
        type="submit"
        disabled={isLoading}
      >
        {isLoading
          ? "Checking..."
          : "Check Sky"}
      </button>
    </form>
  );
}

export default CitySearch;
