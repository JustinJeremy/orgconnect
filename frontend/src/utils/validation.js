// What each text field may contain, so it only takes what it's for.
// The server checks the same patterns (backend/app/Rules/TextFormat.php).
//   name      people's names: letters, spaces and . , ' -   (Ma. Clara Dela Cruz-O'Neil, Jr.)
//   course    letters only, like BSIT or BSCpE
//   orgName   words, may include numbers and . , & ' - ( ) /
//   shortName letters and numbers, like JPCS or CS2
//   college   letters, spaces and . , & ' - ( )
//   words     any text, but with words in it, not only numbers or symbols
const KINDS = {
  name: {
    pattern: /^\p{L}[\p{L}\p{M} .,'’-]*$/u,
    allowed: /[^\p{L}\p{M} .,'’-]/gu,
    message: (label) => `${label} can only have letters, spaces and . , ' - (no numbers or symbols).`,
  },
  course: {
    pattern: /^\p{L}[\p{L} ]*$/u,
    allowed: /[^\p{L} ]/gu,
    message: () => "A course can only have letters, like BSIT or BSCpE.",
  },
  orgName: {
    pattern: /^(?=.*\p{L})[\p{L}\p{M}\p{N} .,&'’()/–—-]+$/u,
    allowed: /[^\p{L}\p{M}\p{N} .,&'’()/–—-]/gu,
    message: () => "Organization name needs letters and can only have numbers, spaces and . , & ' - ( ) /.",
  },
  shortName: {
    pattern: /^(?=.*\p{L})[\p{L}\p{N}][\p{L}\p{N} &-]*$/u,
    allowed: /[^\p{L}\p{N} &-]/gu,
    message: () => "Short name can only have letters and numbers, like JPCS.",
  },
  college: {
    pattern: /^\p{L}[\p{L}\p{M} .,&'’()-]*$/u,
    allowed: /[^\p{L}\p{M} .,&'’()-]/gu,
    message: () => "College can only have letters, spaces and . , & ' - ( ) (no numbers).",
  },
  words: {
    pattern: /\p{L}/u,
    message: (label) => `${label} needs words, not only numbers or symbols.`,
  },
};

// "" when the value is fine (or empty: "required" is checked separately), otherwise the message
export function textProblem(kind, value, label) {
  const text = (value || "").trim();
  return text && !KINDS[kind].pattern.test(text) ? KINDS[kind].message(label) : "";
}

// While typing: drop characters the field can't have (e.g. numbers in a name)
export function keepAllowed(kind, value) {
  return KINDS[kind].allowed ? value.replace(KINDS[kind].allowed, "") : value;
}

export const YEAR_LEVEL_PROBLEM = "Pick a year level from the list.";
