import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  CaretLeft, CaretRight, Database, Code, Brain, FileText,
  Play, Pause, ArrowRight, ArrowSquareOut, ShieldCheck, CheckCircle, XCircle, X,
  SlidersHorizontal, StackSimple, Clock, Target, CircleNotch, Warning, Eye, ChartLineUp, ArrowClockwise,
} from "@phosphor-icons/react";
import { Button as PvButton, Tooltip } from "@/ui";
import { toast } from "sonner";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { AGENTS, platformOf, deckFamilyOf } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";

// Step kinds, using the engine's own vocabulary. These sit one level down —
// the outcome leads, agents attribute, the raw work is available underneath.
const STEP = {
  athena_query: { icon: Database, label: "Query" },
  python_code: { icon: Code, label: "Code" },
  ai_analyze: { icon: Brain, label: "Model" },
  write_file: { icon: FileText, label: "Output" },
};

/* ── The workflow as a read-only diagram.
   Deliberately NOT a builder canvas: no palette, no zoom, no add-node, no grid.
   Nodes are agent families, never queries or model calls — the implementation
   lives one level down, behind each family. The branching is the point: it is
   what shows agents working together rather than in a line. ── */

const SECTION_LABEL = "text-[14px] font-semibold uppercase tracking-wider text-[var(--text-primary)]";
const LABEL = "text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

const RAIL = "var(--color-grey-200)";
const RAIL_ARROW = "var(--color-grey-400)";

function Drop() {
  return (
    <div className="flex justify-center">
      <span className="w-px h-5" style={{ background: RAIL }} />
    </div>
  );
}

/* ── Block state: queued · working · complete · blocked · failed.
   Derived from the workflow's own status and its last run rather than stored
   per block, so a block can never claim it completed on a day the workflow
   never ran. `working` and `blocked` are real states the model supports; the
   demo data has no run in progress, so nothing currently renders them. ── */
const BLOCK_STATE = {
  queued:   { label: "Queued",   icon: Clock,       cls: "text-[var(--text-muted)]" },
  working:  { label: "Working",  icon: CircleNotch, cls: "text-[var(--color-primary-500)] animate-spin" },
  complete: { label: "Complete", icon: CheckCircle, cls: "text-green-600" },
  blocked:  { label: "Blocked",  icon: Warning,     cls: "text-amber-600" },
  failed:   { label: "Failed",   icon: XCircle,     cls: "text-rose-600" },
};

function blockStateFor(wf) {
  if (wf.status === "available") return "queued";
  const last = wf.runs?.[0];
  if (last?.status === "failed") return "failed";
  return "complete";
}

function FamilyNode({ step, agentKey, jobTitle, text, steps, state, selected, onSelect }) {
  const a = AGENTS[agentKey];
  if (!a) return null;
  const Icon = agentIcon(agentKey);
  const st = BLOCK_STATE[state];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={selected}
      className={cn(
        "flex flex-col h-full w-full max-w-[220px] mx-auto text-left bg-white border rounded-lg p-3.5 cursor-pointer transition-all",
        selected
          ? "border-transparent shadow-[0_4px_14px_-2px_rgba(16,24,40,0.12)]"
          : "border-[var(--color-grey-100)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)]"
      )}
      style={selected ? { outline: `2px solid ${a.color}`, outlineOffset: "-1px" } : undefined}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <Icon size={18} weight="fill" style={{ color: a.color }} className="shrink-0" />
        <span
          className="min-w-0 text-[12px] leading-[18px] font-semibold uppercase tracking-wider"
          style={{ color: a.color }}
        >
          {deckFamilyOf(agentKey)}
        </span>
        <span className="ml-auto shrink-0 flex items-center justify-center h-4 px-1.5 rounded-md bg-[var(--color-primary-500)] text-white text-[10px] leading-4 font-normal tabular-nums">
          {step}
        </span>
      </div>
      <span className="text-[12px] font-medium text-[var(--text-primary)] leading-snug mb-1.5">
        {jobTitle || a.label}
      </span>
      <p className="text-[12px] text-[#757A97] leading-snug mb-2">{text}</p>
      <span className="flex items-center gap-1 text-[12px] text-[var(--text-muted)] tabular-nums mt-auto">
        {st && (
          <>
            <st.icon size={12} className={cn("shrink-0", st.cls)} weight="regular" />
            <span className={cn("mr-1", st.cls)}>{st.label}</span>
            <span className="text-[var(--color-grey-300)]">·</span>
          </>
        )}
        {steps.length} {steps.length === 1 ? "step" : "steps"}
        <CaretRight size={11} />
      </span>
    </button>
  );
}

/* ── What Prasanna actually asked to see on click: how this agent is
   configured, which specialists sit inside it, and the blocks it runs.
   Opens as a right-hand panel so the graph stays visible behind it.

   Read top-down it answers, in order: what does this agent do here → what is
   it set to → who is inside it → what does it actually run. The one action
   (open the agent's own page) sits in a pinned footer rather than the header,
   which keeps the title line clean and stops the panel trailing off into empty
   white for the agents that only run two blocks. ── */
function DrawerSection({ icon: Icon, label, count, children, tint }) {
  return (
    <section className="px-5 py-4 border-b border-[var(--color-grey-100)]" style={tint ? { background: tint } : undefined}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon size={13} className="shrink-0 text-[var(--text-muted)]" />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        {count != null && (
          <span className="text-[12px] tabular-nums text-[var(--color-grey-400)]">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function AgentConfigDrawer({ family, accent, index, total, handoff = [], onClose, onOpenAgent }) {
  const a = AGENTS[family.agent];
  const Icon = agentIcon(family.agent);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0"
        style={{ background: "rgba(15,22,36,0.18)" }}
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
        role="dialog"
        aria-label={`${a.label} configuration`}
        className="absolute top-0 right-0 h-full w-[560px] max-w-[94vw] bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Identity only. The subtitle sat inline beside a truncating title and
            read as part of the name; on its own line it reads as a caption. */}
        <div className="shrink-0 flex items-start gap-3 px-5 pt-4 pb-4 border-b border-[var(--color-grey-100)]">
          <span
            className="shrink-0 grid place-items-center w-9 h-9 rounded-md mt-0.5"
            style={{ background: accent + "14" }}
          >
            <Icon size={20} weight="fill" style={{ color: accent }} />
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
              {deckFamilyOf(family.agent)}
            </span>
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">
              {family.jobTitle || a.label}
            </span>
            <span className="text-[12px] text-[#757A97]">
              {index != null && total ? `Step ${index + 1} of ${total}` : ""}
              {family.specialist ? `${index != null && total ? " · " : ""}${family.specialist}` : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 grid place-items-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:bg-grey-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* The sentence from the node. It was the one thing a reader had to
              close the panel to re-read. */}
          {family.text && (
            <DrawerSection icon={Target} label="Role in this workflow">
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{family.text}</p>
            </DrawerSection>
          )}

          {family.uses && (
            <DrawerSection icon={Database} label="Inputs">
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-secondary)]">{family.uses}</p>
            </DrawerSection>
          )}

          {(family.analyzes || family.config) && (
            <DrawerSection icon={SlidersHorizontal} label="Checks">
              {family.analyzes && (
                <p className="m-0 mb-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">{family.analyzes}</p>
              )}
              {family.config?.length > 0 && (
                <div className="flex flex-col">
                  {family.config.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between gap-6 py-2 border-b border-dashed border-[var(--color-grey-100)] last:border-b-0"
                    >
                      <span className="text-[12px] text-[#757A97] shrink-0">{k}</span>
                      <span className="text-[12px] text-[var(--text-primary)] text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </DrawerSection>
          )}

          {family.produces && (
            <DrawerSection icon={FileText} label="Output">
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-secondary)]">{family.produces}</p>
            </DrawerSection>
          )}



          <details className="group border-b border-[var(--color-grey-100)]">
            <summary className="flex items-center gap-1.5 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <StackSimple size={13} className="shrink-0 text-[var(--text-muted)]" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Technical details
              </span>
              <span className="text-[12px] tabular-nums text-[var(--color-grey-400)]">
                {family.steps.length}
              </span>
              <CaretRight
                size={12}
                className="ml-auto shrink-0 text-[var(--color-grey-400)] transition-transform group-open:rotate-90"
              />
            </summary>
            <div className="px-5 pb-4">
            <div className="flex flex-col gap-2">
              {family.steps.map((st, i) => {
                const meta = STEP[st.type] || {};
                const StepIcon = meta.icon || Code;
                const body = st.code || st.prompt;
                return (
                  <div key={i} className="rounded-md border border-[var(--color-grey-100)] overflow-hidden">
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-white">
                      <StepIcon size={14} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="flex-1 min-w-0 text-[12px] text-[var(--text-primary)] leading-snug">{st.label}</span>
                      <span className="shrink-0 text-[12px] text-[#757A97]">{meta.label}</span>
                      {st.ms != null && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[12px] tabular-nums text-[var(--color-grey-400)]">
                          <Clock size={12} />
                          {(st.ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    {body && (
                      <pre className="px-3 py-2 m-0 border-t border-[var(--color-grey-100)] bg-grey-50 text-[12px] leading-relaxed text-[var(--text-secondary)] overflow-x-auto whitespace-pre font-mono">
                        {body}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </details>

          {/* Where its output goes next. In a strictly sequential workflow this
              is the question the panel otherwise leaves the reader to answer by
              closing it and looking back at the graph — and for the last agent
              it is where the approval gate finally gets named. */}
          {handoff.length > 0 && (
            <DrawerSection icon={ArrowRight} label="Hands off to">
              <div className="flex flex-col gap-2">
                {handoff.map((h) => {
                  const HIcon = h.agentKey ? agentIcon(h.agentKey) : h.icon;
                  const row = (
                    <>
                      <HIcon size={18} weight="fill" className="shrink-0" style={{ color: h.color }} />
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[12px] font-medium text-[var(--text-primary)]">{h.label}</span>
                        {h.detail && <span className="text-[12px] text-[#757A97] leading-snug">{h.detail}</span>}
                      </span>
                      {h.onClick && <CaretRight size={13} className="shrink-0 text-[var(--color-grey-400)]" />}
                    </>
                  );
                  return h.onClick ? (
                    <button
                      key={h.label}
                      type="button"
                      onClick={h.onClick}
                      className="flex items-center gap-2.5 text-left w-full px-3 py-2.5 rounded-md border border-[var(--color-grey-100)] bg-white hover:bg-grey-50 cursor-pointer transition-colors"
                    >
                      {row}
                    </button>
                  ) : (
                    <div
                      key={h.label}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-[var(--color-grey-100)] bg-white"
                    >
                      {row}
                    </div>
                  );
                })}
              </div>
            </DrawerSection>
          )}
        </div>

        {/* Pinned, so the panel has a bottom edge even when an agent runs two
            blocks and the scroll area does not fill. */}
        <div className="shrink-0 px-5 py-3 border-t border-[var(--color-grey-100)] bg-white">
          <button
            type="button"
            onClick={onOpenAgent}
            className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--color-grey-200)] bg-white text-[12px] font-medium text-[var(--text-primary)] hover:bg-grey-50 cursor-pointer transition-colors"
          >
            View {a.label} agent
            <ArrowSquareOut size={13} />
          </button>
        </div>
      </motion.aside>
    </div>
  );
}

/* The workflow's specialists, grouped by the family that owns them. */
function specialistRoster(families) {
  return families
    .filter((f) => f.specialist)
    .map((f) => `${deckFamilyOf(f.agent)}: ${f.specialist}`)
    .join("  ·  ");
}

function AgentGraph({ families, system, platform, blockState, selected, onSelect }) {
  return (
    <div className="w-full rounded-lg border border-[var(--color-grey-100)] bg-[var(--color-grey-50)] px-8 py-6">
      {/* One workflow, run in order. It used to fan out from a Sage node, which
          read as agents working in parallel — the steps behind it have always
          been strictly sequential, starting with Measurement. */}
      <div className="flex items-stretch justify-center gap-0">
        {families.map((f, i) => (
          <div key={f.agent} className="flex items-stretch min-w-0">
            {i > 0 && (
              <div className="flex items-center px-2 shrink-0" aria-hidden="true">
                <ArrowRight size={16} style={{ color: RAIL_ARROW }} />
              </div>
            )}
            <FamilyNode
              step={i + 1}
              agentKey={f.agent}
              jobTitle={f.jobTitle}
              text={f.text}
              steps={f.steps}
              state={blockState}
              selected={selected === f.agent}
              onSelect={() => onSelect(selected === f.agent ? null : f.agent)}
            />
          </div>
        ))}
      </div>

      <Drop />

      {/* The gate. Always on — Abiram is explicit that human approval is
          required initially, so this is a fact about the workflow, not a
          setting. Removing it is a future capability, not a demo affordance. */}
      <div className="flex justify-center">
        <div
          className="inline-flex items-center gap-3 px-4 py-3 bg-white rounded-lg border"
          style={{ borderColor: "color-mix(in srgb, var(--color-green) 33%, transparent)" }}
        >
          <ShieldCheck size={22} weight="fill" className="shrink-0" style={{ color: "var(--color-green)" }} />
          <span className="flex flex-col">
            <span className="text-[12px] font-medium text-[var(--text-primary)]">Your approval</span>
            <span className="text-[12px] text-[#757A97]">
              Nothing reaches {platform.short} until you approve
            </span>
          </span>
        </div>
      </div>

      {system && (
        <>
          <Drop />
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-3 bg-white border border-[var(--color-grey-100)] rounded-lg">
              <ArrowSquareOut size={22} weight="fill" className="shrink-0 text-[var(--text-secondary)]" />
              <span className="flex flex-col">
                <span className="text-[12px] font-medium text-[var(--text-primary)]">{system.label}</span>
                <span className="text-[12px] text-[#757A97]">{system.detail}</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Status, next to the control that changes it. A dot and a word answer
   "is this on"; the hover answers "on what schedule, and when did it last
   run" without spending header space on it. ── */
function StatusPill({ wf, live, paused }) {
  const last = wf.runs?.[0];
  const detail = live
    ? [`Runs ${wf.cadence}`, wf.nextRun && `Next ${wf.nextRun}`, last && `Last ran ${last.at}`]
        .filter(Boolean)
        .join(" · ")
    : paused
      ? [`Held — will resume on ${wf.cadence}`, last && `Last ran ${last.at}`].filter(Boolean).join(" · ")
      : "Never activated. Activate it to start on a daily schedule.";

  const tone = live
    ? "bg-green-50 border-green-200 text-green-700"
    : paused
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-grey-50 border-grey-200 text-[var(--text-secondary)]";
  const dot = live ? "bg-green-500" : paused ? "bg-amber-500" : "bg-[var(--color-grey-300)]";

  return (
    <Tooltip title={detail} placement="bottom">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border text-[12px] font-medium cursor-default",
          tone,
        )}
      >
        <i className={cn("w-[6px] h-[6px] rounded-full shrink-0", dot)} />
        {live ? "Live" : paused ? "Paused" : "Available"}
      </span>
    </Tooltip>
  );
}

/* ── Run health. "What is the latest run, was it successful" — his words. ── */
function RunHistory({ runs, nextRun, onOpenRecs, onRetry }) {
  const [open, setOpen] = useState(false);
  if (!runs?.length) return null;
  const rows = open ? runs : runs.slice(0, 1);
  return (
    <div className="rounded-lg border border-[var(--color-grey-100)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 border-solid border-t-0 border-x-0 border-b border-b-[var(--color-grey-100)] bg-transparent cursor-pointer text-left hover:bg-grey-50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <CaretRight
            size={12}
            className={cn("shrink-0 text-[var(--color-grey-400)] transition-transform", open && "rotate-90")}
          />
          <span className="text-[12px] font-medium text-[var(--text-primary)]">Run history</span>
        </span>
        <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
          {open ? "Latest first" : `${runs.length} runs`}
        </span>
      </button>
      <div className="flex flex-col">
        {rows.map((r, i) => {
          // Three outcomes, not two. "Checked, nothing to fix" is a result and
          // showing it is what makes the failed and pending rows believable.
          const ok = r.status === "success";
          const quiet = r.status === "no-action";
          const failed = r.status === "failed";
          // The run history records how a failure ended; a re-run or a
          // re-authorisation means it no longer needs anyone.
          const resolved = failed && /re-run|re-authorized|re-authorised|resolved/i.test(r.evaluated || "");
          const producedRecs = ok && /recommendation/i.test(r.produced || "");
          const RowTag = producedRecs && onOpenRecs ? "button" : "div";
          return (
            <RowTag
              key={i}
              type={producedRecs && onOpenRecs ? "button" : undefined}
              onClick={producedRecs && onOpenRecs ? onOpenRecs : undefined}
              className={cn(
                "grid items-center gap-3 w-full text-left px-4 py-2.5 bg-transparent",
                "border-solid border-t-0 border-x-0 border-b border-b-[var(--color-grey-100)] last:border-b-0",
                producedRecs && onOpenRecs && "cursor-pointer hover:bg-primary-50 transition-colors",
              )}
              style={{ gridTemplateColumns: "150px 130px 1fr 90px" }}
            >
              <span className="text-[12px] text-[var(--text-primary)]">{r.at}</span>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium",
                  failed ? "text-rose-600" : quiet ? "text-[var(--text-secondary)]" : "text-green-600",
                )}
              >
                {failed ? (
                  <XCircle size={13} weight="fill" />
                ) : quiet ? (
                  <Eye size={13} />
                ) : (
                  <CheckCircle size={13} weight="fill" />
                )}
                {failed ? "Failed" : quiet ? "No action needed" : "Succeeded"}
              </span>
              <span className="min-w-0 leading-snug">
                {r.produced && <span className="text-[12px] text-[var(--text-primary)]">{r.produced}</span>}
                {r.evaluated && r.evaluated !== "\u2014" && (
                  <span className="text-[12px] text-[#757A97]">{r.produced ? " · " : ""}{r.evaluated}</span>
                )}
                {quiet && nextRun && (
                  <span className="text-[12px] text-[#757A97]"> · next check {nextRun}</span>
                )}
              </span>
              {/* A run that produced recommendations links to the bundle it
                  produced, so a run is never a dead end. */}
              {producedRecs && onOpenRecs ? (
                <span className="justify-self-end inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-600)]">
                  Review <CaretRight size={11} />
                </span>
              ) : failed ? (
                // A failed run is only a dead end if the row stops at the word
                // "failed". Where the failure was already dealt with, the row
                // says so; where it was not, it offers the retry.
                resolved ? (
                  <span className="justify-self-end inline-flex items-center gap-1 text-[12px] text-[var(--text-secondary)]">
                    <CheckCircle size={12} weight="fill" className="text-green-600" />
                    Resolved
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRetry && onRetry(r); }}
                    className="justify-self-end inline-flex items-center gap-1 text-[12px] text-[var(--color-primary-600)] bg-transparent border-none p-0 cursor-pointer hover:underline"
                  >
                    <ArrowClockwise size={12} /> Retry run
                  </button>
                )
              ) : (
                <span className="text-[12px] text-[#757A97] tabular-nums text-right">{(r.ms / 1000).toFixed(1)}s</span>
              )}
            </RowTag>
          );
        })}
      </div>
    </div>
  );
}

/* ── The rail. Flat sections separated by hairlines, the way the skills detail
   rail reads — the old version stacked four white cards inside a grey box,
   which is boxes inside boxes. Ordered by what a reader wants first: what is
   waiting on me, what I get, then the facts. ── */
const RAIL_LABEL = "text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

function RailRow({ k, v, tone, stack }) {
  if (stack) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] text-[#757A97]">{k}</span>
        <span className={cn("text-[12px]", tone || "text-[var(--text-primary)]")}>{v}</span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[#757A97] shrink-0">{k}</span>
      <span className={cn("text-[12px] text-right", tone || "text-[var(--text-primary)]")}>{v}</span>
    </div>
  );
}

function RailGroup({ label, children, first }) {
  return (
    <div className={cn("flex flex-col gap-2", !first && "pt-4 border-t border-[var(--color-grey-100)]")}>
      <span className={RAIL_LABEL}>{label}</span>
      {children}
    </div>
  );
}

function WorkflowRail({ wf, platform, families, live, paused, onReview }) {
  const last = wf.runs?.[0];
  const ok = last?.status === "success";
  const waiting = wf.recommendation?.waiting || 0;

  return (
    <aside className="w-[300px] shrink-0 self-start sticky top-0 flex flex-col gap-3 p-3 bg-grey-50 border border-grey-100/70 rounded-xl">
      {/* What needs you — the only thing here that is a call to act. */}
      {live && waiting > 0 ? (
        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-primary-50 border border-primary-200">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} weight="fill" className="text-primary-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                {waiting} waiting for your approval
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] leading-snug mt-0.5">
                Review them before anything is applied.
              </p>
            </div>
          </div>
          <PvButton
            variant="blueGhost"
            size="sm"
            label="Review recommendations"
            icon={ArrowSquareOut}
            iconPosition="suffix"
            onClick={onReview}
          />
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-grey-200">
          <CheckCircle
            size={16}
            weight="fill"
            className={cn("shrink-0 mt-0.5", live ? "text-green-600" : "text-[var(--text-muted)]")}
          />
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">
              {live ? "Nothing waiting" : paused ? "Paused" : "Not scheduled"}
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-snug mt-0.5">
              {live
                ? "This workflow is running; there is nothing to approve right now."
                : paused
                  ? "Held for now. Resume it to pick the schedule back up."
                  : "Activate this workflow to start it on a schedule."}
            </p>
          </div>
        </div>
      )}

      <RailGroup label="What you get">
        <p className="text-[12px] text-[var(--text-primary)] leading-snug">
          {wf.customerOutput || wf.deliverable}
        </p>
        {live && wf.recommendation?.headline && (
          <p className="text-[12px] text-[#757A97] leading-snug">
            {wf.recommendation.waiting > 0 ? "Waiting: " : "Latest: "}
            {wf.recommendation.headline}
          </p>
        )}
      </RailGroup>

      {/* The metrics this workflow is judged on. Without them the page says
          what will change but never what "better" is measured as. */}
      {wf.outcomes?.length > 0 && (
        <RailGroup label="Outcomes tracked">
          <div className="flex flex-col gap-1.5">
            {wf.outcomes.map((o) => (
              <span key={o} className="flex items-start gap-2 text-[12px] text-[var(--text-primary)] leading-snug">
                <ChartLineUp size={13} className="mt-[2px] shrink-0 text-[var(--text-muted)]" />
                {o}
              </span>
            ))}
          </div>
        </RailGroup>
      )}

      <RailGroup label="Schedule">
        <RailRow
          k="Runs"
          v={live ? wf.cadence : paused ? `Paused · ${wf.cadence}` : "Not scheduled"}
          tone={live ? undefined : "text-[var(--text-muted)]"}
        />
        {live && wf.nextRun && <RailRow k="Next" v={wf.nextRun} />}
        {live && last && (
          <>
            <RailRow
              k="Last"
              v={
                <span className="inline-flex items-center gap-1.5">
                  {ok ? (
                    <CheckCircle size={13} weight="fill" className="text-green-500" />
                  ) : (
                    <XCircle size={13} weight="fill" className="text-rose-500" />
                  )}
                  {last.at}
                </span>
              }
            />
            <RailRow k="Duration" v={`${(last.ms / 1000).toFixed(1)}s`} />
            {last.evaluated && last.evaluated !== "\u2014" && <RailRow k="Scanned" v={last.evaluated} stack />}
          </>
        )}
      </RailGroup>

      <RailGroup label="Setup">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[#757A97]">Reads</span>
          {(wf.reads || []).map((r) => (
            <div key={r} className="flex items-center gap-2" title={r}>
              <SourceIcon name={r} size={16} />
              <span className="flex-1 min-w-0 text-[12px] text-[var(--text-primary)]">{r}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[#757A97]">Acts on</span>
          {/* Some platforms are compound ("LinkedIn Ads · Pipeline · Web"), so
              each part gets its own mark rather than one generic fallback. */}
          {platform.label.split(" \u00b7 ").map((part) => (
            <div key={part} className="flex items-center gap-2" title={part}>
              <SourceIcon name={part} size={16} />
              <span className="flex-1 min-w-0 text-[12px] text-[var(--text-primary)]">{part}</span>
            </div>
          ))}
        </div>
        {/* Which agent family owns this workflow. It used to group the library
            list, which split six rows into four sections; it describes one
            workflow, so it belongs on that workflow's page. */}
        {wf.family && <RailRow k="Family" v={wf.family} />}
        <RailRow
          k="Agents"
          v={
            <Tooltip title={specialistRoster(families)} placement="bottom">
              <span className="underline decoration-dotted underline-offset-2 cursor-default">
                {families.length} {families.length === 1 ? "agent" : "agents"}
              </span>
            </Tooltip>
          }
        />
      </RailGroup>
    </aside>
  );
}

export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get("from");
  const backTo = from && from.startsWith("/") ? from : "/workflows";
  const backLabel = from?.startsWith("/agents/") ? "Back to agent" : "Back to workflows";
  // The crumb names wherever you came from, so an agent drill-down reads
  // "Demand selection › ICP guardrails" rather than pretending you came from
  // the workflow list.
  const fromAgentKey = from?.startsWith("/agents/") ? from.slice("/agents/".length) : null;
  const crumb = fromAgentKey ? AGENTS[fromAgentKey]?.label || "Agents" : "Workflows";
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["agent-workflows"], queryFn: () => apiGet("/api/agent-workflows") });
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["agent-workflows"] });
    qc.invalidateQueries({ queryKey: ["agents"] });
    qc.invalidateQueries({ queryKey: ["agent"] });
  };
  const activate = useMutation({
    mutationFn: (id) => apiPost(`/api/agent-workflows/${id}/activate`, {}),
    onSuccess: (_r, id) => {
      refreshAll();
      const wasAvailable = wf?.status === "available";
      toast.success(wasAvailable ? "Deployed. The first run is starting now." : "Workflow resumed");
      if (wasAvailable) navigate("/workflows");
    },
  });
  const pause = useMutation({
    mutationFn: (id) => apiPost(`/api/agent-workflows/${id}/pause`, {}),
    onSuccess: () => { refreshAll(); toast.success("Workflow paused — nothing runs until you resume it"); },
  });
  const wf = (data?.workflows || []).find((w) => w.id === id);

  if (isLoading) return <div className="w-full h-full bg-grey-50" />;
  if (!wf) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 bg-grey-50">
        <p className="text-[14px]">That workflow doesn&rsquo;t exist.</p>
        <PvButton variant="secondary" size="sm" label="Back to workflows" icon={CaretLeft} onClick={() => navigate("/workflows")} />
      </div>
    );
  }

  const live = wf.status === "active";
  const paused = wf.status === "paused";
  const platform = platformOf(wf.platform);
  const system = wf.steps.find((s) => s.kind === "system");
  const stepsFor = (agent) => wf.steps.filter((s) => s.agent === agent);
  const families = (
    wf.found ||
    [...new Set(wf.steps.filter((s) => s.agent).map((s) => s.agent))].map((a) => ({ agent: a, text: "" }))
  ).map((f) => ({ ...f, steps: stepsFor(f.agent) }));
  const selectedFamily = families.find((f) => f.agent === selected) || null;

  // What the open agent passes its output to: the next agent in the sequence,
  // or — for the last one — the approval gate and then the ad platform.
  const handoff = (() => {
    if (!selectedFamily) return [];
    const i = families.findIndex((f) => f.agent === selectedFamily.agent);
    const next = families[i + 1];
    if (next) {
      return [{
        agentKey: next.agent,
        label: deckFamilyOf(next.agent),
        detail: next.text,
        color: AGENTS[next.agent]?.color,
        onClick: () => setSelected(next.agent),
      }];
    }
    return [
      { icon: ShieldCheck, color: "var(--color-green)", label: "Your approval", detail: `Nothing reaches ${platform.short} until you approve` },
      ...(system ? [{ icon: ArrowSquareOut, color: "var(--text-secondary)", label: system.label, detail: system.detail }] : []),
    ];
  })();

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(backTo)}
              aria-label={backLabel}
              className="shrink-0 text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {crumb}
            </button>
            <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
            <span className="text-[16px] leading-[24px] font-medium truncate text-grey-900">{wf.name}</span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <StatusPill wf={wf} live={live} paused={paused} />
            {live ? (
              <PvButton
                variant="secondary"
                size="md"
                label={pause.isPending ? "Pausing…" : "Pause workflow"}
                icon={Pause}
                iconWeight="fill"
                disabled={pause.isPending}
                onClick={() => pause.mutate(wf.id)}
              />
            ) : (
              <PvButton
                variant="primary"
                size="md"
                label={activate.isPending ? "Deploying…" : paused ? "Resume workflow" : "Deploy workflow"}
                icon={Play}
                iconWeight="fill"
                disabled={activate.isPending}
                onClick={() => activate.mutate(wf.id)}
              />
            )}
          </div>
        </div>

        <div className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]" style={{ height: "calc(100% - 60px)" }}>
          <div className="flex flex-col bg-white rounded-xl h-full w-full overflow-hidden min-w-[800px]">
            <div className="w-full h-full overflow-y-auto">
              <div className="w-full px-6 py-6 flex gap-5 items-start">
                <div className="flex-1 min-w-0">

                {/* One line of intent, then the diagram. No banner — the
                    output and state live in the rail. */}
                {/* The same lead-and-sections rhythm as the agent detail
                    page: an uppercase label, the answer under it, and a
                    hairline between each block. It used to be four paragraphs
                    stacked with margins, which read as one wall of text. */}
                <div className="flex flex-col mb-5">
                  <div className="flex flex-col gap-2">
                    <h3 className={SECTION_LABEL}>
                      {live ? "How this workflow runs" : "Agents this workflow deploys"}
                    </h3>
                    {wf.problem && (
                      <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">{wf.problem}</p>
                    )}
                    {wf.automates && (
                      <p className="m-0 text-[12px] leading-relaxed text-[var(--text-secondary)]">{wf.automates}</p>
                    )}
                  </div>

                  {wf.manualWork && (
                    <div className="flex flex-col gap-2 pt-4 mt-4 border-t border-[var(--color-grey-100)]">
                      <span className={LABEL}>The manual work it replaces</span>
                      <p className="m-0 text-[12px] leading-relaxed text-[var(--text-secondary)]">{wf.manualWork}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-4 mt-4 border-t border-[var(--color-grey-100)]">
                    <span className={LABEL}>Data readiness</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                      <CheckCircle size={14} weight="fill" className="shrink-0 text-green-600" />
                      <span className="text-[var(--text-primary)]">Ready</span>
                      <span className="text-[var(--color-grey-300)]">·</span>
                      <span className="text-[var(--text-secondary)]">
                        {(wf.reads || []).join(", ")} connected and verified
                      </span>
                    </span>
                  </div>
                </div>

                <AgentGraph
                  families={families}
                  system={system}
                  blockState={blockStateFor(wf)}
                  platform={platform}
                  selected={selected}
                  onSelect={setSelected}
                />


                  <div className="mt-6"><RunHistory runs={wf.runs} nextRun={wf.nextRun} onRetry={(r) => toast.success(`Re-running ${wf.name} from ${r.at}`)} onOpenRecs={() => navigate(`/recommendations?workflow=${wf.id}`)} /></div>
                </div>

                <WorkflowRail
                  wf={wf}
                  platform={platform}
                  families={families}
                  live={live}
                  paused={paused}
                  onReview={() => navigate(`/recommendations?workflow=${wf.id}`)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFamily && (
          <AgentConfigDrawer
            key={selectedFamily.agent}
            family={selectedFamily}
            accent={AGENTS[selectedFamily.agent].color}
            index={families.findIndex((f) => f.agent === selectedFamily.agent)}
            total={families.length}
            handoff={handoff}
            onClose={() => setSelected(null)}
            onOpenAgent={() => navigate(`/agents/${selectedFamily.agent}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
