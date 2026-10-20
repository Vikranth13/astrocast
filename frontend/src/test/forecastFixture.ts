import type {
  ForecastResponse,
  HourlyForecast,
} from "../api/types/observe";

// One night in the shape GET /forecast returns. The 22:00 hour, the
// headline score, and the factor breakdown agree with each other and with
// the backend scoring rules: cloud 20% costs 14 points, rain 10% costs 2,
// wind 16 mph costs 8, and 10 miles of visibility costs nothing, so the
// score is 76. The best window is the run of hours scoring 60 or more.

const NIGHT_SCORES = [
  48, 55, 62, 70, 76, 81,
  85, 88, 90, 87, 79, 66,
];

const NIGHT_TIMES = [
  "2026-10-19T18:00",
  "2026-10-19T19:00",
  "2026-10-19T20:00",
  "2026-10-19T21:00",
  "2026-10-19T22:00",
  "2026-10-19T23:00",
  "2026-10-20T00:00",
  "2026-10-20T01:00",
  "2026-10-20T02:00",
  "2026-10-20T03:00",
  "2026-10-20T04:00",
  "2026-10-20T05:00",
];

function ratingFor(
  score: number
): HourlyForecast["rating"] {
  if (score >= 80) {
    return "Excellent";
  }

  if (score >= 60) {
    return "Good";
  }

  return "Okay";
}

const HOURLY: HourlyForecast[] = NIGHT_TIMES.map(
  (time, index) => ({
    time,
    cloud_cover_percent: index === 4 ? 20 : 30 - index,
    precipitation_probability_percent: 10,
    temperature_f: 52 - index,
    wind_speed_mph: 16,
    visibility_miles: 10,
    score: NIGHT_SCORES[index],
    rating: ratingFor(NIGHT_SCORES[index]),
  })
);

export const FORECAST_FIXTURE: ForecastResponse = {
  location: {
    name: "New Brunswick",
    region: "New Jersey",
    country: "United States",
    latitude: 40.48622,
    longitude: -74.45182,
    timezone: "America/New_York",
  },

  forecast_time: "2026-10-19T22:00",

  conditions: {
    cloud_cover_percent: 20,
    precipitation_probability_percent: 10,
    temperature_f: 48,
    wind_speed_mph: 16,
    visibility_miles: 10,
  },

  stargazing: {
    score: 76,
    rating: "Good",
    explanation:
      "Tonight looks good for stargazing because cloud cover is low, rain chances are minimal, and visibility is good.",
    limiting_factor: "Wind speed",

    factors: [
      {
        factor: "cloud_cover",
        label: "Cloud cover",
        value: 20,
        unit: "%",
        penalty: 14,
        is_limiting: false,
        note: "Cloud cover is low.",
      },

      {
        factor: "precipitation_probability",
        label: "Rain chance",
        value: 10,
        unit: "%",
        penalty: 2,
        is_limiting: false,
        note: "Rain chances are minimal.",
      },

      {
        factor: "wind_speed",
        label: "Wind speed",
        value: 16,
        unit: "mph",
        penalty: 8,
        is_limiting: true,
        note: "Wind may make viewing less comfortable.",
      },

      {
        factor: "visibility",
        label: "Visibility",
        value: 10,
        unit: "mi",
        penalty: 0,
        is_limiting: false,
        note: "Visibility is good.",
      },
    ],
  },

  hourly: HOURLY,

  best_window: {
    first_hour: "2026-10-19T20:00",
    last_hour: "2026-10-20T05:00",
    hour_count: 10,
    peak_time: "2026-10-20T02:00",
    peak_score: 90,
    peak_rating: "Excellent",
    qualifies: true,
  },
};
