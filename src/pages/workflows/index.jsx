import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, CaretRight, Plus, ListChecks, Question, CircleDashed,
  PauseCircle, XCircle, CalendarBlank, CircleNotch, ClipboardText,
  ChartBar, HourglassMedium,
} from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { toast } from "sonner";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf, AGENTS, deckFamilyOf } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";
import WorkflowGlyph from "../../components/WorkflowGlyph";
import { NEXT_RUN, REVIEW_PATH, WORKFLOW_NAME, WORKFLOW_PATH, makeAgents } from "./agents-run/data";
import useRunReviewStore from "./agents-run/useRunReviewStore";
import "./agents-run/runReview.css";

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
    label: wf.nextRun ? `Live \u00b7 Next run ${wf.nextRun}` : "Live \u00b7 First run: Running",
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
function Row({ wf, onOpen, onReview, onDeploy, deploying }) {
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
        ) : deploying ? (
          <span className="inline-flex items-center gap-1.5 min-w-0 text-blue-700">
            <CircleNotch size={14} className="shrink-0 animate-spin" />
            <span className="text-[12px] leading-snug">Deploying…</span>
          </span>
        ) : wf.status === "available" && onDeploy ? (
          <Button
            variant="secondary"
            size="md"
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

/* The workflow published from the Paid Media ROI report. It is a
   workflow like the six above it, so it sits in the same list as one more row.
   What differs is its status: its agents draft recommendations that wait for
   the person who built it, so the row says "Needs review" until they decide. */
const PUBLISHED = {
  name: WORKFLOW_NAME,
  channels: ["Google Ads", "LinkedIn Ads", "Meta Ads"],
  agents: makeAgents().map((a) => a.name),
  deliverable:
    "The workflow refreshes the Paid Media ROI dashboard every Monday and drafts budget, bid and sales hand-off changes for you to review.",
};

function PublishedRow({ waiting, onOpen, onReview }) {
  return (
    <div
      onClick={onOpen}
      className="grid items-center w-full px-3 min-h-[58px] py-2.5 shrink-0 bg-white border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all cursor-pointer"
      style={{ gridTemplateColumns: COLS }}
    >
      <span className="flex items-center min-w-0 px-2">
        <span className="text-[12px] text-[var(--text-primary)] leading-snug">{PUBLISHED.name}</span>
      </span>

      <span className="flex items-center gap-1.5 min-w-0 px-2">
        {PUBLISHED.channels.map((ch) => (
          <SourceIcon key={ch} name={ch} size={14} named />
        ))}
      </span>

      <span className="px-2">
        <Tooltip title={PUBLISHED.agents.join("  \u00b7  ")} placement="top">
          <span className="text-[12px] text-[#757A97] tabular-nums">{PUBLISHED.agents.length} agents</span>
        </Tooltip>
      </span>

      <span className="px-2 min-w-0 text-[12px] text-[var(--text-primary)] leading-snug">{PUBLISHED.deliverable}</span>

      <span className="px-2 flex items-center min-w-0">
        {waiting ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onReview(); }}
            className="inline-flex items-center gap-1.5 min-w-0 bg-transparent border-none p-0 cursor-pointer hover:underline decoration-current underline-offset-2 text-amber-600 font-medium"
          >
            <HourglassMedium size={14} className="shrink-0" />
            <span className="text-[12px] leading-snug">Needs review</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <CalendarBlank size={14} className="shrink-0 text-[var(--text-secondary)]" />
            <span className="text-[12px] leading-snug text-[var(--text-secondary)]">Live · Next run {NEXT_RUN}</span>
          </span>
        )}
      </span>

      <span className="flex justify-center text-[var(--text-muted)]">
        <CaretRight size={15} />
      </span>
    </div>
  );
}

/* ── The assessment, one quiet row under the list.
   It exists for the customer who doesn't know which workflow to pick, but it
   must not compete with the six workflows above it — so no tint, no shouting
   eyebrow: a name, one sentence, and a small button. ── */
const ASSESSMENT = {
  name: "End-to-end assessment of your paid media engine",
  line:
    "Don\u2019t know which workflows to deploy? Petavue assesses campaign delivery, budget allocation, audience quality, and conversion tracking across Google Ads, LinkedIn Ads, and Meta Ads, joined to HubSpot and GA4, and recommends a deployment order for the six workflows.",
  route: "/workflows/paid-media-assessment",
};

/* A second quiet row: the way into building a workflow of your own. It opens
   the chat that built the Paid Media ROI report, with its dashboard beside
   it, which is where Verify & Publish starts. */
const REPORT = {
  name: "Publish a workflow from a report",
  line:
    "Open the Paid Media ROI report in chat. From its dashboard, choose Verify & Publish to run it on a schedule.",
  route: "/chat/paid-media-roi",
  artifact: { path: "output/dashboard/paid_media_roi.html", title: "Paid Media ROI", contentType: "html" },
};

function ReportPanel({ onOpen }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[var(--color-grey-100)] rounded-lg">
      <ChartBar size={16} className="shrink-0 text-[var(--text-muted)]" />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[12px] font-medium text-[var(--text-primary)] leading-snug">{REPORT.name}</span>
        <span className="text-[12px] text-[#757A97] leading-snug">{REPORT.line}</span>
      </span>
      <Button variant="secondary" size="md" label="Open the report" onClick={onOpen} />
    </div>
  );
}

function AssessmentPanel({ onOpen }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[var(--color-grey-100)] rounded-lg">
      <ClipboardText size={16} className="shrink-0 text-[var(--text-muted)]" />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[12px] font-medium text-[var(--text-primary)] leading-snug">{ASSESSMENT.name}</span>
        <span className="text-[12px] text-[#757A97] leading-snug">{ASSESSMENT.line}</span>
      </span>
      <Button variant="secondary" size="md" label="Run the assessment" onClick={onOpen} />
    </div>
  );
}

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  // "all" shows the six workflows; "review" only the runs waiting for you.
  const [view, setView] = useState("all");
  const waiting = useRunReviewStore((s) => (s.outcome ? 0 : 1));
  // ids mid-deploy: the row shows Deploying between the press and Running
  const [deployingIds, setDeployingIds] = useState(() => new Set());

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: () => apiGet("/api/agent-workflows"),
  });
  // Deploying happens in place: the status cell reads Deploying for a beat,
  // then the refreshed row reads Running — its first run is in flight.
  const deploy = useMutation({
    mutationFn: async (id) => {
      setDeployingIds((prev) => new Set(prev).add(id));
      await new Promise((r) => setTimeout(r, 1400));
      return apiPost(`/api/agent-workflows/${id}/activate`, {});
    },
    onSettled: (_r, _e, id) => {
      qc.invalidateQueries({ queryKey: ["agent-workflows"] });
      setDeployingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    },
    onSuccess: () => toast.success("Deployed. The first run is starting now."),
  });
  // The published LinkedIn workflow has its own row above; the API entry
  // exists for the Recommendations page lookups.
  const workflows = (data?.workflows || []).filter((w) => !w.published);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter(
      (w) => !q || `${w.name} ${w.automates} ${w.deliverable}`.toLowerCase().includes(q),
    );
  }, [workflows, search]);

  // The published LinkedIn workflow is searched like the others.
  const publishedMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q || `${PUBLISHED.name} ${PUBLISHED.channels.join(" ")} ${PUBLISHED.deliverable}`.toLowerCase().includes(q);
  }, [search]);

  // The assessment sits under the list, except while a search is narrowing it.
  const showAssessment = !search.trim();

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
          {/* Heading bar — the Dashboards pattern: 56px, label + solid count
              chip on the left, search and the custom-workflow request on the
              right. Deployed vs available is a status, not a view, so there
              are no tabs: one list, six workflows. */}
          <div className="flex items-center justify-between h-14 shrink-0 w-full border-b border-[var(--color-grey-100)] bg-white">
            {/* Two views of the same list: everything, or only what is waiting
                for the person who built it. */}
            <div className="wf-filters" role="tablist" aria-label="Filter workflows">
              <button type="button" role="tab" aria-selected={view === "all"} className={cn("wf-filter", view === "all" && "wf-filter--on")} onClick={() => setView("all")}>
                All workflows <span className="wf-filter__count">{filtered.length + (publishedMatches ? 1 : 0)}</span>
              </button>
              <button type="button" role="tab" aria-selected={view === "review"} className={cn("wf-filter", view === "review" && "wf-filter--on")} onClick={() => setView("review")}>
                Needs review <span className="wf-filter__count">{waiting}</span>
              </button>
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
              <Button
                variant="secondary"
                size="md"
                icon={Plus}
                label="Request a custom workflow"
                onClick={() => toast.success("Request noted. The Petavue team will follow up to scope it with you.")}
              />
            </div>
          </div>

            <div className="w-full flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col w-full px-4 py-4">

                {/* A run whose agents drafted recommendations waits here until
                    its creator has reviewed it. Nothing reaches the
                    Recommendations page before that. */}
                {view === "review" && waiting === 0 && (
                  <div className="wf-empty">
                    <p className="wf-empty__title">Nothing is waiting for your review</p>
                    <p className="wf-empty__text">A run shows up here when its agents have drafted recommendations for you to approve.</p>
                  </div>
                )}

                {/* Floating header — no ground of its own, like the Data Hub's
                    table header. The rows below are separate cards. */}
                <div className={cn("flex flex-col gap-2", view === "review" && waiting === 0 && "hidden")}>
                  <div
                    className="grid w-full items-center px-3 py-2"
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <HeaderCell label="Workflow" />
                    <HeaderCell label="Channel" />
                    <HeaderCell label="Families" />
                    <HeaderCell label="Deliverables" />
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
                  ) : filtered.length === 0 && !publishedMatches ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                      <span className="grid place-items-center w-11 h-11 rounded-full bg-grey-50 border border-[var(--color-grey-100)]">
                        <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                      </span>
                      <span className="flex flex-col gap-1 max-w-[380px]">
                        <span className="text-[14px] font-medium text-[var(--text-primary)]">
                          {`No workflows match \u201c${search.trim()}\u201d`}
                        </span>
                        <span className="text-[12px] leading-relaxed text-[#757A97]">
                          Try a channel, an outcome, or part of the workflow name.
                        </span>
                      </span>
                      <Button variant="secondary" size="sm" label="Clear search" onClick={() => setSearch("")} />
                    </div>
                  ) : (
                    <>
                      {publishedMatches && (view === "all" || waiting > 0) && (
                        <PublishedRow waiting={waiting > 0} onOpen={() => navigate(WORKFLOW_PATH)} onReview={() => navigate(REVIEW_PATH)} />
                      )}
                      {view === "all" &&
                        filtered
                          .slice()
                          .sort((a, b) => (a.n || 0) - (b.n || 0))
                          .map((wf) => (
                            <Row
                              key={wf.id}
                              wf={wf}
                              deploying={deployingIds.has(wf.id)}
                              onOpen={() => navigate(`/workflows/${wf.id}`)}
                              onReview={() => navigate(`/recommendations?workflow=${wf.id}`)}
                              onDeploy={() => deploy.mutate(wf.id)}
                            />
                          ))}
                    </>
                  )}
                </div>

                {showAssessment && view === "all" && (
                  <div className="mt-5 flex flex-col gap-2">
                    <AssessmentPanel onOpen={() => navigate(ASSESSMENT.route)} />
                    <ReportPanel onOpen={() => navigate(REPORT.route, { state: { openArtifact: REPORT.artifact } })} />
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
