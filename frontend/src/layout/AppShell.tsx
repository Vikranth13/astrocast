import {
  Link,
  Outlet,
} from "react-router";

import "../App.css";
import "./AppShell.css";

import PrimaryNav from "./PrimaryNav";

function AppShell() {
  return (
    <div className="app app-shell">
      <a
        className="skip-link"
        href="#main-content"
      >
        Skip to main content
      </a>

      <header className="app-header">
        <Link
          to="/"
          className="app-brand"
        >
          AstroCast
        </Link>

        <PrimaryNav />
      </header>

      <main
        className="app-main"
        id="main-content"
      >
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppShell;
