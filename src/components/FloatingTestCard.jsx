import {
  ReviewModePanel,
  useReviewMode,
} from "../features/review-mode/index.js";

export function FloatingTestCard() {
  const {
    panelOpen,
    commentModeActive,
    currentVersionLabel,
    versionOptions,
    openPanel,
    closePanel,
    toggleCommentMode,
    openOverview,
    openVersion,
  } = useReviewMode();

  return (
    <ReviewModePanel
      panelOpen={panelOpen}
      commentModeActive={commentModeActive}
      currentVersionLabel={currentVersionLabel}
      versionOptions={versionOptions}
      onOpenPanel={openPanel}
      onClosePanel={closePanel}
      onToggleCommentMode={toggleCommentMode}
      onOpenOverview={openOverview}
      onOpenVersion={openVersion}
    />
  );
}
