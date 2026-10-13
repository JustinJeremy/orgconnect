import Icon from "./Icon.jsx";

export default function EmptyState({ icon = "file", title, text, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      {!compact && (
        <span className="empty-icon">
          <Icon name={icon} size={20} />
        </span>
      )}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
