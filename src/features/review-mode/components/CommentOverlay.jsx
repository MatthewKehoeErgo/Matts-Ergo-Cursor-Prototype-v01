import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import placedCommentIcon from "../assets/Comment - Placed - Icon.svg?url";
import closeSmallIcon from "../assets/close_small.svg?url";
import submitIcon from "../assets/Submit Icon.svg?url";
import { useReviewMode } from "../context/ReviewModeContext.jsx";

const EDITOR_PIN_SIZE = 56 * 0.7;
const EDITOR_CARD_GAP = 16;

function clampPosition(left, top, width, height, viewport) {
  const pad = 8;
  const maxLeft = Math.max(pad, viewport.width - width - pad);
  const maxTop = Math.max(pad, viewport.height - height - pad);
  return {
    left: Math.min(Math.max(pad, left), maxLeft),
    top: Math.min(Math.max(pad, top), maxTop),
  };
}

function previewEditorPosition(editor, viewport) {
  if (!editor) return null;

  const cardWidth = Math.min(392, Math.max(240, viewport.width - 120));
  const cardHeight = editor.id != null ? 250 : 208;
  const pinHalf = EDITOR_PIN_SIZE / 2;
  const pinTop = editor.y - pinHalf;
  const preferredLeft =
    editor.x < viewport.width / 2
      ? editor.x + pinHalf + EDITOR_CARD_GAP
      : editor.x - pinHalf - EDITOR_CARD_GAP - cardWidth;

  return clampPosition(preferredLeft, pinTop, cardWidth, cardHeight, viewport);
}

export function CommentOverlay() {
  const {
    panelOpen,
    commentModeActive,
    comments,
    openEditor,
    isIgnoredPlacementTarget,
    openEditorForCreate,
    openEditorForComment,
    closeEditor,
    exitCommentMode,
    updateOpenEditor,
    saveOpenEditor,
    deleteOpenEditor,
  } = useReviewMode();
  const firstFieldRef = useRef(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.documentElement.classList.toggle(
      "review-mode-placement-active",
      commentModeActive,
    );
    document.body.classList.toggle(
      "review-mode-placement-active",
      commentModeActive,
    );

    return () => {
      document.documentElement.classList.remove("review-mode-placement-active");
      document.body.classList.remove("review-mode-placement-active");
    };
  }, [commentModeActive]);

  useEffect(() => {
    if (!openEditor || !firstFieldRef.current) return;
    firstFieldRef.current.focus();
  }, [openEditor]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const onDocumentClick = (event) => {
      if (openEditor) {
        if (event.target instanceof Element) {
          if (event.target.closest("[data-review-mode-editor='true']")) return;
        }
        event.preventDefault();
        event.stopPropagation();
        closeEditor();
        return;
      }

      if (!commentModeActive) return;
      if (isIgnoredPlacementTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      openEditorForCreate(event.clientX, event.clientY);
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (openEditor) {
        closeEditor();
        return;
      }
      if (commentModeActive) exitCommentMode();
    };

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [
    closeEditor,
    commentModeActive,
    exitCommentMode,
    isIgnoredPlacementTarget,
    openEditor,
    openEditorForCreate,
  ]);

  const markers = useMemo(() => {
    if (!panelOpen) return [];
    return comments.filter((comment) => comment.id !== openEditor?.id);
  }, [comments, openEditor?.id, panelOpen]);

  const editorPosition = useMemo(
    () => previewEditorPosition(openEditor, viewport),
    [openEditor, viewport],
  );

  if (typeof document === "undefined") return null;
  if (!panelOpen && !commentModeActive && !openEditor) return null;

  return createPortal(
    <>
      {(panelOpen || openEditor) && (
        <div className="review-mode-layer" aria-live="polite">
          {markers.map((comment) => {
            const pos = clampPosition(
              comment.x - 24,
              comment.y - 24,
              48,
              48,
              viewport,
            );

            return (
              <button
                key={comment.id}
                type="button"
                className="review-mode-marker"
                style={{ left: pos.left, top: pos.top }}
                aria-label="View or edit comment"
                data-review-mode-ui="true"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openEditorForComment(comment);
                }}
              >
                <img src={placedCommentIcon} alt="" aria-hidden />
              </button>
            );
          })}
        </div>
      )}

      {commentModeActive && (
        <p
          id="review-mode-hint"
          className="review-mode-hint"
          role="status"
          data-review-mode-ui="true"
        >
          Click anywhere to place a comment. Press Esc to cancel, or click Add a
          comment again to leave mode.
        </p>
      )}

      {openEditor && editorPosition && (
        <div className="review-mode-editor-shell" data-review-mode-ui="true">
          <div
            className="review-mode-editor-pin"
            style={{ left: openEditor.x, top: openEditor.y }}
            aria-hidden="true"
          >
            <img src={placedCommentIcon} alt="" aria-hidden />
          </div>

          <div
            className={[
              "review-mode-editor-card",
              openEditor.id != null ? "review-mode-editor-card--has-delete" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: editorPosition.left,
              top: editorPosition.top,
              width: Math.min(392, Math.max(240, viewport.width - 120)),
            }}
            data-review-mode-editor="true"
          >
            <button
              type="button"
              className="review-mode-editor__close"
              aria-label="Close comment"
              data-review-mode-ui="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeEditor();
              }}
            >
              <img src={closeSmallIcon} alt="" aria-hidden />
            </button>

            <div className="review-mode-editor__fields">
              <input
                ref={firstFieldRef}
                type="text"
                className="review-mode-editor__input"
                placeholder="Add your name"
                aria-label="Your name"
                maxLength={120}
                autoComplete="name"
                value={openEditor.authorName || ""}
                onChange={(event) =>
                  updateOpenEditor({ authorName: event.target.value })
                }
              />

              <input
                type="text"
                className="review-mode-editor__input"
                placeholder="Add your position"
                aria-label="Your position"
                maxLength={120}
                autoComplete="organization-title"
                value={openEditor.authorPosition || ""}
                onChange={(event) =>
                  updateOpenEditor({ authorPosition: event.target.value })
                }
              />

              <textarea
                className="review-mode-editor__textarea"
                maxLength={180}
                placeholder="Add a comment"
                value={openEditor.body || ""}
                onChange={(event) =>
                  updateOpenEditor({ body: event.target.value })
                }
              />
            </div>

            <button
              type="button"
              className="review-mode-editor__submit"
              aria-label="Submit comment"
              data-review-mode-ui="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                saveOpenEditor();
              }}
            >
              <img src={submitIcon} alt="" aria-hidden />
            </button>

            {openEditor.id != null && (
              <button
                type="button"
                className="review-mode-editor__delete"
                aria-label="Delete comment"
                title="Delete comment"
                data-review-mode-ui="true"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteOpenEditor();
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  delete
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
