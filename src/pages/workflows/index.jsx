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
const COLS = "minmax(0,1.5fr) 150px minmax(0,1.4fr) 110px 130px 28px";

const STATUS = {
  active: { label: "Live", dot: "bg-green-500", text: "text-green-600" },
  available: {
    label: "Available",
    dot: "bg-[var(--color-grey-300)]",
    text: "text-[var(--text-muted)]",
  },
};

/* ── The agents a workflow deploys. Identity only — each mark is its family's
   icon in the family's colour and names itself on hover; what each one did
   lives inside the workflow. ── */
function AgentStack({ steps }) {
  const keys = [...new Set(steps.filter((s) => s.agent).map((s) => s.agent))];
  return (
    <span className="flex items-center gap-2">
      {keys.map((k) => (
        <AgentMark key={k} agentKey={k} size={20} />
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

      <span className="flex justify-center text-[var(--text-muted)]">
        <CaretRight size={15} />
      </span>
    </div>
  );
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });
  const workflows = data?.workflows || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter(
      (w) =>
        !q ||
        `${w.name} ${w.automates} ${w.deliverable}`.toLowerCase().includes(q),
    );
  }, [workflows, search]);

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header — same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="text-[16px] leading-[24px] font-medium">
            Workflows
          </span>
        </div>

        {/* Heading bar — the Dashboards pattern: 56px, label + solid count
            chip on the left, search on the right. */}
        <div className="flex items-center justify-between h-14 shrink-0 w-full border-b border-[var(--color-grey-100)] bg-white">
          <div className="px-8 flex gap-2.5 items-center">
            <span className="font-medium text-[14px]">All workflows</span>
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
                placeholder="Search workflows"
                aria-label="Search workflows"
                className="w-full min-w-0 resize-none outline-none border-none bg-transparent text-xs text-grey-900 placeholder:text-[var(--text-secondary)]"
              />
            </div>
          </div>
        </div>

        <div
          className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]"
          style={{ height: "calc(100% - 116px)" }}
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
