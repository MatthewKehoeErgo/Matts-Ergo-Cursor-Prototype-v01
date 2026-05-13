import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import closeSmallIcon from "../assets/close_small.svg?url";
import dragPanIcon from "../assets/drag_pan.svg?url";

const PANEL_MARGIN = 24;

export function ReviewModePanel({
  panelOpen,
  commentModeActive,
  currentVersionLabel,
  versionOptions,
  onOpenPanel,
  onClosePanel,
  onToggleCommentMode,
  onOpenOverview,
  onOpenVersion,
}) {
  const rootRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const clampPosition = useCallback((nextX, nextY) => {
    const el = rootRef.current;
    const width = el?.offsetWidth ?? 320;
    const height = el?.offsetHeight ?? 160;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return {
      x: Math.min(Math.max(0, nextX), maxX),
      y: Math.min(Math.max(0, nextY), maxY),
    };
  }, []);

  const anchorBottomRight = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    setPos(
      clampPosition(
        window.innerWidth - el.offsetWidth - PANEL_MARGIN,
        window.innerHeight - el.offsetHeight - PANEL_MARGIN,
      ),
    );
  }, [clampPosition]);

  useLayoutEffect(() => {
    if (!panelOpen) return;
    anchorBottomRight();
  }, [anchorBottomRight, panelOpen]);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!draggingRef.current) return;
      const next = clampPosition(
        event.clientX - offsetRef.current.x,
        event.clientY - offsetRef.current.y,
      );
      setPos(next);
    };

    const endDrag = () => {
      draggingRef.current = false;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [clampPosition]);

  useEffect(() => {
    const onResize = () => {
      if (!panelOpen) return;
      anchorBottomRight();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anchorBottomRight, panelOpen]);

  const onHandlePointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    offsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onDetailsToggle = useCallback(
    (event) => {
      if (!event.currentTarget.open) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = rootRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const maxBottom = window.innerHeight - PANEL_MARGIN;
          if (rect.bottom <= maxBottom) return;
          const overflow = rect.bottom - maxBottom;
          setPos((current) => clampPosition(current.x, current.y - overflow));
        });
      });
    },
    [clampPosition],
  );

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="review-mode-launcher"
        aria-expanded="false"
        aria-controls="review-mode-panel"
        data-review-mode-ui="true"
        onClick={onOpenPanel}
      >
        Review Mode
      </button>
    );
  }

  return (
    <aside
      ref={rootRef}
      id="review-mode-panel"
      className="review-mode-panel"
      style={{ left: pos.x, top: pos.y }}
      aria-label="Draggable review mode panel"
      data-review-mode-ui="true"
    >
      <button
        type="button"
        className="review-mode-panel__close"
        aria-label="Close review mode panel"
        data-review-mode-ui="true"
        onClick={onClosePanel}
      >
        <img src={closeSmallIcon} alt="" aria-hidden />
      </button>

      <div
        className="review-mode-panel__handle"
        role="presentation"
        data-review-mode-ui="true"
        onPointerDown={onHandlePointerDown}
      >
        <span className="review-mode-panel__grip" aria-hidden>
          <img src={dragPanIcon} alt="" width={18} height={18} />
        </span>
        <h2 className="review-mode-panel__title">Review Mode</h2>
      </div>

      <div className="review-mode-panel__content">
        <div className="review-mode-panel__actions">
          <button
            type="button"
            className={[
              "review-mode-panel__action",
              "review-mode-panel__comment-btn",
              commentModeActive ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-review-mode-ui="true"
            onClick={onToggleCommentMode}
          >
            <span className="review-mode-panel__comment-icon" aria-hidden />
            Add a comment
          </button>

          <button
            type="button"
            className="review-mode-panel__action"
            data-review-mode-ui="true"
            onClick={onOpenOverview}
          >
            View all comments
          </button>
        </div>

        <details
          className="review-mode-panel__dropdown"
          data-review-mode-ui="true"
          onToggle={onDetailsToggle}
        >
          <summary className="review-mode-panel__summary">
            <span>{currentVersionLabel}</span>
            <span className="review-mode-panel__caret" aria-hidden />
          </summary>

          <ul className="review-mode-panel__version-list">
            {versionOptions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="review-mode-panel__version-link"
                  data-review-mode-ui="true"
                  onClick={() => onOpenVersion(option.id)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  );
}
