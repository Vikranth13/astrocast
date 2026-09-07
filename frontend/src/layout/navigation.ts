export type NavigationItem = {
  path: string;
  label: string;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: "/",
    label: "Dashboard",
  },

  {
    path: "/observe-tonight",
    label: "Observe Tonight",
  },

  {
    path: "/space-weather",
    label: "Space Weather",
  },

  {
    path: "/alerts",
    label: "Alerts",
  },

  {
    path: "/trends",
    label: "Trends",
  },

  {
    path: "/learn",
    label: "Learn",
  },

  {
    path: "/about",
    label: "About",
  },
];
