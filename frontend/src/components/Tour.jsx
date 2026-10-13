import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 12; // between the highlighted element and the card
const EDGE = 16; // minimum distance from the window edge
const CARD_HEIGHT = 290; // about how tall the card is, to leave room for it under the element

const isVisible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};

// Guided tour: dims the page, highlights one element per step and explains it in a card.
// steps: [{ title, body, section?, page?, click?, target? }] (see data/tourSteps.js)
// It opens each step's page, clicks its tab if needed, then waits for the element to appear.
// A step whose element isn't on screen (e.g. an empty list, the sidebar on a phone) shows the card centered.
export default function Tour({ steps, page, onNavigate, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null); // highlighted box, null = no highlight
  const [ready, setReady] = useState(false); // false while moving to the next step
  const [cardPos, setCardPos] = useState(null);
  const targetRef = useRef(null);
  const cardRef = useRef(null);
  const titleId = useId();

  const step = steps[index];
  const last = index === steps.length - 1;

  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Find the step's element: open its page, click its tab, then look for it for up to ~2 seconds
  useEffect(() => {
    setReady(false);
    targetRef.current = null;
    if (step.page && step.page !== page) {
      onNavigate(step.page); // this effect runs again once the page has changed
      return;
    }

    let cancelled = false;
    let timer;
    let tries = 0;
    const clickAndFind = () => {
      if (cancelled) return;
      if (step.click && tries === 0) document.querySelector(step.click)?.click();
      const el = step.target ? document.querySelector(step.target) : null;
      if (el && isVisible(el)) {
        targetRef.current = el;
        // Scroll so the element and the card under it are both in view (or just center a very tall element)
        const r = el.getBoundingClientRect();
        const space = window.innerHeight - r.height - GAP - CARD_HEIGHT;
        const top = space > 2 * EDGE ? space / 2 : (window.innerHeight - r.height) / 2;
        window.scrollTo({ top: window.scrollY + r.top - Math.max(EDGE, top), behavior: "smooth" });
        timer = setTimeout(() => {
          if (cancelled) return;
          setRect(el.getBoundingClientRect());
          setReady(true);
        }, 350);
      } else if (step.target && tries++ < 20) {
        timer = setTimeout(clickAndFind, 100);
      } else {
        setRect(null);
        setReady(true);
      }
    };
    timer = setTimeout(clickAndFind, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, page]);

  // Keep the highlight on the element while the page scrolls or the window resizes
  useEffect(() => {
    const update = () => targetRef.current && setRect(targetRef.current.getBoundingClientRect());
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Keyboard: → / Enter next, ← back, Esc leave
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  // Place the card below the element, else above, else beside it; centered when nothing is highlighted
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !ready) return;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect) return setCardPos({ left: (vw - w) / 2, top: Math.max(EDGE, (vh - h) / 2) });

    const left = Math.min(Math.max(EDGE, rect.left), vw - w - EDGE);
    const sideTop = Math.min(Math.max(EDGE, rect.top), vh - h - EDGE);
    if (rect.bottom + GAP + h <= vh - EDGE) return setCardPos({ left, top: rect.bottom + GAP });
    if (rect.top - GAP - h >= EDGE) return setCardPos({ left, top: rect.top - GAP - h });
    if (rect.right + GAP + w <= vw - EDGE) return setCardPos({ left: rect.right + GAP, top: sideTop });
    if (rect.left - GAP - w >= EDGE) return setCardPos({ left: rect.left - GAP - w, top: sideTop });
    // No free side: sit at the bottom of the window, over the lower edge of the element
    setCardPos({ left: (vw - w) / 2, top: vh - h - EDGE });
  }, [rect, ready, index]);

  // Move keyboard focus to the card for each new step
  useEffect(() => {
    if (ready) cardRef.current?.focus({ preventScroll: true });
  }, [ready, index]);

  return createPortal(
    <div className="tour" role="presentation">
      {/* Blocks clicks on the page while the tour runs; dims it when nothing is highlighted */}
      <div className={`tour-backdrop ${ready && rect ? "" : "dim"}`} onClick={(e) => e.stopPropagation()} />
      {ready && rect && (
        <div
          className="tour-spotlight"
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={ready && cardPos ? cardPos : { visibility: "hidden" }}
      >
        <p className="tour-step">
          {step.section && <span>{step.section} · </span>}
          Step {index + 1} of {steps.length}
        </p>
        <h2 id={titleId}>{step.title}</h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="tour-actions">
          {!last && (
            <button type="button" className="link-btn muted-link" onClick={onClose}>
              Skip tour
            </button>
          )}
          <div className="tour-nav">
            {index > 0 && (
              <button type="button" className="btn btn-outline btn-sm" onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={next}>
              {last ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
