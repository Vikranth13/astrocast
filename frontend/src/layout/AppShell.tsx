import {
  useEffect,
  useRef,
} from "react";

import {
  Link,
  Outlet,
  useLocation,
} from "react-router";

import "../App.css";
import "./AppShell.css";

import PrimaryNav from "./PrimaryNav";

function AppShell() {
  const { pathname } = useLocation();

  const mainRef = useRef<HTMLElement>(null);

  const previousPathname = useRef(pathname);

  // A client-side navigation keeps the old scroll position and leaves
  // focus on the clicked link, which on small screens is now hidden in
  // the closed menu. Start each new page at the top with focus on its
  // content, as a full page load would. Filter changes only alter the
  // query string, so they keep their place.
  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;

    window.scrollTo(0, 0);

    // Without preventScroll, focusing <main> scrolls it into view and
    // tucks its top edge under the sticky header.
    mainRef.current?.focus({
      preventScroll: true,
    });
  }, [pathname]);

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
        ref={mainRef}
        tabIndex={-1}
      >
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppShell;
