// White card with a title row. action goes on the right of the title. tour = name the guided tour points at.
export default function Panel({ title, subtitle, action, className = "", children, id, tour }) {
  return (
    <section className={`panel ${className}`} id={id} data-tour={tour}>
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
