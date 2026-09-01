import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Lightning, Warning, Eye, CheckCircle, CaretRight,
  Flask, Question, CaretDown, Sparkle, PaperPlaneRight,
  ArrowsClockwise, Handshake, PencilSimpleLine, PauseCircle, Prohibit,
} from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { apiGet, apiPost, getApiBase, getAuthToken } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf, deckFamilyOf, AGENTS } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";
import { SAGE_GRADIENT } from "../goals/SageWidget";
import { AnalyticsChat } from "../../components/dashboards/analytics-chat-widget";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import { PUSHER_KEY, PUSHER_CLUSTER } from "../../config";
// the chat widget's own stylesheet — without it Sage renders as unstyled
// stacked text (other pages import it, this page must too)
import "../../components/dashboards/analytics-chat-widget/styles.css";

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
  "act-now": { label: "Act now", icon: Lightning, chip: "text-rose-600 border-rose-200 bg-rose-50" },
  "this-week": { label: "This week", icon: Warning, chip: "text-amber-700 border-amber-200 bg-amber-50" },
  monitor: { label: "Next run", icon: Eye, chip: "text-blue-700 border-blue-200 bg-blue-50" },
};

const DECISION = {
  accepted: { label: "Accepted", chip: "text-green-700 border-green-200 bg-green-50", dot: "bg-green-500" },
  rejected: { label: "Rejected", chip: "text-rose-700/80 border-rose-200 bg-rose-50/60", dot: "bg-rose-300" },
  "on-hold": { label: "On hold", chip: "text-amber-700 border-amber-200 bg-amber-50", dot: "bg-amber-500" },
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
                className={cn(
                  "flex-1 min-w-0 text-[12px] leading-snug text-[var(--text-primary)]",
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
  const dot = d
    ? d.dot
    : item.urgency === "act-now" ? "bg-rose-500" : item.urgency === "this-week" ? "bg-amber-500" : "bg-blue-500";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "w-full text-left flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors",
        "border-solid border-t-0 border-r-0 border-b border-b-[var(--color-grey-100)] border-l-[3px] border-l-transparent",
        selected ? "bg-primary-50 border-l-primary-500" : "bg-transparent hover:bg-primary-50",
        d && !selected && "opacity-70",
      )}
    >
      <i className={cn("mt-[7px] w-[7px] h-[7px] rounded-full shrink-0", dot)} aria-hidden="true" />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <Tooltip title={item.title} placement="right">
          <span className={cn("min-w-0 text-[14px] leading-snug text-[var(--text-primary)]", d ? "font-normal" : "font-medium")}>
            {item.shortTitle || item.title}
          </span>
        </Tooltip>
        <span className="min-w-0 text-[12px] leading-snug text-[var(--text-muted)]">
          {workflowName} · {d ? d.label : u.label}
        </span>
      </span>
      {item.awaitingYou && !item.decision && (
        <Question size={14} className="mt-1 shrink-0 text-amber-600" aria-label="Waiting on you" />
      )}
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
  const platform = workflow ? platformOf(workflow.platform).short : null;
  const specialist = workflow?.found?.find((f) => f.agent === item.agent)?.specialist;
  const onHold = item.decision?.status === "on-hold";
  const showBar = open || onHold;

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-6 pt-[30px] px-[34px] pb-8 max-w-[1180px]">
        {/* 1 · chip row: urgency on open cards, the decision status in the
            same first position once decided, then type, workflow, channel. */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap mb-3.5">
            {d ? (
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1.5 text-[12px] font-semibold", d.chip)}>
                {d.label}
              </span>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold", u.chip)}>
                <u.icon size={12} /> {u.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-grey-200)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)]">
              <t.icon size={12} /> {t.label}
            </span>
            <button
              type="button"
              onClick={onOpenWorkflow}
              className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-primary-600)] cursor-pointer"
            >
              {workflow?.name || item.workflowId}
            </button>
            {workflow && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-grey-200)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)]">
                <SourceIcon name={platform} size={13} />
                {platform}
              </span>
            )}
          </div>

          {/* 2 · headline, basis, metadata line */}
          <h2 className="m-0 text-[24px] leading-[1.2] tracking-[-0.5px] font-semibold text-[var(--text-primary)]">
            {item.title}
          </h2>
          <p className="m-0 mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">{item.basis}</p>
          <p className="m-0 mt-2.5 inline-flex items-center gap-1.5 flex-wrap text-[12px] text-[#757A97]">
            {specialist && (
              <>
                Found by <span className="font-medium text-[var(--text-secondary)]">{specialist}</span>
                <FamilyPill agentKey={item.agent} />
                <span aria-hidden="true">·</span>
              </>
            )}
            Run {item.run?.n} · {item.run?.at} · {item.scope}
          </p>

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
        {(item.timing || item.expect || item.controls || item.followUp) && (
          <div className="grid grid-cols-2 md:grid-cols-4 border border-[var(--color-grey-100)] rounded-lg overflow-hidden divide-x divide-[var(--color-grey-100)]">
            <div className="flex flex-col gap-1.5 px-4 py-3">
              <span className={QUIET}>Timing</span>
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.timing}</p>
            </div>
            <div className="flex flex-col gap-1.5 px-4 py-3">
              <span className={QUIET}>What to expect</span>
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.expect}</p>
            </div>
            <div className="flex flex-col gap-1.5 px-4 py-3">
              <span className={QUIET}>Controls and checks</span>
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.controls}</p>
            </div>
            <div className="flex flex-col gap-1.5 px-4 py-3">
              <span className={QUIET}>Follow-up check</span>
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.followUp}</p>
              {item.needsFromYou && (
                <>
                  <span className={cn(QUIET, "mt-2")}>Needs from you</span>
                  <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{item.needsFromYou}</p>
                </>
              )}
            </div>
          </div>
        )}

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
                Run {item.run?.n} · {item.run?.at}
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
                <EvidenceRow label="Why this action follows">{item.whyFollows}</EvidenceRow>
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
          {modal && (
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
              <Button variant="primary" size="md" label="Accept" onClick={() => setModal("accepted")} />
              {open && <Button variant="secondary" size="md" icon={PauseCircle} label="Hold" onClick={() => setModal("on-hold")} />}
              <Button variant="secondary" size="md" icon={Prohibit} label="Reject" onClick={() => setModal("rejected")} />
              {deciding && <Button variant="ghost" size="md" label="Cancel" onClick={() => setDeciding(false)} />}
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
    refetchInterval: 1200,
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
    mutationFn: ({ id, decision, note }) => apiPost(`/api/goals/recommendations/${id}/decide`, { decision, note }),
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
  const channelOf = (it) => platformOf(wfById[it.workflowId]?.platform).short;
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
                  onDecide={(decision, note) => decide.mutate({ id: selected.id, decision, note })}
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
