import { SealCheck, Clock, Warning, XCircle, CopySimple, Question } from "@phosphor-icons/react";
import { cn } from "../../utils/cn";

/* Data-confidence vocabulary from the Paid-Media Feasibility Matrix trust layer.
   Every recommendation carries one of these states so a marketer can see, at a
   glance, how much to trust the numbers before acting. Bordered chip (no heavy
   fill), regular-weight icon — same visual language as the status badge. */
export const CONFIDENCE = {
  verified:     { label: "Verified",     cls: "text-green-700 border-green-200", icon: SealCheck,  tip: "Source-of-record data, reconciled to the platform." },
  fresh:        { label: "Fresh",        cls: "text-green-700 border-green-200", icon: Clock,      tip: "Recent — within the freshness SLA." },
  partial:      { label: "Partial data", cls: "text-amber-700 border-amber-200", icon: Warning,    tip: "Valid but limited by coverage, lag, or an immature cohort." },
  unreconciled: { label: "Unreconciled", cls: "text-rose-700 border-rose-200",   icon: XCircle,    tip: "Spend or conversions haven't reconciled to the platform total." },
  duplicated:   { label: "Duplicated",   cls: "text-rose-700 border-rose-200",   icon: CopySimple, tip: "Duplicate history rows detected in the source." },
  unknown:      { label: "Unknown",      cls: "text-[var(--text-muted)] border-[var(--color-grey-200)]", icon: Question, tip: "Not enough evidence to state a confidence level." },
};

// Resolve a recommendation's confidence: explicit field wins, else map from the
// action disposition, else assume verified (originals carry explicit gclid/CRM joins).
export function recConfidence(rec) {
  if (rec?.confidence) return rec.confidence;
  const d = rec?.disposition;
  if (d === "Fix data first") return "unreconciled";
  if (d === "Wait") return "partial";
  if (d === "Clear to act") return "verified";
  return "verified";
}

export function ConfidenceBadge({ rec, className }) {
  const c = CONFIDENCE[recConfidence(rec)] || CONFIDENCE.unknown;
  const Icon = c.icon;
  return (
    <span title={c.tip} className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border whitespace-nowrap", c.cls, className)}>
      <Icon size={11} weight="regular" /> {c.label}
    </span>
  );
}
