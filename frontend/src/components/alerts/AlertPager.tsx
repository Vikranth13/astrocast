import {
  Link,
} from "react-router";

import "./alerts.css";

type AlertPagerProps = {
  page: number;
  pageCount: number;
  searchForPage: (page: number) => string;
};

// Previous and Next are links, not buttons, because each page has its own
// address. That keeps the page shareable and lets the browser's back
// button step through pages.
function AlertPager({
  page,
  pageCount,
  searchForPage,
}: AlertPagerProps) {
  return (
    <nav
      className="alert-pager"
      aria-label="Alert pages"
    >
      {page > 1 ? (
        <Link
          className="ui-button-secondary alert-pager-link"
          to={{
            search: searchForPage(page - 1),
          }}
        >
          Previous
        </Link>
      ) : (
        <span
          className="alert-pager-placeholder"
          aria-hidden="true"
        />
      )}

      <span className="ui-caption">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link
          className="ui-button-secondary alert-pager-link"
          to={{
            search: searchForPage(page + 1),
          }}
        >
          Next
        </Link>
      ) : (
        <span
          className="alert-pager-placeholder"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}

export default AlertPager;
