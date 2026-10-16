import Icon from "./Icon.jsx";

// First step of Sign up: pick a path, each on a big illustrated card.
//   join     -> the usual sign-up, applying to the selected org
//   register -> sign up first, then the "Register your organization" form

// The two characters are PNGs in public/images (cut from the uniform illustration), half body:
//   signup-<who>.png        the figure from the head down to mid-shirt, with the right arm removed
//   signup-<who>-upper.png  that sleeve and upper arm (they lift together, like a real raised arm)
//   signup-<who>-arm.png    that forearm (with a round elbow), up to the wrist
//   signup-<who>-hand.png   its hand as drawn (at rest); raised, it's swapped for an open palm (<Palm>)
//   signup-<who>-head.png   head and shoulders, for the small banner on the sign-up form
// On hover the arm swings out at the shoulder and the forearm comes up to wave (App.css,
// "Sign up, step 1"). The arm sits behind the body, so the sleeve always covers the shoulder.
// ART_VERSION goes in the URLs so browsers fetch new files when the images change.
const ART_VERSION = 7;
const img = (file) => `/images/${file}.png?v=${ART_VERSION}`;

// Arm parts, in % of the figure: where each part sits, and its joint in % of the part itself.
// The sleeve + upper arm turns at the shoulder (behind the body, with a shirt-colored fill at the
// joint). The forearm is in front of the body (so the waving hand is never hidden) and repeats
// the shoulder turn, then bends at the elbow: its origin is the shoulder, and (ex, ey) is the
// shoulder-to-elbow distance in % of the forearm image. See .art-fore in App.css.
const ARMS = {
  student: {
    upper: { left: 76.83, top: 53.38, width: 19.21, originX: 42.86, originY: 21.99 },
    fore: { left: 82.32, top: 86.62, width: 16.16, originX: 16.98, originY: -69.66, ex: 24.53, ey: 79.06 },
    // forearm image size, and the wrist (center x, y) and scale for the open palm, in its px
    hand: { w: 53, h: 234, cx: 30.5, wy: 144, k: 0.92 },
  },
  leader: {
    upper: { left: 76.25, top: 44.92, width: 21.9, originX: 30.12, originY: 22.14 },
    fore: { left: 82.59, top: 82.15, width: 16.36, originX: 1.61, originY: -65.94, ex: 42.74, ey: 75.36 },
    hand: { w: 62, h: 276, cx: 35, wy: 163, k: 1.12 },
  },
};

const place = (p) => ({
  left: `${p.left}%`,
  top: `${p.top}%`,
  width: `${p.width}%`,
  transformOrigin: `${p.originX}% ${p.originY}%`,
  ...(p.ex !== undefined && { "--ex": `${p.ex}%`, "--ey": `${p.ey}%` }),
});

// Open palm facing the viewer (a high five), drawn in the forearm's own frame: wrist at the top,
// fingers pointing down the arm and the thumb on the outside. Raised, the fingers point up and
// the thumb faces the head.
const SKIN = "#f19975";
const CREASE = "#c9714f";

function Finger({ x, len, w, rot }) {
  return <rect x={x - w / 2} y="40" width={w} height={len + 6} rx={w / 2} transform={`rotate(${rot} ${x} 44)`} />;
}

function Palm({ hand }) {
  return (
    <svg className="art-palm" viewBox={`0 0 ${hand.w} ${hand.h}`} aria-hidden="true">
      <g transform={`translate(${hand.cx} ${hand.wy}) scale(${hand.k})`} fill={SKIN}>
        <rect x="-20" y="-8" width="40" height="16" rx="6" />
        <Finger x={-18} len={30} w={11} rot={12} />
        <Finger x={-6.5} len={41} w={11.5} rot={4} />
        <Finger x={5.5} len={45} w={11.5} rot={-2} />
        <Finger x={17.5} len={40} w={11} rot={-9} />
        <rect x="14" y="10" width="13" height="38" rx="6.5" transform="rotate(-42 20 16)" />
        <rect x="-25" y="0" width="50" height="50" rx="16" />
        <path d="M-16 30q13 9 28 1" fill="none" stroke={CREASE} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
        <path d="M-6 47v-6M5.5 48v-7M17 46v-6" fill="none" stroke={CREASE} strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
      </g>
    </svg>
  );
}

function Figure({ who, head }) {
  if (head) return <img className="art-img" src={img(`signup-${who}-head`)} alt="" draggable="false" />;
  const arm = ARMS[who];
  // .art-figure gets the hover hop and idle float; .art-upper and .art-fore make the wave
  return (
    <span className="art-figure art-waver">
      <img className="art-upper" src={img(`signup-${who}-upper`)} alt="" draggable="false" style={place(arm.upper)} />
      <img className="art-img" src={img(`signup-${who}`)} alt="" draggable="false" />
      <span className="art-fore" style={place(arm.fore)}>
        <img src={img(`signup-${who}-arm`)} alt="" draggable="false" />
        <img className="art-hand" src={img(`signup-${who}-hand`)} alt="" draggable="false" />
        <Palm hand={arm.hand} />
      </span>
    </span>
  );
}

export function StudentArt({ head = false }) {
  return <Figure who="student" head={head} />;
}

export function LeaderArt({ head = false }) {
  return <Figure who="leader" head={head} />;
}

const CHOICES = [
  { key: "join", title: "Join an organization", who: "I'm a student", Art: StudentArt },
  { key: "register", title: "Register my organization", who: "I lead a student org", Art: LeaderArt },
];

export default function SignUpChooser({ onChoose, onSignIn }) {
  return (
    <div className="signup-chooser">
      <div className="auth-heading">
        <h2>What brings you to OrgConnect?</h2>
        <p>Choose one to get started.</p>
      </div>

      <div className="signup-choices">
        {CHOICES.map(({ key, title, who, Art }) => (
          <button key={key} type="button" className={`signup-choice is-${key}`} onClick={() => onChoose(key)}>
            <span className="signup-choice-head">
              <span className="signup-choice-text">
                <strong>{title}</strong>
                <span>{who}</span>
              </span>
              <Icon name="arrowRight" size={18} />
            </span>
            <span className="signup-choice-art"><Art /></span>
          </button>
        ))}
      </div>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="link-btn" onClick={onSignIn}>Sign in</button>
      </p>
    </div>
  );
}
