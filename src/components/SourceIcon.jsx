import { Globe, Database, Funnel, ListChecks, Plug } from "@phosphor-icons/react";

/**
 * The mark for a platform or data source.
 *
 * Brand logos where we genuinely mean that product (Google Ads, LinkedIn,
 * Meta), and a neutral glyph where the name is a category rather than a vendor
 * — "CRM" is whichever CRM the customer runs, so stamping it with a Salesforce
 * logo would be a claim we can't make.
 */
const LOGO_MODULES = import.meta.glob("../assets/integrations/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});
const LOGO_BY_FILE = Object.fromEntries(
  Object.entries(LOGO_MODULES).map(([path, url]) => [path.split("/").pop().toLowerCase(), url]),
);

const LOGO_FILE = {
  "google search": "google ads.svg",
  "google search ads": "google ads.svg",
  "google ads": "google ads.svg",
  linkedin: "linkedin.svg",
  "linkedin ads": "linkedin.svg",
  "linkedin + web": "linkedin.svg",
  meta: "meta ads.svg",
  "meta ads": "meta ads.svg",
};

const GLYPH = {
  web: Globe,
  website: Globe,
  crm: Database,
  warehouse: Database,
  pipeline: Funnel,
  "target account list": ListChecks,
};

export default function SourceIcon({ name, size = 14, className }) {
  const key = String(name || "").toLowerCase().trim();
  const file = LOGO_FILE[key];
  const url = file ? LOGO_BY_FILE[file] : null;
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`object-contain shrink-0 ${className || ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const Glyph = GLYPH[key] || Plug;
  return <Glyph size={size} className={`shrink-0 text-[var(--text-muted)] ${className || ""}`} />;
}
