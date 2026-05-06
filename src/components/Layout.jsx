import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FloatingTestCard } from "./FloatingTestCard.jsx";
import styles from "./Layout.module.css";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/services", label: "Services" },
  { to: "/support", label: "Support" },
];

export function Layout() {
  const [showTestCard, setShowTestCard] = useState(true);

  return (
    <>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Primary">
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            <span className={styles.brandText}>Acme</span>
            <span className={styles.brandSub}>customer portal</span>
          </div>
          <nav className={styles.nav}>
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ""].join(" ")
                }
                end={item.to === "/dashboard"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className={styles.sidebarFoot}>
            <div className={styles.placeholderSm}>User menu</div>
          </div>
        </aside>

        <div className={styles.mainCol}>
          <header className={styles.topbar}>
            <div className={styles.search}>
              <span className={styles.searchLabel}>Search</span>
              <div className={styles.searchField} role="presentation">
                Find orders, invoices, tickets…
              </div>
            </div>
            <div className={styles.topbarMeta}>
              <span className={styles.badge}>Org: Demo Industries</span>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setShowTestCard((v) => !v)}
                aria-pressed={showTestCard}
              >
                {showTestCard ? "Hide test card" : "Show test card"}
              </button>
              <button type="button" className={styles.ghostBtn}>
                Sign out
              </button>
            </div>
          </header>

          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
      {showTestCard ? <FloatingTestCard /> : null}
    </>
  );
}
