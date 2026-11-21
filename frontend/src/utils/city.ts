// Whether two typed city names ask for the same place. The geocoder
// ignores case and surrounding spaces, so "denver " and "Denver" are one
// search, and the second would only repeat the first.
export function isSameCity(
  first: string,
  second: string
): boolean {
  return (
    first.trim().toLowerCase()
    === second.trim().toLowerCase()
  );
}
