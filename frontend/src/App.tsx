import {
  Route,
  Routes,
} from "react-router";

import AppShell from "./layout/AppShell";

import About from "./pages/About";
import Alerts from "./pages/Alerts";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import NotFound from "./pages/NotFound";
import ObserveTonight from "./pages/ObserveTonight";
import SpaceWeather from "./pages/SpaceWeather";
import Trends from "./pages/Trends";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={<Dashboard />}
        />

        <Route
          path="observe-tonight"
          element={<ObserveTonight />}
        />

        <Route
          path="space-weather"
          element={<SpaceWeather />}
        />

        <Route
          path="alerts"
          element={<Alerts />}
        />

        <Route
          path="trends"
          element={<Trends />}
        />

        <Route
          path="learn"
          element={<Learn />}
        />

        <Route
          path="about"
          element={<About />}
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Route>
    </Routes>
  );
}

export default App;
