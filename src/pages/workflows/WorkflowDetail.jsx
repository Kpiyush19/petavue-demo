import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  CaretLeft, CaretDown, Database, Code, Brain, FileText,
  Sparkle, Play, ArrowSquareOut, ShieldCheck, Lightning, CheckCircle, XCircle,
} from "@phosphor-icons/react";
import { Button as PvButton, Toggle } from "@/ui";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { AGENTS, platformOf } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";

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
        <span
          className="grid place-items-center w-8 h-8 rounded-lg shrink-0 text-white"
          style={{ background: a.color }}
        >
          <Icon size={16} weight="fill" />
        </span>
        <span className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">{a.label}</span>
      </div>
      <p className="text-[12px] text-[#757A97] leading-snug mb-2">{text}</p>
      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] tabular-nums mt-auto">
        {steps.length} steps
        <CaretDown size={11} className={cn("transition-transform", !selected && "-rotate-90")} />
      </span>
    </button>
  );
}

/* ── What Prasanna actually asked to see on click: how this agent is
   configured, which specialists sit inside it, and the blocks it runs. ── */
function AgentConfig({ family, accent }) {
  const a = AGENTS[family.agent];
  return (
    <div className="mt-4 rounded-lg border bg-white overflow-hidden" style={{ borderColor: accent + "55" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-grey-100)]">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[13px] font-medium text-[var(--text-primary)]">{a.label}</span>
        <span className="text-[12px] text-[#757A97]">· how it&rsquo;s configured</span>
      </div>

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
  );
}

function AgentGraph({ families, specialists, system, platform, approval, onApprovalChange, selected, onSelect }) {
  const n = families.length;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` };
  return (
    <div className="rounded-lg border border-[var(--color-grey-100)] bg-[var(--color-grey-50)] px-6 py-6">
      {/* Sage — the orchestrator */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-4 py-3 bg-white border border-[var(--color-primary-100)] rounded-lg">
          <span
            className="grid place-items-center w-8 h-8 rounded-lg shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #3661ed 0%, #6d5ef0 48%, #a855f7 100%)" }}
          >
            <Sparkle size={16} weight="fill" />
          </span>
          <span className="flex flex-col">
            <span className="flex items-baseline gap-2">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">Sage</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">Orchestration</span>
            </span>
            <span className="text-[12px] text-[#757A97]">
              Deployed {n} {n === 1 ? "family" : "families"} · {specialists} specialist agents
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

      {/* The gate. Turn it off and it stops being a gate — the point Prasanna
          makes about trusting an agent enough to drop approval. */}
      <div className="flex justify-center">
        <div
          className={cn(
            "inline-flex items-center gap-3 px-4 py-3 bg-white rounded-lg border",
            !approval && "border-dashed"
          )}
          style={{ borderColor: approval ? "#08BD5055" : "var(--color-grey-200)" }}
        >
          <span
            className="grid place-items-center w-8 h-8 rounded-lg shrink-0"
            style={
              approval
                ? { background: "#EBFFF3", color: "#08BD50" }
                : { background: "var(--color-grey-100)", color: "var(--text-muted)" }
            }
          >
            {approval ? <ShieldCheck size={16} weight="fill" /> : <Lightning size={16} weight="fill" />}
          </span>
          <span className="flex flex-col">
            <span className="text-[13px] font-medium text-[var(--text-primary)]">
              {approval ? "Your approval" : "Approval removed"}
            </span>
            <span className="text-[12px] text-[#757A97]">
              {approval
                ? `Nothing reaches ${platform.short} until you approve`
                : `Actions execute on ${platform.short} automatically`}
            </span>
          </span>
          <Toggle checked={approval} onChange={(e) => onApprovalChange(e?.target?.checked ?? !approval)} />
        </div>
      </div>

      {system && (
        <>
          <Drop />
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-3 bg-white border border-[var(--color-grey-100)] rounded-lg">
              <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0 bg-grey-100 text-[var(--text-secondary)]">
                <ArrowSquareOut size={16} />
              </span>
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

/* ── Run health. "What is the latest run, was it successful" — his words. ── */
function RunHistory({ runs }) {
  const [open, setOpen] = useState(false);
  if (!runs?.length) return null;
  const rows = open ? runs : runs.slice(0, 1);
  return (
    <div className="rounded-lg border border-[var(--color-grey-100)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-grey-100)]">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">Runs</span>
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
              <span className="text-[12px] text-[#757A97] truncate">{r.produced}</span>
              <span className="text-[12px] text-[#757A97] tabular-nums text-right">{(r.ms / 1000).toFixed(1)}s</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  // Local only: flipping approval is a demo affordance, not persisted.
  const [approvalOverride, setApprovalOverride] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ["agent-workflows"], queryFn: () => apiGet("/api/agent-workflows") });
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
  const platform = platformOf(wf.platform);
  const rec = wf.recommendation;
  const system = wf.steps.find((s) => s.kind === "system");
  const stepsFor = (agent) => wf.steps.filter((s) => s.agent === agent);
  const families = (
    wf.found ||
    [...new Set(wf.steps.filter((s) => s.agent).map((s) => s.agent))].map((a) => ({ agent: a, text: "" }))
  ).map((f) => ({ ...f, steps: stepsFor(f.agent) }));
  const selectedFamily = families.find((f) => f.agent === selected) || null;
  const approval = approvalOverride ?? wf.approvalRequired !== false;

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate("/workflows")} aria-label="Back to workflows"
              className="grid place-items-center w-7 h-7 rounded-md bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:bg-grey-100">
              <CaretLeft size={15} />
            </button>
            <span className="text-[16px] leading-[24px] font-medium truncate">{wf.name}</span>
            <span className="shrink-0 text-[11px] text-[#757A97] px-1.5 py-0.5 rounded bg-grey-100">{platform.short}</span>
          </div>
          {!live && (
            <div className="flex items-center gap-2 shrink-0">
              <PvButton variant="primary" size="sm" label="Activate" icon={Play} />
            </div>
          )}
        </div>

        <div className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]" style={{ height: "calc(100% - 60px)" }}>
          <div className="flex flex-col bg-white rounded-xl h-full w-full overflow-hidden min-w-[800px]">
            <div className="w-full h-full overflow-y-auto">
              <div className="w-full px-6 py-6">

                {/* The outcome leads. This is what the workflow produced today. */}
                {live && rec ? (
                  <div className="rounded-xl border border-[var(--color-primary-100)] bg-[var(--color-primary-50)] p-5 mb-7">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary-600 mb-2">
                      Latest output
                    </span>
                    <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] leading-snug mb-1.5">
                      {rec.headline}
                    </h2>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">{rec.impact}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <PvButton
                        variant="secondary"
                        size="md"
                        label={`Review in Recommendations${rec.waiting > 1 ? ` (${rec.waiting})` : ""}`}
                        icon={ArrowSquareOut}
                        iconPosition="suffix"
                        onClick={() => navigate("/goals")}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--color-grey-100)] bg-grey-50 p-5 mb-7">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Not running yet
                    </span>
                    <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] leading-snug mb-1.5">
                      {wf.deliverable}
                    </h2>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">{wf.automates}</p>
                    <PvButton variant="primary" size="md" label="Activate workflow" icon={Play} />
                  </div>
                )}

                {/* The team Sage assembled for this outcome. */}
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h3 className="text-[14px] font-medium text-[var(--text-primary)]">
                    {live ? "How this was found" : "Agents this workflow deploys"}
                  </h3>
                  <span className="text-[12px] text-[#757A97]">acts on {platform.label}</span>
                </div>

                <AgentGraph
                  families={families}
                  specialists={wf.specialists}
                  system={system}
                  platform={platform}
                  approval={approval}
                  onApprovalChange={setApprovalOverride}
                  selected={selected}
                  onSelect={setSelected}
                />

                {selectedFamily && (
                  <AgentConfig family={selectedFamily} accent={AGENTS[selectedFamily.agent].color} />
                )}

                <div className="mt-6"><RunHistory runs={wf.runs} /></div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
