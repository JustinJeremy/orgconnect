// White card with a title row. action goes on the right of the title.
export default function Panel({ title, subtitle, action, className = "", children, id }) {
  return (
    <section className={`panel ${className}`} id={id}>
      {(title || action) && (
        <header className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
