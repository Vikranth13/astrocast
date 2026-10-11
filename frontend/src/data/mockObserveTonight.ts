export type HourlyCondition = {
  time: string;
  cloudCoverPercent: number;
  precipitationProbabilityPercent: number;
  windSpeedMph: number;
  visibilityMiles: number;
  score: number;
};

export type ScoreFactor = {
  factor: string;
  value: string;
  penalty: number;
  note: string;
  isLimiting: boolean;
};

export type ObserveTonightSample = {
  hours: HourlyCondition[];
  factors: ScoreFactor[];
};

export const MOCK_OBSERVE_TONIGHT: ObserveTonightSample = {
  hours: [
    {
      time: "18:00",
      cloudCoverPercent: 62,
      precipitationProbabilityPercent: 20,
      windSpeedMph: 12,
      visibilityMiles: 8,
      score: 47,
    },

    {
      time: "19:00",
      cloudCoverPercent: 55,
      precipitationProbabilityPercent: 15,
      windSpeedMph: 11,
      visibilityMiles: 8,
      score: 53,
    },

    {
      time: "20:00",
      cloudCoverPercent: 48,
      precipitationProbabilityPercent: 10,
      windSpeedMph: 10,
      visibilityMiles: 9,
      score: 60,
    },

    {
      time: "21:00",
      cloudCoverPercent: 40,
      precipitationProbabilityPercent: 10,
      windSpeedMph: 9,
      visibilityMiles: 9,
      score: 65,
    },

    {
      time: "22:00",
      cloudCoverPercent: 35,
      precipitationProbabilityPercent: 10,
      windSpeedMph: 8,
      visibilityMiles: 9,
      score: 70,
    },

    {
      time: "23:00",
      cloudCoverPercent: 28,
      precipitationProbabilityPercent: 5,
      windSpeedMph: 8,
      visibilityMiles: 10,
      score: 77,
    },

    {
      time: "00:00",
      cloudCoverPercent: 22,
      precipitationProbabilityPercent: 5,
      windSpeedMph: 7,
      visibilityMiles: 10,
      score: 81,
    },

    {
      time: "01:00",
      cloudCoverPercent: 18,
      precipitationProbabilityPercent: 5,
      windSpeedMph: 7,
      visibilityMiles: 10,
      score: 84,
    },

    {
      time: "02:00",
      cloudCoverPercent: 12,
      precipitationProbabilityPercent: 0,
      windSpeedMph: 6,
      visibilityMiles: 10,
      score: 89,
    },

    {
      time: "03:00",
      cloudCoverPercent: 10,
      precipitationProbabilityPercent: 0,
      windSpeedMph: 6,
      visibilityMiles: 10,
      score: 90,
    },

    {
      time: "04:00",
      cloudCoverPercent: 14,
      precipitationProbabilityPercent: 0,
      windSpeedMph: 7,
      visibilityMiles: 9,
      score: 87,
    },

    {
      time: "05:00",
      cloudCoverPercent: 25,
      precipitationProbabilityPercent: 5,
      windSpeedMph: 8,
      visibilityMiles: 9,
      score: 78,
    },
  ],

  factors: [
    {
      factor: "Cloud cover",
      value: "35%",
      penalty: 24.5,
      note: "There is moderate cloud cover.",
      isLimiting: true,
    },

    {
      factor: "Visibility",
      value: "6 mi",
      penalty: 10,
      note: "Visibility is moderate.",
      isLimiting: true,
    },

    {
      factor: "Wind speed",
      value: "18 mph",
      penalty: 8,
      note: "Wind may make viewing less comfortable.",
      isLimiting: false,
    },

    {
      factor: "Rain chance",
      value: "10%",
      penalty: 2,
      note: "Rain chances are minimal.",
      isLimiting: false,
    },
  ],
};
