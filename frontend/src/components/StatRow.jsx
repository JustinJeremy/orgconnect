import Icon from "./Icon.jsx";

// Row of plain figures: [{ label, value, note, onClick?, active? }]
// variant="cards": separate rounded cards with big orange numbers (dashboard, Figma)
// className: extra classes, e.g. "stat-accent" for orange numbers (profile)
// An item with onClick is a button (e.g. Profile: open your history)
export default function StatRow({ items, loading, variant, className = "" }) {
  return (
    <section className={`stat-row ${variant === "cards" ? "stat-cards" : ""} ${className}`} aria-label="Summary">
      {items.map((s) => {
        const body = (
          <>
            <span className="stat-label">{s.label}</span>
            <strong className="stat-value">{loading ? "–" : s.value}</strong>
            {s.note && <span className="stat-note">{loading ? " " : s.note}</span>}
          </>
        );
        return s.onClick ? (
          <button type="button" className={`stat stat-link ${s.active ? "is-active" : ""}`} key={s.label} onClick={s.onClick} aria-pressed={Boolean(s.active)}>
            {body}
            <span className="stat-more">View history <Icon name="arrowRight" size={13} /></span>
          </button>
        ) : (
          <div className="stat" key={s.label}>{body}</div>
        );
      })}
    </section>
  );
}
