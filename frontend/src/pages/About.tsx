import PageState from "../components/PageState";

function About() {
  return (
    <section className="page">
      <h1>About</h1>

      <p className="page-intro">
        What AstroCast is, where its data comes from, and what it
        deliberately does not claim.
      </p>

      <PageState
        status="empty"
        emptyMessage={
          "This page is written up as the rest of the platform lands."
        }
      />
    </section>
  );
}

export default About;
