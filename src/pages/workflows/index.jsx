import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, CaretRight } from "@phosphor-icons/react";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf } from "../../mocks/agentWorkflows";
import { AgentMark } from "../../components/AgentMark";

// The headers are doing real work: read left to right and they answer the three
// questions a prospect has in the first ten seconds — what is it automating,
// how does it do it, what do I get.
const COLS = "minmax(0,1.5fr) 150px minmax(0,1.4fr) 110px 130px 84px 28px";

const STATUS = {
  active: { label: "Live", dot: "bg-green-500", text: "text-green-600" },
  available: {
    label: "Available",
    dot: "bg-[var(--color-grey-300)]",
    text: "text-[var(--text-muted)]",
  },
};

/* ── Overlapping stack of the agents a workflow deploys. Identity only — each
   mark carries its family's icon and names itself on hover; what each one did
   lives inside the workflow. ── */
function AgentStack({ steps }) {
  const keys = [...new Set(steps.filter((s) => s.agent).map((s) => s.agent))];
  return (
    <span className="flex items-center pl-1.5">
      {keys.map((k, i) => (
        <span key={k} className="-ml-1.5" style={{ zIndex: keys.length - i }}>
          <AgentMark agentKey={k} />
        </span>
      ))}
    </span>
  );
}

function HeaderCell({ label }) {
  return (
    <span className="px-2 text-[12px] font-medium leading-[19px] text-[var(--color-text-secondary)]">
      {label}
    </span>
  );
}

/* One workflow — a spaced, bordered row on a single line, matching the goals
   and dashboards lists. The longer "what it automates" copy lives inside the
   workflow rather than on this page. */
function Row({ wf, onOpen }) {
  const st = STATUS[wf.status] || STATUS.available;
  const live = wf.status === "active";
  return (
    <div
      onClick={onOpen}
      className="grid items-center w-full px-3 h-[58px] shrink-0 bg-white border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all cursor-pointer"
      style={{ gridTemplateColumns: COLS }}
    >
      <span className="flex items-center gap-2 min-w-0 px-2">
        <span className="text-[13px] text-[var(--text-primary)] truncate">
          {wf.name}
        </span>
        <span className="shrink-0 text-[11px] text-[#757A97] px-1.5 py-0.5 rounded bg-grey-100">
          {platformOf(wf.platform).short}
        </span>
      </span>

      <span className="px-2">
        <AgentStack steps={wf.steps} />
      </span>

      <span className="px-2 min-w-0 text-[13px] text-[var(--text-primary)] truncate">
        {wf.deliverable}
      </span>

      <span className="px-2 flex items-center gap-1.5">
        <i className={cn("w-[6px] h-[6px] rounded-full", st.dot)} />
        <span className={cn("text-[12px] font-medium", st.text)}>
          {st.label}
        </span>
      </span>

      <span className="px-2 text-[12px] text-[#757A97] truncate">
        {live ? wf.lastRun : "Not scheduled"}
      </span>

      <span className="px-2 flex justify-start">
        {wf.pending > 0 ? (
          <span className="grid place-items-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary-50 text-primary-600 text-[12px] font-semibold tabular-nums">
            {wf.pending}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--color-grey-300)]">—</span>
        )}
      </span>

      <span className="flex justify-center text-[var(--text-muted)]">
        <CaretRight size={15} />
      </span>
    </div>
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

  const { data, isLoading } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });
  const workflows = data?.workflows || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter(
      (w) =>
        (filter === "all" || w.status === filter) &&
        (!q ||
          `${w.name} ${w.automates} ${w.deliverable}`
            .toLowerCase()
            .includes(q)),
    );
  }, [workflows, search, filter]);

  const counts = useMemo(
    () => ({
      all: workflows.length,
      active: workflows.filter((w) => w.status === "active").length,
      available: workflows.filter((w) => w.status === "available").length,
    }),
    [workflows],
  );

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header — same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="text-[16px] leading-[24px] font-medium">
            Workflows
          </span>
        </div>

        {/* Tabs bar — same treatment as the Agents page. */}
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
              placeholder="Search workflows"
              aria-label="Search workflows"
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

                {/* Floating header — no ground of its own, like the Data Hub's
                    table header. The rows below are separate cards. */}
                <div className="flex flex-col gap-2">
                  <div
                    className="grid w-full items-center px-3 py-2"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <HeaderCell label="Workflow" />
                    <HeaderCell label="Agents deployed" />
                    <HeaderCell label="What you get" />
                    <HeaderCell label="Status" />
                    <HeaderCell label="Last run" />
                    <HeaderCell label="To approve" />
                    <span />
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 h-[58px] bg-white border border-[var(--color-grey-100)] rounded-lg"
                        >
                          <div className="h-3.5 w-1/3 rounded bg-[var(--color-grey-100)] animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-14 text-center">
                      <MagnifyingGlass
                        size={20}
                        className="text-[var(--text-muted)]"
                      />
                      <p className="text-[13px] text-[#757A97]">
                        No workflows match that.
                      </p>
                    </div>
                  ) : (
                    filtered.map((wf) => (
                      <Row
                        key={wf.id}
                        wf={wf}
                        onOpen={() => navigate(`/workflows/${wf.id}`)}
                      />
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
