// Small square for an org in lists and the org dropdown: its uploaded logo, or the navy/orange dot
export default function OrgSwatch({ org }) {
  return (
    <span className={`org-swatch ${org.logoUrl ? "has-logo" : ""}`} aria-hidden="true">
      {org.logoUrl ? <img src={org.logoUrl} alt="" /> : <span />}
    </span>
  );
}
