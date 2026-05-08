import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import closeSmallIcon from "../../assets/close_small.svg?url";
import dragPanIcon from "../../assets/drag_pan.svg?url";
import styles from "./FloatingTestCard.module.css";

const CARD_MARGIN = 24;

function currentPrototypeVersionLabel() {
  if (typeof window === "undefined") return "Prototype — Version 1";
  const file = window.location.pathname.split("/").pop()?.toLowerCase() ?? "";
  return file === "prototype-v2.html"
    ? "Prototype — Version 2"
    : "Prototype — Version 1";
}

export function FloatingTestCard() {
  const rootRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [panelOpen, setPanelOpen] = useState(false);

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
    if (
      targetFile === here ||
      (here === "" && targetFile === "index.html") ||
      (here === "react-app.html" && targetFile === "index.html")
    ) {
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
      <button
        type="button"
        id="toggle-test-card"
        className={`btn-toggle-test-card btn-review-mode-launcher ${panelOpen ? "is-hidden" : ""}`}
        onClick={() => setPanelOpen(true)}
      >
        Review Mode
      </button>
      <aside
        ref={rootRef}
        id="floating-test-card"
        className={`${styles.card} floating-test-card ${panelOpen ? "" : "is-hidden"}`}
        style={{ left: pos.x, top: pos.y }}
        aria-hidden={!panelOpen}
        aria-label="Draggable testing panel"
      >
        <button
          type="button"
          id="close-test-card"
          className={`comment-mode-close floating-test-card__panel-close ${styles.panelClose}`}
          aria-label="Close testing panel"
          onClick={(e) => {
            e.stopPropagation();
            setPanelOpen(false);
          }}
        >
          <img src={closeSmallIcon} alt="" aria-hidden />
        </button>
        <div
          className={`${styles.handle} floating-test-card__handle`}
          onPointerDown={onHandlePointerDown}
          role="presentation"
        >
          <span className={styles.grip} aria-hidden>
            <img src={dragPanIcon} alt="" width={18} height={18} />
          </span>
          <h2 className={styles.heading}>Review Mode</h2>
        </div>
      <div className={styles.content}>
        <button
          type="button"
          className={`${styles.commentBtn} floating-test-card__comment-btn`}
        >
          <span className="floating-test-card__comment-icon" aria-hidden />
          Add a comment
        </button>
        <details className={styles.dropdown} onToggle={onDetailsToggle}>
          <summary className={styles.summary}>
            <span>{currentPrototypeVersionLabel()}</span>
            <span className={styles.caret} aria-hidden />
          </summary>
          <ul className={styles.links}>
            <li>
              <a
                href="index.html"
                className={styles.versionLink}
                onClick={(e) => handleVersionNav(e, "index.html")}
              >
                Prototype — Version 1
              </a>
            </li>
            <li>
              <a
                href="prototype-v2.html"
                className={styles.versionLink}
                onClick={(e) => handleVersionNav(e, "prototype-v2.html")}
              >
                Prototype Version 2
              </a>
            </li>
          </ul>
        </details>
      </div>
    </aside>
    </>
  );
}
