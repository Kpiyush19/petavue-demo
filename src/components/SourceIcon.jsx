import { Globe, Database, Funnel, ListChecks, Plug } from "@phosphor-icons/react";
import { Tooltip } from "@/ui";

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
  "linkedin campaign manager": "linkedin.svg",
  meta: "meta ads.svg",
  "meta ads": "meta ads.svg",
  // Named products get their own mark. "CRM" stays a neutral glyph below,
  // because that one is a category — whichever CRM the customer runs.
  hubspot: "hubspot.svg",
  ga4: "ga4.svg",
  "google analytics": "ga4.svg",
  salesforce: "salesforce.svg",
  segment: "segment.svg",
  snowflake: "snowflake.svg",
  marketo: "marketo.svg",
  outreach: "outreach.svg",
  gong: "gong.svg",
};

const GLYPH = {
  web: Globe,
  website: Globe,
  crm: Database,
  warehouse: Database,
  pipeline: Funnel,
  "target account list": ListChecks,
  "crm \u00b7 sdr queue": Database,
};

/**
 * `named` wraps the mark in a tooltip. Use it wherever the icon stands alone —
 * an unlabelled row of logos is unreadable otherwise. Where the name is already
 * printed beside the icon, leave it off rather than repeating it on hover.
 */
export default function SourceIcon({ name, size = 14, className, named = false }) {
  const key = String(name || "").toLowerCase().trim();
  const file = LOGO_FILE[key];
  const url = file ? LOGO_BY_FILE[file] : null;
  const mark = url ? (
    <img
      src={url}
      alt={named ? name : ""}
      loading="lazy"
      className={`object-contain shrink-0 ${className || ""}`}
      style={{ width: size, height: size }}
    />
  ) : (
    (() => {
      const Glyph = GLYPH[key] || Plug;
      return <Glyph size={size} className={`shrink-0 text-[var(--text-muted)] ${className || ""}`} />;
    })()
  );

  if (!named) return mark;
  return (
    <Tooltip title={name} placement="top">
      <span className="inline-flex shrink-0 cursor-default" aria-label={name}>
        {mark}
      </span>
    </Tooltip>
  );
}
