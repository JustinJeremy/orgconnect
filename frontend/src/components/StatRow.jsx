// Row of plain figures: [{ label, value, note }]
export default function StatRow({ items, loading }) {
  return (
    <section className="stat-row" aria-label="Summary">
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
