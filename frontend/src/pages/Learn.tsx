import PageState from "../components/PageState";

function Learn() {
  return (
    <section className="page">
      <h1>Learn</h1>

      <p className="page-intro">
        What Kp, CMEs, solar flares, aurora, twilight, seeing,
        transparency, and moonlight actually mean.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "Concept cards are built on Day 6 of Week 4."
        }
      />
    </section>
  );
}

export default Learn;
