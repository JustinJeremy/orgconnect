import { useState } from "react";
import { Ring } from "./Rings.jsx";

// The four decorative shapes in the homepage hero.
//
// To use your own PNGs, put them in  public/images/  with these names:
//   hero-top-left.png, hero-top-right.png, hero-bottom-left.png, hero-bottom-right.png
// If a file is missing, a built-in ring shape is shown instead.
// Size and position of each shape are set in App.css (.hero-shape.tl / .tr / .bl / .br).

const SHAPES = [
  { pos: "tl", file: "hero-top-left.png", ring: { kind: "c", from: "#A5B4FC", to: "#BAE6FD", rotate: 150 } },
  { pos: "tr", file: "hero-top-right.png", ring: { kind: "o", from: "#99F6E4", to: "#BAE6FD", rotate: 0 } },
  { pos: "bl", file: "hero-bottom-left.png", ring: { kind: "o", from: "#BAE6FD", to: "#A5B4FC", rotate: 0 } },
  { pos: "br", file: "hero-bottom-right.png", ring: { kind: "c", from: "#A5B4FC", to: "#99F6E4", rotate: -30 } },
];

function Shape({ pos, file, ring }) {
  const [missing, setMissing] = useState(false);

  return (
    <div className={`hero-shape ${pos}`}>
      {missing ? (
        <Ring kind={ring.kind} from={ring.from} to={ring.to} size="100%" style={{ transform: `rotate(${ring.rotate}deg)` }} />
      ) : (
        <img src={`/images/${file}`} alt="" onError={() => setMissing(true)} />
      )}
    </div>
  );
}

export default function HeroShapes() {
  return (
    <div className="hero-shapes" aria-hidden="true">
      {SHAPES.map((s) => (
        <Shape key={s.pos} {...s} />
      ))}
    </div>
  );
}
