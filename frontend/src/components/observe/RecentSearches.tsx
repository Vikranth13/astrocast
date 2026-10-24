import type {
  RecentSearch,
} from "../../api/types/observe";

import {
  formatLocalTime,
  formatUtc,
} from "../../utils/format";

import "./observe.css";

type RecentSearchesProps = {
  searches: RecentSearch[];
  disabled: boolean;
  onSelect: (city: string) => void;
};

function placeName(
  search: RecentSearch
): string {
  const { name, region } = search.location;

  return region ? `${name}, ${region}` : name;
}

// Each entry searches its city again. The score shown is from the last
// check, labelled with when it was made, so it is not read as current.
function RecentSearches({
  searches,
  disabled,
  onSelect,
}: RecentSearchesProps) {
  return (
    <ul
      className="recent-searches"
      aria-label="Recent searches"
    >
      {searches.map((search) => (
        <li key={search.location.id}>
          <button
            type="button"
            className="ui-button-secondary recent-search"
            disabled={disabled}
            onClick={() =>
              onSelect(search.location.name)
            }
          >
            <span className="recent-search-place">
              {placeName(search)}
            </span>

            <span className="ui-caption">
              {search.latest.score} {search.latest.rating},
              checked {formatUtc(search.latest.retrieved_at)} for{" "}
              {formatLocalTime(search.latest.forecast_time)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default RecentSearches;
