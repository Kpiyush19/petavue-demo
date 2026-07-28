import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Bell, ChatCircle, CheckCircle, ClockCounterClockwise, XCircle, Sliders, CircleNotch, ArrowUUpLeft, Question, CaretDown, Target, Lightning, Eye, Clock, Tag, ListBullets, FlowArrow, ClockClockwise, ChartBar, Info, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button as PvButton, Tooltip } from "@/ui";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import "../../components/dashboards/dashboard-viewer-widget/styles.css";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;

const SNOOZE_OPTIONS = ["1 day", "3 days", "1 week", "2 weeks", "Until next check-in"];

// Status badge — mirrors recMeta in GoalsPage so the title's suffix chip matches
// the queue card. Bordered (no fill), regular-weight icon, uppercase.
const recBadge = (rec) => {
  if (rec.status !== "open") return { label: rec.status === "rejected" ? "Dismissed" : "Acted", cls: "text-green-600 border border-green-200", icon: CheckCircle };
  if (rec.severity === "act-now") return { label: "Act now", cls: "text-rose-600 border border-rose-200", icon: Lightning };
  if ((rec.tier || 2) <= 2) return { label: "Review soon", cls: "text-amber-700 border border-amber-200", icon: Warning };
  return { label: "Watch", cls: "text-blue-700 border border-blue-200", icon: Eye };
};

/* Snooze split-button with a duration dropdown (portaled, opens upward). */
function SnoozeMenu({ onSnooze, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - r.top + 4, left: r.left });
    }
    setOpen((o) => !o);
  };
  return (
    <>
      <button ref={btnRef} onClick={toggle} disabled={disabled}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[14px] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
        <ClockCounterClockwise size={16} /> Snooze <CaretDown size={12} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="fixed z-[71] w-44 bg-white border border-[var(--border-primary)] rounded-[8px] shadow-lg py-1" style={{ bottom: pos.bottom, left: pos.left }}>
            <p className="px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Snooze for</p>
            {SNOOZE_OPTIONS.map((label) => (
              <button key={label} onClick={() => { onSnooze(label); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-left bg-transparent border-none cursor-pointer hover:bg-grey-50 text-[var(--text-primary)]">
                {label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// Render inline `code` chips and **bold** spans inside a derivation step.
function renderInline(text) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1.5 py-0.5 rounded-md bg-grey-100 text-[12px] font-mono text-[var(--text-primary)]">{p.slice(1, -1)}</code>;
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold text-[var(--text-primary)]">{p.slice(2, -2)}</strong>;
    return <span key={i}>{p}</span>;
  });
}

/* A single fact cell in the recommendation header (label over value). */
function Fact({ label, value, valueCls }) {
  return (
    <div className="bg-grey-50 px-3.5 py-2.5">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={cn("text-[12px] font-medium mt-0.5 text-[var(--text-primary)]", valueCls)}>{value}</div>
    </div>
  );
}

/* One section of the evidence "View details" drawer. */
function EvidenceCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-grey-100)] bg-white p-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        {Icon && <Icon size={14} weight="bold" className="text-[var(--text-muted)]" />}
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      </div>
      {children}
    </div>
  );
}

/* Inline recommendation detail — used both in the drawer and the Recommendations
   tab's right panel. Fills its container height (scroll body + pinned footer). */
export function RecommendationDetail({ goalId, recId, onClose, onOpenGoal }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [thread, setThread] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showDeriv, setShowDeriv] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // pending = the action awaiting input ({ action }); reason = the note; snoozeFor = duration.
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [snoozeFor, setSnoozeFor] = useState("");
  const sendComment = () => {
    const t = comment.trim();
    if (!t) return;
    // Newest-first so the freshest note sits right under the composer.
    setThread((c) => [{ text: t, at: "Just now" }, ...c]);
    setComment("");
    toast.success("Note saved to this recommendation");
  };
  const { data: goal } = useQuery({ queryKey: ["goal", goalId], queryFn: () => apiGet(`/api/goals/${goalId}`) });
  const rec = goal?.checkIns?.[0]?.recommendations?.find((r) => r.id === recId);

  const act = useMutation({
    mutationFn: (body) => apiPost(`/api/goals/${goalId}/recommendations/${recId}/act`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goals-attention"] });
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
    },
  });
  const doAct = (body, msg) => act.mutate(body, { onSuccess: () => { toast.success(msg); onClose?.(); } });

  if (!rec) return <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)] p-6"><Spinner size={18} /> Loading…</div>;

  const actNow = rec.severity === "act-now";
  const done = rec.status !== "open";
  const resolved = {
    acted: { label: "Done", cls: "text-green-600" },
    rejected: { label: "Dismissed", cls: "text-[var(--text-muted)]" },
    snoozed: { label: rec.snoozeLabel ? `Snoozed · ${rec.snoozeLabel}` : "Snoozed", cls: "text-amber-600" },
  }[rec.status];

  // Synthesized decision log for the "View details" drawer.
  const history = [["Generated", rec.age || "This check-in", "Surfaced from the latest check-in."]];
  if (rec.status === "acted") history.push(["Acted", "Just now", "Marked done — monitoring for recovery."]);
  if (rec.status === "rejected") history.push(["Dismissed", "Just now", "Archived from the queue."]);
  if (rec.status === "snoozed") history.push(["Snoozed", "Just now", rec.snoozeLabel ? `Until ${rec.snoozeLabel}.` : "Snoozed."]);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Scrollable region: header + body scroll together */}
      <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 flex flex-col gap-[10px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] leading-snug">
              {rec.title}
              {(() => { const b = recBadge(rec); return (
                <span className={cn("inline-flex items-center gap-1 align-middle ml-2 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide rounded-full whitespace-nowrap", b.cls)}>
                  <b.icon size={10} weight="regular" />{b.label}
                </span>
              ); })()}
            </h2>
            {rec.tldr && <p className="text-[14px] text-[#757A97] leading-snug mt-1.5">{rec.tldr}</p>}
          </div>
          {onClose && <button onClick={onClose} className="shrink-0 -mt-1 -mr-1 p-1 rounded-md text-[var(--text-muted)] hover:bg-grey-100 bg-transparent border-none cursor-pointer" aria-label="Close"><X size={18} /></button>}
        </div>
        <div className="flex items-center justify-between gap-3">
          {onOpenGoal && goal?.name ? (
            <button onClick={() => onOpenGoal(goalId)} className="min-w-0 inline-flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:underline bg-transparent border-none cursor-pointer p-0"><Target size={16} weight="bold" className="shrink-0" /><span className="truncate">{goal.name}</span></button>
          ) : <span />}
          <PvButton variant="blueGhost" size="md" label="View details" icon={Info} onClick={() => setShowDetails(true)} className="shrink-0" />
        </div>
        {/* Facts — first generated / last updated / status */}
        <div className="grid grid-cols-3 gap-px rounded-[8px] border border-[var(--color-grey-100)] overflow-hidden bg-[var(--color-grey-100)]">
          <Fact label="First generated" value={rec.age || "This check-in"} />
          <Fact label="Last updated" value={done ? "Just now" : "This check-in"} />
          <Fact label="Status" value={resolved ? resolved.label : "Open · unresolved"} valueCls={resolved ? resolved.cls : "text-black"} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-0 pb-4 flex flex-col gap-5 [&>*]:shrink-0">
        {/* Impact tile — the estimated outcome, amber. */}
        {rec.impact && (
          <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-amber-700">{rec.impact.label || "Estimated impact"}</p>
              {rec.tier && <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-white text-amber-700 border border-amber-200">Tier {rec.tier}</span>}
            </div>
            <p className="text-[24px] font-bold text-amber-900 leading-none mt-2">{rec.impact.value}</p>
            {rec.impact.sub && <p className="text-[12px] text-amber-800 mt-1.5 leading-snug">{rec.impact.sub}</p>}
          </div>
        )}

        {/* Borderless sections separated by hairline rules instead of cards. */}
        <div className="flex flex-col divide-y divide-[var(--color-grey-100)] [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {/* Insight — why this recommendation is being made. */}
        {rec.body && (
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Insight</p>
            <p className="text-[14px] text-[#757A97] leading-relaxed">{rec.body}</p>
          </div>
        )}

        {/* What to do — Action now, then Hold for now and Revisit when. */}
        <div>
          {(rec.hold || rec.revisit) && <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Action now</p>}
          <ul className="flex flex-col gap-2.5">
            {(rec.steps || [rec.tldr]).map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-50 text-primary-600 border border-primary-200 text-[11px] font-semibold shrink-0 mt-px">{i + 1}</span>
                <p className="text-[14px] text-[var(--text-primary)] leading-snug pt-0.5">{s}</p>
              </li>
            ))}
          </ul>
          {rec.hold && (
            <div className="mt-4 pt-3 border-t border-[var(--color-grey-100)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Hold for now</p>
              <p className="text-[14px] text-[#757A97] leading-relaxed">{rec.hold}</p>
            </div>
          )}
          {rec.revisit && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Revisit when</p>
              <p className="text-[14px] text-[#757A97] leading-relaxed">{rec.revisit}</p>
            </div>
          )}
        </div>

        {/* About the data — an honest note on any reporting caveat. */}
        {rec.aboutData && (
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">About the data</p>
            <p className="text-[14px] text-[#757A97] leading-relaxed">{rec.aboutData}</p>
          </div>
        )}
        </div>

        {/* Notes — composer stays pinned on top; saved notes scroll below it so
            the input never gets pushed down as notes accumulate. */}
        <div>
          {/* Composer — header + input grouped in one grey block, fully separate. */}
          <div className="rounded-[8px] border border-[var(--color-grey-100)] bg-grey-50 p-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">Keep context with this recommendation</h3>
              <Tooltip title="Add a note for the next check-in. Saved notes stay attached to this recommendation." placement="top">
                <span className="inline-flex shrink-0 text-[var(--text-muted)] cursor-help"><Info size={14} /></span>
              </Tooltip>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendComment(); } }}
              rows={2}
              placeholder="What should the next check-in know?"
              className="w-full mt-3 text-[13px] px-3 py-2 rounded-[8px] border border-[var(--border-primary)] bg-white focus:border-primary-500 outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <PvButton variant="primary" size="sm" label="Save note" disabled={!comment.trim()} onClick={sendComment} />
            </div>
          </div>

          {/* Saved notes — newest first, scroll if the list grows. */}
          {thread.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-grey-100)] flex flex-col gap-2 max-h-[220px] overflow-y-auto -mr-1 pr-1">
              {thread.map((m, i) => (
                <div key={i} className="rounded-[8px] border border-[var(--color-grey-100)] bg-grey-50 px-3 py-2">
                  <p className="text-[13px] text-[var(--text-primary)] leading-snug">{m.text}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[var(--text-muted)]">
                    <span className="font-medium text-[#757A97]">You</span>
                    <span>·</span>
                    <span>{m.at || "Just now"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t border-[var(--color-grey-100)] px-5 py-3.5">
        {done ? (
          <div className="flex items-center justify-between">
            <span className={cn("inline-flex items-center gap-1.5 text-[14px] font-medium", resolved?.cls)}><CheckCircle size={15} weight="fill" /> {resolved?.label}</span>
            <PvButton variant="secondary" size="sm" label="Undo" icon={ArrowUUpLeft} onClick={() => act.mutate({ action: "open" })} />
          </div>
        ) : pending ? (
          <div className="flex flex-col gap-2">
            {pending.action === "snoozed" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">Snooze for</label>
                <input
                  value={snoozeFor}
                  onChange={(e) => setSnoozeFor(e.target.value)}
                  autoFocus
                  placeholder="e.g. 2 weeks · until next month · after the launch"
                  className="w-full text-[14px] px-3 py-2 rounded-[8px] border border-[var(--border-primary)] focus:border-primary-500 outline-none"
                />
              </div>
            )}
            <p className="text-[12px] font-medium text-[var(--text-primary)]">
              {pending.action === "rejected" ? "Why are you dismissing this? (optional)"
                : pending.action === "acted" ? "What did you do? (optional)"
                : "Anything to note? (optional)"}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              autoFocus={pending.action !== "snoozed"}
              placeholder={pending.action === "rejected" ? "e.g. Never pause Brand Search, it's our best demo source" : "Add context for the next run…"}
              className="w-full text-[14px] px-3 py-2 rounded-[8px] border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <PvButton
                variant="primary" size="sm"
                label={act.isPending ? "Saving…" : "Submit"}
                disabled={act.isPending || (pending.action === "snoozed" && !snoozeFor.trim())}
                onClick={() => doAct(
                  { action: pending.action, snooze: snoozeFor.trim() || undefined, reason: reason.trim() || undefined },
                  pending.action === "acted" ? "Marked done, monitoring for recovery" : pending.action === "rejected" ? "Dismissed, archived" : `Snoozed · ${snoozeFor.trim()}`
                )}
              />
              <button onClick={() => { setPending(null); setReason(""); setSnoozeFor(""); }} className="text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setReason(""); setPending({ action: "acted" }); }} disabled={act.isPending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[14px] font-medium text-green-600 hover:bg-green-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <CheckCircle size={16} /> Acted
            </button>
            <button onClick={() => { setReason(""); setPending({ action: "rejected" }); }} disabled={act.isPending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[14px] font-medium text-rose-600 hover:bg-rose-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <XCircle size={16} /> Reject
            </button>
            <button onClick={() => { setReason(""); setSnoozeFor(""); setPending({ action: "snoozed" }); }} disabled={act.isPending}
              className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[14px] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <ClockCounterClockwise size={16} /> Snooze
            </button>
          </div>
        )}
      </div>

      {/* "View details" — the shared floaty right-side overlay (same chrome as
          Sage): Thresholds · Metrics · Triggers · Goal · Decision log. */}
      <ChatOverlay
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        floating
        heading="Details"
        title={rec.title}
        headerIcon={Info}
        headerIconWeight="regular"
        headerIconSize={20}
        headerIconClass="text-grey-600"
      >
        <div className="h-full overflow-y-auto p-4 flex flex-col gap-3 bg-[var(--bg-primary)]">
                <EvidenceCard icon={Sliders} title="Thresholds">
                  {rec.derivation?.length ? (
                    <ul className="flex flex-col gap-2">
                      {rec.derivation.map((s, i) => <li key={i} className="text-[12px] text-[#757A97] leading-relaxed">{renderInline(s)}</li>)}
                    </ul>
                  ) : <p className="text-[12px] text-[#757A97] leading-relaxed">{rec.evidence}</p>}
                </EvidenceCard>
                {rec.metrics?.length > 0 && (
                  <EvidenceCard icon={ChartBar} title="Metrics">
                    <div className="flex flex-col divide-y divide-[var(--color-grey-100)]">
                      {rec.metrics.map((m, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
                          <span className="text-[12.5px] text-[#757A97]">{m.label}</span>
                          <span className="text-[12.5px] text-right text-[var(--text-primary)]"><span className="font-medium">{m.value}</span>{m.note && <span className="text-[var(--text-muted)]"> · {m.note}</span>}</span>
                        </div>
                      ))}
                    </div>
                  </EvidenceCard>
                )}
                <EvidenceCard icon={FlowArrow} title="Triggers">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{rec.triggerLabel || "Rule"}</p>
                  {rec.trigger && <p className="text-[12.5px] text-[#757A97] mt-1 leading-relaxed">{rec.trigger}</p>}
                  {rec.signal && <p className="text-[12px] text-[var(--text-muted)] mt-2">Why it fired: <span className="text-[#757A97] font-medium">{rec.signal}</span></p>}
                </EvidenceCard>
                <EvidenceCard icon={Target} title="Goal">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{goal?.name || "—"}</p>
                  <p className="text-[12px] text-[#757A97] mt-1">This recommendation is graded against this goal's target.</p>
                </EvidenceCard>
                <EvidenceCard icon={ClockClockwise} title="Decision log">
                  <ol className="flex flex-col gap-2.5">
                    {history.map((h, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                        <div>
                          <p className="text-[12.5px] font-medium text-[var(--text-primary)]">{h[0]} <span className="text-[var(--text-muted)] font-normal">· {h[1]}</span></p>
                          <p className="text-[12px] text-[#757A97]">{h[2]}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </EvidenceCard>
        </div>
      </ChatOverlay>
    </div>
  );
}

/* Drawer wrapper (used on the goal detail page). */
export default function RecommendationDrawer({ goalId, recId, onClose, onOpenGoal }) {
  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="absolute inset-0" style={{ background: "rgba(15,22,36,0.18)" }} onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
        className="absolute top-0 right-0 h-full w-[520px] max-w-[94vw] bg-white shadow-2xl overflow-hidden"
      >
        <RecommendationDetail goalId={goalId} recId={recId} onClose={onClose} onOpenGoal={onOpenGoal} />
      </motion.aside>
    </div>
  );
}
