/**
 * Mirror of `src/constants/prototypeVersion.js` for unbundled static HTML (comment-mode).
 * Keep pathname rule in sync with React `getPrototypeVersionIdFromPathname`.
 */

export const PROTOTYPE_VERSION_V1 = "prototype-v1";
export const PROTOTYPE_VERSION_V2 = "prototype-v2";

/**
 * @param {string} [pathname] — `window.location.pathname`
 */
export function getPrototypeVersionIdFromPathname(pathname) {
  if (typeof pathname !== "string") return PROTOTYPE_VERSION_V2;
  const file = pathname.split("/").pop()?.toLowerCase() ?? "";
  return file === "sbci-hub-v1.html" ? PROTOTYPE_VERSION_V1 : PROTOTYPE_VERSION_V2;
}

/** Match `src/constants/prototypeVersion.js` — detect V1 from full URL when pathname is `/`. */
export function getPrototypeVersionIdFromWindow() {
  if (typeof window === "undefined") return PROTOTYPE_VERSION_V2;
  const href = (window.location.href || "").toLowerCase();
  if (href.includes("sbci-hub-v1.html")) return PROTOTYPE_VERSION_V1;
  return getPrototypeVersionIdFromPathname(window.location.pathname);
}
