import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CaretRight, CheckCircle, CircleNotch, Download, Play, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/ui";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import SourceIcon from "../../components/SourceIcon";
import WorkflowGlyph from "../../components/WorkflowGlyph";

/**
 * End-to-end assessment of your paid-media engine: for customers who don't
 * know which workflows to deploy. One full pass over delivery, budgets,
 * audience, and creatives, ending in a recommended deployment order.
 *
 * It exists here because every one of the six workflows is live in this demo,
 * so none of them can show "Available → Deploy → readiness check → first run".
 * Part II describes the assessment as running like any other workflow, so it
 * carries that flow instead.
 *
 * There is no agent canvas on this page. The handoff never defines a pipeline
 * for the assessment, and inventing three agents with made-up job titles would
 * put names on screen that nobody has approved.
 */

const LABEL = "text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

// The sources the assessment reads. Same five the Data Hub lists.
const SOURCES = [
  { name: "Google Ads", note: "6 campaigns, 90 days of history" },
  { name: "LinkedIn Ads", note: "4 campaigns, 30 days of demographic delivery" },
  { name: "Meta Ads", note: "No active spend in the review window" },
  { name: "HubSpot", note: "Contacts, deals and lifecycle stages" },
  { name: "GA4", note: "Sessions and high-intent page events" },
];

const STAGES = ["idle", "checking", "ready", "running", "done"];

export default function AssessmentPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("idle");
  const [checked, setChecked] = useState(0);

  const { data } = useQuery({ queryKey: ["agent-workflows"], queryFn: () => apiGet("/api/agent-workflows") });
  const workflows = data?.workflows || [];

  // The recommended deployment order is derived from what the workflows are
  // actually waiting on, not written by hand — so it can never contradict the
  // decision queue sitting one click away.
  const order = [...workflows].sort((a, b) => (b.pending || 0) - (a.pending || 0)).slice(0, 3);

  // The readiness check walks the sources one at a time. It is the step that
  // makes "deploy" mean something: nothing runs until the data behind it is
  // verified.
  useEffect(() => {
    if (stage !== "checking") return;
    if (checked >= SOURCES.length) {
      const t = setTimeout(() => setStage("ready"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setChecked((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [stage, checked]);

  useEffect(() => {
    if (stage !== "running") return;
    const t = setTimeout(() => setStage("done"), 2600);
    return () => clearTimeout(t);
  }, [stage]);

  const deployed = STAGES.indexOf(stage) >= STAGES.indexOf("ready");

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/workflows")}
              className="shrink-0 text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Workflows
            </button>
            <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
            <span className="text-[16px] leading-[24px] font-medium truncate text-grey-900">End-to-end assessment of your paid-media engine</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border text-[12px] font-medium",
              stage === "done"
                ? "bg-green-50 border-green-200 text-green-700"
                : deployed
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-grey-50 border-grey-200 text-[var(--text-secondary)]",
            )}
          >
            <i
              className={cn(
                "w-[6px] h-[6px] rounded-full shrink-0",
                stage === "done" ? "bg-green-500" : deployed ? "bg-blue-500" : "bg-[var(--color-grey-300)]",
              )}
            />
            {stage === "done" ? "Complete" : stage === "running" ? "Running" : deployed ? "Deployed" : "Available"}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-grey-50 p-4">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-3 bg-white rounded-xl border border-[var(--color-grey-100)] p-5">
              <h3 className="m-0 text-[14px] font-semibold text-[var(--text-primary)]">What this does</h3>
              <p className="m-0 text-[12px] leading-relaxed text-[var(--text-primary)]">
                For teams that don’t yet know which workflows to deploy. Petavue assesses campaign delivery, budgets,
                audience, and creatives across every connected paid-media platform, and recommends which agents to
                deploy to streamline your paid-media engine.
              </p>
              <p className="m-0 text-[12px] leading-relaxed text-[#757A97]">
                You receive a downloadable assessment with evidence and a recommended deployment order.
              </p>
            </div>

            {/* Data readiness. Deploying is gated on this, because a workflow
                that runs on unverified data produces recommendations nobody
                should approve. */}
            <div className="flex flex-col gap-3 bg-white rounded-xl border border-[var(--color-grey-100)] p-5">
              <div className="flex items-center gap-2">
                <span className={LABEL}>Data readiness</span>
                {stage === "checking" && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-primary-600)]">
                    <CircleNotch size={12} className="animate-spin" /> Checking
                  </span>
                )}
                {deployed && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-green-700">
                    <CheckCircle size={12} weight="fill" /> All sources verified
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                {SOURCES.map((s, i) => {
                  const done = deployed || i < checked;
                  const busy = stage === "checking" && i === checked;
                  return (
                    <div
                      key={s.name}
                      className="flex items-center gap-2.5 py-2 border-b border-dashed border-[var(--color-grey-100)] last:border-b-0"
                    >
                      <SourceIcon name={s.name} size={14} />
                      <span className="text-[12px] text-[var(--text-primary)] w-[120px] shrink-0">{s.name}</span>
                      <span className="flex-1 min-w-0 text-[12px] leading-snug text-[#757A97]">{s.note}</span>
                      <span className="shrink-0 text-[12px]">
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle size={13} weight="fill" /> Ready
                          </span>
                        ) : busy ? (
                          <CircleNotch size={13} className="animate-spin text-[var(--color-primary-500)]" />
                        ) : (
                          <span className="text-[var(--text-muted)]">Not checked</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deploy, then the first run. Two steps, because deploying is not
                the same as having a result. */}
            <div className="flex flex-col gap-3 bg-white rounded-xl border border-[var(--color-grey-100)] p-5">
              {stage === "idle" && (
                <>
                  <p className="m-0 text-[12px] text-[#757A97]">
                    Deploying runs the readiness check first. Nothing is analysed until every source it reads is
                    verified.
                  </p>
                  <div>
                    <Button variant="primary" size="md" icon={ShieldCheck} label="Deploy assessment" onClick={() => setStage("checking")} />
                  </div>
                </>
              )}
              {stage === "checking" && (
                <p className="m-0 text-[12px] text-[#757A97]">Verifying the sources this assessment reads…</p>
              )}
              {stage === "ready" && (
                <>
                  <p className="m-0 text-[12px] text-[var(--text-primary)]">
                    Deployed. Every source is verified, so the first run can start now.
                  </p>
                  <div>
                    <Button variant="primary" size="md" icon={Play} iconWeight="fill" label="Run the first assessment" onClick={() => setStage("running")} />
                  </div>
                </>
              )}
              {stage === "running" && (
                <p className="m-0 inline-flex items-center gap-2 text-[12px] text-[var(--text-primary)]">
                  <CircleNotch size={14} className="animate-spin text-[var(--color-primary-500)]" />
                  Reviewing 10 campaigns across Google Ads and LinkedIn Ads against your selected KPI…
                </p>
              )}
              {stage === "done" && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-green-700">
                    <CheckCircle size={14} weight="fill" /> First run complete
                  </span>
                  <p className="m-0 text-[12px] text-[#757A97]">
                    The assessment reviewed 10 campaigns and ranked the workflows by what they are currently holding for
                    your decision.
                  </p>
                  <div className="flex flex-col gap-2">
                    <span className={LABEL}>Recommended deployment order</span>
                    {order.map((w, i) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => navigate(`/workflows/${w.id}`)}
                        className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border border-[var(--color-grey-100)] bg-white hover:bg-primary-50 cursor-pointer transition-colors"
                      >
                        <span className="grid place-items-center w-5 h-5 shrink-0 rounded-md bg-grey-100 text-[12px] tabular-nums text-[var(--text-secondary)]">
                          {i + 1}
                        </span>
                        <WorkflowGlyph size={14} className="shrink-0 text-[var(--text-muted)]" />
                        <span className="flex-1 min-w-0 text-[12px] text-[var(--text-primary)]">{w.name}</span>
                        <span className="shrink-0 text-[12px] text-[#757A97]">
                          {w.pending} waiting
                        </span>
                        <CaretRight size={13} className="shrink-0 text-[var(--text-muted)]" />
                      </button>
                    ))}
                  </div>
                  <div>
                    <Button variant="secondary" size="md" icon={Download} label="Download the assessment" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
