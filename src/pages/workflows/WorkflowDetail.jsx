import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  CaretLeft, CaretRight, Database, Code, Brain, FileText,
  Sparkle, Play, Pause, ArrowSquareOut, ShieldCheck, CheckCircle, XCircle, X,
} from "@phosphor-icons/react";
import { Button as PvButton, Tooltip } from "@/ui";
import { toast } from "sonner";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { AGENTS, platformOf } from "../../mocks/agentWorkflows";
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

const RAIL = "var(--color-grey-200)";

/* One column of the org-chart rail. `dir` "down" branches out of Sage,
   "up" converges into the approval gate. */
function Rail({ first, last, only, dir }) {
  const bar = only
    ? null
    : first
      ? "left-1/2 right-0"
      : last
        ? "left-0 right-1/2"
        : "left-0 right-0";
  return (
    <div className="relative h-5">
      {bar && (
        <div
          className={cn("absolute h-px", bar, dir === "down" ? "top-0" : "bottom-0")}
          style={{ background: RAIL }}
        />
      )}
      <div className="absolute top-0 h-full w-px left-1/2" style={{ background: RAIL }} />
    </div>
  );
}

function Drop() {
  return (
    <div className="flex justify-center">
      <span className="w-px h-5" style={{ background: RAIL }} />
    </div>
  );
}

function FamilyNode({ agentKey, text, steps, selected, onSelect }) {
  const a = AGENTS[agentKey];
  if (!a) return null;
  const Icon = agentIcon(agentKey);
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
      <div className="flex items-center gap-2.5 mb-2">
        <Icon size={22} weight="fill" style={{ color: a.color }} className="shrink-0" />
        <span className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">{a.label}</span>
      </div>
      <p className="text-[12px] text-[#757A97] leading-snug mb-2">{text}</p>
      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] tabular-nums mt-auto">
        {steps.length} {steps.length === 1 ? "step" : "steps"}
        <CaretRight size={11} />
      </span>
    </button>
  );
}

/* ── What Prasanna actually asked to see on click: how this agent is
   configured, which specialists sit inside it, and the blocks it runs.
   Opens as a right-hand panel so the graph stays visible behind it. ── */
function AgentConfigDrawer({ family, accent, onClose, onOpenAgent }) {
  const a = AGENTS[family.agent];
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
        <div className="shrink-0 flex items-center gap-2.5 px-5 h-[60px] border-b border-[var(--color-grey-100)]">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: accent }} />
          <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">{a.label}</span>
          <span className="text-[12px] text-[#757A97] shrink-0">&middot; how it&rsquo;s configured</span>
          <button
            type="button"
            onClick={onOpenAgent}
            className="ml-auto shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            View agent <ArrowSquareOut size={12} />
          </button>
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
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-0 px-4 py-1">
        {(family.config || []).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--color-grey-100)] last:border-b-0">
            <span className="text-[12px] text-[#757A97] shrink-0">{k}</span>
            <span className="text-[12px] text-[var(--text-primary)] text-right">{v}</span>
          </div>
        ))}
      </div>

      {family.specialistNames?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-t border-[var(--color-grey-100)]">
          <span className="text-[12px] text-[#757A97] mr-1">Specialist agents</span>
          {family.specialistNames.map((n) => (
            <span key={n} className="text-[11px] px-2 py-1 rounded-full border" style={{ borderColor: accent + "55", color: accent }}>
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="px-4 py-3 border-t border-[var(--color-grey-100)] bg-grey-50 flex flex-col gap-1.5">
        <span className="text-[12px] text-[#757A97] mb-0.5">Blocks it runs</span>
        {family.steps.map((st, i) => {
          const meta = STEP[st.type] || {};
          const Icon = meta.icon || Code;
          const body = st.code || st.prompt;
          return (
            <div key={i} className="rounded-md border border-[var(--color-grey-100)] bg-white overflow-hidden">
              <div className="flex items-center gap-2.5 px-3 py-2">
                <Icon size={14} className="text-[var(--text-muted)] shrink-0" />
                <span className="flex-1 min-w-0 text-[12px] text-[var(--text-primary)] truncate">{st.label}</span>
                <span className="shrink-0 text-[11px] text-[#757A97]">{meta.label}</span>
              </div>
              {body && (
                <pre className="px-3 py-2 m-0 border-t border-[var(--color-grey-100)] text-[11px] leading-relaxed text-[var(--text-secondary)] overflow-x-auto whitespace-pre font-mono">
                  {body}
                </pre>
              )}
            </div>
          );
        })}
      </div>
        </div>
      </motion.aside>
    </div>
  );
}

/* The workflow's specialists, grouped by the family that owns them. */
function specialistRoster(families) {
  return families
    .filter((f) => f.specialistNames?.length)
    .map((f) => `${AGENTS[f.agent]?.label}: ${f.specialistNames.join(", ")}`)
    .join("  ·  ");
}

function AgentGraph({ families, specialists, system, platform, selected, onSelect }) {
  const n = families.length;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` };
  return (
    <div className="w-full rounded-lg border border-[var(--color-grey-100)] bg-[var(--color-grey-50)] px-8 py-6">
      {/* Sage — the orchestrator */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-4 py-3 bg-white border border-[var(--color-primary-100)] rounded-lg">
          <Sparkle size={22} weight="fill" className="shrink-0 text-primary-500" />
          <span className="flex flex-col">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">Sage</span>
            <span className="text-[12px] text-[#757A97]">
              Deployed {n} {n === 1 ? "family" : "families"} ·{" "}
              {/* The count was assertable but not checkable — you had to open every
                  family panel to find out which specialists it meant. */}
              <Tooltip title={specialistRoster(families)} placement="bottom">
                <span className="underline decoration-dotted underline-offset-2 cursor-default">
                  {specialists} specialist agents
                </span>
              </Tooltip>
            </span>
          </span>
        </div>
      </div>

      <Drop />
      <div className="mx-auto w-full" style={{ maxWidth: Math.min(n, 4) * 232 }}>
        <div className="grid" style={cols}>
          {families.map((f, i) => (
            <Rail key={f.agent} dir="down" first={i === 0} last={i === n - 1} only={n === 1} />
          ))}
        </div>

        <div className="grid gap-3 items-stretch" style={cols}>
          {families.map((f) => (
            <FamilyNode
              key={f.agent}
              agentKey={f.agent}
              text={f.text}
              steps={f.steps}
              selected={selected === f.agent}
              onSelect={() => onSelect(selected === f.agent ? null : f.agent)}
            />
          ))}
        </div>

        <div className="grid" style={cols}>
          {families.map((f, i) => (
            <Rail key={f.agent} dir="up" first={i === 0} last={i === n - 1} only={n === 1} />
          ))}
        </div>
      </div>
      <Drop />

      {/* The gate. Always on — Abiram is explicit that human approval is
          required initially, so this is a fact about the workflow, not a
          setting. Removing it is a future capability, not a demo affordance. */}
      <div className="flex justify-center">
        <div
          className="inline-flex items-center gap-3 px-4 py-3 bg-white rounded-lg border"
          style={{ borderColor: "#08BD5055" }}
        >
          <ShieldCheck size={22} weight="fill" className="shrink-0" style={{ color: "#08BD50" }} />
          <span className="flex flex-col">
            <span className="text-[13px] font-medium text-[var(--text-primary)]">Your approval</span>
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
                <span className="text-[13px] font-medium text-[var(--text-primary)]">{system.label}</span>
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
function RunHistory({ runs }) {
  const [open, setOpen] = useState(false);
  if (!runs?.length) return null;
  const rows = open ? runs : runs.slice(0, 1);
  return (
    <div className="rounded-lg border border-[var(--color-grey-100)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-grey-100)]">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">Run history</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[12px] text-primary-500 bg-transparent border-none cursor-pointer p-0"
        >
          {open ? "Show latest only" : `Show all ${runs.length}`}
        </button>
      </div>
      <div className="flex flex-col">
        {rows.map((r, i) => {
          const ok = r.status === "success";
          return (
            <div
              key={i}
              className="grid items-center gap-3 px-4 py-2.5 border-b border-[var(--color-grey-100)] last:border-b-0"
              style={{ gridTemplateColumns: "150px 110px 1fr 70px" }}
            >
              <span className="text-[12px] text-[var(--text-primary)]">{r.at}</span>
              <span className={cn("flex items-center gap-1.5 text-[12px] font-medium", ok ? "text-green-600" : "text-rose-600")}>
                {ok ? <CheckCircle size={13} weight="fill" /> : <XCircle size={13} weight="fill" />}
                {ok ? "Succeeded" : "Failed"}
              </span>
              <span className="min-w-0 truncate">
                <span className="text-[12px] text-[var(--text-primary)]">{r.produced}</span>
                {r.evaluated && r.evaluated !== "—" && (
                  <span className="text-[12px] text-[#757A97]"> · from {r.evaluated}</span>
                )}
              </span>
              <span className="text-[12px] text-[#757A97] tabular-nums text-right">{(r.ms / 1000).toFixed(1)}s</span>
            </div>
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
            <div className="min-w-0">
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
            className={cn("shrink-0 mt-0.5", live ? "text-[var(--color-green)]" : "text-[var(--text-muted)]")}
          />
          <div className="min-w-0">
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
        <p className="text-[12px] text-[var(--text-primary)] leading-snug">{wf.deliverable}</p>
        {live && wf.recommendation && (
          <p className="text-[12px] text-[#757A97] leading-snug">Latest: {wf.recommendation.headline}</p>
        )}
      </RailGroup>

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
              <span className="flex-1 min-w-0 text-[12px] truncate text-[var(--text-primary)]">{r}</span>
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
              <span className="flex-1 min-w-0 text-[12px] truncate text-[var(--text-primary)]">{part}</span>
            </div>
          ))}
        </div>
        <RailRow k="Agents" v={`${families.length} families \u00b7 ${wf.specialists} specialists`} />
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
    onSuccess: () => { refreshAll(); toast.success("Workflow activated — it runs daily from tomorrow"); },
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
                label={activate.isPending ? "Activating…" : paused ? "Resume workflow" : "Activate workflow"}
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
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-medium text-[var(--text-primary)]">
                      {live ? "How this workflow runs" : "Agents this workflow deploys"}
                    </h3>
                    <p className="text-[12px] text-[#757A97] leading-snug mt-0.5 max-w-[560px]">{wf.automates}</p>
                  </div>
                </div>

                <AgentGraph
                  families={families}
                  specialists={wf.specialists}
                  system={system}
                  platform={platform}
                  selected={selected}
                  onSelect={setSelected}
                />


                  <div className="mt-6"><RunHistory runs={wf.runs} /></div>
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
            onClose={() => setSelected(null)}
            onOpenAgent={() => navigate(`/agents/${selectedFamily.agent}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
