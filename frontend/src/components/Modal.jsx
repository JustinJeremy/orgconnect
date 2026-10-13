import { useEffect, useId, useRef } from "react";
import Icon from "./Icon.jsx";

// Dialog shell used by every form. Pass onSubmit to render it as a <form>.
export default function Modal({ title, subtitle, onClose, onSubmit, footer, size = "md", children }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Focus the first field once, close on Escape, stop the page behind from scrolling
  useEffect(() => {
    const first = ref.current?.querySelector("input:not([type=checkbox]):not([type=radio]), textarea, select");
    (first || ref.current)?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  const Tag = onSubmit ? "form" : "div";

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Tag
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
        onSubmit={onSubmit}
        noValidate={onSubmit ? true : undefined}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn sm" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </Tag>
    </div>
  );
}
