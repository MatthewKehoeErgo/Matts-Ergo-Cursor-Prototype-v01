import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  closeSmallIconUrl,
  placedCommentIconUrl,
  submitIconUrl,
} from "../reviewModeAssetUrls.js";
import {
  COORDINATE_SPACE_DOCUMENT,
  COORDINATE_SPACE_SCROLL_ROOT,
  clientPointToRootContent,
  getReviewModeScrollRoot,
  pageAnchorToViewportClientCenter,
} from "../utils/reviewModeScrollRoot.js";
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

/** Viewport (client) center for fixed-position chrome. */
function editorViewportCenter(editor) {
  if (!editor) return { x: 0, y: 0 };
  if (editor.positionAnchor === "viewport") {
    return { x: Number(editor.x), y: Number(editor.y) };
  }
  return pageAnchorToViewportClientCenter(editor);
}

function previewEditorPosition(editor, viewport) {
  if (!editor) return null;

  const { x: vx, y: vy } = editorViewportCenter(editor);
  const cardWidth = Math.min(392, Math.max(240, viewport.width - 120));
  const cardHeight = editor.id != null ? 250 : 208;
  const pinHalf = EDITOR_PIN_SIZE / 2;
  const pinTop = vy - pinHalf;
  const preferredLeft =
    vx < viewport.width / 2
      ? vx + pinHalf + EDITOR_CARD_GAP
      : vx - pinHalf - EDITOR_CARD_GAP - cardWidth;

  return clampPosition(preferredLeft, pinTop, cardWidth, cardHeight, viewport);
}

export function CommentOverlay() {
  const location = useLocation();
  const path = (location.pathname || "").replace(/\/$/, "");
  const isCommentsOverview =
    path === "comments-overview" || path.endsWith("/comments-overview");

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
    resolveOpenEditor,
  } = useReviewMode();
  const firstFieldRef = useRef(null);
  const editorFocusSessionRef = useRef(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const [scrollTick, setScrollTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const bumpScroll = () => setScrollTick((n) => n + 1);
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      bumpScroll();
    };
    window.addEventListener("scroll", bumpScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    const root = getReviewModeScrollRoot();
    root?.addEventListener("scroll", bumpScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", bumpScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      root?.removeEventListener("scroll", bumpScroll);
    };
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

  useLayoutEffect(() => {
    if (!openEditor) {
      editorFocusSessionRef.current = null;
      return;
    }
    const sessionKey =
      openEditor.id != null
        ? `id:${openEditor.id}`
        : `new:${openEditor.x},${openEditor.y}`;
    if (editorFocusSessionRef.current === sessionKey) return;
    editorFocusSessionRef.current = sessionKey;
    firstFieldRef.current?.focus();
  }, [openEditor]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const onDocumentClick = (event) => {
      if (isCommentsOverview) return;

      if (openEditor) {
        if (event.target instanceof Element) {
          if (event.target.closest("[data-review-mode-editor='true']")) return;
          if (event.target.closest("[data-review-mode-ui='true']")) return;
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
      const root = getReviewModeScrollRoot();
      let px;
      let py;
      let coordinateSpace = COORDINATE_SPACE_DOCUMENT;
      if (root) {
        const rel = clientPointToRootContent(event.clientX, event.clientY, root);
        if (rel) {
          px = rel.x;
          py = rel.y;
          coordinateSpace = COORDINATE_SPACE_SCROLL_ROOT;
        }
      }
      if (coordinateSpace === COORDINATE_SPACE_DOCUMENT) {
        px =
          typeof event.pageX === "number"
            ? event.pageX
            : event.clientX + window.scrollX;
        py =
          typeof event.pageY === "number"
            ? event.pageY
            : event.clientY + window.scrollY;
      }
      openEditorForCreate({ x: px, y: py, coordinateSpace });
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
    isCommentsOverview,
    isIgnoredPlacementTarget,
    openEditor,
    openEditorForCreate,
  ]);

  const markers = useMemo(() => {
    if (isCommentsOverview || !panelOpen) return [];
    return comments.filter((comment) => comment.id !== openEditor?.id);
  }, [comments, isCommentsOverview, openEditor?.id, panelOpen]);

  const editorPosition = useMemo(
    () => previewEditorPosition(openEditor, viewport),
    [openEditor, viewport, scrollTick],
  );

  const editorPinCenter = useMemo(
    () => (openEditor ? editorViewportCenter(openEditor) : { x: 0, y: 0 }),
    [openEditor, scrollTick],
  );

  if (typeof document === "undefined") return null;
  if (isCommentsOverview && !commentModeActive && !openEditor) return null;
  if (!panelOpen && !commentModeActive && !openEditor) return null;

  return createPortal(
    <>
      {(panelOpen || openEditor) && !isCommentsOverview && (
        <div className="review-mode-layer" aria-live="polite">
          {markers.map((comment) => {
            const client =
              comment.positionAnchor === "viewport"
                ? { x: Number(comment.x), y: Number(comment.y) }
                : pageAnchorToViewportClientCenter(comment);
            const pos = clampPosition(
              client.x - 24,
              client.y - 24,
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
                <img src={placedCommentIconUrl} alt="" aria-hidden />
              </button>
            );
          })}
        </div>
      )}

      {commentModeActive && !isCommentsOverview && (
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

      {openEditor && editorPosition && !isCommentsOverview && (
        <div className="review-mode-editor-shell" data-review-mode-ui="true">
          <div
            className="review-mode-editor-pin"
            style={{
              left: editorPinCenter.x,
              top: editorPinCenter.y,
            }}
            aria-hidden="true"
          >
            <img src={placedCommentIconUrl} alt="" aria-hidden />
          </div>

          <div
            className={[
              "review-mode-editor-card",
              openEditor.id != null ? "review-mode-editor-card--has-delete" : "",
              openEditor.id != null && openEditor.status !== "resolved"
                ? "review-mode-editor-card--has-resolve"
                : "",
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
              <img src={closeSmallIconUrl} alt="" aria-hidden />
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
              <img src={submitIconUrl} alt="" aria-hidden />
            </button>

            {openEditor.id != null && openEditor.status !== "resolved" && (
              <button
                type="button"
                className="review-mode-editor__resolve"
                aria-label="Resolve comment"
                title="Resolve — remove from prototype, keep in overview"
                data-review-mode-ui="true"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  resolveOpenEditor();
                }}
              >
                Resolve
              </button>
            )}

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
