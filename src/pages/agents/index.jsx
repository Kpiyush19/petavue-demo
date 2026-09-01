import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import { apiGet } from "../../api";
import { agentIcon } from "../../components/AgentMark";

/* ── The five agents, as the deck presents them.
   A workflow deploys an ensemble: the Measurement Agent is always its
   foundation, and the analytics agents do the workflow's specific analysis.
   The families organise the page; the individual agents inside them are the
   boxes. The mapping onto the underlying detail pages is presentation only —
   those pages stay as they are (Campaign spans two of them). ── */
const FAMILIES = [
  { key: "measurement", note: "Always the first agent in every workflow" },
  { key: "demand" },
  { key: "delivery" },
  { key: "budget" },
  { key: "conversion" },
];

const searchText = (m) => [m.label, m.owns, m.blurb, ...(m.specialists || [])].join(" ").toLowerCase();

/* One individual agent — a compact box. The family it belongs to is the
   section it sits in; its colour comes from the family icon. */
function AgentBox({ name, color, badge, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="group flex items-center gap-2 px-3.5 py-2.5 bg-white border border-grey-100 rounded-lg cursor-pointer transition-[background-color,box-shadow] duration-150 hover:bg-primary-50 hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)]"
    >
      <span className="flex-1 min-w-0 text-[12px] font-medium text-[var(--text-primary)] leading-snug">{name}</span>
      {badge && (
        <span
          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ background: color }}
        >
          {badge}
        </span>
      )}
      <ArrowRight
        size={12}
        className="shrink-0 text-[var(--color-grey-300)] group-hover:text-primary-500 transition-[color,transform] group-hover:translate-x-0.5"
      />
    </div>
  );
}

/* One family group: the header names the family and carries the deck's line;
   the n × 2 grid below holds its agents as boxes. */
function FamilySection({ agent, note, boxes }) {
  const Icon = agentIcon(agent.key);
  return (
    <div className="flex flex-col gap-2.5 pb-6 border-solid border-x-0 border-t-0 border-b border-b-[var(--color-grey-100)] last:border-b-0 last:pb-0">
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <Icon size={16} weight="fill" style={{ color: agent.color }} className="shrink-0" />
          <span className="text-[14px] leading-[20px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            {agent.label}
          </span>
          {note && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white"
              style={{ background: agent.color }}
            >
              Foundational
            </span>
          )}
          {note && <span className="text-[12px] leading-[18px] text-[var(--text-muted)]">{note}</span>}
          <span className="ml-auto text-[12px] leading-[18px] text-[#757A97] tabular-nums">
            Used by {agent.workflowCount} {agent.workflowCount === 1 ? "workflow" : "workflows"} ·{" "}
            {agent.liveCount} active {agent.liveCount === 1 ? "deployment" : "deployments"}
          </span>
        </span>
        <span className="text-[12px] leading-[18px] text-[#757A97]">{agent.blurb}</span>
      </span>
      <div className="grid grid-cols-4 gap-2.5">{boxes}</div>
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
  const byKey = useMemo(() => Object.fromEntries(agents.map((a) => [a.key, a])), [agents]);

  const q = search.trim().toLowerCase();
  const sections = FAMILIES.map((fam) => ({ ...fam, agent: byKey[fam.key] })).filter(
    (fam) => fam.agent && (!q || searchText(fam.agent).includes(q)),
  );
  const total = sections.length;

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header — same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[72px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="flex flex-col min-w-0">
            <span className="text-[16px] leading-[24px] font-medium">Agents</span>
            <span className="text-[12px] leading-[18px] text-[#757A97]">
              Petavue groups specialist agents into five families. Each workflow deploys the specialists it needs in
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
                {total}
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
              <div className="flex flex-col gap-6 w-full px-4 py-4">

                {isLoading ? (
                  <div className="grid grid-cols-4 gap-2.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[40px] rounded-lg border border-grey-100 bg-grey-50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : total === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
                    <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                    <p className="text-[12px] text-[#757A97]">No agents match that.</p>
                  </div>
                ) : (
                  <>
                    {sections.map((fam) => (
                      <FamilySection
                        key={fam.key}
                        agent={fam.agent}
                        note={fam.note}
                        boxes={(fam.agent.specialists || []).map((sp) => (
                          <AgentBox
                            key={sp}
                            name={sp}
                            color={fam.agent.color}
                            onOpen={() => navigate(`/agents/${fam.key}`)}
                          />
                        ))}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
