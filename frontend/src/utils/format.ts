const SOURCE_LABELS: Record<string, string> = {
  NOAA_SWPC: "NOAA SWPC",
};

function pad(
  value: number
): string {
  return String(value).padStart(2, "0");
}

// Mirrors format_timestamp in the backend explanation service, so a
// timestamp field and the explanation sentence beneath it never show
// the same moment in two different formats.
export function formatUtc(
  timestamp: string
): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Built by hand rather than with Intl, whose short month names differ
// between ICU versions ("Sep" against "Sept"). That would make chart
// labels, and the tests on them, depend on the Node or browser build.
export function formatUtcDay(
  timestamp: string
): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function formatSource(
  source: string
): string {
  return SOURCE_LABELS[source] ?? source;
}
