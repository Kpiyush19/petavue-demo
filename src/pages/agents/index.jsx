import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";

/* ── One agent family ── */
function AgentCard({ agent, onOpen }) {
  const Icon = agentIcon(agent.key);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="group flex flex-col gap-2 h-full p-5 bg-white border border-grey-100 rounded-lg cursor-pointer transition-[background-color,box-shadow] duration-150 hover:bg-primary-50 hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)]"
    >
      <Icon
        size={28}
        weight="fill"
        style={{ color: agent.color }}
        className="shrink-0"
      />

      <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.2px] text-[var(--text-primary)] mt-1">
        {agent.label}
      </h3>
      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
        {agent.blurb}
      </p>

      <ul className="flex flex-col gap-1.5 mt-2">
        {agent.does.map((d) => (
          <li
            key={d}
            className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)] leading-snug"
          >
            <span
              className="mt-[6px] w-[4px] h-[4px] rounded-full shrink-0"
              style={{ background: agent.color }}
            />
            {d}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 mt-auto pt-4">
        {/* What this family works on, as the platforms' own marks. Whether it
            is live is on the detail page and in the workflow list — the card
            answers "what does this touch". */}
        <span className="flex items-center gap-2 min-w-0">
          {agent.platforms.map((pl) => (
            <SourceIcon key={pl} name={pl} size={16} named />
          ))}
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiGet("/api/agents"),
  });
  const agents = data?.agents || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter(
      (a) => !q || `${a.label} ${a.owns} ${a.blurb}`.toLowerCase().includes(q),
    );
  }, [agents, search]);

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header — same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[72px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="flex flex-col min-w-0">
            <span className="text-[16px] leading-[24px] font-medium">Agents</span>
            <span className="text-[12px] leading-[18px] text-[#757A97]">
              Petavue groups specialist agents into six families. Each workflow deploys the specialists it needs in
              sequence. You approve any proposed platform change.
            </span>
          </span>
        </div>

        <div
          className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]"
          style={{ height: "calc(100% - 72px)" }}
        >
          <div className="flex flex-col bg-white rounded-xl h-full w-full overflow-hidden min-w-[800px]">
          {/* Heading bar — the Dashboards pattern: 56px, label + solid count
              chip on the left, search on the right. */}
          <div className="flex items-center justify-between h-14 shrink-0 w-full border-b border-[var(--color-grey-100)] bg-white">
            <div className="px-8 flex gap-2.5 items-center">
              <span className="font-medium text-[14px]">All agents</span>
              <span className="text-xs text-white bg-[var(--color-primary-500)] px-1.5 py-0.5 rounded-md tabular-nums">
                {filtered.length}
              </span>
            </div>
            <div className="flex gap-3 items-center pr-4">
              <div className="flex flex-1 items-center w-80 border border-grey-200 rounded-lg bg-white focus-within:border-primary-500 hover:border-primary-300 py-2 px-3 transition-colors">
                <span className="mr-1.5 text-grey-500">
                  <MagnifyingGlass size={16} />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agents"
                  aria-label="Search agents"
                  className="w-full min-w-0 resize-none outline-none border-none bg-transparent text-xs text-grey-900 placeholder:text-[var(--text-secondary)]"
                />
              </div>
            </div>
          </div>

            <div className="w-full flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col w-full px-4 py-4">

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
                      <AgentCard key={a.key} agent={a} onOpen={() => navigate(`/agents/${a.key}`)} />
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
