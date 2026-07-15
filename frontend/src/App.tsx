import { useState } from "react";
import "./App.css";
import { getForecast, type AstroCastForecast } from "./api/astrocastApi";

function App() {
  const [city, setCity] = useState("");
  const [forecast, setForecast] = useState<AstroCastForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheckSky() {
    const trimmedCity = city.trim();

    if (!trimmedCity) {
      setErrorMessage("Please enter a city.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setForecast(null);

      const data = await getForecast(trimmedCity);
      setForecast(data);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong.");
      }
    } finally {
      setIsLoading(false);
    }
  }

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
          <input
            type="text"
            placeholder="Enter city name..."
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          <button onClick={handleCheckSky} disabled={isLoading}>
            {isLoading ? "Checking..." : "Check Sky"}
          </button>
        </section>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <section className="results-grid">
          <div className="card">
            <h2>Stargazing Score</h2>
            <p className="empty-value">
              {forecast ? `${forecast.stargazing.score} / 100` : "-- / 100"}
            </p>
            <p>{forecast ? forecast.stargazing.rating : "Enter a city to begin."}</p>
          </div>

          <div className="card">
            <h2>Conditions</h2>
            <p>
              Cloud Cover:{" "}
              {forecast?.conditions.cloud_cover_percent ?? "--"}%
            </p>
            <p>
              Rain Chance:{" "}
              {forecast?.conditions.precipitation_probability_percent ?? "--"}%
            </p>
            <p>
              Temperature:{" "}
              {forecast?.conditions.temperature_f ?? "--"}°F
            </p>
            <p>
              Wind Speed:{" "}
              {forecast?.conditions.wind_speed_mph ?? "--"} mph
            </p>
            <p>
              Visibility:{" "}
              {forecast?.conditions.visibility_miles ?? "--"} miles
            </p>
          </div>

          <div className="card">
            <h2>Explanation</h2>
            <p>
              {forecast
                ? forecast.stargazing.explanation
                : "Enter a city to see whether tonight is a good night for observing the sky."}
            </p>
          </div>
        </section>

        {forecast && (
          <section className="location-card">
            <h2>
              Location: {forecast.location.name}
              {forecast.location.region ? `, ${forecast.location.region}` : ""}
            </h2>
            <p>Country: {forecast.location.country}</p>
            <p>Forecast Time: {forecast.forecast_time}</p>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;