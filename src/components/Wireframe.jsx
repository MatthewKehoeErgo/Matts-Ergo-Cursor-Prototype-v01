import styles from "./Wireframe.module.css";

export function PageTitle({ eyebrow, title, description }) {
  return (
    <header className={styles.pageHead}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.lede}>{description}</p> : null}
    </header>
  );
}

export function Panel({ title, children, className = "" }) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(" ")}>
      {title ? (
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>{title}</h2>
        </div>
      ) : null}
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

export function PlaceholderBlock({ label, tall }) {
  return (
    <div
      className={[styles.block, tall ? styles.blockTall : ""].filter(Boolean).join(" ")}
      role="img"
      aria-label={label || "Content placeholder"}
    >
      {label ? <span className={styles.blockLabel}>{label}</span> : null}
    </div>
  );
}

export function DataRow({ cells }) {
  return (
    <div className={styles.row} role="row">
      {cells.map((c, i) => (
        <div key={i} className={styles.cell}>
          {c}
        </div>
      ))}
    </div>
  );
}
