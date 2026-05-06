import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./FloatingTestCard.module.css";

export function FloatingTestCard() {
  const rootRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 24, y: 96 });

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
    const onResize = () => setPos((p) => clampPosition(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPosition]);

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
      className={styles.card}
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
      <p className={styles.body}>Testing if deployment is working</p>
    </aside>
  );
}
