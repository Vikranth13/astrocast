import "./App.css";

function App() {
  return (
    <main className="app">
      <div className="page-container">
        <section className="hero">
          <p className="eyebrow">AstroCast</p>
          <h1>Find out if tonight is good for stargazing.</h1>
          <p className="description">
            Enter a city to check sky conditions, weather, and a simple stargazing score.
          </p>
        </section>

        <section className="search-panel">
          <input type="text" placeholder="Enter city name..." />
          <button>Check Sky</button>
        </section>

        <section className="results-grid">
          <div className="card">
            <h2>Stargazing Score</h2>
            <p className="empty-value">-- / 100</p>
          </div>

          <div className="card">
            <h2>Conditions</h2>
            <p>Cloud Cover: --</p>
            <p>Rain Chance: --</p>
            <p>Wind Speed: --</p>
          </div>

          <div className="card">
            <h2>Explanation</h2>
            <p>
              Enter a city to see whether tonight is a good night for observing the sky.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;