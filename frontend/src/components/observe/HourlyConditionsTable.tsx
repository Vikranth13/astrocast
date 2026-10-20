import Meter from "../ui/Meter";

import type {
  HourlyForecast,
} from "../../api/types/observe";

import {
  formatLocalHour,
  formatMeasurement,
} from "../../utils/format";

import "./observe.css";

type HourlyConditionsTableProps = {
  hours: HourlyForecast[];
};

function HourlyConditionsTable({
  hours,
}: HourlyConditionsTableProps) {
  // The table scrolls sideways on narrow screens. Making the scroll
  // container focusable lets keyboard users scroll it too.
  return (
    <div
      className="hourly-scroll"
      tabIndex={0}
      role="region"
      aria-label="Hourly conditions table"
    >
      <table className="hourly-table">
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Cloud</th>
            <th scope="col">Rain</th>
            <th scope="col">Wind</th>
            <th scope="col">Visibility</th>
            <th scope="col">Score</th>
          </tr>
        </thead>

        <tbody>
          {hours.map((hour) => (
            <tr key={hour.time}>
              <th scope="row">
                {formatLocalHour(hour.time)}
              </th>

              <td>
                {formatMeasurement(
                  hour.cloud_cover_percent,
                  "%"
                )}
              </td>

              <td>
                {formatMeasurement(
                  hour.precipitation_probability_percent,
                  "%"
                )}
              </td>

              <td>
                {formatMeasurement(
                  hour.wind_speed_mph,
                  "mph"
                )}
              </td>

              <td>
                {formatMeasurement(
                  hour.visibility_miles,
                  "mi"
                )}
              </td>

              <td>
                <div className="hourly-score">
                  <span>{hour.score}</span>

                  <Meter
                    percent={hour.score}
                    className="hourly-meter"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HourlyConditionsTable;
