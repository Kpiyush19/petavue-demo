import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MagnifyingGlass, CaretRight, Plus, ListChecks, Question, CircleDashed,
  PauseCircle, XCircle, CalendarBlank, CircleNotch, ClipboardText,
} from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { toast } from "sonner";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf, AGENTS, deckFamilyOf } from "../../mocks/agentWorkflows";
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
    return { label: "Waiting for input", icon: Question, tone: "text-amber-600 font-medium", act: true };
  }
  if (wf.pending > 0) {
    return { label: "Needs your decision", icon: ListChecks, tone: "text-rose-600 font-medium", act: true };
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
  const names = [...new Set(keys.map((k) => deckFamilyOf(k)).filter(Boolean))];
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
    <span className="px-2 text-[12px] font-medium leading-[19px] text-[var(--color-text-secondary)]">
      {label}
    </span>
  );
}

/* One workflow — a spaced, bordered row on a single line, matching the goals
   and dashboards lists. The longer "what it automates" copy lives inside the
   workflow rather than on this page. */
function Row({ wf, onOpen, onReview, onDeploy }) {
  const st = operationalStatus(wf);
  return (
    <div
      onClick={onOpen}
      className="grid items-center w-full px-3 min-h-[58px] py-2.5 shrink-0 bg-white border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all cursor-pointer"
      style={{ gridTemplateColumns: COLS }}
    >
      {/* One sentence per row. Section 1 describes a card carrying both the
          problem and the output; in a table that meant two truncated sentences
          side by side, so the problem lives on the workflow page where it has
          room to be read. */}
      <span className="flex items-center min-w-0 px-2">
        <span className="text-[12px] text-[var(--text-primary)] leading-snug">{wf.name}</span>
      </span>

      {/* Channel is metadata about the workflow, not part of its name, so it
          gets the column the header already promises. */}
      <span className="flex items-center gap-1.5 min-w-0 px-2">
        <SourceIcon name={platformOf(wf.platform).short} size={14} />
        <span className="text-[12px] text-[#757A97]">{platformOf(wf.platform).short}</span>
      </span>

      <span className="px-2">
        <AgentSummary steps={wf.steps} />
      </span>

      <span className="px-2 min-w-0 text-[12px] text-[var(--text-primary)] leading-snug">
        {wf.customerOutput || wf.deliverable}
      </span>

      {/* A row that says it is waiting on you links straight to what it is
          waiting on. The underline inherits the status colour, so the link does
          not introduce a second accent next to the one carrying the meaning. */}
      <span className="px-2 flex items-center min-w-0">
        {st.act && onReview ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReview(); }}
            className={cn(
              // the tone sits on the button so currentColor — and therefore the
              // underline — is the status colour, not the inherited default
              "inline-flex items-center gap-1.5 min-w-0 bg-transparent border-none p-0 cursor-pointer",
              "hover:underline decoration-current underline-offset-2",
              st.tone,
            )}
          >
            <st.icon size={14} className="shrink-0" />
            <span className="text-[12px] leading-snug">{st.label}</span>
          </button>
        ) : wf.status === "available" && onDeploy ? (
          <Button
            variant="secondary"
            size="sm"
            label="Deploy workflow"
            onClick={(e) => { e.stopPropagation(); onDeploy(); }}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <st.icon size={14} className={cn("shrink-0", st.tone)} />
            <span className={cn("text-[12px] leading-snug", st.tone)}>{st.label}</span>
          </span>
        )}
      </span>

      <span className="flex justify-center text-[var(--text-muted)]">
        <CaretRight size={15} />
      </span>
    </div>
  );
}

/* ── The assessment, spelled out as a workflow.
   Two kinds of customers arrive at this tab: those who already know where the
   pipeline problem is and pick a workflow above, and those who don't. This
   panel exists for the second kind — so it leads with their question, carries
   the full spec like any other workflow, and stays visually distinct (tinted,
   not muted) because it is the recommended first step, not a seventh use case. ── */
const ASSESSMENT = {
  name: "End-to-end assessment of your paid-media engine",
  question: "Don\u2019t know which workflows to deploy?",
  line:
    "Run the full assessment. Petavue assesses campaign delivery, budgets, audience, and creatives across every connected paid-media platform, and recommends which agents to deploy to streamline your paid-media engine.",
  output: "A downloadable assessment with the evidence and a recommended deployment order.",
  reads: ["Google Ads", "LinkedIn Ads", "Meta Ads", "HubSpot", "GA4"],
  route: "/workflows/paid-media-assessment",
};

function AssessmentPanel({ onOpen }) {
  return (
    <div
      onClick={onOpen}
      className="flex flex-col gap-3 p-5 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] cursor-pointer transition-shadow hover:shadow-[0_4px_14px_-2px_rgba(54,97,237,0.18)]"
    >
      <div className="flex items-center gap-2">
        <ClipboardText size={16} className="shrink-0 text-[var(--color-primary-600)]" />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-primary-600)]">
          {ASSESSMENT.question}
        </span>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[12px] text-[#757A97]">
          <i className="w-[6px] h-[6px] rounded-full bg-[var(--color-grey-300)]" />
          Available · All channels
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] font-medium text-[var(--text-primary)]">{ASSESSMENT.name}</span>
        <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)] max-w-[860px]">{ASSESSMENT.line}</p>
        <p className="m-0 text-[12px] leading-relaxed text-[#757A97] max-w-[860px]">
          <span className="font-medium text-[var(--text-primary)]">You get: </span>
          {ASSESSMENT.output}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 border-solid border-x-0 border-b-0 border-t border-t-[var(--color-primary-100)]">
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="text-[12px] text-[#757A97] shrink-0">Assesses</span>
          {ASSESSMENT.reads.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 text-[12px] text-[var(--text-primary)]">
              <SourceIcon name={r} size={13} />
              {r}
            </span>
          ))}
        </span>
        <Button
          variant="primary"
          size="sm"
          label="Run the full assessment"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        />
      </div>
    </div>
  );
}


const TABS = [
  { k: "deployed", label: "Deployed" },
  { k: "available", label: "Available" },
];

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "available" ? "available" : "deployed");

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });
  // Deploying from the row activates the workflow and lands you on the
  // Deployed tab, where it reads Running: its first run is in flight.
  const deploy = useMutation({
    mutationFn: (id) => apiPost(`/api/agent-workflows/${id}/activate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-workflows"] });
      setTab("deployed");
      toast.success("Deployed. The first run is starting now.");
    },
  });
  const workflows = data?.workflows || [];

  const isDeployed = (w) => w.status !== "available";
  const counts = {
    deployed: workflows.filter(isDeployed).length,
    available: workflows.filter((w) => !isDeployed(w)).length,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows
      .filter((w) => (tab === "deployed" ? isDeployed(w) : !isDeployed(w)))
      .filter((w) => !q || `${w.name} ${w.automates} ${w.deliverable}`.toLowerCase().includes(q));
  }, [workflows, search, tab]);

  // The assessment belongs with the workflows still to deploy, and never
  // while a search is narrowing the list.
  const showAssessment = !search.trim() && tab !== "deployed";

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
                        <span className="text-[12px] leading-relaxed text-[#757A97]">
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
                          label={tab === "available" ? "See deployed workflows" : "See available workflows"}
                          onClick={() => setTab(tab === "available" ? "deployed" : "available")}
                        />
                      )}
                    </div>
                  ) : (
                    filtered
                      .slice()
                      .sort((a, b) => (a.n || 0) - (b.n || 0))
                      .map((wf) => (
                        <Row
                          key={wf.id}
                          wf={wf}
                          onOpen={() => navigate(`/workflows/${wf.id}`)}
                          onReview={() => navigate(`/recommendations?workflow=${wf.id}`)}
                          onDeploy={() => deploy.mutate(wf.id)}
                        />
                      ))
                  )}
                </div>

                {showAssessment && (
                  <div className="mt-5 flex flex-col gap-3">
                    <AssessmentPanel onOpen={() => navigate(ASSESSMENT.route)} />
                    <button
                      type="button"
                      onClick={() => toast.success("Request noted. The Petavue team will follow up to scope it with you.")}
                      className="flex flex-col items-center justify-center gap-1 w-full py-5 px-4 rounded-xl border border-dashed border-[var(--color-grey-200)] bg-transparent cursor-pointer transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] group"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--color-primary-600)] transition-colors">
                        <Plus size={14} />
                        Request a custom workflow
                      </span>
                      <span className="text-[12px] text-[var(--text-muted)]">
                        Have a recurring paid-media analysis these don’t cover? Petavue builds it as a workflow.
                      </span>
                    </button>
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
