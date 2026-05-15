/** Static review-mode icons served from `public/review-mode/` (see src/features/review-mode/reviewModeAssetUrls.js). */
function reviewModeAsset(fileName) {
  const base = import.meta.env.BASE_URL;
  return `${base}review-mode/${fileName}`;
}

export const placedCommentIconUrl = reviewModeAsset("comment-placed-icon.svg");
export const submitIconUrl = reviewModeAsset("submit-icon.svg");
export const closeSmallIconUrl = reviewModeAsset("close-small.svg");
