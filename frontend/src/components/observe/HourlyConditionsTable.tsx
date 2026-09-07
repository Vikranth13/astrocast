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
  return (
    <div className="hourly-scroll">
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

                  <div className="hourly-meter">
                    <div
                      className="hourly-meter-fill"
                      style={{
                        width: `${hour.score}%`,
                      }}
                    />
                  </div>
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
