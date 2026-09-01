import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, CaretRight, Plus, ListChecks, Question, CircleDashed,
  PauseCircle, XCircle, CalendarBlank, CircleNotch, CheckCircle, ClipboardText, Database,
} from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf, AGENTS } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";
import WorkflowGlyph from "../../components/WorkflowGlyph";

// The headers are doing real work: read left to right and they answer the three
// questions a prospect has in the first ten seconds — what is it automating,
// how does it do it, what do I get — and then, what is it waiting on me for.
const COLS = "minmax(0,0.85fr) 120px 100px minmax(0,2fr) 165px 28px";

/* ── One operational status per row, never two.
   The row used to print "Live" beside "Today, 7:04 AM", which is a state and a
   timestamp competing for the same glance. A workflow can be live AND have two
   decisions waiting AND have a run scheduled tonight; the row has to pick one,
   and it picks the one where the customer is the blocker. Hence the ladder:
   decisions first, then activity, then schedule. ── */
function operationalStatus(wf) {
  if (wf.status === "available") {
    return { label: "Available", icon: CircleDashed, tone: "text-[var(--text-muted)]" };
  }
  if (wf.status === "deploying") {
    return { label: "Deploying", icon: CircleNotch, tone: "text-blue-700" };
  }
  // Two different asks, so two different marks. "Waiting for input" is a
  // question Petavue cannot answer itself and carries the same amber question
  // mark the decision queue uses for those cards. "Needs decision" is work the
  // customer can do right now, and keeps the one bright colour on the page.
  if (wf.awaiting > 0) {
    return { label: "Waiting for input", icon: Question, tone: "text-amber-600 font-medium" };
  }
  if (wf.pending > 0) {
    return { label: "Needs decision", icon: ListChecks, tone: "text-rose-600 font-medium" };
  }
  if (wf.status === "paused") {
    return { label: "Paused", icon: PauseCircle, tone: "text-amber-600" };
  }
  if (wf.lastRunOk === false || wf.runs?.[0]?.status === "failed") {
    return { label: "Failed", icon: XCircle, tone: "text-rose-600" };
  }
  return {
    label: wf.nextRun ? `Next run ${wf.nextRun}` : "Running",
    icon: CalendarBlank,
    tone: "text-[var(--text-secondary)]",
  };
}

/* ── The agents a workflow deploys.
   Icons alone said "three coloured dots" to anyone who hadn't learnt the
   glyphs yet. The count is the readable part; the icons keep the row scannable
   for someone who has; the hover carries the canonical family names, which are
   the thing we are not allowed to paraphrase. ── */
function AgentSummary({ steps }) {
  const keys = [...new Set(steps.filter((s) => s.agent).map((s) => s.agent))];
  const names = keys.map((k) => AGENTS[k]?.label).filter(Boolean);
  return (
    <Tooltip title={names.join("  ·  ")} placement="top">
      <span className="inline-flex items-center gap-1.5 cursor-default">
        <span className="flex items-center gap-0.5">
          {keys.map((k) => {
            const Icon = agentIcon(k);
            return <Icon key={k} size={16} weight="fill" style={{ color: AGENTS[k]?.color }} />;
          })}
        </span>
      </span>
    </Tooltip>
  );
}

function HeaderCell({ label }) {
  return (
    <span className="px-2 text-[12px] font-medium leading-[19px] text-[#757A97]">
      {label}
    </span>
  );
}

/* One workflow — a spaced, bordered row on a single line, matching the goals
   and dashboards lists. The longer "what it automates" copy lives inside the
   workflow rather than on this page. */
function Row({ wf, onOpen }) {
  const st = operationalStatus(wf);
  return (
    <div
      onClick={onOpen}
      className="grid items-center w-full px-3 h-[58px] shrink-0 bg-white border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all cursor-pointer"
      style={{ gridTemplateColumns: COLS }}
    >
      {/* One sentence per row. Section 1 describes a card carrying both the
          problem and the output; in a table that meant two truncated sentences
          side by side, so the problem lives on the workflow page where it has
          room to be read. */}
      <span className="flex items-center min-w-0 px-2">
        <span className="text-[13px] text-[var(--text-primary)] truncate">{wf.name}</span>
      </span>

      {/* Channel is metadata about the workflow, not part of its name, so it
          gets the column the header already promises. */}
      <span className="flex items-center gap-1.5 min-w-0 px-2">
        <SourceIcon name={platformOf(wf.platform).short} size={14} />
        <span className="text-[12px] text-[#757A97] truncate">{platformOf(wf.platform).short}</span>
      </span>

      <span className="px-2">
        <AgentSummary steps={wf.steps} />
      </span>

      <Tooltip title={wf.customerOutput || wf.deliverable} placement="bottom">
        <span className="px-2 min-w-0 text-[13px] text-[var(--text-primary)] truncate cursor-default">
          {wf.customerOutput || wf.deliverable}
        </span>
      </Tooltip>

      <span className="px-2 flex items-center gap-1.5 min-w-0">
        <st.icon size={14} className={cn("shrink-0", st.tone)} />
        <span className={cn("text-[12px] truncate", st.tone)}>{st.label}</span>
      </span>

      <span className="flex justify-center text-[var(--text-muted)]">
        <CaretRight size={15} />
      </span>
    </div>
  );
}

/* ── Foundation entries.
   Not workflows: one is a one-off audit for people who don't know which
   workflow to pick, the other is the data map everything else depends on. They
   belong in the library — a prospect asks "what if I don't know where to
   start?" — but they must not read as a seventh and eighth use case, so they
   get no card, no border, and muted type. ── */
const FOUNDATION = [
  {
    id: "assessment",
    name: "Paid-media Assessment",
    icon: ClipboardText,
    tag: "All channels",
    line: "Petavue reviews the account once and identifies the workflows most likely to improve the selected KPI.",
    output: "You receive a downloadable assessment with evidence and a recommended deployment order.",
    route: "/workflows/paid-media-assessment",
  },
  {
    id: "discovery",
    name: "Data Discovery",
    icon: Database,
    tag: "Foundation",
    line: "Petavue maps campaigns, conversion events, CRM fields, and the selected KPI before any workflow runs.",
    output: "You receive a verified data map that Petavue checks again when a source or field changes.",
    state: "Complete",
  },
];

function FoundationRow({ item, onOpen }) {
  const Tag = onOpen ? "button" : "div";
  return (
    <Tag
      type={onOpen ? "button" : undefined}
      onClick={onOpen}
      className={cn(
        "flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-lg bg-transparent border-none",
        onOpen && "cursor-pointer hover:bg-primary-50 transition-colors",
      )}
    >
      <item.icon size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] text-[var(--text-primary)] truncate">{item.name}</span>
          <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{item.tag}</span>
          {item.state && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-green-700">
              <CheckCircle size={12} weight="fill" className="text-green-600" />
              {item.state}
            </span>
          )}
        </span>
        <span className="text-[12px] text-[#757A97] leading-snug">{item.line}</span>
        {item.output && <span className="text-[12px] text-[#757A97] leading-snug">{item.output}</span>}
      </span>
      {onOpen && <CaretRight size={14} className="mt-1 shrink-0 text-[var(--text-muted)]" />}
    </Tag>
  );
}


const TABS = [
  { k: "all", label: "All" },
  { k: "deployed", label: "Deployed" },
  { k: "available", label: "Available" },
];

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });
  const workflows = data?.workflows || [];

  const isDeployed = (w) => w.status !== "available";
  const counts = {
    deployed: workflows.filter(isDeployed).length,
    available: workflows.filter((w) => !isDeployed(w)).length,
    all: workflows.length,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows
      .filter((w) => (tab === "all" ? true : tab === "deployed" ? isDeployed(w) : !isDeployed(w)))
      .filter((w) => !q || `${w.name} ${w.automates} ${w.deliverable}`.toLowerCase().includes(q));
  }, [workflows, search, tab]);

  // Foundation entries are not deployed, so they only belong under Available
  // and All — and never while a search is narrowing the list.
  const showFoundation = !search.trim() && tab !== "deployed";

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header — same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[72px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="flex flex-col min-w-0">
            <span className="text-[16px] leading-[24px] font-medium">Workflows</span>
            <span className="text-[12px] leading-[18px] text-[#757A97]">
              Each workflow automates one recurring paid-media analysis. The agents prepare the findings and proposed
              changes. You review every change before Petavue applies it.
            </span>
          </span>
          <Button variant="secondary" size="md" icon={Plus} label="Request a custom workflow" />
        </div>

        <div
          className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]"
          style={{ height: "calc(100% - 72px)" }}
        >
          <div className="flex flex-col bg-white rounded-xl h-full w-full overflow-hidden min-w-[800px]">
          {/* Heading bar — the Dashboards pattern: 56px, controls on the left,
              search on the right. Deployed and Available are two views of one
              library, not two products, so they are tabs on the same table
              rather than separate pages. */}
          <div className="flex items-center justify-between h-14 shrink-0 w-full border-b border-[var(--color-grey-100)] bg-white">
            {/* The Data Hub tab bar (.data-hub__tab): 48px tall, 24px gaps,
                active tab in primary-500 with a 2px underline in the same
                colour. Values mirror DataHub.css rather than importing a whole
                page's stylesheet.
                Every border edge is set explicitly — a bare `border-none` or
                `border-0` silently beats `border-b-2` and the underline
                disappears with no error. */}
            <div className="flex items-end gap-2 px-4 h-full" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.k}
                  onClick={() => setTab(t.k)}
                  className={cn(
                    "flex items-center justify-center gap-2 h-12 px-4 bg-transparent cursor-pointer text-[14px] leading-[22px] transition-colors",
                    "border-solid border-t-0 border-x-0 border-b-2",
                    tab === t.k
                      ? "border-b-[var(--color-primary-500)] text-[var(--color-primary-500)] font-medium"
                      : "border-b-transparent text-[var(--color-text-primary)] hover:text-[var(--color-primary-500)] font-normal",
                  )}
                >
                  {t.label}
                  {/* The Data Hub toolbar count bubble (.data-hub__toolbar-count):
                      16px tall, 10px regular, 6px radius. Filled primary on the
                      active tab; primary-50 on primary-500 for the rest, so the
                      counts stay readable without pulling the eye off the tab
                      that is actually selected. */}
                  <span
                    className={cn(
                      "flex items-center justify-center h-4 px-1.5 rounded-md text-[10px] leading-4 font-normal tabular-nums",
                      tab === t.k
                        ? "bg-[var(--color-primary-500)] text-white"
                        : "bg-[var(--color-primary-50)] text-[var(--color-primary-500)]",
                    )}
                  >
                    {counts[t.k]}
                  </span>
                </button>
              ))}
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

            <div className="w-full flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col w-full px-4 py-4">

                {/* Floating header — no ground of its own, like the Data Hub's
                    table header. The rows below are separate cards. */}
                <div className="flex flex-col gap-2">
                  <div
                    className="grid w-full items-center px-3 py-2"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <HeaderCell label="Workflow" />
                    <HeaderCell label="Channel" />
                    <HeaderCell label="Agents" />
                    <HeaderCell label="What you get" />
                    <HeaderCell label="Status" />
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
                    // An empty state should say what happened, why, and what
                    // to do next. A magnifier and four words did none of it,
                    // and the search case and the empty-tab case are not the
                    // same situation.
                    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                      <span className="grid place-items-center w-11 h-11 rounded-full bg-grey-50 border border-[var(--color-grey-100)]">
                        {search.trim() ? (
                          <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                        ) : (
                          <WorkflowGlyph size={20} className="text-[var(--text-muted)]" />
                        )}
                      </span>
                      <span className="flex flex-col gap-1 max-w-[380px]">
                        <span className="text-[14px] font-medium text-[var(--text-primary)]">
                          {search.trim()
                            ? `No workflows match “${search.trim()}”`
                            : tab === "available"
                              ? "Every workflow is deployed"
                              : "No workflows deployed yet"}
                        </span>
                        <span className="text-[13px] leading-relaxed text-[#757A97]">
                          {search.trim()
                            ? "Try a channel, an outcome, or part of the workflow name."
                            : tab === "available"
                              ? "All six are live and running on their schedules. Nothing is left to deploy."
                              : "Deploy one from the Available tab and its first run will appear here."}
                        </span>
                      </span>
                      {search.trim() ? (
                        <Button variant="secondary" size="sm" label="Clear search" onClick={() => setSearch("")} />
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          label={tab === "available" ? "See deployed workflows" : "See all workflows"}
                          onClick={() => setTab(tab === "available" ? "deployed" : "all")}
                        />
                      )}
                    </div>
                  ) : (
                    filtered
                      .slice()
                      .sort((a, b) => (a.n || 0) - (b.n || 0))
                      .map((wf) => (
                        <Row key={wf.id} wf={wf} onOpen={() => navigate(`/workflows/${wf.id}`)} />
                      ))
                  )}
                </div>

                {showFoundation && (
                  <div className="mt-6 pt-4 border-t border-[var(--color-grey-100)] flex flex-col gap-1">
                    <span className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Before you deploy
                    </span>
                    {FOUNDATION.map((f) => (
                      <FoundationRow key={f.id} item={f} onOpen={f.route ? () => navigate(f.route) : undefined} />
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
