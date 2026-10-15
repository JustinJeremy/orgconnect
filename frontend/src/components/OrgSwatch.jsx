// Small square for an org in lists and the org dropdown: its uploaded logo, or a dot on the org's own color
export const DEFAULT_NAVY = "#1b3a6b";

export default function OrgSwatch({ org }) {
  return (
    <span className={`org-swatch ${org.logoUrl ? "has-logo" : ""}`} style={{ "--swatch": org.theme?.navy || DEFAULT_NAVY }} aria-hidden="true">
      {org.logoUrl ? <img src={org.logoUrl} alt="" /> : <span />}
    </span>
  );
}
