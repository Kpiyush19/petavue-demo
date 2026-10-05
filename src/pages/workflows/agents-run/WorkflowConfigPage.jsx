import { useNavigate } from "react-router-dom";
import { CaretRight, CheckCircle, Cpu, Eye, Hash, ListChecks, SquaresFour, UsersThree } from "@phosphor-icons/react";
import { Button, Toggle } from "@/ui";
import SourceIcon from "../../../components/SourceIcon";
import SlackChannelPicker from "../../../components/shared/SlackChannelPicker";
import { ROI_DASHBOARD_PATH, ROI_REPORT_SESSION_ID, ROI_TITLE } from "../../../mocks/paidMediaRoi";
import AgentsSetup from "./AgentsSetup";
import { NEXT_RUN, REVIEW_PATH, RUN_DATE, SCHEDULE, WORKFLOW_NAME } from "./data";
import { plural } from "./parts";
import useRunReviewStore from "./useRunReviewStore";
import useWorkflowConfigStore from "./useWorkflowConfigStore";
import "./workflowConfig.css";

/* The published workflow's own page. It shows what the workflow is set up to
   do, in the order a run does it: refresh the dashboard, run the agents, send
   the Slack alert. Everything here can be edited. When a run's recommendations
   are waiting, the draft is at the top and opens in chat for review. */

const REVIEW_CHOICES = [
  { key: "pause", icon: Eye, title: "Pause for my review", desc: "Recommendations stay private until you publish them." },
  { key: "publish", icon: UsersThree, title: "Publish straight", desc: "Each run goes to the Recommendations page without a review." },
];

function Section({ icon: Icon, title, desc, on, onToggle, children }) {
  const open = on !== false;
  return (
    <section className="wf-config__section">
      <header className="wf-config__section-head">
        <span className={`wf-config__section-icon${open ? " wf-config__section-icon--on" : ""}`}>
          <Icon size={18} />
        </span>
        <div className="wf-config__section-text">
          <h2 className="wf-config__section-title">{title}</h2>
          <p className="wf-config__section-desc">{desc}</p>
        </div>
        {onToggle && <Toggle checked={open} onChange={() => onToggle(!open)} size="lg" />}
      </header>
      {open && children && <div className="wf-config__section-body">{children}</div>}
    </section>
  );
}

// The latest run's recommendations: waiting, published, or rejected.
function Draft() {
  const navigate = useNavigate();
  const outcome = useRunReviewStore((s) => s.outcome);
  const approvedCount = useRunReviewStore((s) => s.approvedCount);
  const waiting = useRunReviewStore((s) => s.recs.filter((r) => r.pending && !s.left[r.id]).length);

  if (outcome === "approved") {
    return (
      <div className="wf-config__draft wf-config__draft--done">
        <CheckCircle size={20} weight="fill" className="wf-config__draft-icon" aria-hidden="true" />
        <div className="wf-config__draft-text">
          <p className="wf-config__draft-title">Recommendations published</p>
          <p className="wf-config__draft-desc">
            {plural(approvedCount, "change")} from the {RUN_DATE} run {approvedCount === 1 ? "is" : "are"} on the Recommendations page.
          </p>
        </div>
        <Button variant="secondary" size="md" label="Open Recommendations" onClick={() => navigate("/recommendations")} />
      </div>
    );
  }
  if (outcome === "rejected") {
    return (
      <div className="wf-config__draft wf-config__draft--quiet">
        <ListChecks size={20} className="wf-config__draft-icon" aria-hidden="true" />
        <div className="wf-config__draft-text">
          <p className="wf-config__draft-title">The {RUN_DATE} run was rejected</p>
          <p className="wf-config__draft-desc">Nothing was published. The next run, on {NEXT_RUN}, prepares a new draft.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="wf-config__draft">
      <ListChecks size={20} className="wf-config__draft-icon" aria-hidden="true" />
      <div className="wf-config__draft-text">
        <p className="wf-config__draft-title">Recommendation draft</p>
        <p className="wf-config__draft-desc">
          {plural(waiting, "change")} from the {RUN_DATE} run {waiting === 1 ? "is" : "are"} waiting for your review. They stay private until you publish them.
        </p>
      </div>
      <Button variant="primary" size="md" label="Review recommendations" icon={CaretRight} iconPosition="suffix" iconWeight="bold" onClick={() => navigate(REVIEW_PATH)} />
    </div>
  );
}

const SOURCES = ["Google Ads", "LinkedIn Ads", "Meta Ads", "Salesforce"];
// Earlier runs, newest first. The latest one is added from the review's state.
const EARLIER_RUNS = [
  { at: "Sep 28", result: "4 changes published" },
  { at: "Sep 21", result: "3 changes published" },
  { at: "Sep 14", result: "No changes drafted" },
];

function RailGroup({ label, children }) {
  return (
    <div className="wf-config__rail-group">
      <h3 className="wf-config__rail-label">{label}</h3>
      {children}
    </div>
  );
}

function RailRow({ k, children }) {
  return (
    <div className="wf-config__rail-row">
      <span className="wf-config__rail-key">{k}</span>
      <span className="wf-config__rail-value">{children}</span>
    </div>
  );
}

// The facts about this workflow that are not settings: its last run, its
// schedule, what it reads and where its results go.
function Rail({ slackOn, slackTargets }) {
  const outcome = useRunReviewStore((s) => s.outcome);
  const approvedCount = useRunReviewStore((s) => s.approvedCount);
  const drafted = useRunReviewStore((s) => s.recs.filter((r) => r.pending).length);
  const status = outcome === "approved" ? "Published" : outcome === "rejected" ? "Rejected" : "Waiting for your review";
  const latest = outcome === "approved" ? `${plural(approvedCount, "change")} published` : outcome === "rejected" ? "Rejected" : "Needs review";

  return (
    <aside className="wf-config__rail">
      <RailGroup label="Latest run">
        <RailRow k="Ran">{RUN_DATE}, 6:00 AM</RailRow>
        <RailRow k="Status">
          <span className={`wf-config__status wf-config__status--${outcome || "waiting"}`}>{status}</span>
        </RailRow>
        <RailRow k="Agents">5 of 5 finished · 6m 36s</RailRow>
        <RailRow k="Drafted">{plural(drafted, "change")}</RailRow>
      </RailGroup>

      <RailGroup label="Schedule">
        <RailRow k="Runs">{SCHEDULE}</RailRow>
        <RailRow k="Next run">{NEXT_RUN}</RailRow>
      </RailGroup>

      <RailGroup label="Reads from">
        <ul className="wf-config__rail-list">
          {SOURCES.map((name) => (
            <li key={name}>
              <SourceIcon name={name} size={14} />
              {name}
            </li>
          ))}
        </ul>
      </RailGroup>

      <RailGroup label="Sends results to">
        <ul className="wf-config__rail-list">
          <li><SquaresFour size={14} /> Dashboard · {ROI_TITLE}</li>
          <li><ListChecks size={14} /> Recommendations page</li>
          {slackOn && slackTargets.length > 0 && <li><Hash size={14} /> Slack · {slackTargets.join(", ")}</li>}
        </ul>
      </RailGroup>

      <RailGroup label="Run history">
        <ul className="wf-config__runs">
          <li>
            <span>{RUN_DATE}</span>
            <span className={outcome ? "" : "wf-config__runs-open"}>{latest}</span>
          </li>
          {EARLIER_RUNS.map((r) => (
            <li key={r.at}>
              <span>{r.at}</span>
              <span>{r.result}</span>
            </li>
          ))}
        </ul>
      </RailGroup>
    </aside>
  );
}

export default function WorkflowConfigPage() {
  const navigate = useNavigate();
  const c = useWorkflowConfigStore();
  const slackTargets = [...c.slackChannels.map((ch) => `#${ch.name}`), ...c.slackUsers.map((u) => `@${u.real_name || u.name}`)];

  const openDashboard = () =>
    navigate(`/chat/${ROI_REPORT_SESSION_ID}`, { state: { openArtifact: { path: ROI_DASHBOARD_PATH, title: ROI_TITLE, contentType: "html" } } });

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header: the same bar every page in the app uses. */}
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/workflows")}
              aria-label="Back to workflows"
              className="shrink-0 text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Workflows
            </button>
            <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
            <span className="text-[16px] leading-[24px] font-medium truncate text-grey-900">{WORKFLOW_NAME}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="wf-config__live">Live</span>
            <Button variant="primary" size="md" label={c.dirty ? "Save changes" : c.savedAt ? "Saved" : "Save changes"} disabled={!c.dirty} onClick={c.save} />
          </div>
        </div>

        {/* No outer card: the sections sit straight on the page background. */}
        <div className="w-full flex overflow-x-auto bg-[var(--color-grey-50)]" style={{ height: "calc(100% - 60px)" }}>
          <div className="flex flex-col h-full w-full overflow-hidden min-w-[800px]">
            <div className="w-full h-full overflow-y-auto p-6">
              <div className="wf-config">
                <Draft />

                <div className="wf-config__columns">
                <div className="wf-config__main">
                <div className="wf-config__group">
                  <h1 className="wf-config__heading">Configuration</h1>
                  <p className="wf-config__sub">What this workflow does on every run, in order. Changes apply from the next run.</p>
                </div>

                <Section
                  icon={SquaresFour}
                  title="Publish dashboard"
                  desc={`The Measurement agent repeats the report's verified steps and refreshes “${ROI_TITLE}” before anything else runs.`}
                >
                  <div className="wf-config__row">
                    <span className="wf-config__row-name">{ROI_TITLE}</span>
                    <span className="wf-config__row-meta">7 sections · last refreshed {RUN_DATE}, 6:00 AM</span>
                    <Button variant="secondary" size="md" label="View dashboard" onClick={openDashboard} />
                  </div>
                </Section>

                <Section
                  icon={Cpu}
                  title="Agents"
                  desc="After each refresh, agents study the numbers and draft recommendations. They run in the order shown, each starting from what the ones before it did."
                  on={c.agentsOn}
                  onToggle={c.setAgentsOn}
                >
                  <AgentsSetup
                    agents={c.agents}
                    setAgents={c.setAgents}
                    reviewChoice={
                      <div className="wf-config__choices" role="radiogroup" aria-label="Who sees the recommendations first?">
                        {REVIEW_CHOICES.map((r) => (
                          <button
                            key={r.key}
                            type="button"
                            role="radio"
                            aria-checked={c.review === r.key}
                            className={`wf-config__choice${c.review === r.key ? " wf-config__choice--on" : ""}`}
                            onClick={() => c.setReview(r.key)}
                          >
                            <r.icon size={20} weight="duotone" className="wf-config__choice-icon" />
                            <span className="wf-config__choice-text">
                              <span className="wf-config__choice-title">{r.title}</span>
                              <span className="wf-config__choice-desc">{r.desc}</span>
                            </span>
                            <span className="wf-config__choice-dot" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    }
                  />
                </Section>

                <Section
                  icon={Hash}
                  title="Slack alert"
                  desc={
                    slackTargets.length
                      ? `Posts a summary and a link to ${slackTargets.join(" and ")} after every run.`
                      : "Posts a summary and a link after every run."
                  }
                  on={c.slackOn}
                  onToggle={c.setSlackOn}
                >
                  <p className="wf-config__label">Where should it go?</p>
                  <SlackChannelPicker
                    selectedChannels={c.slackChannels}
                    onChannelsChange={c.setSlackChannels}
                    selectedDmUsers={c.slackUsers}
                    onDmUsersChange={c.setSlackUsers}
                  />
                </Section>
                </div>

                <Rail slackOn={c.slackOn} slackTargets={slackTargets} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
