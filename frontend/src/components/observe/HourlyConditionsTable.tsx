import Meter from "../ui/Meter";

import type {
  HourlyCondition,
} from "../../data/mockObserveTonight";

import "./observe.css";

type HourlyConditionsTableProps = {
  hours: HourlyCondition[];
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
                {hour.time}
              </th>

              <td>
                {hour.cloudCoverPercent}%
              </td>

              <td>
                {hour.precipitationProbabilityPercent}%
              </td>

              <td>
                {hour.windSpeedMph} mph
              </td>

              <td>
                {hour.visibilityMiles} mi
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
