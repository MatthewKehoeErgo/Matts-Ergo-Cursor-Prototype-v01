import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getPrototypeVersionLabel,
  PROTOTYPE_VERSION_V1,
  PROTOTYPE_VERSION_V2,
} from "../../../constants/prototypeVersion.js";
import { useReviewMode } from "../context/ReviewModeContext.jsx";
import styles from "./ReviewCommentsOverviewPage.module.css";

const VERSION_FILTER_CHOICES = [
  { value: PROTOTYPE_VERSION_V1, label: getPrototypeVersionLabel(PROTOTYPE_VERSION_V1) },
  { value: PROTOTYPE_VERSION_V2, label: getPrototypeVersionLabel(PROTOTYPE_VERSION_V2) },
];

function parseVersionFromSearchParams(searchParams) {
  const raw = searchParams.get("version");
  if (raw === PROTOTYPE_VERSION_V1 || raw === PROTOTYPE_VERSION_V2) return raw;
  return PROTOTYPE_VERSION_V2;
}

const PATH_LABELS = new Map([
  ["", "Home"],
  ["dashboard", "Dashboard"],
  ["services", "Services"],
  ["support", "Support"],
]);

function screenLabelFromPageUrl(pageUrl) {
  if (!pageUrl || typeof pageUrl !== "string") return "Unknown screen";

  try {
    const url = new URL(pageUrl);
    const segments = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const lastRaw = segments[segments.length - 1] || "";
    const lower = lastRaw.toLowerCase();

    if (
      lower === "react-app.html" ||
      lower === "index.html" ||
      lower === "sbci-hub-v1.html"
    ) {
      return lower === "sbci-hub-v1.html"
        ? "SBCI Hub · Version 1"
        : "Customer portal (prototype)";
    }

    const routeKey = lower.replace(/\.html$/i, "");
    if (PATH_LABELS.has(routeKey)) return PATH_LABELS.get(routeKey);

    if (segments.length >= 1) {
      const seg = segments[segments.length - 1]
        .replace(/\.html$/i, "")
        .toLowerCase();
      if (PATH_LABELS.has(seg)) return PATH_LABELS.get(seg);
    }

    if (lastRaw && /^[\w.-]+$/.test(lastRaw)) {
      const words = lastRaw.replace(/\.html$/i, "").replace(/-/g, " ");
      return words.charAt(0).toUpperCase() + words.slice(1);
    }

    return url.pathname || "Prototype screen";
  } catch {
    return pageUrl.length > 48 ? `${pageUrl.slice(0, 45)}…` : pageUrl;
  }
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function formatLifecycleStatus(row) {
  return row?.status === "resolved" ? "Resolved" : "Unresolved";
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function previewRatios(row) {
  const x = Number.isFinite(row?.xRatio) ? row.xRatio : null;
  const y = Number.isFinite(row?.yRatio) ? row.yRatio : null;
  if (x != null && y != null) {
    return {
      x: clamp01(x),
      y: clamp01(y),
      approximate: false,
    };
  }

  const vw = Number(row?.viewportWidth);
  const vh = Number(row?.viewportHeight);
  const px = Number(row?.x);
  const py = Number(row?.y);
  if (
    Number.isFinite(vw) &&
    vw > 0 &&
    Number.isFinite(vh) &&
    vh > 0 &&
    Number.isFinite(px) &&
    Number.isFinite(py)
  ) {
    return {
      x: clamp01(px / vw),
      y: clamp01(py / vh),
      approximate: false,
    };
  }

  return { x: 0.5, y: 0.5, approximate: true };
}

export function ReviewCommentsOverviewPage() {
  const { repository, openDefaultScreen } = useReviewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPage, setFilterPage] = useState("");
  const [filterSession, setFilterSession] = useState("");
  /** Server-side filter: `unresolved` (default) or `resolved`. */
  const [lifecycleFilter, setLifecycleFilter] = useState("unresolved");
  const [selectedId, setSelectedId] = useState(null);

  const filterVersion = useMemo(
    () => parseVersionFromSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    const raw = searchParams.get("version");
    if (raw === PROTOTYPE_VERSION_V1 || raw === PROTOTYPE_VERSION_V2) return;
    setSearchParams({ version: PROTOTYPE_VERSION_V2 }, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await repository.listAll({
        version: filterVersion,
        status: lifecycleFilter,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ReviewCommentsOverviewPage]", err);
      setRows([]);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load comments from the configured repository.",
      );
    } finally {
      setLoading(false);
    }
  }, [repository, filterVersion, lifecycleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.documentElement.classList.add("comments-overview-route");
    return () => {
      document.documentElement.classList.remove("comments-overview-route");
    };
  }, []);

  const pageOptions = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.pageUrl) values.add(row.pageUrl);
    });
    return Array.from(values).sort();
  }, [rows]);

  const sessionOptions = useMemo(() => {
    const values = new Set();
    rows.forEach((row) => {
      if (row.sessionId) values.add(String(row.sessionId));
    });
    return Array.from(values).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filterPage && row.pageUrl !== filterPage) return false;
      if (filterSession && String(row.sessionId) !== filterSession) return false;
      return true;
    });
  }, [filterPage, filterSession, rows]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) => {
      if (current != null && filtered.some((row) => row.id === current)) {
        return current;
      }
      return filtered[0].id;
    });
  }, [filtered]);

  const selected = useMemo(
    () => filtered.find((row) => row.id === selectedId) ?? null,
    [filtered, selectedId],
  );
  const previewPos = selected ? previewRatios(selected) : null;
  const previewStageStyle = useMemo(() => {
    if (!selected) return undefined;
    const w = Number(selected.viewportWidth);
    const h = Number(selected.viewportHeight);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { aspectRatio: `${Math.round(w)} / ${Math.round(h)}` };
    }
    return undefined;
  }, [selected]);
  const previewBackdrop = selected?.previewImageUrl ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => openDefaultScreen(filterVersion)}
        >
          ← Back to the prototype
        </button>

        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Comments overview</h1>
          <p className={styles.subtitle}>
            Comments for one prototype version at a time (nothing is mixed). Use
            the version control to switch. Screen and session filters apply
            within that version only.
          </p>
        </div>
      </header>

      {loading && (
        <div className={styles.loading} role="status">
          Loading comments…
        </div>
      )}

      {!loading && error && (
        <div
          className={`${styles.panel} ${styles.contentMax} ${styles.errorPanel}`}
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && rows.length === 0 && (
        <div className={`${styles.panel} ${styles.contentMax}`}>
          <div className={styles.emptyPanel}>
            {lifecycleFilter === "resolved"
              ? `No resolved comments for ${getPrototypeVersionLabel(filterVersion)}.`
              : `No comments yet for ${getPrototypeVersionLabel(filterVersion)}. Add feedback from Review Mode on that prototype.`}
          </div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && filtered.length === 0 && (
        <div className={`${styles.panel} ${styles.contentMax}`}>
          <div className={styles.emptyPanel}>
            No comments match the selected filters. Try clearing filters.
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={styles.grid}>
          <section className={styles.panel} aria-label="Comments table">
            <div className={styles.panelHead}>
              Comments — {getPrototypeVersionLabel(filterVersion)}
            </div>

            <div className={styles.filters}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel} htmlFor="filter-page">
                  Screen / page
                </label>
                <select
                  id="filter-page"
                  className={styles.select}
                  value={filterPage}
                  onChange={(event) => setFilterPage(event.target.value)}
                >
                  <option value="">All screens</option>
                  {pageOptions.map((url) => (
                    <option key={url} value={url}>
                      {screenLabelFromPageUrl(url)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField}>
                <label className={styles.filterLabel} htmlFor="filter-session">
                  Session
                </label>
                <select
                  id="filter-session"
                  className={styles.select}
                  value={filterSession}
                  onChange={(event) => setFilterSession(event.target.value)}
                >
                  <option value="">All sessions</option>
                  {sessionOptions.map((sessionId) => (
                    <option key={sessionId} value={sessionId}>
                      {sessionId.slice(0, 8)}…
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField}>
                <label className={styles.filterLabel} htmlFor="filter-version">
                  Prototype version
                </label>
                <select
                  id="filter-version"
                  className={styles.select}
                  value={filterVersion}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (
                      next !== PROTOTYPE_VERSION_V1 &&
                      next !== PROTOTYPE_VERSION_V2
                    ) {
                      return;
                    }
                    setSearchParams(
                      (prev) => {
                        const merged = new URLSearchParams(prev);
                        merged.set("version", next);
                        return merged;
                      },
                      { replace: true },
                    );
                  }}
                >
                  {VERSION_FILTER_CHOICES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterField}>
                <span className={styles.filterLabel} id="lifecycle-toggle-label">
                  Status
                </span>
                <div
                  className={styles.lifecycleToggle}
                  role="group"
                  aria-labelledby="lifecycle-toggle-label"
                >
                  <button
                    type="button"
                    className={`${styles.lifecycleToggleBtn} ${
                      lifecycleFilter === "unresolved"
                        ? styles.lifecycleToggleBtnActive
                        : ""
                    }`}
                    aria-pressed={lifecycleFilter === "unresolved"}
                    onClick={() => setLifecycleFilter("unresolved")}
                  >
                    Unresolved
                  </button>
                  <button
                    type="button"
                    className={`${styles.lifecycleToggleBtn} ${
                      lifecycleFilter === "resolved"
                        ? styles.lifecycleToggleBtnActive
                        : ""
                    }`}
                    aria-pressed={lifecycleFilter === "resolved"}
                    onClick={() => setLifecycleFilter("resolved")}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Comment</th>
                    <th>Screen</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Resolved</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const excerpt = row.body?.trim() || "(No text)";
                    const isSelected = row.id === selectedId;

                    return (
                      <tr
                        key={row.id}
                        className={`${styles.row} ${
                          isSelected ? styles.rowSelected : ""
                        }`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>
                          <p className={styles.cellText}>{excerpt}</p>
                        </td>
                        <td className={styles.screenCell}>
                          {screenLabelFromPageUrl(row.pageUrl)}
                        </td>
                        <td className={styles.versionCell}>
                          {getPrototypeVersionLabel(row.version)}
                        </td>
                        <td className={styles.versionCell}>
                          {formatLifecycleStatus(row)}
                        </td>
                        <td className={styles.dateCell}>
                          {formatWhen(row.resolvedAt)}
                        </td>
                        <td className={styles.dateCell}>
                          {formatWhen(row.createdAt)}
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            type="button"
                            className={styles.linkish}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(row.id);
                            }}
                          >
                            View context
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside
            className={`${styles.panel} ${styles.detailPanel}`}
            aria-label="Comment detail"
          >
            <div className={styles.panelHead}>Context</div>

            {selected ? (
              <div className={styles.detailBody}>
                <p className={styles.commentBody}>{selected.body?.trim() || "—"}</p>

                <ul className={styles.metaList}>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Screen</span>
                    <span className={styles.metaValue}>
                      {screenLabelFromPageUrl(selected.pageUrl)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Version</span>
                    <span className={styles.metaValue}>
                      {getPrototypeVersionLabel(selected.version)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Status</span>
                    <span className={styles.metaValue}>
                      {formatLifecycleStatus(selected)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Resolved</span>
                    <span className={styles.metaValue}>
                      {formatWhen(selected.resolvedAt)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Created</span>
                    <span className={styles.metaValue}>
                      {formatWhen(selected.createdAt)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Session</span>
                    <span className={styles.metaMuted}>
                      {selected.sessionId ? String(selected.sessionId) : "—"}
                    </span>
                  </li>
                </ul>

                <div className={styles.previewBox}>
                  <div className={styles.previewLabel}>Placement preview</div>
                  <div
                    className={styles.previewStage}
                    style={previewStageStyle}
                  >
                    {previewBackdrop ? (
                      <img
                        className={styles.previewSnapshot}
                        src={previewBackdrop}
                        alt=""
                        decoding="async"
                      />
                    ) : (
                      <div
                        className={styles.previewPlaceholderGrid}
                        aria-hidden
                      />
                    )}
                    {previewPos && (
                      <div
                        className={styles.marker}
                        style={{
                          left: `${previewPos.x * 100}%`,
                          top: `${previewPos.y * 100}%`,
                        }}
                        title={
                          previewPos.approximate
                            ? "Approximate position (no ratio or viewport stored)"
                            : "Comment anchor"
                        }
                      />
                    )}
                  </div>
                </div>

                {previewPos?.approximate && (
                  <p className={styles.metaMuted}>
                    Position ratios were not stored for this comment, and
                    viewport size was missing; marker is centered for
                    orientation.
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.detailPlacehold}>
                Select a comment to view details.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
