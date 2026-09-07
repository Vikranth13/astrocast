import PageState from "../components/PageState";

function SpaceWeather() {
  return (
    <section className="page">
      <h1>Space Weather</h1>

      <p className="page-intro">
        Current geomagnetic conditions from NOAA SWPC, shown with the
        measurements the interpretation is based on.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "Current condition cards are built on Day 5 of Week 4."
        }
      />
    </section>
  );
}

export default SpaceWeather;
