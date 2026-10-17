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
  // Original characters in the style of anime, cartoons and movies
  { id: "anime", label: "Anime hero", bg: "#ffe08a", skin: "#f1b98a", hair: "#f28c1e", shirt: "#1b3a6b" },
  { id: "ninja", label: "Ninja", bg: "#b8c4d6", skin: "#e9a35f", hair: "#1f2328", shirt: "#2a2f45" },
  { id: "wizard", label: "Wizard", bg: "#c9b8f0", skin: "#f1b98a", hair: "#3b2a1e", shirt: "#4a3290" },
  { id: "astronaut", label: "Astronaut", bg: "#1b2a4a", skin: "#e9a35f", hair: "#1f2328", shirt: "#eef2f7" },
  { id: "hero", label: "Superhero", bg: "#ffd35c", skin: "#b9733f", hair: "#1f2328", shirt: "#d62839" },
  { id: "pirate", label: "Pirate", bg: "#8fd3f4", skin: "#e9a35f", hair: "#3b2a1e", shirt: "#fffaf3" },
  { id: "detective", label: "Detective", bg: "#d9c3a0", skin: "#f1b98a", hair: "#3b2a1e", shirt: "#6e5330" },
  { id: "magical", label: "Magical girl", bg: "#ffd1e8", skin: "#f1b98a", hair: "#e85d9e", shirt: "#fffaf3" },
  { id: "princess", label: "Princess", bg: "#bfe3ff", skin: "#e9a35f", hair: "#f2c14e", shirt: "#7b5cd6" },
  { id: "witch", label: "Witch", bg: "#b7e4c7", skin: "#f1b98a", hair: "#6b3a1f", shirt: "#3a2f6b" },
  { id: "catears", label: "Cat ears", bg: "#ffc9a3", skin: "#b9733f", hair: "#1f2328", shirt: "#f58a1f" },
];

// These have long hair behind the head
const LONG_HAIR_BACK = ["bow", "princess", "witch"];

const SHORT_HAIR = "M28 46c-2-16 9-26 22-26s24 10 22 26c-6-8-14-12-22-12s-16 4-22 12z";
const BOB_HAIR = "M26 52c-3-21 10-32 24-32s27 11 24 32v8c-3 0-5-2-5-6v-8c-6-5-13-9-19-9s-13 4-19 9v8c0 4-2 6-5 6z";

// Hair and accessories drawn behind the head
function HairBack({ style, hair }) {
  if (LONG_HAIR_BACK.includes(style)) return <path d="M26 52c-3-21 10-32 24-32s27 11 24 32v30H26z" fill={hair} />;
  if (style === "bun") return <circle cx="50" cy="20" r="9" fill={hair} />;
  if (style === "pigtails") return <><circle cx="26" cy="32" r="9" fill={hair} /><circle cx="74" cy="32" r="9" fill={hair} /></>;
  if (style === "magical") return <><ellipse cx="22" cy="58" rx="8" ry="20" fill={hair} /><ellipse cx="78" cy="58" rx="8" ry="20" fill={hair} /></>;
  if (style === "ninja") return <path d="M70 40l18 2-14 8z" fill="#1b3a6b" />;
  if (style === "astronaut") return <circle cx="50" cy="46" r="32" fill="#dfe8f2" />;
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
    case "anime":
      // Big swept spikes
      return <path d="M24 50l-5-21 13 5-3-19 13 11 6-19 8 17 12-13v17l14-3-8 14 6 11c-8-11-17-17-29-17s-21 6-27 17z" fill={hair} />;
    case "ninja":
      return (
        <>
          <path d={SHORT_HAIR} fill={hair} />
          <rect x="27" y="34" width="46" height="8" rx="2" fill="#1b3a6b" />
          <rect x="42" y="34.5" width="16" height="7" rx="1.5" fill="#c9d1d9" />
          <path d="M47 38h6" stroke="#6b7685" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
    case "wizard":
      return (
        <>
          <path d={SHORT_HAIR} fill={hair} />
          <path d="M28 34L52 -4l20 38z" fill="#5b3fa8" />
          <ellipse cx="50" cy="34" rx="30" ry="5" fill="#4a3290" />
          <circle cx="52" cy="16" r="3" fill="#ffd35c" />
          <circle cx="44" cy="26" r="2" fill="#ffd35c" />
        </>
      );
    case "astronaut":
      return (
        <>
          <path d={SHORT_HAIR} fill={hair} />
          <circle cx="50" cy="46" r="30" fill="none" stroke="#b8c4d6" strokeWidth="4" />
          <path d="M33 26q8-7 17-7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <rect x="47" y="8" width="6" height="8" rx="2" fill="#b8c4d6" />
        </>
      );
    case "hero":
      return (
        <>
          <path d={SHORT_HAIR} fill={hair} />
          <path d="M29 44q21-6 42 0v9q-21 6-42 0z" fill="#1b3a6b" />
          <ellipse cx="43" cy="49" rx="4.5" ry="3.5" fill="#fff" />
          <ellipse cx="57" cy="49" rx="4.5" ry="3.5" fill="#fff" />
        </>
      );
    case "pirate":
      return (
        <>
          <path d="M27 42c0-14 10-21 23-21s23 7 23 21z" fill="#c0392b" />
          <path d="M71 34l12 4-9 6z" fill="#c0392b" />
          <g fill="#fff">{[[38, 30], [50, 27], [62, 30]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2" />)}</g>
        </>
      );
    case "detective":
      return (
        <>
          <path d={SHORT_HAIR} fill={hair} />
          <path d="M28 38c0-12 10-19 22-19s22 7 22 19z" fill="#8a6a3b" />
          <path d="M22 37h56a3 3 0 0 1 0 6H22a3 3 0 0 1 0-6z" fill="#6e5330" />
          <rect x="28" y="33" width="44" height="4" fill="#4a3820" />
        </>
      );
    case "magical":
      return (
        <>
          <path d={BOB_HAIR} fill={hair} />
          <path d="M36 21l2 5 5 .5-4 3.5 1.5 5-4.5-3-4.5 3 1.5-5-4-3.5 5-.5z" fill="#ffd35c" />
        </>
      );
    case "princess":
      return (
        <>
          <path d={BOB_HAIR} fill={hair} />
          <path d="M37 27l3-10 5 6 5-9 5 9 5-6 3 10z" fill="#ffd35c" />
          <circle cx="50" cy="21" r="1.8" fill="#e2508a" />
        </>
      );
    case "witch":
      return (
        <>
          <path d={BOB_HAIR} fill={hair} />
          <path d="M33 31L60 -6l8 37z" fill="#3a2f6b" />
          <ellipse cx="50" cy="31" rx="32" ry="5" fill="#2b2350" />
          <path d="M37 28h28" stroke="#9be3c9" strokeWidth="3" />
        </>
      );
    case "catears":
      return (
        <>
          <path d="M29 33l1-19 13 11zM71 33l-1-19-13 11z" fill={hair} />
          <path d="M32 28l1-9 6 5zM68 28l-1-9-6 5z" fill="#ff9cbf" />
          <path d={BOB_HAIR} fill={hair} />
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
          {a.id === "pirate" && (
            <>
              <path d="M30 40l40 14" stroke="#1f2328" strokeWidth="1.8" />
              <ellipse cx="57" cy="49" rx="5.5" ry="5" fill="#1f2328" />
            </>
          )}
          <path d="M45 57q5 5 10 0" fill="none" stroke="#1f2328" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

// A user's avatar: their own photo, their character, or otherwise their initials (as before;
// also when they chose "initials")
export function UserAvatar({ user, className = "" }) {
  if (user?.avatar === "photo" && user.avatarUrl) {
    return (
      <span className={`avatar has-art ${className}`}>
        <img className="avatar-photo" src={user.avatarUrl} alt="" />
      </span>
    );
  }
  if (user?.avatar && user.avatar !== "photo" && user.avatar !== "initials") {
    return (
      <span className={`avatar has-art ${className}`}>
        <AvatarArt id={user.avatar} size="100%" />
      </span>
    );
  }
  return <span className={`avatar ${className}`}>{initials(user?.name || "")}</span>;
}
