import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Lightning, Warning, Eye, CheckCircle, CaretRight,
  Flask, CaretDown, Sparkle, PaperPlaneRight,
  ArrowsClockwise, Handshake, PencilSimpleLine, PauseCircle, Prohibit,
  Clock, CircleNotch, X, Check, PencilSimple,
} from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { apiGet, apiPost, getApiBase, getAuthToken } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf, deckFamilyOf, AGENTS } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";
import WorkflowGlyph from "../../components/WorkflowGlyph";
import { SAGE_GRADIENT } from "../goals/SageWidget";
import { AnalyticsChat } from "../../components/dashboards/analytics-chat-widget";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import { PUSHER_KEY, PUSHER_CLUSTER } from "../../config";
// the chat widget's own stylesheet — without it Sage renders as unstyled
// stacked text (other pages import it, this page must too)
import "../../components/dashboards/analytics-chat-widget/styles.css";
import "./recommendations.css";

/* ── Sage, scoped to the recommendation on screen. ── */
function recFollowups(ctx) {
  const qs = [
    "Why is this being recommended?",
    ctx.agentLabel ? `What did the ${ctx.agentLabel} agent actually find?` : "What did the agent actually find?",
    "What happens if I don’t act on this?",
  ];
  return qs.map((q) => ({ question: q, grounded_in: ctx.name, grounded_type: "recommendation" }));
}

function RecSagePanel({ context }) {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  useEffect(() => {
    let alive = true;
    setSessionId(null);
    apiPost(`/api/goals/${context.id}/chat`, {}).then((res) => {
      if (alive) setSessionId(res?.session_id || res?.session?.session_id || null);
    });
    return () => { alive = false; };
  }, [context.id]);

  if (!sessionId) {
    return <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-muted)]">Starting Sage…</div>;
  }
  return (
    <AnalyticsChat
      externalQueryClient={qc}
      sessionId={sessionId}
      dashboardName={context.name}
      apiUrl={getApiBase()}
      authToken={getAuthToken()}
      pusherKey={PUSHER_KEY}
      pusherCluster={PUSHER_CLUSTER}
      timezone="UTC"
      welcomeSubtitle={
        context.workflowName
          ? `Found by ${context.specialist || context.agentLabel} in ${context.workflowName}. Ask why it fired, what the numbers behind it are, or what happens if you don’t act.`
          : "Ask why this fired, what the numbers behind it are, or what happens if you don’t act."
      }
      welcomeCtas={[]}
      followups={recFollowups(context)}
      inputPlaceholder="Ask about this recommendation…"
    />
  );
}

function RecSageDrawer({ open, onClose, context }) {
  return (
    <ChatOverlay isOpen={open} onClose={onClose} floating heading="Sage" title={context?.name || "Sage"}>
      <div className="h-full min-h-0">
        {context ? (
          <RecSagePanel key={context.id} context={context} />
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-muted)]">
            Select a recommendation to ask about it.
          </div>
        )}
      </div>
    </ChatOverlay>
  );
}

/* ── Vocabulary (doc 19).
   Urgency is how soon an OPEN card should be decided; once decided, the
   decision status takes its chip position. Type says what kind of
   recommendation the card is and never becomes a page-level filter. ── */
const URGENCY = {
  "act-now": { label: "Act now", icon: Lightning },
  "this-week": { label: "This week", icon: Warning },
  monitor: { label: "Next run", icon: Eye },
};

const DECISION = {
  accepted: { label: "Accepted", icon: CheckCircle },
  rejected: { label: "Rejected", icon: Prohibit },
  "on-hold": { label: "On hold", icon: PauseCircle },
};

const TYPE = {
  change: { label: "Change", icon: PencilSimpleLine },
  test: { label: "Test", icon: Flask },
  handoff: { label: "Handoff", icon: Handshake },
};

/* Sentence-case quiet section headings (doc 19 §5.1): all caps is part of
   what made the old page read like a spec. */
const QUIET = "text-[12px] font-semibold text-[var(--text-secondary)]";

/* The family renders as a visible pill with its icon, never only text. */
function FamilyPill({ agentKey }) {
  const a = AGENTS[agentKey];
  if (!a) return null;
  const Icon = agentIcon(agentKey);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[12px] leading-[16px] font-medium"
      style={{ background: a.tint, color: a.color }}
    >
      <Icon size={11} weight="fill" />
      {deckFamilyOf(agentKey)}
    </span>
  );
}

/* A table, not a paragraph. */
function DataTable({ cols, rows, emphasise, bare }) {
  return (
    <div className={cn("overflow-x-auto", !bare && "border border-[var(--color-grey-100)] rounded-lg")}>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-grey-50">
            {cols.map((c) => (
              <th
                key={c}
                className="text-left font-medium text-[var(--text-muted)] px-3 py-2 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-[var(--color-grey-100)]">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-3 py-2 align-top",
                    ci === 0
                      ? cn("text-[var(--text-primary)]", emphasise && "font-medium")
                      : "tabular-nums text-[var(--text-secondary)]",
                    String(r[0]).startsWith("+") && "text-[var(--text-muted)] italic",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── The decision modal (doc 19 §1, §8.2).
   One compact centered modal for all three decisions. The note field has
   focus on open; on Reject and Hold the confirm stays disabled until the
   field has text. One click commits — the card changing state is the
   confirmation, so there is no toast. ── */
const MODAL = {
  accepted: {
    title: "Accept this recommendation",
    consequence: (item, platform) =>
      item.type === "handoff"
        ? "Petavue creates the tasks in HubSpot and verifies them before reporting it as done."
        : item.type === "test"
          ? `Petavue starts the capped test in ${platform} and confirms its saved setup before reporting it as running.`
          : `Petavue applies the change to ${platform} and confirms the saved settings before reporting it as done.`,
    noteLabel: "Add a note (optional)",
    confirm: "Accept",
    required: false,
  },
  rejected: {
    title: "Reject this recommendation",
    consequence: () => "Nothing is applied. Your reason is saved with this recommendation, and future runs work within it.",
    noteLabel: "Why are you rejecting this? (required)",
    confirm: "Reject",
    required: true,
  },
  "on-hold": {
    title: "Put this on hold",
    consequence: () => "Nothing is applied. The recommendation stays in your queue as On hold until you decide.",
    noteLabel: "What are you waiting on? (required)",
    confirm: "Put on hold",
    required: true,
  },
};

function DecisionModal({ kind, item, platform, onCancel, onConfirm }) {
  const m = MODAL[kind];
  const [note, setNote] = useState("");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const ok = !m.required || note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0"
        style={{ background: "rgba(15,22,36,0.28)" }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-label={m.title}
        className="relative w-[480px] max-w-[92vw] bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex flex-col gap-3 px-5 py-5">
          <h3 className="m-0 text-[16px] font-semibold text-[var(--text-primary)]">{m.title}</h3>
          <p className="m-0 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {m.consequence(item, platform || "the platform")}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className={QUIET}>{m.noteLabel}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-md border border-[var(--color-grey-200)] px-3 py-2 text-[12px] outline-none focus:border-primary-500"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-grey-100)] bg-grey-50">
          <Button variant="ghost" size="md" label="Cancel" onClick={onCancel} />
          <Button variant="primary" size="md" label={m.confirm} disabled={!ok} onClick={() => onConfirm(note.trim() || null)} />
        </div>
      </motion.div>
    </div>
  );
}

function FilterDropdown({ value, options, onChange, ariaLabel, size = "sm", align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const selected = options.find((o) => o.value === value) || options[0];
  return (
    <span className="relative inline-flex" ref={ref}>
      <Button
        variant="secondary"
        size={size}
        icon={CaretDown}
        iconPosition="suffix"
        label={selected?.label || ""}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute top-[calc(100%+4px)] z-30 min-w-[240px] max-h-[320px] overflow-y-auto py-1 bg-white border border-[var(--color-grey-100)] rounded-lg shadow-[0_8px_24px_0_rgba(0,0,0,0.10)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 text-left px-3 py-2 cursor-pointer transition-colors bg-transparent",
                "border-solid border-y-0 border-r-0 border-l-[3px]",
                o.value === value
                  ? "bg-primary-50 border-l-primary-500"
                  : "border-l-transparent hover:bg-primary-50",
              )}
            >
              {o.icon}
              <span
                title={o.label}
                className={cn(
                  "flex-1 min-w-0 truncate text-[12px] leading-snug text-[var(--text-primary)]",
                  o.value === value && "font-medium",
                )}
              >
                {o.label}
              </span>
              {o.count != null && (
                <span className="shrink-0 text-[12px] tabular-nums text-[var(--text-muted)]">{o.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/* ── Apply (Ijas's design, from the product at ccpoc-dev).
   Every change the recommendation makes is a card naming the exact object
   on the platform. Before applying, anything can be unticked (a whole card,
   one field, one title) and any number can be changed inline. Every
   departure from the recommendation needs a one-line reason, and Apply
   stays disabled until each has one. The amber summary recalculates the
   spend effect of what is still ticked. Apply then sends the ticked cards
   one at a time (Applying, Waiting, Applied) and turns into the read-only
   "What changed" view, which See what changed reopens later. ── */
const APPLY_STEP_MS = 1400;

const dayStamp = (d) => `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
const joinNames = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const systemsOf = (changes) => joinNames([...new Set(changes.map((c) => c.system))]);
const nowLabel = (system) => (system === "LinkedIn Ads" ? "Now on LinkedIn" : `Now in ${system}`);
const shortSystem = (system) => (system === "LinkedIn Ads" ? "LinkedIn" : system);

/* The changes for one answer to "Needs from you". Cards predating per-object
   changes show their proposed-change table as a single change. */
function resolveChanges(item, choice, ts, platform) {
  const pick = (v) => (v && typeof v === "object" ? v[choice] ?? Object.values(v)[0] : v);
  const fill = (v) => (typeof v === "string" ? v.replace("{revert21}", dayStamp(new Date(ts + 21 * 864e5))) : v);
  if (!item.changes) {
    const system = item.appliedPrefix?.replace(/^(Applied to|Pushed to|Started in|Launched in)\s+/, "") || platform || "Platform";
    return [{ system, kind: "Change", name: item.changeTitle, table: { cols: item.changeCols, rows: item.changeRows } }];
  }
  return item.changes
    .filter((c) => !c.when || c.when === choice)
    .map((c) => ({
      ...c,
      name: pick(c.name),
      fields: c.fields?.map((f) => ({ ...f, now: fill(pick(f.now)), after: fill(pick(f.after)) })),
    }));
}

/* The editable copy of those changes: everything ticked, nothing adjusted. */
function buildDraft(changes) {
  return changes.map((c) => ({
    ...c,
    on: true,
    reason: "",
    fields: (c.fields || []).map((f) => ({ ...f, rec: f.after, value: f.after, on: true, mode: "skip", reason: "" })),
    groups: (c.groups || []).map((g) => ({
      ...g,
      rows: g.rows.map((r) => ({
        ...r,
        mode: "skip",
        reason: "",
        chips: r.chips.map((label) => (typeof label === "string" ? { label, on: true, fixed: label.startsWith("+") } : label)),
      })),
    })),
  }));
}

/* Numbers keep the shape they were written in: "$9.0K", "$2,850", "400 impressions". */
const NUM_RE = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;
function parseNum(v) {
  const m = String(v ?? "").match(NUM_RE);
  if (!m) return null;
  return { prefix: m[1], num: parseFloat(m[2].replace(/,/g, "")), suffix: m[3], decimals: (m[2].split(".")[1] || "").length, commas: m[2].includes(",") };
}
function formatLike(sample, n) {
  const p = parseNum(sample);
  if (!p) return String(n);
  const body = p.decimals ? n.toFixed(p.decimals) : p.commas || Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : String(Math.round(n));
  return `${p.prefix}${body}${p.suffix}`;
}
const moneyOf = (v) => {
  const p = parseNum(v);
  return p ? p.num * (/^K/.test(p.suffix.trim()) ? 1000 : 1) : 0;
};
const moneyText = (sample, amount) =>
  /K/.test(parseNum(sample)?.suffix || "") ? `$${(Math.abs(amount) / 1000).toFixed(1)}K` : `$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;

const isAdjusted = (f) => f.on && f.value !== f.rec;
const rowOff = (r) => r.chips.some((x) => !x.fixed && !x.on);
const verbOf = (g) => (/removal/i.test(g.heading) ? "removed" : /exclusion/i.test(g.heading) ? "excluded" : /new inclusion|added/i.test(g.heading) ? "added" : "included");
const offWord = (g) => ({ added: "won’t be added", removed: "stays", excluded: "won’t be excluded", included: "left out" })[verbOf(g)];

function missingReasons(draft) {
  const out = [];
  draft.forEach((c) => {
    if (!c.on) {
      if (!c.reason.trim()) out.push(`${c.name} (left out)`);
      return;
    }
    c.fields.forEach((f) => (!f.on || isAdjusted(f)) && !f.reason.trim() && out.push(`${f.field} on ${c.name}`));
    c.groups.forEach((g) => g.rows.forEach((r) => rowOff(r) && !r.reason.trim() && out.push(`${r.label} (${verbOf(g)}) on ${c.name}`)));
  });
  return out;
}

function tally(draft) {
  let adjusted = 0;
  let off = 0;
  let later = 0;
  let reasons = 0;
  draft.forEach((c) => {
    if (!c.on) { off += 1; if (c.reason) reasons += 1; return; }
    c.fields.forEach((f) => {
      if (!f.on) { off += 1; if (f.mode === "later") later += 1; }
      else if (isAdjusted(f)) adjusted += 1;
      if (f.reason) reasons += 1;
    });
    c.groups.forEach((g) => g.rows.forEach((r) => {
      const n = r.chips.filter((x) => !x.fixed && !x.on).length;
      off += n;
      if (r.mode === "later") later += n;
      if (n && r.reason) reasons += 1;
    }));
  });
  return { adjusted, off, later, reasons };
}

/* The one-line summary of what was done, in Ijas's words. */
function appliedSummary(draft) {
  const { adjusted, off, later } = tally(draft);
  const dropped = off - later;
  return [
    adjusted ? `Applied with ${adjusted} adjusted` : "Applied as recommended",
    later && `${later} still to do`,
    dropped && `${dropped} not applied`,
  ].filter(Boolean).join(" · ");
}

function unitsOf(c) {
  const chips = c.groups.flatMap((g) => g.rows.flatMap((r) => r.chips.filter((x) => !x.fixed)));
  return { total: c.fields.length + chips.length, on: c.fields.filter((f) => f.on).length + chips.filter((x) => x.on).length };
}

/* The spend effect of what is still ticked, recalculated as values change. */
function impactLines(draft) {
  const launches = [];
  const notes = [];
  const periods = {};
  draft.forEach((c) => {
    if (!c.on) return;
    if (c.impact) notes.push({ text: c.impact });
    c.fields.forEach((f) => {
      if (!f.on || !f.money) return;
      if (c.launches) launches.push({ strong: `This turns ${c.name} on.`, text: ` It starts spending up to ${f.value} a ${f.money} as soon as it is live.` });
      const delta = moneyOf(f.value) - moneyOf(f.now);
      const p = (periods[f.money] ||= { inc: 0, dec: 0, nInc: 0, nDec: 0, sample: f.value });
      if (delta > 0) { p.inc += delta; p.nInc += 1; }
      if (delta < 0) { p.dec -= delta; p.nDec += 1; }
    });
  });
  const budget = Object.entries(periods).flatMap(([per, p]) => {
    if (!p.inc && !p.dec) return [];
    const lead = `${{ day: "Daily", week: "Weekly", month: "Monthly" }[per]} budgets: `;
    const across = (k) => `across ${k} ${k === 1 ? "campaign" : "campaigns"}`;
    if (!p.dec) return [{ lead, strong: `+${moneyText(p.sample, p.inc)} a ${per}`, text: ` ${across(p.nInc)}.` }];
    if (!p.inc) return [{ lead, strong: `−${moneyText(p.sample, p.dec)} a ${per}`, text: ` ${across(p.nDec)}.` }];
    const net = p.inc - p.dec;
    return [{
      lead,
      strong: `+${moneyText(p.sample, p.inc)} ${across(p.nInc)}, −${moneyText(p.sample, p.dec)} ${across(p.nDec)}.`,
      text: Math.abs(net) < 1 ? " Total spend stays the same." : ` Net ${net > 0 ? "+" : "−"}${moneyText(p.sample, net)} a ${per}.`,
    }];
  });
  return [...launches, ...notes, ...budget];
}

const APPLY_STATUS = {
  will: { label: "Will change", cls: "border-primary-200 bg-white text-[var(--color-primary-600)]" },
  waiting: { label: "Waiting", icon: Clock, cls: "border-[var(--color-grey-200)] bg-grey-50 text-[var(--text-muted)]" },
  applying: { label: "Applying", icon: CircleNotch, spin: true, cls: "border-[var(--color-grey-200)] bg-white text-[var(--text-secondary)]" },
  applied: { label: "Applied", icon: CheckCircle, fill: true, cls: "border-green-200 bg-green-50 text-green-700" },
  skipped: { label: "Not applied", cls: "border-[var(--color-grey-200)] bg-grey-50 text-[var(--text-muted)]" },
};

function Pill({ cls, children }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border-solid border px-2.5 py-1 text-[12px] font-medium whitespace-nowrap", cls)}>
      {children}
    </span>
  );
}

function ApplyStatus({ status }) {
  const st = APPLY_STATUS[status];
  return (
    <Pill cls={st.cls}>
      {st.icon && (
        <st.icon
          size={12}
          weight={st.fill ? "fill" : "regular"}
          className={cn("shrink-0", st.spin && "animate-spin", status === "applied" && "text-green-600")}
        />
      )}
      {st.label}
    </Pill>
  );
}

function TickBox({ on }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center w-4 h-4 shrink-0 rounded-[4px] border-solid border transition-colors",
        on ? "bg-primary-500 border-primary-500" : "bg-white border-[var(--color-grey-300)]",
      )}
    >
      {on && <Check size={11} weight="bold" className="text-white" />}
    </span>
  );
}

function Tick({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "grid place-items-center w-4 h-4 shrink-0 rounded-[4px] border-solid border cursor-pointer p-0 transition-colors",
        on ? "bg-primary-500 border-primary-500" : "bg-white border-[var(--color-grey-300)] hover:border-primary-500",
      )}
    >
      {on && <Check size={11} weight="bold" className="text-white" />}
    </button>
  );
}

function WhyInput({ value, onChange, example }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Why? (required) e.g. ${example}`}
      className={cn(
        "w-full min-w-0 h-8 px-2.5 rounded-md border-solid border text-[12px] outline-none bg-white placeholder:text-[var(--text-muted)] focus:border-primary-500",
        value.trim() ? "border-[var(--color-grey-200)]" : "border-rose-300",
      )}
    />
  );
}

function LaterOrSkip({ mode, onChange }) {
  return (
    <span className="inline-flex p-0.5 rounded-md bg-grey-50 border border-[var(--color-grey-200)]">
      {[["skip", "Don’t apply"], ["later", "Save for later"]].map(([m, label]) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "h-7 px-2.5 rounded-[5px] text-[12px] cursor-pointer border-none whitespace-nowrap",
            mode === m ? "bg-white font-semibold text-[var(--text-primary)] shadow-[0_1px_2px_0_rgba(16,24,40,0.08)]" : "bg-transparent text-[var(--text-secondary)]",
          )}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

/* What happened to something that was not applied as recommended. */
function DeviationTag({ mode }) {
  return mode === "later" ? (
    <span className="text-[12px] font-semibold text-amber-700">Saved for later, still to do</span>
  ) : (
    <span className="text-[12px] font-semibold text-[var(--text-muted)]">Not applied</span>
  );
}

function WhyQuote({ reason }) {
  if (!reason) return null;
  return <span className="text-[12px] italic leading-relaxed text-[var(--text-secondary)]">Why: “{reason}”</span>;
}

const FOLD_AT = 20;
const FOLD_SHOW = 12;

const CHIP_TONE = {
  added: "bg-[#EEF8F1] border-[#CDEBD6]",
  removed: "bg-white border-[var(--color-grey-200)]",
  excluded: "bg-white border-[var(--color-grey-200)]",
  included: "bg-white border-[var(--color-grey-200)]",
};

/* One change card. mode: "edit" (before applying), "run" (while applying),
   "read" (what changed). `update` mutates a clone of the draft. */
function ChangeCard({ c, ci, mode, status, update, appliedLine }) {
  const edit = mode === "edit";
  const read = mode === "read";
  const [editing, setEditing] = useState(null);
  const [temp, setTemp] = useState("");
  // rows longer than FOLD_AT start folded; "Show all" opens them in place
  const [unfolded, setUnfolded] = useState(() => new Set());
  const u = unitsOf(c);
  const adjustedHere = c.on && c.fields.some(isAdjusted);
  const fieldCols = edit ? "16px minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,1.4fr)" : "minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,1.4fr)";

  const commit = (fi) => {
    const f = c.fields[fi];
    const p = parseNum(f.rec);
    const n = parseFloat(String(temp).replace(/[^\d.-]/g, ""));
    if (p && Number.isFinite(n)) update((d) => { d[ci].fields[fi].value = formatLike(f.rec, n); });
    setEditing(null);
  };

  return (
    <div
      className={cn(
        "shrink-0 flex flex-col rounded-lg border bg-white overflow-hidden",
        read && c.on ? "border-green-200" : "border-[var(--color-grey-100)]",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 bg-grey-50 border-solid border-x-0 border-t-0 border-b border-b-[var(--color-grey-100)]">
        {edit && <Tick on={c.on} label={`Apply ${c.name}`} onChange={() => update((d) => { d[ci].on = !d[ci].on; })} />}
        <SourceIcon name={c.system} size={14} />
        <span className="shrink-0 text-[12px] font-semibold uppercase tracking-wider text-[#757A97]">{c.kind}</span>
        <span className={cn("min-w-0 text-[14px] font-semibold leading-snug", c.on ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through")}>
          {c.name}
        </span>
        {(c.ref || c.state) && (
          <span className="shrink-0 text-[12px] text-[var(--text-muted)]">{(read ? [c.ref] : [c.ref, c.state]).filter(Boolean).join(" · ")}</span>
        )}
        <span className="ml-auto shrink-0 flex items-center gap-1.5">
          {!read && c.on && u.total > 0 && u.on < u.total && <Pill cls="border-[var(--color-grey-200)] bg-white text-[var(--text-secondary)]">{u.on} of {u.total} changes</Pill>}
          {!read && adjustedHere && <Pill cls="border-violet-200 bg-violet-50 text-violet-700">Adjusted</Pill>}
          <ApplyStatus status={status} />
        </span>
      </div>

      {!c.on ? (
        <div className="flex flex-col gap-2 px-4 py-3">
          <span className="text-[12px] text-[var(--text-muted)]">{edit ? "This change won’t be applied." : "Not applied."}</span>
          {!edit && <WhyQuote reason={c.reason} />}
          {edit && <WhyInput value={c.reason} example="Not this quarter" onChange={(v) => update((d) => { d[ci].reason = v; })} />}
        </div>
      ) : (
        <>
          {c.groups.map((g, gi) => (
            <div key={g.heading} className="flex flex-col px-4 pt-3 pb-2">
              <span className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{g.heading}</span>
              {g.rows.map((r, ri) => {
                const off = rowOff(r);
                return (
                  <div key={r.label} className="flex flex-col py-1.5">
                    <div className="grid items-start gap-3" style={{ gridTemplateColumns: "170px minmax(0,1fr)" }}>
                      <span className="pt-1 text-[12px] font-medium text-[var(--text-primary)]">{r.label}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {(r.chips.length > FOLD_AT && !unfolded.has(`${gi}:${ri}`)
                          ? r.chips.slice(0, FOLD_SHOW)
                          : r.chips
                        ).map((x, xi) => {
                          const toggle = edit && !x.fixed;
                          const Chip = toggle ? "button" : "span";
                          return (
                            <Chip
                              key={x.label}
                              {...(toggle && {
                                type: "button",
                                role: "checkbox",
                                "aria-checked": x.on,
                                onClick: () => update((d) => { const t = d[ci].groups[gi].rows[ri].chips[xi]; t.on = !t.on; }),
                              })}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[12px] leading-snug",
                                x.on || x.fixed
                                  ? cn("border-solid text-[var(--text-primary)]", CHIP_TONE[verbOf(g)])
                                  : "border-dashed border-[var(--color-grey-300)] bg-white text-[var(--text-muted)]",
                                toggle && "cursor-pointer transition-colors hover:border-primary-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500",
                              )}
                            >
                              {toggle && <TickBox on={x.on} />}
                              <span className={cn(!edit && !x.on && !x.fixed && "line-through")}>{x.label}</span>
                              {edit && !x.on && !x.fixed && <span className="italic"> — {offWord(g)}</span>}
                            </Chip>
                          );
                        })}
                        {r.chips.length > FOLD_AT && (
                          <button
                            type="button"
                            onClick={() => setUnfolded((set) => {
                              const next = new Set(set);
                              const k = `${gi}:${ri}`;
                              if (next.has(k)) next.delete(k); else next.add(k);
                              return next;
                            })}
                            className="self-center px-1 bg-transparent border-none cursor-pointer text-[12px] font-medium text-[var(--color-primary-600)] hover:underline"
                          >
                            {unfolded.has(`${gi}:${ri}`)
                              ? "Show fewer"
                              : (() => {
                                  // say so when an unticked value is folded out of sight
                                  const hiddenOff = r.chips.slice(FOLD_SHOW).filter((x) => !x.on).length;
                                  return `Show all ${r.chips.length}${hiddenOff ? ` · ${hiddenOff} unticked` : ""}`;
                                })()}
                          </button>
                        )}
                      </span>
                    </div>
                    {off && edit && (
                      <div className="grid items-center gap-2 mt-2" style={{ gridTemplateColumns: "170px auto minmax(0,1fr)" }}>
                        <span />
                        <LaterOrSkip mode={r.mode} onChange={(m) => update((d) => { d[ci].groups[gi].rows[ri].mode = m; })} />
                        <WhyInput
                          value={r.reason}
                          example="Sales already owns this account"
                          onChange={(v) => update((d) => { d[ci].groups[gi].rows[ri].reason = v; })}
                        />
                      </div>
                    )}
                    {off && !edit && (
                      <span className="flex flex-col gap-0.5 mt-1.5" style={{ paddingLeft: 182 }}>
                        <DeviationTag mode={r.mode} />
                        <WhyQuote reason={r.reason} />
                      </span>
                    )}
                  </div>
                );
              })}
              {edit && verbOf(g) === "removed" && (
                <span className="mt-1 text-[12px] text-[var(--text-muted)]">Untick a value to leave it out. New values can’t be added here.</span>
              )}
            </div>
          ))}

          {c.fields.length > 0 && (
            <div
              className={cn(
                "flex flex-col px-4 py-2",
                c.groups.length > 0 && "border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]",
              )}
            >
              {edit && c.fields.length > 1 && (
                <p className="m-0 pt-1 pb-1.5 text-[12px] text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-secondary)]">{c.fields.length} changes from this recommendation,</span> sent as
                  one update. The ticked ones land together or not at all.
                </p>
              )}
              <div className="grid gap-3 py-1.5" style={{ gridTemplateColumns: fieldCols }}>
                {edit && <span />}
                {[c.fieldHead || "Field", read ? "Before" : nowLabel(c.system), "After"].map((h) => (
                  <span key={h} className="text-[12px] font-semibold uppercase tracking-wider text-[#757A97]">{h}</span>
                ))}
              </div>
              {c.fields.map((f, fi) => {
                const adj = isAdjusted(f);
                const key = `${ci}:${fi}`;
                return (
                  <div
                    key={f.field}
                    className="grid items-start gap-3 py-2 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]"
                    style={{ gridTemplateColumns: fieldCols }}
                  >
                    {edit && (
                      <span className="pt-px">
                        <Tick on={f.on} label={f.field} onChange={() => update((d) => { d[ci].fields[fi].on = !d[ci].fields[fi].on; })} />
                      </span>
                    )}
                    <span className={cn("text-[12px] leading-snug", f.on ? "text-[var(--text-primary)]" : cn("text-[var(--text-muted)]", edit && "line-through"))}>
                      {f.field}
                    </span>
                    <span className="text-[12px] leading-snug text-[var(--text-muted)]">{f.now}</span>
                    <span className="flex flex-col gap-1 min-w-0">
                      {edit && editing === key ? (
                        <input
                          autoFocus
                          value={temp}
                          onChange={(e) => setTemp(e.target.value)}
                          onBlur={() => commit(fi)}
                          onKeyDown={(e) => { if (e.key === "Enter") commit(fi); if (e.key === "Escape") setEditing(null); }}
                          aria-label={`New value for ${f.field}`}
                          className="w-[140px] h-7 px-2 rounded-md border-solid border border-primary-500 text-[12px] outline-none"
                        />
                      ) : (
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[12px] leading-snug", f.on ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through")}>
                            {f.on ? f.value : f.rec}
                          </span>
                          {!edit && !f.on && <DeviationTag mode={f.mode} />}
                          {edit && f.edit && f.on && (
                            <button
                              type="button"
                              onClick={() => { setTemp(String(parseNum(f.value)?.num ?? "")); setEditing(key); }}
                              className="inline-flex items-center gap-1 p-0 bg-transparent border-none cursor-pointer text-[12px] text-[var(--color-primary-600)] hover:underline"
                            >
                              <PencilSimple size={12} /> Change
                            </button>
                          )}
                        </span>
                      )}
                      {edit && !f.edit && f.on && <span className="text-[12px] text-[var(--text-muted)]">Keep it or leave it out</span>}
                      {adj && (
                        <span className="text-[12px] text-[var(--color-primary-600)]">
                          Recommended: {f.rec}
                          {edit && (
                            <>
                              {" · "}
                              <button
                                type="button"
                                onClick={() => update((d) => { d[ci].fields[fi].value = f.rec; d[ci].fields[fi].reason = ""; })}
                                className="p-0 bg-transparent border-none cursor-pointer text-[12px] text-[var(--color-primary-600)] underline"
                              >
                                use recommended
                              </button>
                            </>
                          )}
                        </span>
                      )}
                      {edit && !f.on && (
                        <LaterOrSkip mode={f.mode} onChange={(m) => update((d) => { d[ci].fields[fi].mode = m; })} />
                      )}
                      {edit && (adj || !f.on) && (
                        <WhyInput
                          value={f.reason}
                          example={adj ? "Finance capped us at this amount" : "Turning it on once the new creative is approved"}
                          onChange={(v) => update((d) => { d[ci].fields[fi].reason = v; })}
                        />
                      )}
                      {!edit && (adj || !f.on) && <WhyQuote reason={f.reason} />}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {c.table && <DataTable cols={c.table.cols} rows={c.table.rows} emphasise bare />}
        </>
      )}

      {read && c.on && c.platformNote && (
        <p className="m-0 flex items-start gap-1.5 px-4 py-2.5 bg-amber-50 text-[12px] leading-relaxed text-amber-800">
          <Warning size={14} className="mt-[2px] shrink-0" />
          {shortSystem(c.system)} said: {c.platformNote}
        </p>
      )}
      {appliedLine && c.on && (
        <p className="m-0 px-4 py-2.5 text-[12px] text-[var(--text-muted)] border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]">
          {appliedLine}
        </p>
      )}
    </div>
  );
}

function ApplyModal({ item, platform, mode, onClose, onApplied }) {
  const ts = useRef(item.decision?.ts || Date.now());
  // "Needs from you" is not asked here (Ijas's design has no picker): the
  // card applies its first option, and anyone who disagrees can Hold with a reason.
  const choice = item.decision?.choice || item.choice?.options?.[0]?.id || null;
  const [draft, setDraft] = useState(
    () => item.decision?.applied || buildDraft(resolveChanges(item, choice, ts.current, platform)),
  );
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState(mode === "view" ? "done" : "review");
  const [step, setStep] = useState(0);
  const update = (fn) => setDraft((d) => { const next = structuredClone(d); fn(next); return next; });

  const live = draft.filter((c) => c.on);
  const n = live.length;
  const where = systemsOf(live.length ? live : draft);
  const missing = missingReasons(draft);
  const { adjusted, off } = tally(draft);
  const impact = impactLines(draft);
  const busy = phase === "applying";

  // one ticked card at a time; the decision is recorded once the last lands
  useEffect(() => {
    if (!busy) return;
    if (step >= n) {
      setPhase("done");
      onApplied(note.trim() || null, choice, draft);
      return;
    }
    const t = setTimeout(() => setStep((i) => i + 1), APPLY_STEP_MS);
    return () => clearTimeout(t);
  }, [busy, step, n]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const statusAt = (c) => {
    if (!c.on) return phase === "review" ? "will" : "skipped";
    if (phase === "review") return "will";
    if (phase === "done") return "applied";
    const i = live.indexOf(c);
    return i < step ? "applied" : i === step ? "applying" : "waiting";
  };
  const d = item.decision;
  const appliedLine = phase === "done" ? `Applied ${d?.at || "just now"} by ${d?.by || "you"}` : null;
  const extras = [adjusted && `${adjusted} adjusted`, off && `${off} not applied`].filter(Boolean).join(", ");
  const systemsCount = new Set(draft.map((c) => c.system)).size;
  const itemsLabel =
    systemsCount === 1
      ? `${draft.length} ${shortSystem(draft[0]?.system)} ${draft.length === 1 ? "item" : "items"}`
      : `${draft.length} items on ${systemsOf(draft)}`;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0"
        style={{ background: "rgba(15,22,36,0.28)" }}
        onClick={busy ? undefined : onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-label={phase === "done" ? `What changed on ${where}` : "Apply this recommendation"}
        className="relative flex flex-col w-[820px] max-w-[94vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden border-solid border-x-0 border-b-0 border-t-[3px] border-t-primary-500"
      >
        <div className="shrink-0 flex items-start gap-3 px-6 pt-5 pb-3 border-solid border-x-0 border-t-0 border-b border-b-[var(--color-grey-100)]">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h3 className="m-0 text-[16px] font-semibold text-[var(--text-primary)]">
              {phase === "done" ? `What changed on ${where}` : "Apply this recommendation"}
            </h3>
            <p className="m-0 text-[12px] text-[var(--text-muted)]">
              {phase === "review"
                ? `${itemsLabel} · untick anything you don’t want, or change a value${extras ? ` · ${extras}` : ""}`
                : busy
                  ? "Sending changes one at a time. Please keep this window open."
                  : appliedSummary(draft)}
            </p>
          </div>
          {!busy && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="shrink-0 grid place-items-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:bg-grey-50"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-6 py-4">
          {phase === "done" && tally(draft).reasons > 0 && (
            <p className="m-0 shrink-0 text-[12px] text-[var(--text-muted)]">Each change’s reason sits under it.</p>
          )}
          {draft.map((c, ci) => (
            <ChangeCard
              key={`${c.system}-${c.name}`}
              c={c}
              ci={ci}
              mode={phase === "review" ? "edit" : phase === "done" ? "read" : "run"}
              status={statusAt(c)}
              update={update}
              appliedLine={appliedLine}
            />
          ))}
        </div>

        {phase === "review" && (
          <div className="shrink-0 flex flex-col gap-3 px-6 pt-3 pb-1 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]">
            {impact.length > 0 && (
              <div className="flex flex-col gap-1 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50">
                {impact.map((l, i) => (
                  <p key={i} className="m-0 flex items-start gap-1.5 text-[12px] leading-relaxed text-amber-900">
                    {i === 0 ? <Warning size={14} weight="fill" className="mt-[2px] shrink-0 text-amber-600" /> : <span className="w-[14px] shrink-0" />}
                    <span>
                      {l.lead}
                      {l.strong && <span className="font-semibold">{l.strong}</span>}
                      {l.text}
                    </span>
                  </p>
                ))}
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Anything else your team should know? <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Part of the Q4 ABM push."
                className="w-full resize-none rounded-md border border-[var(--color-grey-200)] px-3 py-2 text-[12px] outline-none focus:border-primary-500 placeholder:text-[var(--text-muted)]"
              />
            </label>
          </div>
        )}

        <div
          className={cn(
            "shrink-0 flex items-center justify-between gap-4 px-6 py-3",
            phase !== "review" && "border-t border-[var(--color-grey-100)] bg-grey-50",
          )}
        >
          {phase === "review" && (
            <>
              <span className="text-[12px] leading-snug text-[var(--text-muted)]">
                {missing.length > 0
                  ? `${missing.length} ${missing.length === 1 ? "change still needs a reason" : "changes still need a reason"}: ${missing.join("; ")}. One line under each is enough.`
                  : n === 0
                    ? "Everything is unticked, so there is nothing to apply."
                    : ""}
              </span>
              <span className="shrink-0 flex items-center gap-2">
                <Button variant="secondary" size="md" label="Cancel" onClick={onClose} />
                <Button
                  variant="primary"
                  size="md"
                  label="Apply"
                  disabled={missing.length > 0 || n === 0}
                  onClick={() => { setStep(0); setPhase("applying"); }}
                />
              </span>
            </>
          )}
          {busy && (
            <>
              <Button variant="ghost" size="md" label="Close" disabled />
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-grey-200)] bg-white text-[12px] text-[var(--text-muted)]">
                <CircleNotch size={13} className="animate-spin" />
                Sending change {Math.min(step + 1, n)} of {n}…
              </span>
            </>
          )}
          {phase === "done" && (
            <span className="ml-auto">
              <Button variant="secondary" size="md" label="Close" onClick={onClose} />
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* One beat of the working: sentence-case label in a fixed left column. */
function EvidenceRow({ label, children }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)] first:border-t-0">
      <span className={cn(QUIET, "w-[150px] shrink-0 pt-0.5")}>{label}</span>
      <div className="m-0 flex-1 min-w-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{children}</div>
    </div>
  );
}

/* ── The queue row. The status line shows the urgency word while open, or
   the decision status once decided; decided items drop to normal weight so
   "Needs your decision" stays the only bright element. ── */
function QueueRow({ item, workflowName, selected, onClick }) {
  const u = URGENCY[item.urgency] || URGENCY.monitor;
  const d = item.decision ? DECISION[item.decision.status] : null;
  const mark = d || u;
  const state = item.decision ? item.decision.status : item.urgency || "monitor";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn("rec-queue-row", selected && "rec-queue-row--selected", d && "rec-queue-row--decided")}
    >
      <mark.icon size={12} className={`rec-queue-row__icon rec-queue-row__icon--${state}`} aria-label={mark.label} role="img" />
      <span className="rec-queue-row__body">
        <Tooltip title={item.title} placement="right">
          <span className="rec-queue-row__title">{item.shortTitle || item.title}</span>
        </Tooltip>
        <span className="rec-queue-row__meta">{workflowName}</span>
      </span>
    </button>
  );
}

/* The comments thread (doc 19 §2): decision notes and general comments in
   one chronological place, each with author, timestamp, and — for decision
   notes — a plain-words label. A general comment changes no state. */
function Comments({ comments, onPost, posting }) {
  const [draft, setDraft] = useState("");
  const post = () => {
    const text = draft.trim();
    if (!text || posting) return;
    onPost(text);
    setDraft("");
  };
  return (
    <div className="flex flex-col border border-[var(--color-grey-100)] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-[18px] py-[13px] bg-[#f8f9ff] border-solid border-t-0 border-x-0 border-b border-b-[var(--color-grey-100)]">
        <span className="text-[12px] font-semibold text-[var(--color-primary-600)]">Comments</span>
        {comments.length > 0 && (
          <span className="text-[12px] text-[#757A97] tabular-nums">{comments.length}</span>
        )}
      </div>
      <div className="flex flex-col">
        {comments.length === 0 && (
          <p className="m-0 px-4 py-3 text-[12px] text-[var(--text-muted)]">
            No comments yet. Comments persist in the activity history and are available as context to later runs.
          </p>
        )}
        {comments.map((c, i) => (
          <div key={i} className="flex flex-col gap-1 px-4 py-3 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)] first:border-t-0">
            <span className="text-[12px] leading-snug">
              <span className="font-semibold text-[var(--text-primary)]">{c.author}</span>
              <span className="text-[var(--text-muted)]"> · {c.at}</span>
              {c.label && <span className="text-[var(--text-muted)] italic"> · {c.label}</span>}
            </span>
            <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{c.text}</p>
          </div>
        ))}
        <div className="flex items-end gap-2 px-4 py-3 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]">
          <label className="flex-1 min-w-0 flex flex-col gap-1.5">
            <span className={QUIET}>Add a comment</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--color-grey-200)] px-3 py-2 text-[12px] outline-none focus:border-primary-500"
            />
          </label>
          <Button variant="secondary" size="sm" icon={PaperPlaneRight} label="Post" disabled={!draft.trim() || posting} onClick={post} />
        </div>
      </div>
    </div>
  );
}

/* ── The decision surface (doc 19 §8.1 order). ── */
function Detail({ item, workflow, onDecide, onComment, commentPosting, onOpenWorkflow }) {
  const open = !item.decision;
  const [working, setWorking] = useState(open);
  // 8.5: once a card is decided the working collapses by default (the reader
  // can reopen it); an open card keeps it open.
  const decided = !!item.decision;
  useEffect(() => { if (decided) setWorking(false); }, [decided]);
  const [modal, setModal] = useState(null);
  const [deciding, setDeciding] = useState(false); // On hold → Decide now
  const u = URGENCY[item.urgency] || URGENCY.monitor;
  const d = item.decision ? DECISION[item.decision.status] : null;
  const t = TYPE[item.type] || TYPE.change;
  const platformId = item.platform || workflow?.platform;
  const platform = platformId ? platformOf(platformId).short : null;
  const specialist = workflow?.found?.find((f) => f.agent === item.agent)?.specialist;
  const onHold = item.decision?.status === "on-hold";
  const applied = item.decision?.status === "accepted";
  const showBar = open || onHold || applied;

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-6 pt-[30px] px-[34px] pb-8 max-w-[1180px]">
        {/* 1 · chip row: urgency on open cards, the decision status in the
            same first position once decided, then type, workflow, channel. */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap mb-3.5">
            {d ? (
              <span className={`rec-card-status rec-card-status--${item.decision.status}`}>
                <d.icon size={12} />
                {d.label}
              </span>
            ) : (
              <span className={`rec-card-status rec-card-status--${item.urgency || "monitor"}`}>
                <u.icon size={12} />
                {u.label}
              </span>
            )}
            <span className="rec-card-tag">
              <t.icon size={12} /> {t.label}
            </span>
            <button type="button" onClick={onOpenWorkflow} className="rec-card-link">
              <WorkflowGlyph size={13} />
              {workflow?.name || item.workflowId}
            </button>
            {platform && (
              <span className="rec-card-tag">
                <SourceIcon name={platform} size={13} />
                {platform}
              </span>
            )}
          </div>

          {/* 2 · headline, basis, metadata line */}
          <h2 className="m-0 text-[18px] leading-[1.25] tracking-[-0.4px] font-semibold text-[var(--text-primary)]">
            {item.title}
          </h2>
          <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">{item.basis}</p>
          <dl className="rec-meta">
            {specialist && (
              <div className="rec-meta__item">
                <dt className="rec-meta__label">Found by</dt>
                <dd className="rec-meta__value">
                  {specialist} <FamilyPill agentKey={item.agent} />
                </dd>
              </div>
            )}
            {item.run?.n && (
              <div className="rec-meta__item">
                <dt className="rec-meta__label">Workflow run</dt>
                <dd className="rec-meta__value">
                  <span className="rec-meta__run">{item.run.n}</span>
                </dd>
              </div>
            )}
            {item.run?.at && (
              <div className="rec-meta__item">
                <dt className="rec-meta__label">Run date</dt>
                <dd className="rec-meta__value">{item.run.at}</dd>
              </div>
            )}
            {item.scope && (
              <div className="rec-meta__item">
                <dt className="rec-meta__label">Scope</dt>
                <dd className="rec-meta__value">{item.scope}</dd>
              </div>
            )}
          </dl>

          {/* 3 · decided-by line and applied summary (decided cards only) */}
          {item.decision && (
            <div className="flex flex-col gap-1.5 mt-4 px-4 py-3 rounded-lg border border-[var(--color-grey-100)] bg-grey-50">
              <span className="text-[12px] leading-snug text-[var(--text-primary)]">
                <span className="font-semibold">{d.label}</span>
                <span className="text-[var(--text-secondary)]"> · {item.decision.by} · {item.decision.at}</span>
              </span>
              {item.decision.note && (
                <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">
                  <span className="italic text-[var(--text-muted)]">
                    {item.decision.status === "rejected"
                      ? "Reason given when rejected: "
                      : item.decision.status === "on-hold"
                        ? "Note added when put on hold: "
                        : "Note added when accepted: "}
                  </span>
                  {item.decision.note}
                </p>
              )}
              {item.decision.status === "accepted" && item.decision.applied && (() => {
                const done = item.decision.applied.filter((c) => c.on);
                const { adjusted, off } = tally(item.decision.applied);
                const extras = [adjusted && `${adjusted} adjusted`, off && `${off} not applied`].filter(Boolean).join(", ");
                return (
                  <p className="m-0 flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--text-primary)]">
                    <CheckCircle size={13} weight="fill" className="mt-[3px] shrink-0 text-green-600" />
                    {done.length} {done.length === 1 ? "change" : "changes"} applied on {systemsOf(done)}
                    {extras ? ` (${extras})` : ""}. Petavue read each one back and confirmed it saved.
                  </p>
                );
              })()}
              {item.decision.status === "accepted" && item.applied && (
                <p className="m-0 flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--text-primary)]">
                  {item.applied.includes("is confirming") ? (
                    <ArrowsClockwise size={13} className="mt-[3px] shrink-0 animate-spin text-[var(--color-primary-500)]" />
                  ) : (
                    <CheckCircle size={13} weight="fill" className="mt-[3px] shrink-0 text-green-600" />
                  )}
                  {item.applied}
                </p>
              )}
              {item.decision.status === "accepted" && item.impact && (
                <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.impact}</p>
              )}
              {item.decision.status === "rejected" && item.carried && (
                <p className="m-0 text-[12px] leading-relaxed text-[#757A97]">{item.carried}</p>
              )}
              {item.decision.status === "accepted" && item.followUp && (
                <p className="m-0 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  <span className="font-semibold">Follow-up check:</span> {item.followUp}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4 · the proposed change: the visual center of the card */}
        <div className="border border-primary-200 rounded-xl overflow-hidden bg-white">
          <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] bg-[#f8f9ff] border-solid border-t-0 border-x-0 border-b border-b-[var(--color-grey-100)]">
            <span className="text-[12px] font-semibold text-[var(--color-primary-600)]">
              The proposed change
            </span>
            <span className="text-[12px] text-[#757A97] text-right leading-snug">{item.changeTitle}</span>
          </div>
          <DataTable cols={item.changeCols} rows={item.changeRows} emphasise bare />
          {item.scopeNote && (
            <p className="m-0 px-[18px] py-[12px] text-[12px] leading-relaxed text-[#757A97] border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]">
              <span className="font-medium text-[var(--text-secondary)]">Scope note: </span>
              {item.scopeNote}
            </p>
          )}
        </div>

        {/* 5 · Timing · What to expect · Controls and checks · Follow-up check */}
        {(item.timing || item.expect || item.controls || item.followUp || item.needsFromYou) && (() => {
          const cells = [
            item.timing && ["Timing", item.timing],
            item.expect && ["What to expect", item.expect],
            item.controls && ["Controls and checks", item.controls],
            (item.followUp || item.needsFromYou) && ["Follow-up check", item.followUp],
          ].filter(Boolean);
          const long = [...cells.map((c) => c[1]), item.needsFromYou].some((b) => (b || "").length > 220);
          if (long) {
            return (
              <div className="flex flex-col border border-[var(--color-grey-100)] rounded-lg overflow-hidden">
                {cells.map(([label, body]) => (
                  <EvidenceRow key={label} label={label}>{body}</EvidenceRow>
                ))}
                {item.needsFromYou && (
                  <div className="flex items-start gap-4 px-4 py-3 bg-[#f8f9ff] border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]">
                    <span className="w-[150px] shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--color-primary-600)]">
                      Needs from you
                    </span>
                    <p className="m-0 flex-1 min-w-0 text-[12px] leading-relaxed text-[var(--text-primary)]">
                      {item.needsFromYou}
                    </p>
                  </div>
                )}
              </div>
            );
          }
          return (
            <div
              className="grid border border-[var(--color-grey-100)] rounded-lg overflow-hidden divide-x divide-[var(--color-grey-100)]"
              style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
            >
              {cells.map(([label, body]) => (
                <div key={label} className="flex flex-col gap-1.5 px-4 py-3">
                  <span className={QUIET}>{label}</span>
                  {body && <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{body}</p>}
                  {label === "Follow-up check" && item.needsFromYou && (
                    <>
                      <span className={cn(QUIET, body && "mt-2")}>Needs from you</span>
                      <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.needsFromYou}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* 7 · How we reached this — open by default on an open card,
            collapsed once decided. */}
        {item.noticed && (
          <div className="border border-[var(--color-grey-100)] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setWorking((v) => !v)}
              className="w-full flex items-center gap-2 px-[18px] py-[15px] bg-[#f8f9ff] border-none cursor-pointer text-left"
            >
              <CaretRight size={12} className={cn("shrink-0 text-[var(--color-grey-400)] transition-transform", working && "rotate-90")} />
              <span className="text-[12px] font-semibold text-[var(--color-primary-600)]">How we reached this</span>
              <span className="ml-auto text-[12px] text-[#757A97]">
                Workflow run {item.run?.n} · {item.run?.at}
              </span>
            </button>
            {working && (
              <div className="flex flex-col">
                <EvidenceRow label="What we noticed">{item.noticed}</EvidenceRow>
                <EvidenceRow label="What we analyzed">{item.analyzed}</EvidenceRow>
                {item.dataCols && (
                  <div className="px-4 py-3 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-grey-100)]">
                    <span className={cn(QUIET, "block mb-2")}>What the data showed</span>
                    <DataTable cols={item.dataCols} rows={item.dataRows} />
                  </div>
                )}
                {item.found && <EvidenceRow label="What we found">{item.found}</EvidenceRow>}
                {item.estimate && <EvidenceRow label="How we estimated the impact">{item.estimate}</EvidenceRow>}
                {item.whyNow && <EvidenceRow label="Why now">{item.whyNow}</EvidenceRow>}
                {item.whyFollows && <EvidenceRow label="Why this action follows">{item.whyFollows}</EvidenceRow>}
                {item.excluded && <EvidenceRow label="What we excluded">{item.excluded}</EvidenceRow>}
                {item.confidence && <EvidenceRow label="Confidence and limits">{item.confidence}</EvidenceRow>}
                {item.trace?.length > 0 && (
                  <EvidenceRow label="How this was analyzed">
                    <div className="flex flex-col gap-2">
                      {item.trace.map((tr) => (
                        <p key={tr.specialist} className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">
                          <span className="font-semibold">{tr.specialist}</span>{" "}
                          <FamilyPill agentKey={tr.agent} /> {tr.text}
                        </p>
                      ))}
                    </div>
                  </EvidenceRow>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8 · Comments, always last, always present. */}
        <Comments comments={item.comments || []} onPost={onComment} posting={commentPosting} />

        <AnimatePresence>
          {(modal === "accepted" || modal === "view") && (
            <ApplyModal
              item={item}
              platform={platform}
              mode={modal === "view" ? "view" : "apply"}
              onClose={() => setModal(null)}
              onApplied={(note, choice, applied) => { setDeciding(false); onDecide("accepted", note, choice, applied); }}
            />
          )}
          {(modal === "on-hold" || modal === "rejected") && (
            <DecisionModal
              kind={modal}
              item={item}
              platform={platform}
              onCancel={() => setModal(null)}
              onConfirm={(note) => { setModal(null); setDeciding(false); onDecide(modal, note); }}
            />
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* 6 · the decision row, pinned in layout below the scroll area so it
          can never cover the comments thread. Accept, Hold, Reject on open
          cards; a single Decide now on held cards. */}
      {showBar && (
        <div className="shrink-0 border-t border-[var(--color-grey-100)] bg-white px-[34px] py-3">
          {open || deciding ? (
            <div className="flex items-center gap-2">
              <Button variant="primary" size="md" icon={CheckCircle} iconWeight="fill" label="Apply" onClick={() => setModal("accepted")} />
              {open && <Button variant="secondary" size="md" icon={PauseCircle} label="Hold" onClick={() => setModal("on-hold")} />}
              <Button variant="blueGhost" size="md" icon={Prohibit} label="Reject" onClick={() => setModal("rejected")} />
              {deciding && <Button variant="ghost" size="md" label="Cancel" onClick={() => setDeciding(false)} />}
            </div>
          ) : applied ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-[var(--text-muted)]">Decided. This recommendation is closed.</span>
              <Button variant="secondary" size="md" label="See what changed" onClick={() => setModal("view")} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" label="Decide now" onClick={() => setDeciding(true)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState(params.get("workflow") || "all");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["goals-recommendations"],
    queryFn: () => apiGet("/api/goals/recommendations"),
    // the applied line walks from "is confirming" to the read-back clause on
    // elapsed time, so the accepted card updates in place
    refetchInterval: 700,
  });
  const { data: wfData } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });

  const items = data?.items || [];
  const workflows = wfData?.workflows || [];
  const wfById = useMemo(() => Object.fromEntries(workflows.map((w) => [w.id, w])), [workflows]);

  // One click on the modal's confirm commits the decision; the card itself
  // changing state is the confirmation, so there is no toast.
  const decide = useMutation({
    mutationFn: ({ id, decision, note, choice, applied }) =>
      apiPost(`/api/goals/recommendations/${id}/decide`, { decision, note, choice, applied }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
      qc.invalidateQueries({ queryKey: ["agent-workflows"] });
    },
  });
  const comment = useMutation({
    mutationFn: ({ id, text }) => apiPost(`/api/goals/recommendations/${id}/comment`, { text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals-recommendations"] }),
  });

  // Channel is secondary metadata, so it filters what everything else counts.
  const channelOf = (it) => {
    const id = it.platform || wfById[it.workflowId]?.platform;
    return id ? platformOf(id).short : null;
  };
  const channels = [...new Set(items.map(channelOf).filter(Boolean))].sort();
  const byChannel = channel === "all" ? items : items.filter((it) => channelOf(it) === channel);

  const openOf = (list) => list.filter((i) => !i.decision);
  const chips = [
    { id: "all", name: "All", count: openOf(byChannel).length },
    ...workflows.map((w) => ({
      id: w.id,
      name: w.name,
      count: openOf(byChannel).filter((i) => i.workflowId === w.id).length,
    })),
  ];

  const scoped = scope === "all" ? byChannel : byChannel.filter((i) => i.workflowId === scope);

  // The status filter (doc 19 §4): independent of workflow and channel, and
  // its counts update live with those filters applied. Accepted covers every
  // stage after acceptance.
  const statusOf = (it) => (it.decision ? it.decision.status : "open");
  const STATUS_SEGMENTS = [
    { v: "all", label: "All" },
    { v: "open", label: "Open" },
    { v: "accepted", label: "Accepted" },
    { v: "rejected", label: "Rejected" },
    { v: "on-hold", label: "On hold" },
  ];
  const countFor = (v) => (v === "all" ? scoped.length : scoped.filter((i) => statusOf(i) === v).length);
  const filtered = status === "all" ? scoped : scoped.filter((i) => statusOf(i) === status);
  const selected = filtered.find((i) => i.id === sel) || filtered[0];

  const [sageOpen, setSageOpen] = useState(false);
  const sageContext = selected
    ? {
        id: selected.id,
        name: selected.shortTitle || selected.title,
        agentLabel: deckFamilyOf(selected.agent),
        specialist: wfById[selected.workflowId]?.found?.find((f) => f.agent === selected.agent)?.specialist,
        workflowName: wfById[selected.workflowId]?.name,
      }
    : null;

  const pickScope = (id) => {
    setScope(id);
    setSel(null);
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("workflow");
    else next.set("workflow", id);
    setParams(next, { replace: true });
  };

  // Empty states, one sentence each (doc 19 §8.4).
  const EMPTY = {
    open: "Nothing needs your decision. The next run is scheduled for Sep 2, 7:00 AM.",
    accepted: "No accepted recommendations yet. Recommendations you accept appear here with their results.",
    rejected: "No rejected recommendations. When you reject one, the reason is saved here and future runs work within it.",
    "on-hold": "Nothing is on hold.",
    all: "Nothing matches this workflow and channel. The next run will look again.",
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
        <span className="text-[16px] leading-[24px] font-medium">Recommendations</span>
        <button
          type="button"
          onClick={() => setSageOpen(true)}
          className="inline-flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-[8px] text-[12px] font-medium text-white border-none cursor-pointer transition-[filter] hover:brightness-105"
          style={{ background: SAGE_GRADIENT }}
        >
          <Sparkle size={14} weight="fill" /> Ask Sage
        </button>
      </div>

      <RecSageDrawer open={sageOpen} onClose={() => setSageOpen(false)} context={sageContext} />

      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">

          {isLoading ? (
            <div className="flex-1 grid place-items-center text-[12px] text-[#757A97]">Loading…</div>
          ) : (
            <div className="flex-1 min-h-0 flex">
              <div className="w-[400px] max-w-[400px] shrink-0 flex flex-col border-r border-[var(--color-grey-100)] overflow-hidden">
                <div className="shrink-0 flex items-center gap-2 h-[52px] px-4 border-b border-[var(--color-grey-100)]">
                  <span className="min-w-0 text-[14px] font-semibold text-[var(--text-primary)]">
                    Decision queue
                  </span>
                  <span className="ml-auto shrink-0">
                    <FilterDropdown
                      ariaLabel="Filter by workflow"
                      size="md"
                      value={scope}
                      onChange={pickScope}
                      options={chips.map((c) => ({
                        value: c.id,
                        label: c.id === "all" ? "All workflows" : c.name,
                        count: c.count,
                      }))}
                    />
                  </span>
                </div>

                {/* channel: a contained segmented control */}
                <div className="shrink-0 px-3 py-2 border-b border-[var(--color-grey-100)]">
                  <div
                    role="tablist"
                    className="flex items-stretch gap-0.5 p-0.5 bg-grey-50 border border-[var(--color-grey-100)] rounded-lg"
                  >
                    {[{ v: "all", label: "All channels" }, ...channels.map((c) => ({ v: c, label: c }))].map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        role="tab"
                        aria-selected={channel === t.v}
                        onClick={() => { setChannel(t.v); setSel(null); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 h-7 px-2 rounded-md text-[12px] cursor-pointer transition-colors border-solid border",
                          channel === t.v
                            ? "bg-white border-[var(--color-grey-200)] text-[var(--text-primary)] font-medium shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]"
                            : "bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {t.v !== "all" && <SourceIcon name={t.label} size={13} />}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* status: open vs decided (doc 19 §4). Zero segments stay
                      visible and clickable. */}
                  <div
                    role="tablist"
                    className="mt-2 flex items-stretch gap-0.5 p-0.5 bg-grey-50 border border-[var(--color-grey-100)] rounded-lg"
                  >
                    {STATUS_SEGMENTS.map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        role="tab"
                        aria-selected={status === t.v}
                        onClick={() => { setStatus(t.v); setSel(null); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 h-7 px-1.5 rounded-md text-[12px] cursor-pointer transition-colors border-solid border whitespace-nowrap",
                          status === t.v
                            ? "bg-white border-[var(--color-grey-200)] text-[var(--text-primary)] font-medium shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]"
                            : "bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {t.label}
                        <span className="tabular-nums text-[var(--text-muted)]">{countFor(t.v)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-14 px-6 text-center">
                      <span className="grid place-items-center w-10 h-10 rounded-full bg-grey-50 border border-[var(--color-grey-100)]">
                        <CheckCircle size={18} weight="fill" className="text-green-600" />
                      </span>
                      <span className="text-[12px] leading-relaxed text-[#757A97]">
                        {EMPTY[status] || EMPTY.all}
                      </span>
                    </div>
                  ) : (
                    filtered.map((it) => (
                      <QueueRow key={it.id} item={it} workflowName={wfById[it.workflowId]?.name || it.workflowId} selected={selected?.id === it.id} onClick={() => setSel(it.id)} />
                    ))
                  )}
                </div>
              </div>

              {selected ? (
                <Detail
                  key={selected.id}
                  item={selected}
                  workflow={wfById[selected.workflowId]}
                  onDecide={(decision, note, choice, applied) => decide.mutate({ id: selected.id, decision, note, choice, applied })}
                  onComment={(text) => comment.mutate({ id: selected.id, text })}
                  commentPosting={comment.isPending}
                  onOpenWorkflow={() => navigate(`/workflows/${selected.workflowId}?from=/recommendations`)}
                />
              ) : (
                <div className="flex-1 grid place-items-center px-8 text-center">
                  <span className="text-[12px] text-[#757A97] max-w-[320px]">
                    Choose a different workflow, channel, or status to see the recommendations behind it.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
