/** Static review-mode icons (copied to `public/review-mode/` at build time). */
function reviewModeAsset(fileName) {
  const base = import.meta.env.BASE_URL;
  return `${base}review-mode/${fileName}`;
}

export const placedCommentIconUrl = reviewModeAsset("comment-placed-icon.svg");
export const submitIconUrl = reviewModeAsset("submit-icon.svg");
export const closeSmallIconUrl = reviewModeAsset("close-small.svg");
export const dragPanIconUrl = reviewModeAsset("drag-pan.svg");
