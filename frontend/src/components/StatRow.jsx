// Row of plain figures: [{ label, value, note }]
// variant="cards": separate rounded cards with big orange numbers (dashboard, Figma)
// className: extra classes, e.g. "stat-accent" for orange numbers (profile)
export default function StatRow({ items, loading, variant, className = "" }) {
  return (
    <section className={`stat-row ${variant === "cards" ? "stat-cards" : ""} ${className}`} aria-label="Summary">
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <span className="stat-label">{s.label}</span>
          <strong className="stat-value">{loading ? "–" : s.value}</strong>
          {s.note && <span className="stat-note">{loading ? " " : s.note}</span>}
        </div>
      ))}
    </section>
  );
}
