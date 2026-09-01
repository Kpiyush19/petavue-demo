import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { CaretRight, ArrowSquareOut, Lightning, Warning, Eye, CheckCircle } from "@phosphor-icons/react";
import { apiGet } from "../../api";
import { cn } from "../../utils/cn";
import { platformOf } from "../../mocks/agentWorkflows";
import { agentIcon } from "../../components/AgentMark";
import SourceIcon from "../../components/SourceIcon";

/* The agent detail page.
 *
 * Deliberately NOT the shape of a builder product's agent page. A family here
 * is a presentation of contiguous steps inside a workflow — it has no trigger,
 * no schedule and no run history of its own, so there are no tabs for those.
 * What it does have is: jobs, specialists beneath it, the workflows that deploy
 * it, and what it has actually found. The last two are the point: they thread
 * this page to the workflow and the recommendation on either side of it.
 */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
});

const LABEL = "text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

function Section({ title, lead, children, delay, first }) {
  return (
    <motion.section
      {...fadeUp(delay)}
      className={cn("flex flex-col gap-3", !first && "pt-5 mt-5 border-t border-[var(--color-grey-100)]")}
    >
      <h2 className={LABEL}>{title}</h2>
      {lead && <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">{lead}</p>}
      {children}
    </motion.section>
  );
}

function RailRow({ k, v, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[#757A97] shrink-0">{k}</span>
      <span className={cn("text-[12px] text-right", tone || "text-[var(--text-primary)]")}>{v}</span>
    </div>
  );
}

const FINDING_TONE = {
  "act-now": { label: "Act now", cls: "text-rose-600 border-rose-200", icon: Lightning },
  "needs-review": { label: "Review soon", cls: "text-amber-700 border-amber-200", icon: Warning },
  watchlist: { label: "Watch", cls: "text-blue-700 border-blue-200", icon: Eye },
  archived: { label: "Acted", cls: "text-green-600 border-green-200", icon: CheckCircle },
};
function findingTone(f) {
  if (f.status !== "open") return FINDING_TONE.archived;
  if (f.severity === "act-now") return FINDING_TONE["act-now"];
  if ((f.tier || 2) <= 2) return FINDING_TONE["needs-review"];
  return FINDING_TONE.watchlist;
}

export default function AgentDetail() {
  const { key } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["agent", key],
    queryFn: () => apiGet(`/api/agents/${key}`),
  });
  const a = data?.agent;

  if (isLoading) return <div className="w-full h-full bg-grey-50" />;
  if (!a) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 bg-grey-50">
        <p className="text-[14px]">That agent doesn&rsquo;t exist.</p>
        <button
          onClick={() => navigate("/agents")}
          className="text-[13px] text-primary-600 bg-transparent border-none cursor-pointer"
        >
          Back to agents
        </button>
      </div>
    );
  }

  const Icon = agentIcon(a.key);
  const deployed = a.liveCount > 0;

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        {/* Standard page header. */}
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/agents")}
              aria-label="Back to agents"
              className="shrink-0 text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Agents
            </button>
            <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
            <Icon size={20} weight="fill" style={{ color: a.color }} className="shrink-0" />
            <span className="text-[16px] leading-[24px] font-medium truncate text-grey-900">{a.label}</span>
          </div>
        </div>

        {/* Grey-framed scroll area with a white content card — the skills detail pattern. */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-grey-50 p-4">
          <div className="flex flex-col min-h-full w-full bg-white border border-grey-100/50 rounded-xl p-4">
            <div className="flex gap-10 items-start">
              <main className="flex-1 min-w-0 flex flex-col">
                {/* One title. "What it owns" as a label above the answer read as
                    two headings stacked. */}
                <motion.div {...fadeUp(0.04)} className="flex flex-col gap-2">
                  <h1 className="text-[16px] font-medium leading-snug text-[var(--text-primary)]">{a.owns}</h1>
                  <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">{a.blurb}</p>
                </motion.div>

                <Section title="What it does" delay={0.06}>
                  <div className="flex flex-col gap-2">
                    {a.does.map((d) => (
                      <div
                        key={d}
                        className="flex items-start gap-2.5 px-4 py-3 bg-grey-50 border border-grey-100 rounded-lg"
                      >
                        <span
                          className="mt-[6px] w-[5px] h-[5px] rounded-full shrink-0"
                          style={{ background: a.color }}
                        />
                        <span className="text-[12px] leading-snug text-[var(--text-primary)]">{d}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section
                  title={`Specialist agents · ${a.specialists.length}`}
                  lead="The named decisions inside this family. A workflow deploys only the ones its analysis needs."
                  delay={0.1}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {a.specialists.map((sp) => (
                      <span
                        key={sp}
                        className="text-[12px] px-2.5 py-1 rounded-full border"
                        style={{ borderColor: a.color + "55", color: a.color }}
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </Section>

                <Section
                  title={`Where it's deployed · ${a.deployments.length}`}
                  lead={
                    a.deployments.length
                      ? "The workflows that run this family, and what it contributed to each."
                      : undefined
                  }
                  delay={0.14}
                >
                  {a.deployments.length === 0 ? (
                    <p className="text-[12px] text-[#757A97] px-4 py-3 bg-grey-50 border border-grey-100 rounded-lg">
                      No workflow deploys this family yet. It will appear here as soon as one does.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {a.deployments.map((d) => {
                        const live = d.status === "active";
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => navigate(`/workflows/${d.id}?from=/agents/${a.key}`)}
                            className="group flex flex-col gap-1.5 text-left px-4 py-3 bg-white border border-grey-100 rounded-lg cursor-pointer hover:bg-primary-50 hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                {d.name}
                              </span>
                              <span className="shrink-0 text-[11px] text-[#757A97] px-1.5 py-0.5 rounded bg-grey-100">
                                {platformOf(d.platform).short}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 flex items-center gap-1.5 text-[12px] font-medium",
                                  live ? "text-green-600" : "text-[var(--text-muted)]",
                                )}
                              >
                                <i
                                  className={cn(
                                    "w-[6px] h-[6px] rounded-full",
                                    live ? "bg-green-500" : "bg-[var(--color-grey-300)]",
                                  )}
                                />
                                {live ? "Live" : "Available"}
                              </span>
                              <CaretRight
                                size={14}
                                className="ml-auto shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
                              />
                            </span>
                            {d.contribution && (
                              <span className="text-[12px] text-[#757A97] leading-snug">{d.contribution}</span>
                            )}
                            {d.steps.length > 0 && (
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {d.steps.length} {d.steps.length === 1 ? "step" : "steps"}
                                {d.specialistNames.length > 0 && ` · ${d.specialistNames.join(" · ")}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Section>

                <Section
                  title={`What it found · ${a.findings.length}`}
                  lead={
                    a.findings.length
                      ? "Recommendations this family produced. Open one to approve or dismiss it."
                      : undefined
                  }
                  delay={0.18}
                >
                  {a.findings.length === 0 ? (
                    <p className="text-[12px] text-[#757A97] px-4 py-3 bg-grey-50 border border-grey-100 rounded-lg">
                      Nothing found yet. Findings appear here once a workflow running this family produces one.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {a.findings.map((f) => {
                        const t = findingTone(f);
                        return (
                          <button
                            key={f.recId}
                            type="button"
                            onClick={() => navigate(`/recommendations?workflow=${f.workflowId}`)}
                            className="group flex flex-col gap-1.5 text-left px-4 py-3 bg-white border border-grey-100 rounded-lg cursor-pointer hover:bg-primary-50 hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                {f.title}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full border whitespace-nowrap",
                                  t.cls,
                                )}
                              >
                                <t.icon size={10} />
                                {t.label}
                              </span>
                              <CaretRight
                                size={14}
                                className="ml-auto shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
                              />
                            </span>
                            {f.tldr && (
                              <span className="text-[12px] text-[#757A97] leading-snug line-clamp-1">{f.tldr}</span>
                            )}
                            <span className="text-[11px] text-[var(--text-muted)]">from {f.workflowName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Section>

                <div className="h-10" />
              </main>

              {/* Facts only — no schedule and no run history, because a family
                  has neither. Those belong to the workflow. */}
              <motion.aside
                {...fadeUp(0.06)}
                className="w-[300px] shrink-0 self-start sticky top-0 flex flex-col gap-3 p-3 bg-grey-50 border border-grey-100/70 rounded-xl"
              >
                <div
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-lg border",
                    deployed ? "bg-[var(--color-green-bg)] border-[var(--color-green)]/25" : "bg-white border-grey-200",
                  )}
                >
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className={cn("shrink-0 mt-0.5", deployed ? "text-[var(--color-green)]" : "text-[var(--text-muted)]")}
                  />
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                      {deployed ? "Working now" : "Not yet deployed"}
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-snug mt-0.5">
                      {deployed
                        ? `Running in ${a.liveCount} live workflow${a.liveCount > 1 ? "s" : ""}.`
                        : a.workflowCount > 0
                          ? `Configured in ${a.workflowCount} workflow${a.workflowCount > 1 ? "s" : ""}, none of them live yet.`
                          : "No workflow uses this family yet."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-[var(--color-grey-100)]">
                  <span className={LABEL}>At a glance</span>
                  <RailRow k="Specialists" v={a.specialists.length} />
                  <RailRow k="Workflows" v={a.workflowCount || "None"} />
                  <RailRow
                    k="Open findings"
                    v={a.findings.filter((f) => f.status === "open").length || "None"}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-[var(--color-grey-100)]">
                  <span className={LABEL}>Acts on</span>
                  <div className="flex flex-wrap gap-1.5">
                    {a.platforms.map((pl) => (
                      <span
                        key={pl}
                        title={pl}
                        className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded bg-white border border-grey-200 text-[var(--text-secondary)]"
                      >
                        <SourceIcon name={pl} size={14} />
                        {pl}
                      </span>
                    ))}
                  </div>
                </div>

                {a.reads.length > 0 && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-[var(--color-grey-100)]">
                    <span className={LABEL}>Reads</span>
                    <div className="flex flex-col gap-2">
                      {a.reads.map((r) => (
                        <div key={r} className="flex items-center gap-2.5" title={r}>
                          <SourceIcon name={r} size={18} />
                          <span className="flex-1 min-w-0 text-[12px] truncate text-[var(--text-primary)]">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {a.deployments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate(`/workflows/${a.deployments[0].id}?from=/agents/${a.key}`)}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] text-[12px] font-medium bg-white border border-grey-200 text-[var(--text-primary)] cursor-pointer hover:border-primary-300 transition-colors"
                  >
                    See it in a workflow <ArrowSquareOut size={13} />
                  </button>
                )}
              </motion.aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
