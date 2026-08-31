import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, ChartLineUp, Wallet, Broadcast, Crosshair, PaintBrush, FunnelSimple,
  ArrowRight, Sparkle, ShieldCheck, Circle,
} from "@phosphor-icons/react";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";

// Families are told apart by icon first, colour second — so the grid still
// reads for anyone who can't separate the hues.
const ICONS = { ChartLineUp, Wallet, Broadcast, Crosshair, PaintBrush, FunnelSimple };

const FILTERS = [
  { k: "all", label: "All agents" },
  { k: "deployed", label: "Deployed" },
  { k: "idle", label: "Not yet deployed" },
];

/* ── One agent family ── */
function AgentCard({ agent, onOpen }) {
  const Icon = ICONS[agent.icon] || Circle;
  const deployed = agent.liveCount > 0;
  return (
    <div
      onClick={onOpen}
      className="group flex flex-col gap-2 h-full p-5 bg-white border border-grey-100 rounded-lg cursor-pointer transition-[background-color,box-shadow] duration-150 hover:bg-primary-50 hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid place-items-center w-10 h-10 rounded-[10px] shrink-0"
          style={{ background: agent.tint, color: agent.color }}
        >
          <Icon size={20} weight="duotone" />
        </span>
        <span className="flex items-center gap-1.5 shrink-0 pt-1">
          <i className={cn("w-[6px] h-[6px] rounded-full", deployed ? "bg-green-500" : "bg-[var(--color-grey-300)]")} />
          <span className={cn("text-[12px] font-medium", deployed ? "text-green-600" : "text-[var(--text-muted)]")}>
            {deployed ? `In ${agent.liveCount} live workflow${agent.liveCount > 1 ? "s" : ""}` : "Not yet deployed"}
          </span>
        </span>
      </div>

      <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.2px] text-[var(--text-primary)] mt-1">
        {agent.label}
      </h3>
      <p className="text-[12px] font-medium uppercase tracking-wider" style={{ color: agent.color }}>
        Owns · {agent.owns}
      </p>
      <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">{agent.blurb}</p>

      <ul className="flex flex-col gap-1.5 mt-2">
        {agent.does.map((d) => (
          <li key={d} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)] leading-snug">
            <span className="mt-[7px] w-[4px] h-[4px] rounded-full shrink-0" style={{ background: agent.color }} />
            {d}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 mt-auto pt-4">
        <span className="flex items-center gap-1 min-w-0 text-[12px] text-[var(--text-muted)] truncate">
          {agent.platforms.join(" · ")}
        </span>
        <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)] group-hover:text-primary-500 transition-colors whitespace-nowrap shrink-0">
          View agent <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}

/* ── Sage, above the families ── */
function OrchestratorStrip({ orchestrator, agentCount }) {
  return (
    <div className="flex items-center gap-4 p-4 mb-6 rounded-lg border border-[var(--color-primary-100)] bg-[var(--color-primary-50)]">
      <span
        className="grid place-items-center w-10 h-10 rounded-[10px] shrink-0 text-white"
        style={{ background: "linear-gradient(135deg, #3661ed 0%, #6d5ef0 48%, #a855f7 100%)" }}
      >
        <Sparkle size={20} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">{orchestrator.label}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-600 px-1.5 py-0.5 rounded bg-white">
            {orchestrator.role}
          </span>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{orchestrator.blurb}</p>
      </div>
      <span className="hidden lg:flex items-center gap-1.5 shrink-0 text-[12px] text-[var(--text-muted)] whitespace-nowrap">
        <ShieldCheck size={14} /> {agentCount} agent families beneath it
      </span>
    </div>
  );
}

export default function AgentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({ queryKey: ["agents"], queryFn: () => apiGet("/api/agents") });
  const agents = data?.agents || [];
  const orchestrator = data?.orchestrator;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter(
      (a) =>
        (filter === "all" || (filter === "deployed" ? a.liveCount > 0 : a.liveCount === 0)) &&
        (!q || `${a.label} ${a.owns} ${a.blurb}`.toLowerCase().includes(q))
    );
  }, [agents, search, filter]);

  const counts = useMemo(
    () => ({
      all: agents.length,
      deployed: agents.filter((a) => a.liveCount > 0).length,
      idle: agents.filter((a) => a.liveCount === 0).length,
    }),
    [agents]
  );

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">
          <div className="w-full h-full overflow-y-auto">
            <div className="flex flex-col w-full p-4">
              <div className="flex items-start justify-between gap-6 mb-4">
                <div className="min-w-0">
                  <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] mb-1.5">Agents</h1>
                  <p className="text-[13px] text-[#757A97] leading-relaxed max-w-[680px]">
                    Each agent owns one recurring decision in your paid media and works its own platform&rsquo;s controls.
                    Workflows deploy them in combination.
                  </p>
                </div>
              </div>

              {orchestrator && <OrchestratorStrip orchestrator={orchestrator} agentCount={agents.length} />}

              <div className="flex items-center gap-3 mb-4 flex-wrap">
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
                    placeholder="Search agents"
                    aria-label="Search agents"
                    className="flex-1 min-w-0 h-full bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)]"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[300px] rounded-lg border border-grey-100 bg-grey-50 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
                  <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                  <p className="text-[13px] text-[#757A97]">No agents match that.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {filtered.map((a) => (
                    <AgentCard key={a.key} agent={a} onOpen={() => navigate("/workflows")} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
