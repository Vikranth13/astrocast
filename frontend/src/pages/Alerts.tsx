import PageState from "../components/PageState";

function Alerts() {
  return (
    <section className="page">
      <h1>Alerts</h1>

      <p className="page-intro">
        NOAA watches, warnings, and alerts, with severity, source,
        issue time, expiration, and a plain-language explanation.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "The alert list and detail layout are built on Day 5 of Week 4."
        }
      />
    </section>
  );
}

export default Alerts;
