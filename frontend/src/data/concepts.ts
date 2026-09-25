export type ConceptStatus =
  | "measured"
  | "via_alerts"
  | "approximated"
  | "planned"
  | "not_measured"
  | "not_forecast";

export type Concept = {
  name: string;
  definition: string;
  whyItMatters: string;
  status: ConceptStatus;
  inAstroCast: string;
};

export type DataSource = {
  name: string;
  provides: string;
};

export const SPACE_WEATHER_CONCEPTS: Concept[] = [
  {
    name: "Kp index",
    definition:
      "A 0 to 9 scale of global geomagnetic disturbance, worked out every three hours from a network of magnetometers. It is published in thirds, so 5- is 4.67, 5 is 5.00, and 5+ is 5.33.",
    whyItMatters:
      "A higher Kp pushes the aurora oval toward the equator. On its own it cannot tell you whether aurora will be visible from where you stand.",
    status: "measured",
    inAstroCast:
      "Stored from NOAA and shown on Space Weather and Trends. It sets the geomagnetic activity level and feeds the risk level.",
  },

  {
    name: "Coronal mass ejection (CME)",
    definition:
      "A large cloud of magnetised plasma thrown out from the Sun's outer atmosphere. When one is aimed at Earth, it usually arrives one to three days later.",
    whyItMatters:
      "If the cloud's magnetic field points southward when it arrives, it can drive geomagnetic storms and aurora well away from the poles.",
    status: "not_measured",
    inAstroCast:
      "Not tracked directly. Its arrival shows up as rising solar wind speed, density, and Kp.",
  },

  {
    name: "Solar flare",
    definition:
      "A sudden burst of radiation from the Sun, graded by X-ray brightness as A, B, C, M, or X. Each class is ten times stronger than the one before.",
    whyItMatters:
      "A strong flare can black out radio on Earth's sunlit side within minutes. A flare alone does not cause aurora, though a CME launched with it might.",
    status: "via_alerts",
    inAstroCast:
      "Radio blackouts appear as NOAA R-scale alerts on the Alerts page.",
  },

  {
    name: "Aurora",
    definition:
      "Light given off when charged particles, guided by Earth's magnetic field, strike gases high in the atmosphere. Oxygen glows green and red, nitrogen blue and purple.",
    whyItMatters:
      "Seeing it needs geomagnetic activity, a dark and clear sky, and a view toward the pole. How much activity you need depends on your geomagnetic latitude.",
    status: "not_forecast",
    inAstroCast:
      "AstroCast reports global geomagnetic activity. It does not forecast aurora for your location.",
  },
];

export const OBSERVING_CONCEPTS: Concept[] = [
  {
    name: "Twilight",
    definition:
      "The time when the Sun has set but still lights the sky. Civil, nautical, and astronomical twilight end when the Sun is 6, 12, and 18 degrees below the horizon.",
    whyItMatters:
      "The sky is only fully dark once astronomical twilight ends, which is when faint galaxies and nebulae become worth attempting.",
    status: "planned",
    inAstroCast:
      "Not calculated yet. Darkness windows are planned.",
  },

  {
    name: "Seeing",
    definition:
      "How steady the air is. Turbulence makes stars twinkle and smears fine detail when you use high magnification.",
    whyItMatters:
      "It matters most for planets, the Moon, and close double stars, and it can be poor on a perfectly clear night.",
    status: "not_measured",
    inAstroCast:
      "Not measured. Standard weather forecasts do not provide it, so AstroCast does not claim to know it.",
  },

  {
    name: "Transparency",
    definition:
      "How clear the air is, meaning how much haze, humidity, smoke, or dust dims and scatters the light from the sky.",
    whyItMatters:
      "It matters most for faint galaxies and nebulae. A transparent sky can still have poor seeing, and the reverse is true too.",
    status: "approximated",
    inAstroCast:
      "Estimated from cloud cover and visibility. It is not a direct measurement.",
  },

  {
    name: "Moonlight",
    definition:
      "Sunlight reflected by the Moon, which brightens the whole sky. How much it interferes depends on the phase, the Moon's height, and how close your target is to it.",
    whyItMatters:
      "A bright Moon washes out faint targets, while planets and double stars hold up well. The darkest skies come around new Moon or after moonset.",
    status: "planned",
    inAstroCast:
      "Not calculated yet. Moon phase and rise and set times are planned.",
  },
];

export const DATA_SOURCES: DataSource[] = [
  {
    name: "NOAA Space Weather Prediction Center",
    provides:
      "The planetary K-index, solar wind speed and density, and space-weather alerts, watches, and warnings. AstroCast stores each ingestion and serves pages from storage, so a NOAA outage does not take the app down.",
  },

  {
    name: "Open-Meteo",
    provides:
      "Hourly cloud cover, chance of rain, temperature, wind speed, and visibility, plus city lookup. Fetched when you search on Observe Tonight.",
  },
];

export const LIMITATIONS: string[] = [
  "Space weather describes the whole planet. AstroCast does not forecast aurora for your location.",
  "Space-weather data is only as fresh as the last ingestion, which is why every reading shows its age.",
  "The observing score currently looks at one evening hour, 22:00 local time, rather than the whole night.",
  "Seeing is not measured, and transparency is only estimated from cloud cover and visibility.",
  "Every interpretation comes from fixed rules rather than a model, and AstroCast's output is informational.",
];
