import PageState from "../components/PageState";

function Dashboard() {
  return (
    <section className="page">
      <h1>Dashboard</h1>

      <p className="page-intro">
        Tonight at a glance: observing status, the best window,
        the Moon, geomagnetic risk, the latest alert, and mini trends.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "The combined dashboard is built on Day 3 of Week 4."
        }
      />
    </section>
  );
}

export default Dashboard;
