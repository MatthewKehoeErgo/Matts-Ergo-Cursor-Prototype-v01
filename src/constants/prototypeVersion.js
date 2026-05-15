/** Stable ids stored in Supabase `comments.version` and used in Review Mode. */
export const PROTOTYPE_VERSION_V1 = "prototype-v1";
export const PROTOTYPE_VERSION_V2 = "prototype-v2";

const LABELS = new Map([
  [PROTOTYPE_VERSION_V1, "Prototype — Version 1"],
  [PROTOTYPE_VERSION_V2, "Prototype — Version 2"],
]);

/**
 * @param {string} [pathname] — `window.location.pathname` (last segment is often the HTML file).
 */
export function getPrototypeVersionIdFromPathname(pathname) {
  if (typeof pathname !== "string") return PROTOTYPE_VERSION_V2;
  const file = pathname.split("/").pop()?.toLowerCase() ?? "";
  return file === "sbci-hub-v1.html" ? PROTOTYPE_VERSION_V1 : PROTOTYPE_VERSION_V2;
}

/**
 * Prefer full `window.location` so Version 1 is detected even when `pathname` is `/` (dev server).
 */
export function getPrototypeVersionIdFromWindow() {
  if (typeof window === "undefined") return PROTOTYPE_VERSION_V2;
  const href = (window.location.href || "").toLowerCase();
  if (href.includes("sbci-hub-v1.html")) return PROTOTYPE_VERSION_V1;
  return getPrototypeVersionIdFromPathname(window.location.pathname);
}

/** @param {string|null|undefined} versionId */
export function getPrototypeVersionLabel(versionId) {
  if (versionId == null || versionId === "") return "Unspecified";
  return LABELS.get(versionId) ?? String(versionId);
}

/**
 * @param {string} reactEntryHref — e.g. `${import.meta.env.BASE_URL}index.html#/dashboard`
 */
export function buildPrototypeVersionOptions(reactEntryHref) {
  return [
    {
      id: PROTOTYPE_VERSION_V1,
      label: LABELS.get(PROTOTYPE_VERSION_V1),
      href: "sbci-hub-v1.html",
    },
    {
      id: PROTOTYPE_VERSION_V2,
      label: LABELS.get(PROTOTYPE_VERSION_V2),
      href: reactEntryHref,
    },
  ];
}
