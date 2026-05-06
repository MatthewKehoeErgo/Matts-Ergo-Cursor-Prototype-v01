import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import addCommentIcon from "../../assets/add_comment.svg?url";
import styles from "./FloatingTestCard.module.css";

const CARD_MARGIN = 24;

export function FloatingTestCard() {
  const rootRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });

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
    anchorBottomRight();
  }, [anchorBottomRight]);

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
    const onResize = () => anchorBottomRight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anchorBottomRight]);

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

  return (
    <aside
      ref={rootRef}
      id="floating-test-card"
      className={`${styles.card} floating-test-card`}
      style={{ left: pos.x, top: pos.y }}
      aria-label="Draggable test card"
    >
      <div
        className={styles.handle}
        onPointerDown={onHandlePointerDown}
        role="presentation"
      >
        <span className={styles.grip} aria-hidden />
        <h2 className={styles.heading}>Test Details</h2>
      </div>
      <div className={styles.content}>
        <button
          type="button"
          className={`${styles.commentBtn} floating-test-card__comment-btn`}
        >
          <img src={addCommentIcon} alt="" width={18} height={18} />
          Add a comment
        </button>
        <details className={styles.dropdown}>
          <summary className={styles.summary}>
            <span>Prototype Version</span>
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
  );
}
