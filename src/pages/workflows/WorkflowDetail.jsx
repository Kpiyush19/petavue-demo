import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  CaretRight, CaretLeft, ShieldCheck, ArrowSquareOut, Lightning, Sparkle,
  Pause, Gear, FlowArrow, Play,
} from "@phosphor-icons/react";
import { Button as PvButton } from "@/ui";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { AGENTS, platformOf } from "../../mocks/agentWorkflows";

/* ── A single node in the pipeline.
   Three visually distinct kinds, because the distinction IS the governance
   story: agents propose, you approve, a connected system executes. ── */
function PipelineNode({ node, last }) {
  const agent = node.kind === "agent" ? AGENTS[node.agent] : null;
  const accent = agent ? agent.color : node.kind === "approval" ? "#08BD50" : "#757A97";
  const tint = agent ? agent.tint : node.kind === "approval" ? "#EBFFF3" : "#EEF0F7";

  return (
    <div className="flex items-stretch shrink-0">
      <div
        className="w-[212px] flex flex-col rounded-[10px] border border-[var(--color-grey-100)] bg-white px-3.5 py-3"
        style={{ borderTop: `3px solid ${accent}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          {agent ? (
            <span className="grid place-items-center w-[22px] h-[22px] rounded-full text-[9px] font-semibold text-white shrink-0" style={{ background: accent }}>
              {agent.mark}
            </span>
          ) : (
            <span className="grid place-items-center w-[22px] h-[22px] rounded-md shrink-0" style={{ background: tint, color: accent }}>
              {node.kind === "approval" ? <ShieldCheck size={13} weight="fill" /> : <ArrowSquareOut size={13} weight="bold" />}
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
            {agent ? `${agent.label} agent` : node.kind === "approval" ? "Your approval" : "Connected system"}
          </span>
        </div>
        <span className="text-[13px] font-medium text-[var(--text-primary)] leading-snug mb-1">{node.label}</span>
        <span className="text-[12px] text-[#757A97] leading-snug">{node.detail}</span>
      </div>
      {!last && (
        <span className="flex items-center px-2 text-[var(--color-grey-300)]">
          <CaretRight size={15} weight="bold" />
        </span>
      )}
    </div>
  );
}

function MetaCell({ label, children }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-r border-[var(--color-grey-100)] last:border-r-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className="text-[13px] text-[var(--text-primary)]">{children}</span>
    </div>
  );
}

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ["agent-workflows"], queryFn: () => apiGet("/api/agent-workflows") });
  const wf = (data?.workflows || []).find((w) => w.id === id);

  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full p-4 bg-grey-50">
        <div className="w-full h-full rounded-xl border border-[var(--color-grey-100)] bg-white animate-pulse" />
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 bg-grey-50">
        <p className="text-[14px] text-[var(--text-primary)]">That workflow doesn&rsquo;t exist.</p>
        <PvButton variant="secondary" size="sm" label="Back to workflows" icon={CaretLeft} onClick={() => navigate("/workflows")} />
      </div>
    );
  }

  const live = wf.status === "active";
  const platform = platformOf(wf.platform);
  const agentCount = wf.pipeline.filter((n) => n.kind === "agent").length;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">
          <div className="w-full h-full overflow-y-auto">
            <div className="flex flex-col w-full p-4">
              {/* Breadcrumb */}
              <button
                onClick={() => navigate("/workflows")}
                className="flex items-center gap-1.5 mb-3 px-0 py-0 bg-transparent border-none cursor-pointer text-[12px] text-[var(--text-muted)] hover:text-primary-500 transition-colors w-fit"
              >
                <CaretLeft size={13} /> Workflows
              </button>

              {/* Title */}
              <div className="flex items-start justify-between gap-6 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.02em]">{wf.name}</h1>
                    <span className="flex items-center gap-1.5">
                      <i className={cn("w-[6px] h-[6px] rounded-full", live ? "bg-green-500" : "bg-[var(--color-grey-300)]")} />
                      <span className={cn("text-[12px] font-medium", live ? "text-green-600" : "text-[var(--text-muted)]")}>
                        {live ? "Live" : "Available"}
                      </span>
                    </span>
                  </div>
                  <p className="text-[13px] text-[#757A97] leading-relaxed max-w-[680px]">{wf.automates}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PvButton variant="secondary" size="md" label="Ask Sage" icon={Sparkle} />
                  {live ? (
                    <PvButton variant="secondary" size="md" label="Pause" icon={Pause} />
                  ) : (
                    <PvButton variant="primary" size="md" label="Activate" icon={Play} />
                  )}
                  <PvButton variant="secondary" size="md" icon={Gear} aria-label="Workflow settings" />
                </div>
              </div>

              {/* Meta strip */}
              <div className="grid grid-cols-4 mb-4 rounded-lg border border-[var(--color-grey-100)] overflow-hidden">
                <MetaCell label="What you get">{wf.deliverable}</MetaCell>
                <MetaCell label="Runs on">{platform.label}</MetaCell>
                <MetaCell label="Schedule">{live ? wf.cadence : "Not scheduled"}</MetaCell>
                <MetaCell label="Last run">
                  {live ? (
                    <span className="flex items-center gap-1.5">
                      {wf.lastRun}
                      <span className="text-[11px] text-green-600">· succeeded</span>
                    </span>
                  ) : (
                    <span className="text-[#757A97]">Never</span>
                  )}
                </MetaCell>
              </div>

              {/* Pending actions */}
              {wf.pending > 0 && (
                <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-lg border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]">
                  <span className="grid place-items-center w-8 h-8 rounded-lg bg-white text-primary-600 shrink-0">
                    <Lightning size={16} weight="fill" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">
                      {wf.pending} action{wf.pending > 1 ? "s" : ""} waiting for your approval
                    </p>
                    <p className="text-[12px] text-[#757A97]">From the {wf.lastRun.replace("Today, ", "")} run.</p>
                  </div>
                  <PvButton variant="primary" size="sm" label="Review" />
                </div>
              )}

              {/* Pipeline */}
              <div className="rounded-lg border border-[var(--color-grey-100)]">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-grey-100)]">
                  <div className="flex items-center gap-2">
                    <FlowArrow size={15} className="text-[var(--text-muted)]" />
                    <span className="text-[14px] text-[var(--text-primary)]">How this workflow runs</span>
                    <span className="text-[12px] text-[#757A97]">· {agentCount} agents</span>
                  </div>
                  <div className="flex items-center gap-3.5 text-[11px] text-[#757A97]">
                    <span className="flex items-center gap-1.5"><i className="w-[7px] h-[7px] rounded-sm bg-[#825CDE]" />Agent step</span>
                    <span className="flex items-center gap-1.5"><i className="w-[7px] h-[7px] rounded-sm bg-[#08BD50]" />Your approval</span>
                    <span className="flex items-center gap-1.5"><i className="w-[7px] h-[7px] rounded-sm bg-[#757A97]" />Connected system</span>
                  </div>
                </div>
                <div className="flex items-stretch overflow-x-auto px-4 py-4">
                  {wf.pipeline.map((node, i) => (
                    <PipelineNode key={i} node={node} last={i === wf.pipeline.length - 1} />
                  ))}
                </div>
                <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--color-grey-100)]">
                  <ShieldCheck size={14} className="text-green-600 shrink-0" />
                  <p className="text-[12px] text-[#757A97]">
                    Every run ends in one action. Nothing reaches {platform.short} until you approve it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
