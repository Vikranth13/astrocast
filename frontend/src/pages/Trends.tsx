import PageState from "../components/PageState";

function Trends() {
  return (
    <section className="page">
      <h1>Trends</h1>

      <p className="page-intro">
        How geomagnetic activity and the solar wind have moved over
        the recent past.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "Mock time-series charts are built on Day 6 of Week 4."
        }
      />
    </section>
  );
}

export default Trends;
