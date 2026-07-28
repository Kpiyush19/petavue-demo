import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CaretRight, CaretDown, Cpu, Lightning, FileText, Copy, CheckCircle, X, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button as PvButton } from "@/ui";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;

const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n));
const sumTokens = (agents) => agents.reduce((a, x) => ({
  input: a.input + x.tokens.input, cacheRead: a.cacheRead + x.tokens.cacheRead,
  cacheWrite: a.cacheWrite + x.tokens.cacheWrite, out: a.out + x.tokens.out,
}), { input: 0, cacheRead: 0, cacheWrite: 0, out: 0 });
const totalAll = (t) => t.input + t.cacheRead + t.cacheWrite + t.out;

function TokenChips({ tokens }) {
  const items = [["input", tokens.input], ["cache read", tokens.cacheRead], ["cache write", tokens.cacheWrite], ["out", tokens.out]];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(([label, v]) => (
        <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-grey-50 text-[12px] text-[var(--text-muted)]">
          {label} <span className="font-semibold text-[var(--text-primary)]">{fmt(v)}</span>
        </span>
      ))}
    </div>
  );
}

function AgentRow({ agent, onTranscript }) {
  const Icon = agent.kind === "task" ? Lightning : Cpu;
  return (
    <div className="border border-[var(--border-primary)] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={16} weight={agent.kind === "task" ? "fill" : "regular"} className={cn("shrink-0", agent.kind === "task" ? "text-amber-500" : "text-primary-500")} />
          <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{agent.name}</span>
          {agent.via && <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">via {agent.via} · #{agent.index}</span>}
        </div>
        <PvButton variant="secondary" size="sm" label="View transcript" icon={FileText} onClick={() => onTranscript(agent)} />
      </div>
      <TokenChips tokens={agent.tokens} />
    </div>
  );
}

function ModelBlock({ model, defaultOpen, onTranscript }) {
  const [open, setOpen] = useState(defaultOpen);
  const agg = sumTokens(model.agents);
  return (
    <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden bg-white">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent border-none cursor-pointer hover:bg-grey-50/60 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <CaretDown size={14} className={cn("text-[var(--text-muted)] transition-transform", !open && "-rotate-90")} />
          <Cpu size={16} className="text-primary-500 shrink-0" />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">{model.name}</span>
          <span className="text-[12px] text-[var(--text-muted)]">{model.agents.length} agents</span>
        </div>
        <div className="hidden md:block"><TokenChips tokens={agg} /></div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-[var(--color-grey-100)]">
          {model.agents.map((a, i) => <AgentRow key={a.name + i} agent={a} onTranscript={onTranscript} />)}
        </div>
      )}
    </div>
  );
}

function RunBlock({ run, defaultOpen, onTranscript }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = run.models.reduce((s, m) => s + totalAll(sumTokens(m.agents)), 0);
  return (
    <div className="bg-white border border-[var(--color-grey-100)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-none cursor-pointer hover:bg-grey-50/50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <CaretDown size={16} className={cn("text-[var(--text-muted)] transition-transform", !open && "-rotate-90")} />
          <span className="text-[16px] font-semibold text-[var(--text-primary)]">{run.at}</span>
          <span className="px-2 py-0.5 text-[12px] font-semibold rounded-full bg-green-50 text-green-700">{run.status}</span>
          <span className="text-[14px] text-[var(--text-muted)]">{run.duration}</span>
          <span className="text-[14px] text-[var(--text-muted)]">· {run.recCount} recs</span>
        </div>
        <span className="text-[14px] font-semibold text-[var(--text-primary)] whitespace-nowrap">{fmt(total)} tokens</span>
      </button>
      {open && (
        <div className="px-5 pb-5 flex flex-col gap-3 border-t border-[var(--color-grey-100)] pt-4">
          <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <span>Session</span>
            <code className="px-1.5 py-0.5 rounded bg-grey-100 text-[var(--text-primary)] font-mono text-[12px]">{run.sessionId}</code>
            <button onClick={() => { navigator.clipboard?.writeText(run.sessionId); toast.success("Session ID copied"); }} className="p-1 rounded hover:bg-grey-100 bg-transparent border-none cursor-pointer text-[var(--text-muted)]" aria-label="Copy session id">
              <Copy size={13} />
            </button>
          </div>
          {run.models.map((m, i) => <ModelBlock key={m.name + i} model={m} defaultOpen={i === 0} onTranscript={onTranscript} />)}
        </div>
      )}
    </div>
  );
}

function TranscriptModal({ agent, onClose }) {
  const label = agent.via ? `${agent.name} · via ${agent.via} #${agent.index}` : agent.name;
  const lines = [
    { role: "system", text: `You are the ${agent.name} agent for the Paid Media Pipeline Tracking goal. Ground every claim in the copied history and cite the specific rows.` },
    { role: "user", text: "Analyze the current high-value pipeline against the goal's targets and surface anything that needs action." },
    { role: "assistant", text: 'Read raw_deals.csv (497 rows). The open high-value pipeline is concentrated in a single $250,000 deal ("D3 - test 2") whose close date is 211 days in the past. It is effectively un-dated and is corrupting the forecast.' },
    { role: "assistant", text: "Recommendation: have the deal owner confirm it is still live and set a realistic new close date. Flagged as act-now with $250K forecast exposure." },
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[640px] max-w-[94vw] max-h-[86vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-primary-500 shrink-0" />
            <span className="text-[16px] font-semibold text-[var(--text-primary)] truncate">{label}: transcript</span>
          </div>
          <PvButton variant="ghost" size="sm" icon={X} aria-label="Close" onClick={onClose} />
        </div>
        <div className="flex flex-col gap-3 px-5 py-5 overflow-y-auto">
          {lines.map((l, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{l.role}</span>
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{l.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RunHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ["goal-runs", id], queryFn: () => apiGet(`/api/goals/${id}/runs`) });
  const goalName = data?.goalName || "Goal";

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate("/goals")} className="text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0">Goals</button>
          <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
          <button onClick={() => navigate(`/goals/${id}`)} className="text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0 truncate max-w-[320px]">{goalName}</button>
          <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
          <span className="block truncate text-[16px] leading-[24px] font-medium text-grey-900">Run history</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-grey-50 p-4">
        <div className="flex flex-col min-h-full w-full bg-white rounded-xl border border-[var(--color-grey-100)] p-4">
          <h1 className="text-[24px] font-semibold text-[var(--text-primary)]">Run history</h1>
          <p className="text-[14px] text-[#757A97] mb-6">Every check-in, its cost per agent, and the full transcripts behind it.</p>

          {isLoading || !data ? (
            <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)] mt-8"><Spinner size={18} /> Loading…</div>
          ) : (
            <>
              {/* Calibration summary */}
              <div className="bg-grey-50 border border-[var(--color-grey-100)] rounded-2xl px-5 py-4 mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Cpu size={16} className="text-primary-500" />
                  <span className="text-[16px] font-semibold text-[var(--text-primary)]">Calibration</span>
                  <span className="text-[14px] text-[var(--text-muted)]">{data.calibration.duration}</span>
                </div>
                <TokenChips tokens={data.calibration.tokens} />
              </div>

              {/* Runs */}
              <div className="flex flex-col gap-4">
                {data.runs.map((run, i) => <RunBlock key={run.id} run={run} defaultOpen={i === 0} onTranscript={setTranscript} />)}
              </div>
            </>
          )}
        </div>
      </div>

      {transcript && <TranscriptModal agent={transcript} onClose={() => setTranscript(null)} />}
    </div>
  );
}
