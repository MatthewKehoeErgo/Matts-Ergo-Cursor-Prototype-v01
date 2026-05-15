import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FloatingTestCard } from "./FloatingTestCard.jsx";
import setuLogoUrl from "../../assets/SETU/setu-logo.svg?url";

const MQ = "(max-width: 1200px)";

/**
 * SBCI Hub shell — uses global classes from `src/styles/sbci-hub.css`
 * (extracted from legacy `sbci-hub-v1.html`).
 */
const NAV_ITEMS = [
  {
    kind: "route",
    to: "/dashboard",
    label: "Home",
    icon: "home",
    end: true,
  },
  {
    kind: "route",
    to: "/services",
    label: "Your Applications",
    icon: "assignment",
    end: false,
  },
  {
    kind: "stub",
    label: "Your Account",
    icon: "account_circle",
  },
  {
    kind: "stub",
    label: "Your Documents",
    icon: "folder",
  },
  {
    kind: "route",
    to: "/support",
    label: "Help & FAQs",
    icon: "help",
    end: false,
  },
];

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const mqRef = useRef(
    typeof window !== "undefined" ? window.matchMedia(MQ) : null,
  );

  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  const toggleNav = useCallback(() => {
    setNavOpen((o) => !o);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MQ);
    mqRef.current = mq;
    const onResizeMode = () => {
      if (!mq.matches && navOpen) closeNav();
    };
    mq.addEventListener("change", onResizeMode);
    return () => mq.removeEventListener("change", onResizeMode);
  }, [navOpen, closeNav]);

  useEffect(() => {
    const mq = mqRef.current;
    if (!mq?.matches || !navOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  useEffect(() => {
    const onKey = (e) => {
      const mq = mqRef.current;
      if (
        e.key === "Escape" &&
        mq?.matches &&
        navOpen
      ) {
        e.preventDefault();
        closeNav();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen, closeNav]);

  return (
    <>
      <div
        id="app-root"
        className={["app", "theme-setu", navOpen ? "nav-open" : ""].filter(Boolean).join(" ")}
      >
        <aside id="primary-nav" className="sidebar" aria-label="Primary">
          <div className="sidebar__mobile-header">
            <button
              type="button"
              className="sidebar-close"
              id="sidebar-close"
              aria-label="Close menu"
              onClick={() => {
                if (mqRef.current?.matches) closeNav();
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          <div className="sidebar__brand">
            <img
              className="sidebar__brand-logo"
              src={setuLogoUrl}
              alt="SETU"
              width={120}
              height={46}
            />
          </div>
          {NAV_ITEMS.map((item) => {
            if (item.kind === "stub") {
              return (
                <button
                  key={item.label}
                  type="button"
                  className="nav-item"
                  onClick={(e) => e.preventDefault()}
                >
                  <span
                    className="material-symbols-outlined nav-item__icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  ["nav-item", isActive ? "nav-item--active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
                onClick={() => {
                  if (mqRef.current?.matches) closeNav();
                }}
              >
                <span
                  className="material-symbols-outlined nav-item__icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </aside>

        <button
          type="button"
          className="nav-overlay"
          id="nav-overlay"
          aria-label="Close menu"
          aria-hidden={navOpen ? "false" : "true"}
          tabIndex={navOpen ? undefined : -1}
          onClick={() => {
            if (mqRef.current?.matches) closeNav();
          }}
        />

        <div className="main-column">
          <header className="top-header">
            <div className="top-header-left">
              <button
                type="button"
                className="nav-burger"
                id="nav-burger"
                aria-label="Open menu"
                aria-expanded={navOpen}
                aria-controls="primary-nav"
                onClick={() => {
                  if (!mqRef.current?.matches) return;
                  toggleNav();
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  menu
                </span>
              </button>
              <nav
                className="top-header-nav"
                aria-label="Courses and resources"
              >
                <a href="#" className="top-header-nav__link">
                  Courses
                </a>
                <a href="#" className="top-header-nav__link">
                  Events
                </a>
                <a href="#" className="top-header-nav__link">
                  Shop
                </a>
                <a href="#" className="top-header-nav__link">
                  Resources
                </a>
              </nav>
            </div>
            <div className="logo-wrap">
              <span className="logo">
                <img
                  src={setuLogoUrl}
                  alt="SETU"
                  width="120"
                  height="46"
                />
              </span>
            </div>
            <div className="top-header-actions">
              <button type="button" className="btn-logout">
                Log out
              </button>
            </div>
          </header>

          <div className="content-scroll">
            <Outlet />
          </div>
        </div>
        <FloatingTestCard />
        <div className="prototype-version-banner" role="status">
          Prototype — Version 2
        </div>
      </div>
    </>
  );
}
