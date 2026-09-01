import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle, ClockCounterClockwise, XCircle, CircleNotch, ArrowUUpLeft, CaretDown, CaretLeft, CaretRight, CalendarBlank, Lightning, Eye, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button as PvButton } from "@/ui";
import "../../components/dashboards/dashboard-viewer-widget/styles.css";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { AgentMark } from "../../components/AgentMark";
import WorkflowGlyph from "../../components/WorkflowGlyph";
import { AGENTS } from "../../mocks/agentWorkflows";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;

const SNOOZE_OPTIONS = ["1 day", "3 days", "1 week", "2 weeks", "Until next check-in"];

// Status badge — mirrors recMeta in GoalsPage so the title's suffix chip matches
// the queue card. Bordered (no fill), regular-weight icon, uppercase.
const recBadge = (rec) => {
  if (rec.status !== "open") return { label: rec.status === "rejected" ? "Dismissed" : "Accepted", cls: "text-green-600 border border-green-200", icon: CheckCircle };
  if (rec.severity === "act-now") return { label: "Act now", cls: "text-rose-600 border border-rose-200", icon: Lightning };
  if ((rec.tier || 2) <= 2) return { label: "Review soon", cls: "text-amber-700 border border-amber-200", icon: Warning };
  return { label: "Watch", cls: "text-blue-700 border border-blue-200", icon: Eye };
};

// Heading + plain-language "what this action does" line shown before the note /
// snooze-until field. Uses the rec's own `consequences` copy when provided,
// otherwise a clean generic fallback that reads well for any recommendation.
const CONSEQUENCE_HEADING = { acted: "Accepting means", rejected: "Rejecting means", snoozed: "Snoozing means" };
const consequenceText = (rec, action) => {
  const c = rec.consequences || {};
  if (action === "acted") return c.accepted || "Accepting puts this recommendation into effect and routes the change to its owner for action. The decision is logged, and the next run tracks whether the expected impact holds.";
  if (action === "rejected") return c.rejected || "Rejecting leaves everything as is and archives the recommendation. Nothing changes, and the decision is recorded so the next run has the context.";
  return c.snoozed || "Snoozing defers this until the date you pick. If the signal still crosses the threshold then, it's re-flagged on the next run.";
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

// ── Date picker ──────────────────────────────────────────────────────────
// Month calendar matching the Petavue design-system "Date Picker": 264px card,
// Sun–Sat grid, 32px rounded day cells in secondary text, and a blue-bordered
// selected day. Arrows change month. Days before `min` are disabled.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseISO = (s) => (s ? new Date(s + "T00:00:00") : null);

// Scrollable month/year list (used by the header dropdowns). Rest = secondary
// text, the current real month/year = link blue, hover = primary-50, and the
// item in view = solid-blue selected — matching the design-system states.
function PickerList({ items, valueIndex, currentIndex, onPick }) {
  const selRef = useRef(null);
  // Center the in-view item when the list opens.
  useEffect(() => { selRef.current?.scrollIntoView({ block: "center" }); }, []);
  return (
    <div className="flex flex-col gap-1 max-h-[228px] overflow-y-auto py-0.5">
      {items.map((label, i) => {
        const sel = i === valueIndex;
        const cur = i === currentIndex;
        return (
          <button
            key={label}
            ref={sel ? selRef : null}
            type="button"
            onClick={() => onPick(i)}
            className={cn(
              "py-1 rounded-[4px] text-[12px] text-center bg-white border-none cursor-pointer transition-colors",
              sel ? "bg-[#3661ED] text-white" : cur ? "text-[#3661ED] hover:bg-[#F5F8FF]" : "text-[#757A97] hover:bg-[#F5F8FF] hover:text-[#3661ED]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Calendar({ value, min, onSelect }) {
  const selected = parseISO(value);
  const minDate = parseISO(min);
  const today = new Date();
  const [view, setView] = useState(() => {
    const base = selected || today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const [picker, setPicker] = useState(null); // null | "month" | "year"

  const startDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const YEARS = [];
  for (let y = view.y - 10; y <= view.y + 10; y++) YEARS.push(y);

  const step = (dir) => setView((v) => {
    const m = v.m + dir;
    if (m < 0) return { y: v.y - 1, m: 11 };
    if (m > 11) return { y: v.y + 1, m: 0 };
    return { y: v.y, m };
  });
  const minFloor = minDate && new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const isDisabled = (d) => minFloor && new Date(view.y, view.m, d) < minFloor;
  const isSelected = (d) => selected && selected.getFullYear() === view.y && selected.getMonth() === view.m && selected.getDate() === d;
  const isToday = (d) => today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;

  return (
    <div className="w-[264px] bg-white rounded-[8px] p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} className="size-5 flex items-center justify-center rounded-[4px] text-[#232532] hover:bg-[#F5F8FF] bg-transparent border-none cursor-pointer transition-colors">
          <CaretLeft size={14} weight="bold" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <button type="button" onClick={() => setPicker((p) => (p === "month" ? null : "month"))}
            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-transparent border-none cursor-pointer transition-colors hover:bg-[#F5F8FF]", picker === "month" && "bg-[#F5F8FF]")}>
            <span className="text-[14px] font-medium text-[#232532]">{MONTHS[view.m]}</span>
            <CaretDown size={12} className="text-[#232532]" />
          </button>
          <button type="button" onClick={() => setPicker((p) => (p === "year" ? null : "year"))}
            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-transparent border-none cursor-pointer transition-colors hover:bg-[#F5F8FF]", picker === "year" && "bg-[#F5F8FF]")}>
            <span className="text-[14px] font-medium text-[#232532]">{view.y}</span>
            <CaretDown size={12} className="text-[#232532]" />
          </button>
        </div>
        <button type="button" onClick={() => step(1)} className="size-5 flex items-center justify-center rounded-[4px] text-[#232532] hover:bg-[#F5F8FF] bg-transparent border-none cursor-pointer transition-colors">
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {picker === "month" ? (
        <PickerList
          items={MONTHS}
          valueIndex={view.m}
          currentIndex={today.getFullYear() === view.y ? today.getMonth() : -1}
          onPick={(m) => { setView((v) => ({ ...v, m })); setPicker(null); }}
        />
      ) : picker === "year" ? (
        <PickerList
          items={YEARS.map(String)}
          valueIndex={YEARS.indexOf(view.y)}
          currentIndex={YEARS.indexOf(today.getFullYear())}
          onPick={(i) => { setView((v) => ({ ...v, y: YEARS[i] })); setPicker(null); }}
        />
      ) : (
        <>
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => <div key={w} className="py-2 text-center text-[12px] text-[#232532]">{w}</div>)}
          </div>
          <div className="flex flex-col gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((d, di) => d === null ? <div key={di} className="h-8" /> : (
                  <button
                    key={di}
                    type="button"
                    disabled={isDisabled(d)}
                    onClick={() => onSelect(toISODate(new Date(view.y, view.m, d)))}
                    className={cn(
                      "h-8 flex items-center justify-center rounded-[8px] text-[12px] bg-white border border-transparent transition-colors",
                      isDisabled(d) ? "text-[#757A97] opacity-30 cursor-default"
                        : isSelected(d) ? "bg-[#3661ED] text-white cursor-pointer"
                        : isToday(d) ? "border-[#3661ED] text-[#757A97] cursor-pointer hover:bg-[#F5F8FF] hover:text-[#3661ED]"
                        : "text-[#757A97] cursor-pointer hover:bg-[#F5F8FF] hover:text-[#3661ED]",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Trigger field + upward popover wrapping the Calendar, used for "Snooze until".
function SnoozeCalendarField({ value, min, onChange, format }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - r.top + 6, left: r.left });
    }
    setOpen((o) => !o);
  };
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-2 text-[14px] px-3 py-2 rounded-[8px] border bg-white cursor-pointer transition-colors text-left w-fit",
          open ? "border-[#3661ED]" : "border-[var(--border-primary)] hover:border-[#3661ED]",
        )}
      >
        <CalendarBlank size={16} className="text-[var(--text-muted)] shrink-0" />
        <span className={cn(value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
          {value ? format(value) : "Pick a date"}
        </span>
        <CaretDown size={12} className="text-[var(--text-muted)] shrink-0" />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div className="fixed z-[81] rounded-[8px] border border-[var(--border-primary)] shadow-[0px_8px_12px_rgba(0,0,0,0.12)]" style={{ bottom: pos.bottom, left: pos.left }}>
            <Calendar value={value} min={min} onSelect={(iso) => { onChange(iso); setOpen(false); }} />
          </div>
        </>,
        document.body,
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

/* Inline recommendation detail — used both in the drawer and the Recommendations
   tab's right panel. Fills its container height (scroll body + pinned footer). */
export function RecommendationDetail({ goalId, recId, onClose, onOpenGoal, source }) {
  const qc = useQueryClient();
  // pending = the action awaiting input ({ action }); reason = the note; snoozeFor = duration.
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [snoozeFor, setSnoozeFor] = useState("");
  const { data: goal } = useQuery({ queryKey: ["goal", goalId], queryFn: () => apiGet(`/api/goals/${goalId}`) });
  const rec = goal?.checkIns?.[0]?.recommendations?.find((r) => r.id === recId);

  const act = useMutation({
    mutationFn: (body) => apiPost(`/api/goals/${goalId}/recommendations/${recId}/act`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goals-attention"] });
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
      // Workflow rows and rails derive their pending count from this queue, so
      // an approval has to refresh them too — otherwise you approve something
      // and the workflow still claims it is waiting on you.
      qc.invalidateQueries({ queryKey: ["agent-workflows"] });
      qc.invalidateQueries({ queryKey: ["agent"] });
    },
  });
  const doAct = (body, msg) => act.mutate(body, { onSuccess: () => { toast.success(msg); onClose?.(); } });

  if (!rec) return <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)] p-6"><Spinner size={18} /> Loading…</div>;

  const actNow = rec.severity === "act-now";
  const done = rec.status !== "open";
  const resolved = {
    acted: { label: "Accepted", cls: "text-green-600" },
    rejected: { label: "Dismissed", cls: "text-[var(--text-muted)]" },
    snoozed: { label: rec.snoozeLabel ? `Snoozed · ${rec.snoozeLabel}` : "Snoozed", cls: "text-amber-600" },
  }[rec.status];
  const todayISO = new Date().toISOString().slice(0, 10);
  const fmtDate = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return iso; } };


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
          {source?.workflowName ? (
            <span className="min-w-0 inline-flex items-center gap-2 text-[12px] text-[#757A97]">
              Found by
              {source.agent && <AgentMark agentKey={source.agent} size={18} />}
              {source.agent && (
                <button
                  onClick={() => source.onOpenAgent?.(source.agent)}
                  className="text-[12px] font-medium text-primary-600 hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  {AGENTS[source.agent]?.label}
                </button>
              )}
              <span>in</span>
              <button
                onClick={() => source.onOpenWorkflow?.(source.workflowId)}
                className="min-w-0 inline-flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                <WorkflowGlyph size={14} className="shrink-0" />
                <span className="truncate">{source.workflowName}</span>
              </button>
            </span>
          ) : <span />}
        </div>
      </div>

      {/* Body — two highlighted blocks carry the decision: what to do, and the
          number that makes it worth doing. Everything else is on demand. The
          supporting metrics, the methodology note and the derivation all moved
          into the evidence panel below. */}
      <div className="px-5 pt-0 pb-4 flex flex-col gap-4 [&>*]:shrink-0">

        {/* The ask. */}
        <div className="rounded-[10px] border border-primary-200 bg-primary-50 px-4 py-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-primary-700 mb-3">
            Recommended action
          </p>
          <ul className="flex flex-col gap-2.5">
            {(rec.steps || [rec.tldr]).map((st, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-primary-600 border border-primary-200 text-[11px] font-semibold shrink-0 mt-px tabular-nums">
                  {i + 1}
                </span>
                <p className="text-[13px] text-[var(--text-primary)] leading-snug pt-0.5">{st}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Why it is worth doing. Observed, never projected — the figure
            describes what is happening now, not what will happen. */}
        {rec.impact && (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
              {rec.impact.label}
            </p>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-[28px] font-semibold leading-none text-amber-900 tabular-nums">
                {rec.impact.value}
              </span>
              {rec.impact.sub && (
                <span className="text-[13px] text-amber-800">{rec.impact.sub}</span>
              )}
            </div>
          </div>
        )}

        {/* The numbers behind it. */}
        {(rec.metrics || []).length > 0 && (
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-grey-50 border border-[var(--color-grey-100)]">
            {rec.metrics.map((m, i) => (
              <div key={i} className="flex flex-col h-full bg-white border border-[var(--color-grey-100)] rounded-[8px] px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{m.label}</span>
                <span className="text-[22px] font-semibold leading-none text-[var(--text-primary)] mb-1.5 tabular-nums">{m.value}</span>
                {m.note && <p className="text-[11px] text-[#757A97] leading-snug">{m.note}</p>}
              </div>
            ))}
          </div>
        )}

        {/* The reasoning, in reading order: why, then the working, then the
            conditions. Hairline rules rather than cards — these are prose, and
            boxing every paragraph is what made the old pane feel like a wall. */}
        <div className="flex flex-col divide-y divide-[var(--color-grey-100)] [&>*]:py-4 [&>*:first-child]:pt-1 [&>*:last-child]:pb-0">
          {rec.body && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Why this matters</p>
              <p className="text-[12px] text-[#757A97] leading-relaxed">{rec.body}</p>
            </div>
          )}

          {(rec.derivation || []).length > 0 && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">How we got there</p>
              <ul className="flex flex-col gap-2 list-disc pl-4">
                {rec.derivation.map((d, i) => (
                  <li key={i} className="text-[12px] text-[#757A97] leading-relaxed">{renderInline(d)}</li>
                ))}
              </ul>
            </div>
          )}

          {(rec.trigger || rec.aboutData) && (
            <div className="flex flex-col gap-3">
              {rec.trigger && (
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">When this fires</p>
                  <p className="text-[12px] text-[#757A97] leading-relaxed">{rec.trigger}</p>
                </div>
              )}
              {rec.aboutData && (
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">About the data</p>
                  <p className="text-[12px] text-[#757A97] leading-relaxed">{rec.aboutData}</p>
                </div>
              )}
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
          <div className="flex flex-col gap-3">
            {/* What this action will do */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{CONSEQUENCE_HEADING[pending.action]}</p>
              <p className="text-[12px] text-[#757A97] leading-snug">{consequenceText(rec, pending.action)}</p>
            </div>

            {pending.action === "snoozed" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">Snooze until</label>
                <SnoozeCalendarField value={snoozeFor} min={todayISO} onChange={setSnoozeFor} format={fmtDate} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">Note (required)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder={pending.action === "rejected" ? "e.g. Never pause Brand Search, it's our best demo source" : "Add context for the next run…"}
                  className="w-full text-[14px] px-3 py-2 rounded-[8px] border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <PvButton
                variant="primary" size="sm"
                label={act.isPending ? "Saving…"
                  : pending.action === "snoozed" ? "Confirm snooze"
                  : pending.action === "rejected" ? "Confirm reject"
                  : "Confirm accept"}
                disabled={act.isPending || (pending.action === "snoozed" ? !snoozeFor : !reason.trim())}
                onClick={() => doAct(
                  { action: pending.action, snooze: snoozeFor || undefined, reason: reason.trim() || undefined },
                  pending.action === "acted" ? "Accepted — routed for action" : pending.action === "rejected" ? "Dismissed, archived" : `Snoozed until ${fmtDate(snoozeFor)}`
                )}
              />
              <button onClick={() => { setPending(null); setReason(""); setSnoozeFor(""); }} className="text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[12px] text-[var(--text-muted)] leading-snug">Nothing runs until you accept, and every decision is logged and reversible.</p>
            <div className="flex items-center gap-2">
            <button onClick={() => { setReason(""); setPending({ action: "acted" }); }} disabled={act.isPending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[14px] font-medium text-green-600 hover:bg-green-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <CheckCircle size={16} /> Accept
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
          </div>
        )}
      </div>

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
