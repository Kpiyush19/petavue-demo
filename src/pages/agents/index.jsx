import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, ArrowRight, TreeStructure } from "@phosphor-icons/react";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { agentIcon } from "../../components/AgentMark";

const FILTERS = [
  { k: "all", label: "All agents" },
  { k: "deployed", label: "Deployed" },
  { k: "idle", label: "Not yet deployed" },
];

/* ── One agent family ── */
function AgentCard({ agent }) {
  const Icon = agentIcon(agent.key);
  const deployed = agent.liveCount > 0;
  return (
    <div className="group flex flex-col gap-2 h-full p-5 bg-white border border-grey-100 rounded-lg cursor-pointer transition-[background-color,box-shadow] duration-150 hover:bg-primary-50 hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)]">
      <Icon
        size={28}
        weight="fill"
        style={{ color: agent.color }}
        className="shrink-0"
      />

      <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.2px] text-[var(--text-primary)] mt-1">
        {agent.label}
      </h3>
      <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
        {agent.blurb}
      </p>

      <ul className="flex flex-col gap-1.5 mt-2">
        {agent.does.map((d) => (
          <li
            key={d}
            className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)] leading-snug"
          >
            <span
              className="mt-[7px] w-[4px] h-[4px] rounded-full shrink-0"
              style={{ background: agent.color }}
            />
            {d}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 mt-auto pt-4">
        <span
          className={cn(
            "flex items-center gap-1.5 min-w-0 text-[12px] truncate",
            deployed ? "text-green-600" : "text-[var(--text-muted)]",
          )}
        >
          <TreeStructure size={14} className="shrink-0" />
          {deployed
            ? `In ${agent.liveCount} live workflow${agent.liveCount > 1 ? "s" : ""}`
            : "Not yet deployed"}
        </span>
        <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)] group-hover:text-primary-500 transition-colors whitespace-nowrap shrink-0">
          View agent{" "}
          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiGet("/api/agents"),
  });
  const agents = data?.agents || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter(
      (a) =>
        (filter === "all" ||
          (filter === "deployed" ? a.liveCount > 0 : a.liveCount === 0)) &&
        (!q || `${a.label} ${a.owns} ${a.blurb}`.toLowerCase().includes(q)),
    );
  }, [agents, search, filter]);

  const counts = useMemo(
    () => ({
      all: agents.length,
      deployed: agents.filter((a) => a.liveCount > 0).length,
      idle: agents.filter((a) => a.liveCount === 0).length,
    }),
    [agents],
  );

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header — same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="text-[16px] leading-[24px] font-medium">Agents</span>
        </div>

        {/* Tabs bar — matches the Data Hub pattern: full-width, own bottom
            border, 48px tabs with an underline on the active one. */}
        <div className="flex w-full items-center justify-between px-6 bg-white border-b border-[var(--color-grey-100)] shrink-0">
          <div className="flex items-start gap-6">
            {FILTERS.map((f) => {
              const active = filter === f.k;
              return (
                <button
                  key={f.k}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.k)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 h-12 px-2 bg-transparent border-solid border-x-0 border-t-0 border-b-2 cursor-pointer text-[14px] transition-colors",
                    active
                      ? "text-primary-500 font-medium border-primary-500"
                      : "text-[var(--text-secondary)] border-transparent hover:text-primary-500",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular-nums text-[12px]",
                      active ? "text-primary-500" : "text-[var(--text-muted)]",
                    )}
                  >
                    {counts[f.k] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 w-80 h-8 border border-grey-200 rounded-lg bg-white focus-within:border-primary-500 hover:border-primary-300 px-3 transition-colors">
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

        <div
          className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]"
          style={{ height: "calc(100% - 109px)" }}
        >
          <div className="flex flex-col bg-white rounded-xl h-full w-full overflow-hidden min-w-[800px]">
            <div className="w-full h-full overflow-y-auto">
              <div className="flex flex-col w-full px-4 py-2">

                {isLoading ? (
                  <div className="grid grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[300px] rounded-lg border border-grey-100 bg-grey-50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
                    <MagnifyingGlass
                      size={20}
                      className="text-[var(--text-muted)]"
                    />
                    <p className="text-[13px] text-[#757A97]">
                      No agents match that.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    {filtered.map((a) => (
                      <AgentCard key={a.key} agent={a} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
