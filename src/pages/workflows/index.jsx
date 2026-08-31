import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Lightning, CheckCircle, Clock, CaretRight, Plus, Sparkle, ArrowClockwise } from "@phosphor-icons/react";
import { Button as PvButton, Tooltip } from "@/ui";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { AGENTS, platformOf } from "../../mocks/agentWorkflows";

// The headers are doing real work: read left to right and they answer the three
// questions a prospect has in the first ten seconds — what is it automating,
// how does it do it, what do I get.
const COLS = "minmax(0,2.1fr) 168px minmax(0,1.25fr) 116px 132px 92px 32px";

const STATUS = {
  active: { label: "Live", dot: "bg-green-500", text: "text-green-600" },
  available: { label: "Available", dot: "bg-[var(--color-grey-300)]", text: "text-[var(--text-muted)]" },
};

/* ── Overlapping stack of the agents a workflow deploys. Identity only — the
   sequence and what each one does live inside the workflow. ── */
function AgentStack({ pipeline }) {
  const keys = pipeline.filter((s) => s.kind === "agent").map((s) => s.agent);
  return (
    <span className="flex items-center pl-1.5">
      {keys.map((k, i) => {
        const a = AGENTS[k];
        if (!a) return null;
        return (
          <span key={`${k}-${i}`} className="-ml-1.5" style={{ zIndex: keys.length - i }}>
            <Tooltip content={`${a.label} agent`}>
              <span
                className="grid place-items-center w-[22px] h-[22px] rounded-full text-[9px] font-semibold text-white ring-2 ring-white cursor-default"
                style={{ background: a.color }}
              >
                {a.mark}
              </span>
            </Tooltip>
          </span>
        );
      })}
    </span>
  );
}

function Stat({ icon: Icon, tone, value, label, sub }) {
  return (
    <div className="flex flex-col bg-white border border-[var(--color-grey-100)] rounded-[8px] px-4 py-3.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{label}</span>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon size={16} className={tone} />}
        <span className="text-[24px] font-semibold leading-none text-[var(--text-primary)]">{value}</span>
      </div>
      <p className="text-[12px] text-[#757A97] leading-snug">{sub}</p>
    </div>
  );
}

function HeaderCell({ label }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-grey-500)] px-2">{label}</span>;
}

function Row({ wf, onOpen }) {
  const st = STATUS[wf.status] || STATUS.available;
  const live = wf.status === "active";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full items-center gap-3 px-4 py-3.5 text-left bg-transparent border-none border-b border-[var(--color-grey-100)] last:border-b-0 cursor-pointer hover:bg-grey-50 transition-colors"
      style={{ gridTemplateColumns: COLS }}
    >
      <span className="flex flex-col min-w-0 px-2">
        <span className="flex items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">{wf.name}</span>
          <span className="shrink-0 text-[11px] text-[#757A97] px-1.5 py-0.5 rounded bg-grey-100">{platformOf(wf.platform).short}</span>
        </span>
        <span className="text-[12px] text-[#757A97] leading-snug line-clamp-2">{wf.automates}</span>
      </span>

      <span className="px-2"><AgentStack pipeline={wf.pipeline} /></span>

      <span className="px-2 text-[13px] text-[var(--text-primary)] leading-snug">{wf.deliverable}</span>

      <span className="px-2 flex items-center gap-1.5">
        <i className={cn("w-[6px] h-[6px] rounded-full", st.dot)} />
        <span className={cn("text-[12px] font-medium", st.text)}>{st.label}</span>
      </span>

      <span className="px-2 flex flex-col">
        {live ? (
          <>
            <span className="text-[12px] text-[var(--text-primary)]">{wf.lastRun}</span>
            <span className="text-[11px] text-[#757A97]">{wf.cadence}</span>
          </>
        ) : (
          <span className="text-[12px] text-[#757A97]">Not scheduled</span>
        )}
      </span>

      <span className="px-2 flex justify-start">
        {wf.pending > 0 ? (
          <span className="grid place-items-center min-w-[24px] h-[24px] px-1.5 rounded-full bg-primary-50 text-primary-600 text-[12px] font-semibold tabular-nums">
            {wf.pending}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--color-grey-300)]">—</span>
        )}
      </span>

      <span className="flex justify-center text-[var(--text-muted)]">
        <CaretRight size={15} />
      </span>
    </button>
  );
}

const FILTERS = [
  { k: "all", label: "All" },
  { k: "active", label: "Live" },
  { k: "available", label: "Available" },
];

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({ queryKey: ["agent-workflows"], queryFn: () => apiGet("/api/agent-workflows") });
  const workflows = data?.workflows || [];
  const s = data?.summary;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter(
      (w) =>
        (filter === "all" || w.status === filter) &&
        (!q || `${w.name} ${w.automates} ${w.deliverable}`.toLowerCase().includes(q))
    );
  }, [workflows, search, filter]);

  const counts = useMemo(
    () => ({
      all: workflows.length,
      active: workflows.filter((w) => w.status === "active").length,
      available: workflows.filter((w) => w.status === "available").length,
    }),
    [workflows]
  );

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">
          <div className="w-full h-full overflow-y-auto">
            <div className="flex flex-col w-full p-4">
              <div className="flex items-start justify-between gap-6 mb-4">
                <div className="min-w-0">
                  <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] mb-1.5">Workflows</h1>
                  <p className="text-[13px] text-[#757A97] leading-relaxed max-w-[660px]">
                    Each workflow automates one deep paid-media analysis your team doesn&rsquo;t have time to do by hand,
                    and ends in a single action you approve.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PvButton variant="secondary" size="md" label="Ask Sage" icon={Sparkle} />
                  <PvButton variant="primary" size="md" label="Activate workflow" icon={Plus} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-grey-50 border border-[var(--color-grey-100)] mb-6">
                <Stat label="Waiting on you" icon={Lightning} tone="text-rose-600"
                  value={s ? String(s.pending) : "—"} sub="actions ready to approve" />
                <Stat label="Running for you" icon={ArrowClockwise} tone="text-primary-500"
                  value={s ? `${s.live} of ${s.total}` : "—"} sub="workflows live · the rest are one click away" />
                <Stat label="Actions taken" icon={CheckCircle} tone="text-green-600"
                  value={s ? String(s.actionsTaken) : "—"} sub={s ? `${s.approved} approved · ${s.rejected} rejected` : "this month"} />
              </div>

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {FILTERS.map((f) => {
                    const active = filter === f.k;
                    return (
                      <button
                        key={f.k}
                        type="button"
                        onClick={() => setFilter(f.k)}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium border transition-colors cursor-pointer",
                          active
                            ? "bg-primary-50 border-primary-500 text-primary-700"
                            : "bg-white border-[var(--color-grey-100)] text-[var(--text-muted)] hover:bg-grey-50"
                        )}
                      >
                        {f.label}
                        <span className={cn("tabular-nums text-[11px]", active ? "text-primary-600" : "text-[var(--text-muted)]")}>
                          {counts[f.k] ?? 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 w-80 h-8 ml-auto border border-grey-200 rounded-lg bg-white focus-within:border-primary-500 hover:border-primary-300 px-3 transition-colors">
                  <MagnifyingGlass size={16} className="text-grey-500 shrink-0" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search workflows"
                    aria-label="Search workflows"
                    className="flex-1 min-w-0 h-full bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)]"
                  />
                </div>
              </div>

              <div className="border border-[var(--color-grey-100)] rounded-lg overflow-hidden">
                <div className="grid w-full items-center gap-3 px-4 py-2.5 bg-grey-50 border-b border-[var(--color-grey-100)]" style={{ gridTemplateColumns: COLS }}>
                  <HeaderCell label="Workflow · what it automates" />
                  <HeaderCell label="Agents" />
                  <HeaderCell label="What you get" />
                  <HeaderCell label="Status" />
                  <HeaderCell label="Last run" />
                  <HeaderCell label="To approve" />
                  <span />
                </div>

                {isLoading ? (
                  <div className="flex flex-col">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 h-[68px] border-b border-[var(--color-grey-100)] last:border-b-0">
                        <div className="h-3.5 w-1/3 rounded bg-[var(--color-grey-100)] animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-14 text-center">
                    <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                    <p className="text-[13px] text-[#757A97]">No workflows match that.</p>
                  </div>
                ) : (
                  filtered.map((wf) => <Row key={wf.id} wf={wf} onOpen={() => navigate(`/workflows/${wf.id}`)} />)
                )}
              </div>

              <div className="flex items-center gap-2 mt-3 px-1">
                <Clock size={14} className="text-[var(--text-muted)] shrink-0" />
                <p className="text-[12px] text-[#757A97]">
                  Pilots start with three workflows. The other three stay available and can be switched on at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
