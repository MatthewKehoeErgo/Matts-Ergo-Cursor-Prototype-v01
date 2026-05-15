/**
 * Legacy comments stored viewport (client) X/Y in `x_position` / `y_position` with
 * matching `x_ratio` ≈ x/vw and `y_ratio` ≈ y/vh. New comments store document-space
 * (page) coordinates so pins track page scroll.
 *
 * @param {Record<string, unknown>} row — raw Supabase `comments` row
 * @returns {"viewport" | "page"}
 */
export function inferCommentPositionAnchor(row) {
  const vw = Number(row?.viewport_width);
  const vh = Number(row?.viewport_height);
  const x = Number(row?.x_position);
  const y = Number(row?.y_position);
  const xr = Number(row?.x_ratio);
  const yr = Number(row?.y_ratio);
  if (
    !(vw > 0) ||
    !(vh > 0) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(xr) ||
    !Number.isFinite(yr)
  ) {
    return "page";
  }
  const tol = 0.06;
  const nearXr = Math.abs(x / vw - xr) < tol;
  const nearYr = Math.abs(y / vh - yr) < tol;
  return nearXr && nearYr ? "viewport" : "page";
}
