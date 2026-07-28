import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CaretRight, ArrowLeft, Check, CheckCircle, Info, Eye, Target, Sparkle, MagnifyingGlass, Coins, TrendUp, Gauge, NumberCircleOne, NumberCircleTwo, NumberCircleThree, NumberCircleFour, NumberCircleFive, NumberCircleSix } from "@phosphor-icons/react";

const STEP_ICONS = [NumberCircleOne, NumberCircleTwo, NumberCircleThree, NumberCircleFour, NumberCircleFive, NumberCircleSix];
import { toast } from "sonner";
import { Button as PvButton, Tooltip } from "@/ui";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";

/* The goal taxonomy — six questions Petavue turns into one measurable goal
   statement, then calibrates against connected data. */
const FIELDS = {
  outcome: {
    kicker: "Outcome",
    q: "What outcome are you trying to improve?",
    sub: "Tell Petavue what success looks like, who or what it affects, and how you would recognize progress.",
    help: "Include the business result, the audience or channel, and any target you already have.",
    placeholder: "e.g. Increase qualified demo bookings from paid media, without hurting lead quality.",
    required: true,
  },
  target: {
    kicker: "Time horizon",
    q: "By when should this outcome be achieved?",
    sub: "Give Petavue the timing it should use for pacing, review cadence, and urgency.",
    help: "Use a date, a time window, or a milestone sequence. It is fine to describe more than one horizon.",
    placeholder: "e.g. By September 30, with a checkpoint after the first 30 days.",
    required: true,
  },
  guardrails: {
    kicker: "Guardrails",
    q: "What must Petavue protect?",
    sub: "Describe what Petavue must not compromise while pursuing the goal. Your wording is the source of truth.",
    help: "Include budgets, approval limits, protected channels, minimum volumes, quality requirements, compliance rules, or anything else that should constrain recommendations.",
    placeholder: "e.g. Keep monthly paid-media spend flat; no budget change above 10% without approval.",
    required: true,
  },
  scope: {
    kicker: "Recommendation scope",
    q: "What may Petavue recommend?",
    sub: "Describe the kinds of help you want from Petavue and what should remain outside its scope.",
    help: "Mention monitoring, investigations, budget or campaign changes, reallocations, approvals, or actions Petavue should never propose.",
    placeholder: "e.g. Monitor daily and recommend budget shifts. Never execute anything automatically.",
    required: true,
  },
  ambition: {
    kicker: "Ambition",
    q: "How ambitious should Petavue be?",
    sub: "Describe how hard Petavue should push when evidence is incomplete or trade-offs are unavoidable.",
    help: "Mention whether you prefer conservative, balanced, or aggressive recommendations. Petavue will ask if it needs this.",
    placeholder: "e.g. Be balanced overall. Push for growth when quality is stable, but never recommend a budget move above 10% without approval.",
    required: false,
  },
  priority: {
    kicker: "Priority",
    q: "When priorities conflict, what takes priority?",
    sub: "Explain how Petavue should rank trade-offs when it cannot improve everything at once.",
    help: "State the ordering that matters to you, such as quality over volume, efficiency over growth, or expected business impact over a single metric.",
    placeholder: "e.g. Protect lead quality first, then grow volume, while keeping spend within plan.",
    required: false,
  },
};
const FIELD_ORDER = Object.keys(FIELDS);
const PREVIEW_FACETS = ["guardrails", "scope", "ambition", "priority"];

// Strip a leading "by" so a horizon like "By September 30" doesn't render as
// "…by By September 30" once we prefix it with "by".
const cleanHorizon = (t) => t.trim().replace(/^by\s+/i, "");

/* Starter templates — the flow's answer to the blank-page problem. Each pre-fills
   the whole taxonomy and suggests the workflow that feeds it, so authoring becomes
   editing. Ids under `suggestedWf` match GOAL_WORKFLOWS in mocks/goals.js. */
const TEMPLATES = [
  {
    id: "spend",
    name: "Reduce wasted paid spend",
    desc: "Cut inefficient spend without losing pipeline",
    icon: Coins,
    suggestedWf: "wf-cpl-monitor",
    values: {
      outcome: "Reduce wasted paid-media spend by bringing blended Salesforce cost-per-lead down 5%, without cutting qualified lead volume.",
      target: "This quarter, with a checkpoint after the first 30 days.",
      guardrails: "Keep total monthly paid spend flat; no single channel budget change above 12% without approval; judge waste on Salesforce-attributed CPL, not platform CPL.",
      scope: "Monitor daily and recommend channel caps, holds, and reallocations within the flat budget. Never execute changes automatically.",
      ambition: "Balanced — cap clear waste, but hold a channel through its confirmation window before cutting.",
      priority: "Protect Salesforce lead volume first, then efficiency, then platform-level metrics.",
    },
  },
  {
    id: "pipeline",
    name: "Grow qualified pipeline",
    desc: "More SQLs from the same funnel",
    icon: TrendUp,
    suggestedWf: "wf-pipeline-health",
    values: {
      outcome: "Increase Salesforce-qualified leads from marketing without lowering lead quality.",
      target: "Grow weekly SQLs by ~20% within the quarter.",
      guardrails: "Don't sacrifice lead quality for volume; keep cost-per-SQL within 15% of today's.",
      scope: "Monitor lead flow, investigate drops, and recommend channel or routing changes. Flag, don't auto-execute.",
      ambition: "Balanced, leaning ambitious while quality holds.",
      priority: "Quality over volume; expected pipeline impact over any single metric.",
    },
  },
  {
    id: "pacing",
    name: "Keep budget pacing on plan",
    desc: "Spend the plan — no more, no less",
    icon: Gauge,
    suggestedWf: "wf-rev-snapshot",
    values: {
      outcome: "Keep paid budget pacing within plan across all channels every month.",
      target: "Stay within 5% of the monthly plan, reviewed weekly.",
      guardrails: "Never overspend the monthly cap; no reallocation above 10% without approval.",
      scope: "Monitor pacing daily and recommend smoothing or reallocations. Never change budgets automatically.",
      ambition: "Conservative — prioritise staying on plan over chasing upside.",
      priority: "On-plan spend first, then efficiency, then growth.",
    },
  },
];

// Two-phase spine: Define → Workflows. Done steps show a check and are clickable
// to jump back.
function PhaseStepper({ step, onStep }) {
  const phases = ["Define", "Workflows"];
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      {phases.map((label, i) => {
        const done = i < step;
        const active = i === step;
        const clickable = i < step; // can only step backward
        const inner = (
          <>
            {i > 0 && <span className="w-8 h-px bg-[var(--color-grey-200)]" />}
            {done ? (
              <CheckCircle size={24} weight="fill" className="text-primary-500 shrink-0" />
            ) : (() => {
              const N = STEP_ICONS[i] || NumberCircleOne;
              return <N size={24} weight="regular" className={cn("shrink-0", active ? "text-primary-500" : "text-[var(--text-muted)]")} />;
            })()}
            <span className={cn("text-[14px]", active ? "font-medium text-[var(--text-primary)]" : done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{label}</span>
          </>
        );
        return clickable ? (
          <button key={label} type="button" onClick={() => onStep(i)} className="flex items-center gap-2.5 bg-transparent border-none p-0 cursor-pointer">{inner}</button>
        ) : (
          <div key={label} className="flex items-center gap-2.5">{inner}</div>
        );
      })}
    </div>
  );
}

/* One taxonomy question card. The step number lives on the timeline rail outside. */
function TaxonomyField({ name, value, onChange }) {
  const f = FIELDS[name];
  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-grey-100)] bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-primary-600">{f.kicker}</span>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", f.required ? "bg-primary-50 text-primary-600" : "bg-grey-100 text-[var(--text-muted)]")}>
          {f.required ? "Required" : "Optional"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <label className="block text-[14px] font-semibold text-[var(--text-primary)] leading-snug">{f.q}</label>
        <Tooltip title={f.help} placement="top">
          <span className="inline-flex shrink-0 text-[var(--text-muted)]"><Info size={14} /></span>
        </Tooltip>
      </div>
      <p className="text-[12px] text-[#757A97] mt-1 leading-snug">{f.sub}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={f.placeholder}
        className="w-full mt-3 text-[14px] px-3 py-2.5 rounded-[8px] border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none text-[var(--text-primary)] placeholder:text-[#adb2ce]"
      />
    </div>
  );
}

/* The goal preview — Eye header + the "You want to…" statement and facets.
   Shared by both steps so the definition stays visible on the right. */
function PreviewPane({ form, ready }) {
  return (
    <aside className="hidden xl:flex xl:flex-col w-[380px] shrink-0 bg-white border-l border-[var(--color-grey-100)] overflow-y-auto">
      <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-4 border-b border-[var(--color-grey-100)]">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <Eye size={14} className="text-[var(--text-muted)]" /> Preview
        </span>
      </div>
      <div className="p-5">
        {ready ? (
          <>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Petavue will work from this definition</p>
            <div className="mt-2.5 rounded-lg border border-primary-200 bg-primary-50 p-3.5">
              <p className="text-[13px] font-normal text-[var(--text-primary)] leading-relaxed">
                <span className="font-medium">You want to</span> {form.outcome.trim()}
                {form.target.trim() && <> <span className="font-medium">by</span> {cleanHorizon(form.target)}</>}
              </p>
            </div>
            <div className="flex flex-col mt-3 divide-y divide-[var(--color-grey-100)]">
              {PREVIEW_FACETS.filter((name) => form[name].trim()).map((name) => (
                <div key={name} className="py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{FIELDS[name].kicker}</p>
                  <p className="text-[12.5px] text-[var(--text-primary)] leading-snug mt-0.5">{name === "scope" ? `Petavue may recommend ${form[name].trim()}` : form[name].trim()}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-center rounded-lg border border-dashed border-[var(--border-primary)] bg-grey-50 px-4 py-9">
            <Sparkle size={20} className="text-[var(--color-grey-300)]" />
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">Your goal will take shape here as you answer the questions.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function NewGoalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0); // 0 = Define, 1 = Workflows
  const [form, setForm] = useState({ outcome: "", target: "", guardrails: "", scope: "", ambition: "", priority: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [suggestedWf, setSuggestedWf] = useState(null);

  const [selected, setSelected] = useState([]);
  const [wfSearch, setWfSearch] = useState("");
  const { data: wfData, isLoading: wfLoading } = useQuery({ queryKey: ["goal-workflows"], queryFn: () => apiGet("/api/goals/workflows") });
  const workflows = wfData?.workflows || [];
  const filteredWf = workflows.filter((w) => w.name.toLowerCase().includes(wfSearch.toLowerCase()));
  // Recommended workflow floats to the top of the list.
  const orderedWf = [...filteredWf].sort((a, b) => (b.id === suggestedWf ? 1 : 0) - (a.id === suggestedWf ? 1 : 0));

  // Applying a template turns the blank page into an editable draft and pre-picks
  // the workflow that feeds this kind of goal.
  const applyTemplate = (t) => {
    setForm(t.values);
    setActiveTemplate(t.id);
    setSuggestedWf(t.suggestedWf);
    setSelected([t.suggestedWf]);
  };

  const derived = useMemo(() => {
    const o = form.outcome.trim();
    const t = cleanHorizon(form.target);
    if (!o) return "";
    return t ? `You want to ${o} by ${t}` : `You want to ${o}`;
  }, [form.outcome, form.target]);
  const ready = derived.length > 0;

  // Discard guard — the whole form is local state, so leaving loses it.
  const dirty = FIELD_ORDER.some((k) => form[k].trim()) || selected.length > 0;
  const leave = () => { if (!dirty || window.confirm("Discard this goal? Your answers won't be saved.")) navigate("/goals"); };

  const create = useMutation({
    mutationFn: () => apiPost("/api/goals", { statement: derived || form.outcome.trim(), taxonomy: form, workflowIds: selected }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      const id = res?.goal?.id;
      navigate(id ? `/goals/${id}` : "/goals");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  // Continue is gated on every required field; Confirm additionally needs a workflow.
  const requiredFilled = FIELD_ORDER.filter((k) => FIELDS[k].required).every((k) => form[k].trim());
  const canProceed = requiredFilled;
  const canConfirm = requiredFilled && selected.length > 0;

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header — breadcrumb bar, then a title row with the two-phase spine
          (same white/bordered structure as the app's other page headers). */}
      <div className="shrink-0 bg-white border-b border-[var(--color-grey-100)]">
        <div className="flex items-center h-[52px] min-w-0 border-b border-[var(--color-grey-100)] px-6">
          <button onClick={leave} className="text-[14px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0">Goals</button>
          <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0 mx-1.5" />
          <span className="block truncate text-[14px] font-medium max-w-[420px] text-grey-900">New goal</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 flex-wrap px-4">
          <div className="min-w-0">
            <h1 className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight text-balance">{step === 0 ? "Turn a priority into a goal Petavue can act on" : "Which workflows feed this goal?"}</h1>
            <p className="text-[12px] text-[#757A97] mt-1 whitespace-nowrap leading-snug">{step === 0 ? "Answer a few questions so Petavue knows what to measure, what to protect, and what it may recommend." : "Select one or more periodic workflows whose data Petavue will use to track this goal."}</p>
          </div>
          <PhaseStepper step={step} onStep={setStep} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-grey-50">
        {/* ── Step 1 · Define ── */}
        {step === 0 && (
          <div className="flex h-full min-h-0">
            {/* Questions — a connected timeline; numbers flow down a progress line. Scrolls on its own. */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className="m-4 p-4 flex flex-col bg-white rounded-xl border border-[var(--color-grey-100)]">
                {FIELD_ORDER.map((name, i) => {
                  const filled = !!form[name].trim();
                  const last = i === FIELD_ORDER.length - 1;
                  return (
                    <div key={name} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        {(() => { const N = STEP_ICONS[i] || NumberCircleOne; return <N size={24} weight="regular" className="text-primary-500 shrink-0 mt-2" />; })()}
                        {!last && <span className={cn("w-0.5 flex-1 my-2 rounded-full transition-colors", filled ? "bg-primary-300" : "bg-[var(--color-grey-200)]")} />}
                      </div>
                      <div className={cn("flex-1 min-w-0", !last && "pb-4")}>
                        <TaxonomyField name={name} value={form[name]} onChange={set(name)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview — full-height pane pinned to the right, its own scroll. */}
            <PreviewPane form={form} ready={ready} />
          </div>
        )}

        {/* ── Step 2 · Workflows ── */}
        {step === 1 && (
          <div className="flex h-full min-h-0">
            {/* Left: workflow selection, scrolls on its own. */}
            <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="m-4 flex flex-col gap-4">
              <div className="flex flex-col bg-white border border-[var(--color-grey-100)] rounded-xl p-5">
                {suggestedWf && selected.includes(suggestedWf) && (
                  <p className="text-[13px] text-[#757A97] mb-3 leading-snug">Based on your goal, Petavue pre-selected the workflow below. Keep it, and add any others that should feed this goal.</p>
                )}
                <div className="flex items-center gap-2 h-10 border border-grey-200 rounded-lg bg-white focus-within:border-primary-500 hover:border-primary-300 px-3 transition-colors">
                  <MagnifyingGlass size={16} className="text-grey-500 shrink-0" />
                  <input value={wfSearch} onChange={(e) => setWfSearch(e.target.value)} placeholder="Search your workflows…" className="flex-1 min-w-0 border-none outline-none bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-grey-500 p-0" />
                </div>

                {wfLoading ? (
                  <div className="mt-3 flex items-center justify-center gap-2 py-10 rounded-lg border border-dashed border-[var(--border-primary)] text-[13px] text-[var(--text-muted)]">
                    Loading your workflows…
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="mt-3 flex flex-col items-center justify-center gap-1.5 py-10 rounded-lg border border-dashed border-[var(--border-primary)] text-center">
                    <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                    <p className="text-[13px] text-[#757A97]">No workflows connected yet.</p>
                  </div>
                ) : orderedWf.length === 0 ? (
                  <div className="mt-3 flex flex-col items-center justify-center gap-1.5 py-10 rounded-lg border border-dashed border-[var(--border-primary)] text-center">
                    <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                    <p className="text-[13px] text-[#757A97]">No workflows match “{wfSearch}”.</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-[var(--color-grey-100)] overflow-hidden max-h-[360px] overflow-y-auto">
                    {orderedWf.map((w) => {
                      const sel = selected.includes(w.id);
                      const rec = w.id === suggestedWf;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          role="checkbox"
                          aria-checked={sel}
                          onClick={() => setSelected((s) => s.includes(w.id) ? s.filter((x) => x !== w.id) : [...s, w.id])}
                          className={cn("w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--color-grey-100)] last:border-b-0 transition-colors", sel ? "bg-primary-50" : "hover:bg-grey-50")}
                        >
                          <span className={cn("shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-colors", sel ? "bg-primary-500 border-primary-500" : "border-[var(--color-grey-300)] bg-white")}>
                            {sel && <Check size={12} weight="bold" className="text-white" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[var(--text-primary)] truncate flex items-center gap-2">
                              {w.name}
                              {rec && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-primary-600 border border-primary-200">Recommended</span>}
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)] truncate">{w.schedule} · {w.lastRun}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Preview — the goal definition stays in view while picking a workflow. */}
            <PreviewPane form={form} ready={ready} />
          </div>
        )}
      </div>

      {/* Fixed review footer — present on both steps */}
      <div className="shrink-0 w-full px-6 py-3 border-t border-[var(--color-grey-100)] bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <PvButton variant="ghost" size="md" label="Cancel" onClick={leave} />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          {step === 0 ? (
            <PvButton variant="primary" size="md" label="Continue to workflows" icon={CaretRight} iconPosition="suffix" disabled={!canProceed} onClick={() => setStep(1)} />
          ) : (
            <>
              <PvButton variant="secondary" size="md" label="Back" icon={ArrowLeft} onClick={() => setStep(0)} />
              <PvButton variant="primary" size="md" label={create.isPending ? "Creating…" : "Confirm goal"} disabled={!canConfirm || create.isPending} onClick={() => create.mutate()} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
