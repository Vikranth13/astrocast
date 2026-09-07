import {
  useState,
} from "react";

import {
  NavLink,
} from "react-router";

import {
  NAVIGATION_ITEMS,
} from "./navigation";

function PrimaryNav() {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  return (
    <nav
      className="primary-nav"
      aria-label="Primary"
      data-open={isMenuOpen}
    >
      <button
        type="button"
        className="nav-toggle"
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
              to={item.path}
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
