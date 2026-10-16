import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { AVATARS, AvatarArt } from "./Avatars.jsx";
import { initials } from "../utils/format.js";

// Your own picture: PNG or JPG up to 2 MB (the server checks this too)
const PHOTO_TYPES = ["image/png", "image/jpeg"];
const PHOTO_MAX = 2 * 1024 * 1024;
const OPTIONS = [...AVATARS, { id: "photo", label: "Your photo" }];

// Full-screen avatar picker: a row of round characters that slides so the chosen one sits in
// the big white ring in the middle. The last option is the member's own photo. Shown once after
// an officer approves the account (App.jsx), and again from Profile to change it.
//   onSave(id | { photo: File }) -> Promise of { ok, message? }
//   onSkip: optional "Skip for now"; onClose: optional (from Profile)
export default function AvatarPicker({ user, orgName, current, onSave, onSkip, onClose }) {
  const start = Math.max(0, OPTIONS.findIndex((a) => a.id === current));
  const [index, setIndex] = useState(start);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null); // a newly chosen photo, not uploaded yet
  const [preview, setPreview] = useState(null); // its object URL, for the ring
  const fileRef = useRef(null);
  const n = OPTIONS.length;

  const selected = OPTIONS[index];
  const isPhoto = selected.id === "photo";
  // The photo to show: the one just chosen, or the one they already have
  const photoSrc = preview || (user.avatar === "photo" ? user.avatarUrl : null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const move = (step) => {
    setError("");
    setIndex((i) => (i + step + n) % n);
  };

  // Position of each avatar relative to the chosen one: 0 = in the ring, ±1, ±2 at the sides
  const offsetOf = (i) => {
    let d = (i - index + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };

  const choosePhoto = () => fileRef.current?.click();

  const onFile = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!picked) return;
    if (!PHOTO_TYPES.includes(picked.type)) return setError("Choose a PNG or JPG image.");
    if (picked.size > PHOTO_MAX) return setError("That image is over 2 MB. Choose a smaller one.");
    setError("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setIndex(OPTIONS.length - 1);
  };

  const save = async () => {
    if (isPhoto && !file && !photoSrc) return choosePhoto();
    // Keeping the photo they already have: nothing to upload
    const choice = isPhoto ? (file ? { photo: file } : "photo") : selected.id;
    if (choice === "photo") return onClose ? onClose() : onSkip?.();
    setSaving(true);
    setError("");
    const result = await onSave(choice);
    setSaving(false);
    if (result && result.ok === false) setError(result.message || "Couldn't save your avatar. Try again.");
  };

  const keepInitials = async () => {
    setSaving(true);
    setError("");
    const result = await onSave("initials");
    setSaving(false);
    if (result && result.ok === false) setError(result.message || "Couldn't save your choice. Try again.");
    else onClose?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
  };


  return (
    <div className="avatar-picker" role="dialog" aria-modal="true" aria-labelledby="avatar-picker-title">
      {onClose && (
        <button type="button" className="avatar-picker-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={20} />
        </button>
      )}

      <div className="avatar-picker-inner">
        <p className="avatar-picker-eyebrow">
          {onClose ? "Your avatar" : `Welcome to ${orgName}, ${user.name.split(" ")[0]}!`}
        </p>
        <h1 id="avatar-picker-title">Pick your avatar</h1>
        <p className="avatar-picker-lead">This is how other members will see you around OrgConnect.</p>

        <div className="avatar-carousel" tabIndex={0} onKeyDown={onKeyDown} aria-label="Avatars. Use the left and right arrow keys to browse.">
          <span className="avatar-ring" aria-hidden="true" />
          {OPTIONS.map((a, i) => {
            const d = offsetOf(i);
            const hidden = Math.abs(d) > 2;
            const photo = a.id === "photo";
            return (
              <button
                key={a.id}
                type="button"
                className={`avatar-option ${d === 0 ? "is-selected" : ""} ${photo ? "is-photo" : ""}`}
                style={{ "--offset": d, "--dist": Math.abs(d) }}
                // The photo option: first click brings it to the ring, then it opens the file picker
                onClick={() => (photo && d === 0 ? choosePhoto() : setIndex(i))}
                tabIndex={-1}
                aria-hidden={hidden}
                aria-label={photo ? (photoSrc ? "Your photo (click to change)" : "Upload your own photo") : `${a.label}${d === 0 ? " (selected)" : ""}`}
              >
                {photo ? (
                  photoSrc ? (
                    <img className="avatar-photo" src={photoSrc} alt="" />
                  ) : (
                    <span className="avatar-upload">
                      <Icon name="upload" size={26} />
                      <span>Upload</span>
                    </span>
                  )
                ) : (
                  <AvatarArt id={a.id} size="100%" />
                )}
              </button>
            );
          })}
        </div>

        <div className="avatar-picker-nav">
          <button type="button" className="avatar-arrow" onClick={() => move(-1)} aria-label="Previous avatar">
            <Icon name="chevronLeft" size={20} />
          </button>
          <span className="avatar-picker-name" aria-live="polite">{selected.label}</span>
          <button type="button" className="avatar-arrow" onClick={() => move(1)} aria-label="Next avatar">
            <Icon name="chevronRight" size={20} />
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={onFile} />

        {error && <p className="avatar-picker-error" role="alert">{error}</p>}

        <button type="button" className="btn btn-accent btn-pill btn-lg avatar-picker-save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : onClose ? "Save avatar" : "Continue"} {!saving && <Icon name="arrowRight" size={18} />}
        </button>
        <div className="avatar-picker-links">
          {/* No picture at all: just their initials, as before avatars existed */}
          <button type="button" className="avatar-picker-skip" onClick={keepInitials} disabled={saving}>
            Use my initials ({initials(user.name)})
          </button>
          {onSkip && (
            <button type="button" className="avatar-picker-skip" onClick={onSkip}>Skip for now</button>
          )}
        </div>
      </div>
    </div>
  );
}
