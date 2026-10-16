import { initials } from "../utils/format.js";

// Avatar characters, in the same flat style as the sign-up characters (SignUpChooser.jsx).
// The keys are stored on the user (users.avatar) and must match User::AVATARS in the backend.
// Each one: background color, skin, hair color, shirt color and a hair/accessory style.
export const AVATARS = [
  { id: "bun", label: "Bun", bg: "#9fd0f0", skin: "#e9a35f", hair: "#1f2328", shirt: "#1b3a6b" },
  { id: "cap", label: "Cap", bg: "#f8a649", skin: "#f1b98a", hair: "#3b2a1e", shirt: "#fffaf3" },
  { id: "headband", label: "Headband", bg: "#ffd35c", skin: "#f1b98a", hair: "#6b3a1f", shirt: "#1b3a6b" },
  { id: "glasses", label: "Glasses", bg: "#ffc9a3", skin: "#e9a35f", hair: "#1f2328", shirt: "#2a4c80" },
  { id: "curly", label: "Curly", bg: "#9be3c9", skin: "#b9733f", hair: "#1f2328", shirt: "#f58a1f" },
  { id: "pigtails", label: "Pigtails", bg: "#f7a8c8", skin: "#f1b98a", hair: "#6b3a1f", shirt: "#fffaf3" },
  { id: "spiky", label: "Spiky", bg: "#2a4c80", skin: "#e9a35f", hair: "#1f2328", shirt: "#f58a1f" },
  { id: "bow", label: "Bow", bg: "#c7c3f5", skin: "#f1b98a", hair: "#3b2a1e", shirt: "#1b3a6b" },
];

const SHORT_HAIR = "M28 46c-2-16 9-26 22-26s24 10 22 26c-6-8-14-12-22-12s-16 4-22 12z";
const BOB_HAIR = "M26 52c-3-21 10-32 24-32s27 11 24 32v8c-3 0-5-2-5-6v-8c-6-5-13-9-19-9s-13 4-19 9v8c0 4-2 6-5 6z";

// Hair and accessories drawn behind the head
function HairBack({ style, hair }) {
  if (style === "bow") return <path d="M26 52c-3-21 10-32 24-32s27 11 24 32v30H26z" fill={hair} />;
  if (style === "bun") return <circle cx="50" cy="20" r="9" fill={hair} />;
  if (style === "pigtails") return <><circle cx="26" cy="32" r="9" fill={hair} /><circle cx="74" cy="32" r="9" fill={hair} /></>;
  return null;
}

// Hair and accessories drawn on top of the head
function HairFront({ style, hair }) {
  switch (style) {
    case "cap":
      return (
        <>
          <path d="M27 42c0-14 10-22 23-22s23 8 23 22z" fill="#1fa58a" />
          <path d="M50 38h28a4 4 0 0 1 0 8H50z" fill="#1fa58a" />
          <circle cx="50" cy="20" r="2.5" fill="#1fa58a" />
        </>
      );
    case "headband":
      return (
        <>
          <path d={BOB_HAIR} fill={hair} />
          <path d="M29 37c6-8 13-11 21-11s15 3 21 11" fill="none" stroke="#ff6fa3" strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case "curly":
      return (
        <g fill={hair}>
          {[[31, 40], [36, 31], [44, 26], [52, 25], [60, 27], [67, 33], [70, 41]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="7.5" />
          ))}
        </g>
      );
    case "spiky":
      return <path d="M28 46l1-15 7 6 3-13 7 9 4-13 4 13 7-9 3 13 7-6 1 15c-6-8-14-12-22-12s-16 4-22 12z" fill={hair} />;
    case "bow":
      return (
        <>
          <path d={BOB_HAIR} fill={hair} />
          <path d="M60 26l-9-6v12zM60 26l9-6v12z" fill="#ff6fa3" />
          <circle cx="60" cy="26" r="3" fill="#e2508a" />
        </>
      );
    default: // bun, glasses, pigtails
      return <path d={SHORT_HAIR} fill={hair} />;
  }
}

// The character itself, as a round badge. className "art-head" / "art-eyes" pick up the
// same bob and blink animations as the sign-up characters.
export function AvatarArt({ id, size = 40, className = "" }) {
  const a = AVATARS.find((x) => x.id === id) || AVATARS[0];
  const clip = `avatar-clip-${a.id}`;
  return (
    <svg className={`avatar-art ${className}`} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={clip}><circle cx="50" cy="50" r="50" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <circle cx="50" cy="50" r="50" fill={a.bg} />
        <HairBack style={a.id} hair={a.hair} />
        <path d="M14 104c0-20 16-31 36-31s36 11 36 31z" fill={a.shirt} />
        <rect x="43" y="60" width="14" height="15" rx="4" fill={a.skin} />
        <g className="art-head">
          <circle cx="28" cy="49" r="5" fill={a.skin} />
          <circle cx="72" cy="49" r="5" fill={a.skin} />
          <circle cx="50" cy="46" r="22" fill={a.skin} />
          <HairFront style={a.id} hair={a.hair} />
          <circle cx="37" cy="54" r="3.5" fill="#ff7a7a" opacity="0.45" />
          <circle cx="63" cy="54" r="3.5" fill="#ff7a7a" opacity="0.45" />
          <g className="art-eyes">
            <circle cx="43" cy="49" r="2.4" fill="#1f2328" />
            <circle cx="57" cy="49" r="2.4" fill="#1f2328" />
          </g>
          {a.id === "glasses" && (
            <g fill="none" stroke="#1f2328" strokeWidth="2">
              <circle cx="43" cy="49" r="6" />
              <circle cx="57" cy="49" r="6" />
              <path d="M49 49h2" />
            </g>
          )}
          <path d="M45 57q5 5 10 0" fill="none" stroke="#1f2328" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

// A user's avatar: their own photo, their character, or otherwise their initials (as before)
export function UserAvatar({ user, className = "" }) {
  if (user?.avatar === "photo" && user.avatarUrl) {
    return (
      <span className={`avatar has-art ${className}`}>
        <img className="avatar-photo" src={user.avatarUrl} alt="" />
      </span>
    );
  }
  if (user?.avatar && user.avatar !== "photo") {
    return (
      <span className={`avatar has-art ${className}`}>
        <AvatarArt id={user.avatar} size="100%" />
      </span>
    );
  }
  return <span className={`avatar ${className}`}>{initials(user?.name || "")}</span>;
}
