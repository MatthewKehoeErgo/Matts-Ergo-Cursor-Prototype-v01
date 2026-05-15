/** Stored in serialized comment meta when x/y are scroll-root content coordinates. */
export const COORDINATE_SPACE_SCROLL_ROOT = "scroll_root";
/** Legacy / fallback: x/y match document-style page coordinates (client + window.scroll). */
export const COORDINATE_SPACE_DOCUMENT = "document";

/**
 * Main prototype scroll pane (SETU shell). When absent, callers fall back to document scroll.
 */
export function getReviewModeScrollRoot() {
  if (typeof document === "undefined") return null;
  const el = document.querySelector("[data-review-mode-scroll-root]");
  return el instanceof HTMLElement ? el : null;
}

/**
 * Pin center in scroll-root **content** coordinates from a viewport click.
 * @returns {{ x: number, y: number } | null}
 */
export function clientPointToRootContent(clientX, clientY, root) {
  if (!root) return null;
  const r = root.getBoundingClientRect();
  return {
    x: root.scrollLeft + (clientX - r.left),
    y: root.scrollTop + (clientY - r.top),
  };
}

/**
 * Viewport **client** position of a point given as scroll-root content coords (pin center).
 * @returns {{ x: number, y: number } | null}
 */
export function rootContentToClientCenter(relX, relY, root) {
  if (!root) return null;
  const r = root.getBoundingClientRect();
  return {
    x: r.left + (Number(relX) - root.scrollLeft),
    y: r.top + (Number(relY) - root.scrollTop),
  };
}

/**
 * Viewport client coords for the pin center of a saved comment (fixed overlay math).
 * @param {{ positionAnchor: string, x: number, y: number, coordinateSpace?: string }} comment
 */
export function pageAnchorToViewportClientCenter(comment) {
  if (!comment) return { x: 0, y: 0 };
  if (comment.positionAnchor === "viewport") {
    return { x: Number(comment.x), y: Number(comment.y) };
  }
  const space = comment.coordinateSpace ?? COORDINATE_SPACE_DOCUMENT;
  const root = getReviewModeScrollRoot();
  if (space === COORDINATE_SPACE_SCROLL_ROOT && root) {
    const p = rootContentToClientCenter(comment.x, comment.y, root);
    if (p) return p;
  }
  const sx = typeof window !== "undefined" ? window.scrollX : 0;
  const sy = typeof window !== "undefined" ? window.scrollY : 0;
  return {
    x: Number(comment.x) - sx,
    y: Number(comment.y) - sy,
  };
}
