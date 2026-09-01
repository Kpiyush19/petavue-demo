import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Lightning, Warning, Eye, CheckCircle, CaretRight, ArrowSquareOut,
  MagnifyingGlass, Prohibit, PauseCircle, Flask, ChatText, Question, CaretDown,
} from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { toast } from "sonner";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { AGENTS, platformOf } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import WorkflowGlyph from "../../components/WorkflowGlyph";
import SourceIcon from "../../components/SourceIcon";

/* ── Urgency and lifecycle are separate axes.
   Urgency says how soon this should be decided. Lifecycle says how far the
   decision has got. The old queue collapsed them into one status, which is how
   a deferred item ended up reading as "acted". ── */
const URGENCY = {
  "act-now": { label: "Act now", icon: Lightning, fg: "text-rose-600", chip: "text-rose-600 border-rose-200 bg-rose-50" },
  "this-week": { label: "This week", icon: Warning, fg: "text-amber-600", chip: "text-amber-700 border-amber-200 bg-amber-50" },
  monitor: { label: "Monitor", icon: Eye, fg: "text-blue-600", chip: "text-blue-700 border-blue-200 bg-blue-50" },
};

const LIFECYCLE = {
  "needs-decision": { label: "Needs your decision", chip: "text-rose-600 border-rose-200 bg-rose-50" },
  approved: { label: "Approved", chip: "text-blue-700 border-blue-200 bg-blue-50" },
  applying: { label: "Applying", chip: "text-blue-700 border-blue-200 bg-blue-50" },
  applied: { label: "Applied", chip: "text-blue-700 border-blue-200 bg-blue-50" },
  confirmed: { label: "Confirmed in platform", chip: "text-green-700 border-green-200 bg-green-50" },
  "impact-ready": { label: "Impact assessed", chip: "text-green-700 border-green-200 bg-green-50" },
  held: { label: "On hold", chip: "text-amber-700 border-amber-200 bg-amber-50" },
  rejected: { label: "Rejected", chip: "text-[var(--text-muted)] border-grey-200 bg-grey-50" },
  superseded: { label: "Superseded", chip: "text-[var(--text-muted)] border-grey-200 bg-grey-50" },
  expired: { label: "Expired", chip: "text-[var(--text-muted)] border-grey-200 bg-grey-50" },
  failed: { label: "Failed", chip: "text-rose-700 border-rose-200 bg-rose-50" },
};

/* Test runs on its own track: a proposed test is not an approval, and a test
   result is not an applied change. Only the first two states have data behind
   them today; the rest exist so the vocabulary is one list, not two. */
const TEST = {
  proposed: { label: "Test proposed", chip: "text-blue-700 border-blue-200 bg-blue-50" },
  running: { label: "Test running", chip: "text-blue-700 border-blue-200 bg-blue-50" },
  "stopped-early": { label: "Stopped early", chip: "text-amber-700 border-amber-200 bg-amber-50" },
  "result-ready": { label: "Result ready", chip: "text-blue-700 border-blue-200 bg-blue-50" },
  adopted: { label: "Adopted", chip: "text-green-700 border-green-200 bg-green-50" },
  rejected: { label: "Rejected", chip: "text-[var(--text-muted)] border-grey-200 bg-grey-50" },
  inconclusive: { label: "Inconclusive", chip: "text-amber-700 border-amber-200 bg-amber-50" },
};

const LABEL = "text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

/* A table, not a paragraph. Used for both the proposed change and the finding
   rows, because both are the same claim: named entities with their numbers. */
function DataTable({ cols, rows, emphasise }) {
  return (
    <div className="overflow-x-auto border border-[var(--color-grey-100)] rounded-lg">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-grey-50">
            {cols.map((c, i) => (
              <th
                key={c}
                className={cn(
                  "text-left font-medium text-[var(--text-muted)] px-3 py-2 whitespace-nowrap",
                  i > 0 && "text-right",
                )}
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
                      : "text-right tabular-nums text-[var(--text-secondary)]",
                    // "+N more" rows are what make the column totals reconcile
                    // with the headline, so they stay visible but read quieter.
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

function Beat({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}


/* ── Applied is not done.
   The handoff is explicit that "Confirmed in platform" may only appear after
   Petavue has re-read the platform, never from intent. So the stages are shown
   as a quiet stepper on the card and the read-back line names what was
   verified. ── */
const APPLY_STEPS = ["approved", "applying", "applied", "confirmed", "impact-ready"];

function ApplyStepper({ lifecycle, readback, platform }) {
  // impact-ready sits past the end of the apply path, not outside it: the
  // change was confirmed and then measured. Without this the read-back line
  // vanished on exactly the cards that prove read-back happened.
  const done = lifecycle === "impact-ready";
  const i = APPLY_STEPS.indexOf(lifecycle);
  if (i < 0) return null;
  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-lg border border-[var(--color-grey-100)] bg-white">
      <div className="flex items-center gap-2 flex-wrap">
        {APPLY_STEPS.map((k, n) => (
          <span key={k} className="inline-flex items-center gap-2">
            {n > 0 && <span className="w-4 h-px bg-[var(--color-grey-200)]" />}
            <span className="inline-flex items-center gap-1.5">
              <i
                className={cn(
                  "w-[7px] h-[7px] rounded-full shrink-0",
                  n < i ? "bg-green-500" : n === i ? (done ? "bg-green-500" : "bg-[var(--color-primary-500)]") : "bg-[var(--color-grey-200)]",
                )}
              />
              <span
                className={cn(
                  "text-[12px]",
                  n === i ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                )}
              >
                {LIFECYCLE[k].label}
              </span>
            </span>
          </span>
        ))}
      </div>
      {(lifecycle === "confirmed" || done) && (
        <p className="m-0 flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
          <CheckCircle size={13} weight="fill" className="mt-[3px] shrink-0 text-green-600" />
          {readback ||
            `Petavue re-read the saved settings in ${platform || "the platform"} and they match the approved change.`}
        </p>
      )}
    </div>
  );
}

const VERDICT = {
  improved: { label: "Improved", chip: "text-green-700 border-green-200 bg-green-50" },
  worsened: { label: "Worsened", chip: "text-rose-700 border-rose-200 bg-rose-50" },
  unchanged: { label: "Unchanged", chip: "text-[var(--text-secondary)] border-grey-200 bg-grey-50" },
  immature: { label: "Too early to judge", chip: "text-amber-700 border-amber-200 bg-amber-50" },
  confounded: { label: "Confounded", chip: "text-amber-700 border-amber-200 bg-amber-50" },
};


/* ── The confirmation sheet.
   Approving is the only action here that reaches a live ad account, so it gets
   one deliberate pause that restates the scope, the projected state after the
   change, and when the result will be judged. It replaces the old required
   note: a text box was friction that proved nothing, this is friction that
   tells the customer exactly what they are about to do. ── */
function ConfirmSheet({ item, platform, onBack, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0"
        style={{ background: "rgba(15,22,36,0.28)" }}
        onClick={onBack}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-label="Confirm this change"
        className="relative w-[440px] max-w-[92vw] bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex flex-col gap-3 px-5 py-5">
          <h3 className="m-0 text-[16px] font-semibold text-[var(--text-primary)]">
            Approve this {platform || "platform"} change?
          </h3>
          <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-[var(--text-primary)]">
            <span className="text-[var(--text-secondary)]">
              {item.scope}
              {item.entities ? ` · ${item.entities}` : ""}
            </span>
            {item.projection && <span>{item.projection}</span>}
            <span className="text-[#757A97]">
              Petavue will re-read the saved settings in {platform || "the platform"} and only mark this confirmed
              once they match.
            </span>
            {item.checkResult && <span className="text-[#757A97]">Impact check: {item.checkResult}</span>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-grey-100)] bg-grey-50">
          <Button variant="secondary" size="md" label="Back" onClick={onBack} />
          <Button variant="primary" size="md" label="Approve and apply" onClick={onConfirm} />
        </div>
      </motion.div>
    </div>
  );
}


function FilterDropdown({ value, options, onChange, ariaLabel }) {
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
        size="sm"
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
          className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[240px] max-h-[320px] overflow-y-auto py-1 bg-white border border-[var(--color-grey-100)] rounded-lg shadow-[0_8px_24px_0_rgba(0,0,0,0.10)]"
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
                  "flex-1 min-w-0 truncate text-[13px] text-[var(--text-primary)]",
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

/* ── The queue row. Compact by rule: everything else about the recommendation
   is on the detail pane a few hundred pixels to the right. ── */
function QueueRow({ item, selected, onClick }) {
  const u = URGENCY[item.urgency] || URGENCY.monitor;
  const decided = item.lifecycle !== "needs-decision";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "w-full text-left flex items-center min-h-[46px] px-3 py-2.5 cursor-pointer transition-colors",
        "border-solid border-t-0 border-r-0 border-b border-b-[var(--color-grey-100)] border-l-[3px] border-l-transparent",
        selected ? "bg-primary-50 border-l-primary-500" : "bg-transparent hover:bg-primary-50",
        decided && !selected && "opacity-60",
      )}
    >
      <u.icon size={15} className={cn("shrink-0 mr-2.5", u.fg)} aria-hidden="true" />
      {item.awaitingYou && item.lifecycle === "needs-decision" && (
        <Question size={13} className="shrink-0 mr-1.5 text-amber-600" aria-label="Waiting on you" />
      )}
      <Tooltip title={`${u.label} — ${item.title}`} placement="right">
        <span className={cn("min-w-0 truncate text-[14px] text-[var(--text-primary)]", selected && "font-medium")}>
          {item.title}
        </span>
      </Tooltip>
    </button>
  );
}

/* ── The decision surface. Order is fixed by the handoff: what to change, then
   why, then the decision. The working opens by default — an unopened proof
   reads as an unsupported claim. ── */
function Detail({ item, workflow, onDecide, onTest, onAddContext, onOpenWorkflow }) {
  const [working, setWorking] = useState(true);
  const [trace, setTrace] = useState(false);
  const [reasonFor, setReasonFor] = useState(null);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const u = URGENCY[item.urgency] || URGENCY.monitor;
  const life = LIFECYCLE[item.lifecycle] || LIFECYCLE["needs-decision"];
  const agent = AGENTS[item.agent];
  const AgentIcon = agentIcon(item.agent);
  const open = item.lifecycle === "needs-decision";

  const submitReason = () => {
    if (!reason.trim()) return;
    if (reasonFor === "context") onAddContext(reason.trim());
    else onDecide(reasonFor, reason.trim());
    setReasonFor(null);
    setReason("");
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-5">
        {/* Header. Workflow, channel, run and date — the four things that say
            where this came from, per the 6.1 composition. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[12px] font-medium", u.chip)}>
              <u.icon size={12} /> {u.label}
            </span>
            <span className={cn("inline-flex items-center h-6 px-2 rounded-md border text-[12px] font-medium", life.chip)}>
              {life.label}
            </span>
            {item.test && TEST[item.test] && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[12px] font-medium",
                  TEST[item.test].chip,
                )}
              >
                <Flask size={12} /> {TEST[item.test].label}
              </span>
            )}
          </div>
          <h2 className="m-0 text-[20px] leading-snug font-semibold text-[var(--text-primary)]">{item.title}</h2>
          <p className="m-0 text-[14px] leading-relaxed text-[var(--text-secondary)]">{item.basis}</p>
          <div className="flex items-center gap-2 text-[12px] text-[#757A97] flex-wrap">
            <button
              type="button"
              onClick={onOpenWorkflow}
              className="inline-flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-[var(--color-primary-600)] hover:underline"
            >
              <WorkflowGlyph size={13} />
              {workflow?.name || item.workflowId}
            </button>
            {workflow && (
              <>
                <span className="text-[var(--color-grey-300)]">·</span>
                <span>{platformOf(workflow.platform).short}</span>
              </>
            )}
            <span className="text-[var(--color-grey-300)]">·</span>
            <span>{item.scope}</span>
            <span className="text-[var(--color-grey-300)]">·</span>
            <span>Run {item.run?.n}</span>
            <span className="text-[var(--color-grey-300)]">·</span>
            <span>{item.run?.at}</span>
          </div>
        </div>

        <ApplyStepper
          lifecycle={item.lifecycle}
          readback={item.readback}
          platform={workflow ? platformOf(workflow.platform).short : null}
        />

        {item.impact && (
          <div className="flex flex-col gap-2 px-4 py-3 rounded-lg border border-[var(--color-grey-100)] bg-white">
            <div className="flex items-center gap-2">
              <span className={LABEL}>Impact</span>
              <span
                className={cn(
                  "inline-flex items-center h-5 px-2 rounded-md border text-[11px] font-medium",
                  (VERDICT[item.impact.verdict] || VERDICT.unchanged).chip,
                )}
              >
                {(VERDICT[item.impact.verdict] || VERDICT.unchanged).label}
              </span>
              <span className="ml-auto text-[12px] text-[#757A97]">Measured {item.impact.measuredAt}</span>
            </div>
            <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.impact.detail}</p>
          </div>
        )}

        {item.lifecycle === "rejected" && item.note && (
          <div className="flex flex-col gap-1.5 px-4 py-3 rounded-lg border border-[var(--color-grey-100)] bg-grey-50">
            <span className={LABEL}>Why it was rejected</span>
            <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.note}</p>
            {item.carried && <p className="m-0 text-[12px] text-[#757A97]">{item.carried}</p>}
          </div>
        )}

        {/* The evidence comes before the change it justifies. A reader should
            reach the proposed edit having already seen the rows behind it,
            rather than being asked to trust a headline and scroll for proof. */}
        <div className="border border-[var(--color-grey-100)] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setWorking((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-grey-50 border-none cursor-pointer text-left"
          >
            <CaretRight size={12} className={cn("shrink-0 text-[var(--color-grey-400)] transition-transform", working && "rotate-90")} />
            <span className={LABEL}>The evidence</span>
            <span className="ml-auto text-[12px] text-[#757A97]">
              Run {item.run?.n} · {item.run?.at}
            </span>
          </button>
          {working && (
            <div className="flex flex-col gap-4 px-4 py-4">
              <Beat label="Symptom">
                <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.symptom}</p>
              </Beat>
              <Beat label="Examined">
                <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.examined}</p>
              </Beat>
              <Beat label="What the data showed">
                <DataTable cols={item.findingCols} rows={item.findingRows} />
              </Beat>
              <Beat label="Therefore">
                <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.therefore}</p>
              </Beat>
            </div>
          )}
        </div>

        {/* The proposed change. This block IS the recommendation. */}
        <div className="flex flex-col gap-2">
          <span className={LABEL}>Proposed change</span>
          <p className="m-0 text-[13px] text-[#757A97]">{item.changeTitle}</p>
          <DataTable cols={item.changeCols} rows={item.changeRows} emphasise />
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 rounded-lg bg-grey-50 border border-[var(--color-grey-100)]">
          <Beat label="When">
            <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.when}</p>
          </Beat>
          <Beat label="Expected effect">
            <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.expected}</p>
          </Beat>
          {item.guardrail && (
            <Beat label="Guardrail">
              <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.guardrail}</p>
            </Beat>
          )}
          {item.checkResult && (
            <Beat label="Check result">
              <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.checkResult}</p>
            </Beat>
          )}
          {item.needsFromYou && (
            <Beat label="Needs from you">
              <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.needsFromYou}</p>
            </Beat>
          )}
        </div>

        {/* Agent provenance is a trace link at the very bottom, never the
            explanation. */}
        <div>
          <button
            type="button"
            onClick={() => setTrace((v) => !v)}
            className="inline-flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-[12px] text-[var(--color-primary-600)] hover:underline"
          >
            <CaretRight size={11} className={cn("transition-transform", trace && "rotate-90")} />
            Raw lineage and full agent trace
          </button>
          {trace && (
            <div className="flex items-center gap-2 mt-2 text-[12px] text-[#757A97]">
              <AgentIcon size={14} weight="fill" style={{ color: agent?.color }} className="shrink-0" />
              <span>{agent?.label}</span>
              <span className="text-[var(--color-grey-300)]">·</span>
              <span>Run {item.run?.n}</span>
              <span className="text-[var(--color-grey-300)]">·</span>
              <button
                type="button"
                onClick={onOpenWorkflow}
                className="inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-[var(--color-primary-600)] hover:underline"
              >
                Open the workflow <ArrowSquareOut size={11} />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {confirming && (
            <ConfirmSheet
              item={item}
              platform={workflow ? platformOf(workflow.platform).short : null}
              onBack={() => setConfirming(false)}
              onConfirm={() => { setConfirming(false); onDecide("approved"); }}
            />
          )}
        </AnimatePresence>

        {item.context && (
          <div className="flex flex-col gap-1.5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-amber-700">
              Revised with your context
            </span>
            <p className="m-0 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.context}</p>
            {item.changed && (
              <p className="m-0 text-[12px] leading-relaxed text-[#757A97]">
                <span className="font-medium text-amber-700">What changed: </span>
                {item.changed}
              </p>
            )}
          </div>
        )}
      </div>
      </div>

      {/* The decision stays on screen.
          The 6.1 composition puts the evidence above the change, which is right
          — but with real copy that pushes the buttons about 550px below the
          fold, so the first thing a viewer saw had no way to act on it. The
          order is unchanged; the actions are simply pinned. */}
      {open && (
        <div className="shrink-0 border-t border-[var(--color-grey-100)] bg-white px-6 py-3">
        {/* Decisions. No note is required to approve. Hold and Reject open a
            reason box, because a decision that changes later runs has to say
            why it did. */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="md" label="Approve change" onClick={() => setConfirming(true)} />
              <Button variant="secondary" size="md" icon={Flask} label="Test instead" onClick={() => onTest()} />
              <Button variant="secondaryGhost" size="md" icon={ChatText} label="Add context" onClick={() => { setReasonFor("context"); setReason(""); }} />
              <Button variant="secondaryGhost" size="md" icon={PauseCircle} label="Hold" onClick={() => { setReasonFor("held"); setReason(""); }} />
              <Button variant="secondaryGhost" size="md" icon={Prohibit} label="Reject" onClick={() => { setReasonFor("rejected"); setReason(""); }} />
            </div>
            {reasonFor && (
              <div className="flex flex-col gap-2 px-4 py-3 rounded-lg border border-[var(--color-grey-200)] bg-white">
                <span className={LABEL}>
                  {reasonFor === "context"
                    ? "What should the workflow take into account?"
                    : `Why are you ${reasonFor === "held" ? "holding" : "rejecting"} this?`}
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder={
                    reasonFor === "context"
                      ? "e.g. Cold Outreach is protected for the event promo until Sep 15."
                      : "Required. This reason is carried into later runs."
                  }
                  className="w-full resize-none rounded-md border border-[var(--color-grey-200)] px-3 py-2 text-[13px] outline-none focus:border-primary-500"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    label={reasonFor === "context" ? "Add context and rerun" : "Confirm"}
                    disabled={!reason.trim()}
                    onClick={submitReason}
                  />
                  <Button variant="ghost" size="sm" label="Cancel" onClick={() => setReasonFor(null)} />
                </div>
              </div>
            )}
          </div>
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
  const [sel, setSel] = useState(null);
  const [onlyAsking, setOnlyAsking] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["goals-recommendations"],
    queryFn: () => apiGet("/api/goals/recommendations"),
    // The apply stages advance on elapsed time, so the card walks from Approved
    // to Confirmed in platform without the user clicking anything.
    refetchInterval: 1200,
  });
  const { data: wfData } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });

  const items = data?.items || [];
  const workflows = wfData?.workflows || [];
  const wfById = useMemo(() => Object.fromEntries(workflows.map((w) => [w.id, w])), [workflows]);

  const decide = useMutation({
    mutationFn: ({ id, lifecycle, note }) => apiPost(`/api/goals/recommendations/${id}/decide`, { lifecycle, note }),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
      qc.invalidateQueries({ queryKey: ["agent-workflows"] });
      toast.success(LIFECYCLE[v.lifecycle]?.label || "Updated");
    },
  });
  const test = useMutation({
    mutationFn: ({ id }) => apiPost(`/api/goals/recommendations/${id}/test`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
      toast.success("Test proposed");
    },
  });
  const addContext = useMutation({
    mutationFn: ({ id, note }) => apiPost(`/api/goals/recommendations/${id}/context`, { note }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
      qc.invalidateQueries({ queryKey: ["agent-workflows"] });
      if (r?.item?.id) setSel(r.item.id);
      toast.success("Rerun with your context. The original is marked Superseded.");
    },
  });

  // Channel is secondary metadata, so it filters what the workflow chips count.
  const channelOf = (it) => platformOf(wfById[it.workflowId]?.platform).short;
  const channels = [...new Set(items.map(channelOf).filter(Boolean))].sort();
  const byChannel = channel === "all" ? items : items.filter((it) => channelOf(it) === channel);

  // Every workflow gets a chip, including the ones with nothing pending. A zero
  // is information: the workflow ran and found nothing worth changing.
  const openOf = (list) => list.filter((i) => i.lifecycle === "needs-decision");
  const chips = [
    { id: "all", name: "All", count: openOf(byChannel).length },
    ...workflows.map((w) => ({
      id: w.id,
      name: w.name,
      count: openOf(byChannel).filter((i) => i.workflowId === w.id).length,
    })),
  ];

  const scoped = scope === "all" ? byChannel : byChannel.filter((i) => i.workflowId === scope);
  const asking = scoped.filter((i) => i.awaitingYou && i.lifecycle === "needs-decision");
  const filtered = onlyAsking ? asking : scoped;
  const selected = filtered.find((i) => i.id === sel) || filtered[0];

  const pickScope = (id) => {
    setScope(id);
    setSel(null);
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("workflow");
    else next.set("workflow", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
        <span className="text-[16px] leading-[24px] font-medium">Recommendations</span>
        <FilterDropdown
          ariaLabel="Filter by channel"
          value={channel}
          onChange={(v) => { setChannel(v); setSel(null); }}
          options={[
            { value: "all", label: "All channels" },
            ...channels.map((c) => ({ value: c, label: c, icon: <SourceIcon name={c} size={15} /> })),
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">

          {isLoading ? (
            <div className="flex-1 grid place-items-center text-[13px] text-[#757A97]">Loading…</div>
          ) : (
            <div className="flex-1 min-h-0 flex">
              <div className="w-[400px] max-w-[400px] shrink-0 flex flex-col border-r border-[var(--color-grey-100)] overflow-hidden">
                <div className="shrink-0 flex items-center gap-2 h-[52px] px-3 border-b border-[var(--color-grey-100)]">
                  <span className="min-w-0 truncate text-[14px] font-semibold text-[var(--text-primary)]">
                    Decision queue
                  </span>
                  {asking.length > 0 && (
                    <Tooltip
                      title="Recommendations Petavue cannot finish without an answer from you"
                      placement="bottom"
                    >
                      <button
                        type="button"
                        onClick={() => { setOnlyAsking((v) => !v); setSel(null); }}
                        aria-pressed={onlyAsking}
                        className={cn(
                          "ml-auto shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md border text-[12px] font-medium cursor-pointer transition-colors",
                          onlyAsking
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-white border-[var(--color-grey-200)] text-[var(--text-secondary)] hover:bg-grey-50",
                        )}
                      >
                        <Question size={13} />
                        {asking.length}
                      </button>
                    </Tooltip>
                  )}
                  <span className={cn("shrink-0", asking.length === 0 && "ml-auto")}>
                    <FilterDropdown
                      ariaLabel="Filter by workflow"
                      value={scope}
                      onChange={pickScope}
                      options={chips.map((c) => ({
                        value: c.id,
                        label: c.id === "all" ? "All workflows" : c.name,
                        count: c.count,
                        icon: c.id === "all" ? null : <WorkflowGlyph size={14} className="text-[var(--text-muted)]" />,
                      }))}
                    />
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-14 px-6 text-center">
                      <span className="grid place-items-center w-10 h-10 rounded-full bg-grey-50 border border-[var(--color-grey-100)]">
                        <CheckCircle size={18} weight="fill" className="text-green-600" />
                      </span>
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">
                        {onlyAsking ? "Nothing is waiting on you" : "Checked, nothing to fix"}
                      </span>
                      <span className="text-[13px] leading-relaxed text-[#757A97]">
                        {onlyAsking
                          ? "Every recommendation here has what it needs to proceed."
                          : "Nothing matches this workflow and channel. The next run will look again."}
                      </span>
                    </div>
                  ) : (
                    filtered.map((it) => (
                      <QueueRow key={it.id} item={it} selected={selected?.id === it.id} onClick={() => setSel(it.id)} />
                    ))
                  )}
                </div>
              </div>

              {selected ? (
                <Detail
                  key={selected.id}
                  item={selected}
                  workflow={wfById[selected.workflowId]}
                  onDecide={(lifecycle, note) => decide.mutate({ id: selected.id, lifecycle, note })}
                  onTest={() => test.mutate({ id: selected.id })}
                  onAddContext={(note) => addContext.mutate({ id: selected.id, note })}
                  onOpenWorkflow={() => navigate(`/workflows/${selected.workflowId}?from=/recommendations`)}
                />
              ) : (
                <div className="flex-1 grid place-items-center px-8 text-center">
                  <span className="text-[13px] text-[#757A97] max-w-[320px]">
                    Choose a different workflow or channel to see the recommendations behind it.
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
