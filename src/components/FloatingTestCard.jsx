import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import closeSmallIcon from "../../assets/close_small.svg?url";
import dragPanIcon from "../../assets/drag_pan.svg?url";

const CARD_MARGIN = 24;

function currentPrototypeVersionLabel() {
  if (typeof window === "undefined") return "Prototype — Version 2";
  const file = window.location.pathname.split("/").pop()?.toLowerCase() ?? "";
  return file === "sbci-hub-v1.html"
    ? "Prototype — Version 1"
    : "Prototype — Version 2";
}

export function FloatingTestCard() {
  const rootRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panelOpen, setPanelOpen] = useState(() => import.meta.env.DEV);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    draggingRef.current = false;
    setPanelOpen(false);
  }, []);

  const clampPosition = useCallback((nextX, nextY) => {
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 280;
    const h = el?.offsetHeight ?? 140;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    return {
      x: Math.min(Math.max(0, nextX), maxX),
      y: Math.min(Math.max(0, nextY), maxY),
    };
  }, []);

  const anchorBottomRight = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos(
      clampPosition(
        window.innerWidth - w - CARD_MARGIN,
        window.innerHeight - h - CARD_MARGIN,
      ),
    );
  }, [clampPosition]);

  useLayoutEffect(() => {
    if (!panelOpen) return;
    anchorBottomRight();
  }, [panelOpen, anchorBottomRight]);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const next = clampPosition(e.clientX - offsetRef.current.x, e.clientY - offsetRef.current.y);
      setPos(next);
    };

    const endDrag = () => {
      draggingRef.current = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
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

  function handleVersionNav(e, href) {
    e.preventDefault();
    const targetFile =
      href.split("/").pop()?.split("?")[0]?.toLowerCase() ?? "";
    const here =
      window.location.pathname.split("/").pop()?.toLowerCase() ?? "";
    if (targetFile === here) {
      return;
    }
    sessionStorage.setItem("sbci-version-transition", "1");
    window.location.href = href;
  }

  const onHandlePointerDown = (e) => {
    if (e.button !== 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDetailsToggle = useCallback((e) => {
      if (!e.currentTarget.open) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = rootRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const maxBottom = window.innerHeight - CARD_MARGIN;
          if (rect.bottom <= maxBottom) return;
          const overflow = rect.bottom - maxBottom;
          setPos((prev) => clampPosition(prev.x, prev.y - overflow));
        });
      });
  }, [clampPosition]);

  return (
    <>
      {panelOpen ? (
        <aside
          ref={rootRef}
          id="floating-test-card"
          className="floating-test-card"
          style={{ left: pos.x, top: pos.y }}
          aria-hidden="false"
          aria-label="Draggable testing panel"
        >
          <button
            type="button"
            id="close-test-card"
            className="comment-mode-close floating-test-card__panel-close"
            aria-label="Close testing panel"
            onClick={(e) => {
              e.stopPropagation();
              closePanel();
            }}
          >
            <img src={closeSmallIcon} alt="" aria-hidden />
          </button>
          <div
            className="floating-test-card__handle"
            onPointerDown={onHandlePointerDown}
            role="presentation"
          >
            <span className="floating-test-card__grip" aria-hidden>
              <img src={dragPanIcon} alt="" width={18} height={18} />
            </span>
            <h2 className="floating-test-card__title">Review Mode</h2>
          </div>
          <div className="floating-test-card__content">
            <div className="floating-test-card__actions">
              <button
                type="button"
                className="floating-test-card__action floating-test-card__comment-btn"
              >
                <span className="floating-test-card__comment-icon" aria-hidden />
                Add a comment
              </button>
              <Link
                to="/comments-overview"
                className="floating-test-card__action floating-test-card__overview-link"
              >
                View all comments
              </Link>
            </div>
            <details className="floating-test-card__dropdown" onToggle={onDetailsToggle}>
              <summary className="floating-test-card__summary">
                <span>{currentPrototypeVersionLabel()}</span>
                <span className="floating-test-card__caret" aria-hidden />
              </summary>
              <ul className="floating-test-card__links">
                <li>
                  <a
                    href="sbci-hub-v1.html"
                    className="version-switch-link"
                    onClick={(e) => handleVersionNav(e, "sbci-hub-v1.html")}
                  >
                    Prototype — Version 1
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="version-switch-link"
                    onClick={(e) => handleVersionNav(e, "/")}
                  >
                    Prototype — Version 2
                  </a>
                </li>
              </ul>
            </details>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          id="toggle-test-card"
          className="btn-toggle-test-card btn-review-mode-launcher"
          aria-expanded="false"
          aria-controls="floating-test-card"
          onClick={openPanel}
        >
          Review Mode
        </button>
      )}
    </>
  );
}
