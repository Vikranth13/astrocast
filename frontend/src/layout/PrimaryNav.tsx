import {
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  NavLink,
} from "react-router";

import {
  NAVIGATION_ITEMS,
} from "./navigation";

type PrimaryNavProps = {
  // The query string the Dashboard last had, so its link returns to the
  // same city instead of an empty Dashboard.
  dashboardSearch?: string;
};

function PrimaryNav({
  dashboardSearch = "",
}: PrimaryNavProps) {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const toggleRef =
    useRef<HTMLButtonElement>(null);

  function handleKeyDown(
    event: KeyboardEvent<HTMLElement>
  ) {
    if (
      event.key === "Escape"
      && isMenuOpen
    ) {
      setIsMenuOpen(false);

      toggleRef.current?.focus();
    }
  }

  return (
    <nav
      className="primary-nav"
      aria-label="Primary"
      data-open={isMenuOpen}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="nav-toggle ui-button-secondary"
        ref={toggleRef}
        aria-expanded={isMenuOpen}
        aria-controls="primary-nav-list"
        onClick={() =>
          setIsMenuOpen(!isMenuOpen)
        }
      >
        {isMenuOpen
          ? "Close menu"
          : "Open menu"}
      </button>

      <ul
        className="nav-list"
        id="primary-nav-list"
      >
        {NAVIGATION_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={
                item.path === "/"
                  ? {
                    pathname: item.path,
                    search: dashboardSearch,
                  }
                  : item.path
              }
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive
                  ? "nav-link is-active"
                  : "nav-link"
              }
              onClick={() =>
                setIsMenuOpen(false)
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default PrimaryNav;
