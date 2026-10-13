// Underlined tabs. items: [{ key, label, count? }]
export default function Tabs({ items, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          data-tour={`tab-${item.key}`}
          className={value === item.key ? "active" : ""}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {item.count > 0 && <span className="tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
