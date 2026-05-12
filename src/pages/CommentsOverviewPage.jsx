import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCommentsOverview } from "../../assets/supabase.js";
import { parseStoredComment } from "../utils/parseStoredComment.js";
import styles from "./CommentsOverviewPage.module.css";

const PATH_LABELS = new Map([
  ["", "Home"],
  ["dashboard", "Dashboard"],
  ["services", "Services"],
  ["support", "Support"],
]);

function screenLabelFromPageUrl(pageUrl) {
  if (!pageUrl || typeof pageUrl !== "string") return "Unknown screen";
  try {
    const u = new URL(pageUrl);
    const segments = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
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
      const seg = segments[segments.length - 1].replace(/\.html$/i, "").toLowerCase();
      if (PATH_LABELS.has(seg)) return PATH_LABELS.get(seg);
    }
    if (lastRaw && /^[\w.-]+$/.test(lastRaw)) {
      const words = lastRaw.replace(/\.html$/i, "").replace(/-/g, " ");
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
    return u.pathname || "Prototype screen";
  } catch {
    return pageUrl.length > 48 ? `${pageUrl.slice(0, 45)}…` : pageUrl;
  }
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function previewRatios(row) {
  const xr = row?.x_ratio;
  const yr = row?.y_ratio;
  const xn =
    typeof xr === "number" && Number.isFinite(xr)
      ? Math.min(1, Math.max(0, xr))
      : null;
  const yn =
    typeof yr === "number" && Number.isFinite(yr)
      ? Math.min(1, Math.max(0, yr))
      : null;
  if (xn != null && yn != null) return { x: xn, y: yn, approximate: false };
  return { x: 0.5, y: 0.5, approximate: true };
}

export function CommentsOverviewPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPage, setFilterPage] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommentsOverview();
      const list = Array.isArray(data) ? data : [];
      setRows(list);
    } catch (e) {
      console.error("[CommentsOverview]", e);
      setError(
        e instanceof Error ? e.message : "Could not load comments from Supabase.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pageOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.page_url) set.add(r.page_url);
    });
    return Array.from(set).sort();
  }, [rows]);

  const sessionOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.session_id) set.add(String(r.session_id));
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterPage && r.page_url !== filterPage) return false;
      if (filterSession && String(r.session_id) !== filterSession)
        return false;
      return true;
    });
  }, [rows, filterPage, filterSession]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev != null && filtered.some((r) => r.id === prev)) return prev;
      return filtered[0].id;
    });
  }, [filtered]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const selectedParsed = useMemo(() => {
    if (!selected) return null;
    return parseStoredComment(selected.text || "");
  }, [selected]);

  const previewPos = selected ? previewRatios(selected) : null;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link className={styles.backBtn} to="/dashboard">
          ← Back to the prototype
        </Link>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Comments overview</h1>
          <p className={styles.subtitle}>
            Read-only summary of feedback across the prototype. Select a row to
            see full text and where it was placed on screen.
          </p>
        </div>
      </header>

      {loading && (
        <div className={styles.loading} role="status">
          Loading comments…
        </div>
      )}

      {!loading && error && (
        <div className={`${styles.panel} ${styles.errorPanel}`} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && rows.length === 0 && (
        <div className={styles.panel}>
          <div className={styles.emptyPanel}>
            No comments yet. Add feedback from Review Mode on any screen.
          </div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && filtered.length === 0 && (
        <div className={styles.panel}>
          <div className={styles.emptyPanel}>
            No comments match the selected filters. Try clearing filters.
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={styles.grid}>
          <section className={styles.panel} aria-label="Comments table">
            <div className={styles.panelHead}>All comments</div>
            <div className={styles.filters}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel} htmlFor="filter-page">
                  Screen / page
                </label>
                <select
                  id="filter-page"
                  className={styles.select}
                  value={filterPage}
                  onChange={(e) => setFilterPage(e.target.value)}
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
                  onChange={(e) => setFilterSession(e.target.value)}
                >
                  <option value="">All sessions</option>
                  {sessionOptions.map((sid) => (
                    <option key={sid} value={sid}>
                      {sid.slice(0, 8)}…
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Comment</th>
                    <th>Screen</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const parsed = parseStoredComment(row.text || "");
                    const excerpt =
                      parsed.body?.trim() || "(No text)";
                    const isSel = row.id === selectedId;
                    return (
                      <tr
                        key={row.id}
                        className={`${styles.row} ${isSel ? styles.rowSelected : ""}`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>
                          <p className={styles.cellText}>{excerpt}</p>
                        </td>
                        <td className={styles.screenCell}>
                          {screenLabelFromPageUrl(row.page_url)}
                        </td>
                        <td className={styles.dateCell}>
                          {formatWhen(row.created_at)}
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            type="button"
                            className={styles.linkish}
                            onClick={(e) => {
                              e.stopPropagation();
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
            {selected && selectedParsed ? (
              <div className={styles.detailBody}>
                <p className={styles.commentBody}>{selectedParsed.body?.trim() || "—"}</p>
                <ul className={styles.metaList}>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Screen</span>
                    <span className={styles.metaValue}>
                      {screenLabelFromPageUrl(selected.page_url)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Created</span>
                    <span className={styles.metaValue}>
                      {formatWhen(selected.created_at)}
                    </span>
                  </li>
                  <li className={styles.metaRow}>
                    <span className={styles.metaLabel}>Session</span>
                    <span className={styles.metaMuted}>
                      {selected.session_id != null
                        ? String(selected.session_id)
                        : "—"}
                    </span>
                  </li>
                </ul>

                <div className={styles.previewBox}>
                  <div className={styles.previewLabel}>Placement preview</div>
                  <div className={styles.previewStage}>
                    <div className={styles.previewPlaceholderGrid} aria-hidden />
                    {previewPos && (
                      <div
                        className={styles.marker}
                        style={{
                          left: `${previewPos.x * 100}%`,
                          top: `${previewPos.y * 100}%`,
                        }}
                        title={
                          previewPos.approximate
                            ? "Approximate position (no ratio stored)"
                            : "Comment anchor"
                        }
                      />
                    )}
                  </div>
                </div>
                {previewPos?.approximate && (
                  <p className={styles.metaMuted}>
                    Position ratios were not stored for this comment; marker is
                    centered for orientation.
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
