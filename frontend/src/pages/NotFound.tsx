import {
  Link,
} from "react-router";

import PageState from "../components/PageState";

function NotFound() {
  return (
    <section className="page">
      <h1>Page not found</h1>

      <p className="page-intro">
        That address is not part of AstroCast.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "Use the navigation above to get "
          + "back to a page that exists."
        }
      />

      <p>
        <Link to="/">
          Go to the dashboard
        </Link>
      </p>
    </section>
  );
}

export default NotFound;
