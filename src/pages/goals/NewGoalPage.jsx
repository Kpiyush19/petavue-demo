import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CaretRight, ArrowLeft, Check, Target, Sparkle, MagnifyingGlass, TrendUp, Database } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button as PvButton } from "@/ui";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";

/* The goal taxonomy — six questions Petavue turns into one measurable goal
   statement, then calibrates against connected data. */
const FIELDS = {
  outcome: {
    kicker: "Outcome",
    q: "What outcome are you trying to improve?",
    sub: "Name the business result, audience, or channel you want to move.",
    help: "Be specific about the metric or outcome and where it comes from.",
    placeholder: "e.g. Increase qualified demo bookings from paid media.",
    required: true,
  },
  target: {
    kicker: "Target and measurement",
    q: "How will you recognize progress?",
    sub: "Give a target, a baseline, or a direction — the exact number can be unknown.",
    help: "A percent change, an absolute number, or “improve vs the trailing 90-day baseline” all work.",
    placeholder: "e.g. Increase weekly Salesforce-qualified leads by 20% without reducing demo quality.",
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

// Two-phase spine: Define → Workflows. Define shows a check once you advance.
function PhaseStepper({ step }) {
  const phases = ["Define", "Workflows"];
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      {phases.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex items-center gap-2.5">
            {i > 0 && <span className="w-8 h-px bg-[var(--color-grey-200)]" />}
            <span className={cn("flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-semibold tabular-nums", done || active ? "bg-primary-500 text-white" : "bg-grey-100 text-[var(--text-muted)]")}>
              {done ? <Check size={13} weight="bold" /> : i + 1}
            </span>
            <span className={cn("text-[14px]", active ? "font-medium text-[var(--text-primary)]" : done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* One taxonomy question card (the number rail lives outside, in the timeline). */
function TaxonomyField({ name, value, onChange }) {
  const f = FIELDS[name];
  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-grey-100)] bg-white p-5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">{f.kicker}</span>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", f.required ? "bg-primary-50 text-primary-600" : "bg-grey-100 text-[var(--text-muted)]")}>
          {f.required ? "Required" : "Optional"}
        </span>
      </div>
      <label className="block text-[15px] font-semibold text-[var(--text-primary)] leading-snug mt-1">{f.q}</label>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-snug">{f.sub}</p>
      <div className="mt-2.5 px-3 py-2 rounded-lg bg-grey-50 border-l-2 border-primary-300">
        <p className="text-[12px] text-[var(--text-secondary)] leading-snug"><span className="font-semibold text-[var(--text-primary)]">Guidance:</span> {f.help}</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={f.placeholder}
        className="w-full mt-3 text-[14px] px-3 py-2.5 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none text-[var(--text-primary)] placeholder:text-[#adb2ce]"
      />
    </div>
  );
}

export default function NewGoalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0); // 0 = Define, 1 = Workflows
  const [form, setForm] = useState({ outcome: "", target: "", guardrails: "", scope: "", ambition: "", priority: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const [selected, setSelected] = useState([]);
  const [wfSearch, setWfSearch] = useState("");
  const { data: wfData } = useQuery({ queryKey: ["goal-workflows"], queryFn: () => apiGet("/api/goals/workflows") });
  const workflows = wfData?.workflows || [];
  const filteredWf = workflows.filter((w) => w.name.toLowerCase().includes(wfSearch.toLowerCase()));
  const selectedWf = workflows.filter((w) => selected.includes(w.id));
  const toggleWf = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const derived = useMemo(
    () => [form.outcome, form.target].map((s) => s.trim()).filter(Boolean).join(" "),
    [form.outcome, form.target]
  );
  const answered = FIELD_ORDER.filter((k) => form[k].trim()).length;
  const ready = derived.length > 0;

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
      <div className="shrink-0 bg-white border-b border-[var(--color-grey-100)] px-6">
        <div className="flex items-center h-[52px] min-w-0 border-b border-[var(--color-grey-100)]">
          <button onClick={() => navigate("/goals")} className="text-[14px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0">Goals</button>
          <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0 mx-1.5" />
          <span className="block truncate text-[14px] font-medium max-w-[420px] text-grey-900">New goal</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)] leading-tight text-balance">Turn a priority into a goal Petavue can act on</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 max-w-[620px] leading-snug">Answer a few questions so Petavue knows what to measure, what to protect, and what it may recommend.</p>
          </div>
          <PhaseStepper step={step} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-grey-50">
        {/* ── Step 1 · Define ── */}
        {step === 0 && (
          <div className="px-6 pt-5 pb-8 grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            {/* Questions — a connected timeline; numbers flow down a progress line */}
            <div className="xl:col-span-2 flex flex-col">
              {FIELD_ORDER.map((name, i) => {
                const filled = !!form[name].trim();
                const last = i === FIELD_ORDER.length - 1;
                return (
                  <div key={name} className="flex gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white text-[13px] font-semibold tabular-nums shrink-0">{i + 1}</span>
                      {!last && <span className={cn("w-0.5 flex-1 my-2 rounded-full transition-colors", filled ? "bg-primary-300" : "bg-[var(--color-grey-200)]")} />}
                    </div>
                    <div className={cn("flex-1 min-w-0", !last && "pb-5")}>
                      <TaxonomyField name={name} value={form[name]} onChange={set(name)} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live preview — collapsed until there's a statement, then fills in */}
            <div className="flex flex-col bg-white border border-[var(--color-grey-100)] rounded-xl p-5 xl:sticky xl:top-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", ready ? "bg-green-500" : "bg-[var(--color-grey-300)]")} /> Live preview
                </span>
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{answered}/{FIELD_ORDER.length} answered</span>
              </div>

              {ready ? (
                <>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] mt-3">Petavue will work from this definition</p>
                  <div className="mt-2.5 rounded-lg border border-primary-200 bg-primary-50 p-3.5">
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{derived}</p>
                  </div>
                  <div className="flex flex-col mt-3 divide-y divide-[var(--color-grey-100)]">
                    {PREVIEW_FACETS.filter((name) => form[name].trim()).map((name) => (
                      <div key={name} className="py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{FIELDS[name].kicker}</p>
                        <p className="text-[12.5px] text-[var(--text-primary)] leading-snug mt-0.5">{form[name].trim()}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-3 flex flex-col items-center justify-center gap-2 text-center rounded-lg border border-dashed border-[var(--border-primary)] bg-grey-50 px-4 py-9">
                  <Sparkle size={20} className="text-[var(--color-grey-300)]" />
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">Your goal will take shape here as you answer the questions.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2 · Workflows ── */}
        {step === 1 && (
          <div className="px-6 pt-5 pb-8">
            <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-0 mb-3">
              <ArrowLeft size={16} /> Back to definition
            </button>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
              <div className="xl:col-span-2 flex flex-col bg-white border border-[var(--color-grey-100)] rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-grey-900 text-white shrink-0"><Database size={17} weight="fill" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">Data sources</p>
                    <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mt-0.5">Which workflows feed this goal?</h2>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1">Select one or more periodic workflows whose data Petavue will use to track this goal.</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 h-10 border border-grey-200 rounded-lg bg-white focus-within:border-primary-500 hover:border-primary-300 px-3 transition-colors">
                  <MagnifyingGlass size={16} className="text-grey-500 shrink-0" />
                  <input value={wfSearch} onChange={(e) => setWfSearch(e.target.value)} placeholder="Search your workflows…" className="flex-1 min-w-0 border-none outline-none bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-grey-500 p-0" />
                </div>

                {filteredWf.length === 0 ? (
                  <div className="mt-3 flex flex-col items-center justify-center gap-1.5 py-10 rounded-lg border border-dashed border-[var(--border-primary)] text-center">
                    <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                    <p className="text-[13px] text-[var(--text-secondary)]">No workflows match “{wfSearch}”.</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-[var(--color-grey-100)] overflow-hidden max-h-[360px] overflow-y-auto">
                    {filteredWf.map((w) => {
                      const sel = selected.includes(w.id);
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => toggleWf(w.id)}
                          className={cn("w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--color-grey-100)] last:border-b-0 transition-colors", sel ? "bg-primary-50" : "hover:bg-grey-50")}
                        >
                          <span className={cn("shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors", sel ? "bg-primary-500 border-primary-500" : "border-[var(--color-grey-300)] bg-white")}>
                            {sel && <Check size={11} weight="bold" className="text-white" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">{w.name}</p>
                            <p className="text-[12px] text-[var(--text-muted)] truncate">{w.schedule} · {w.lastRun}</p>
                          </div>
                          <TrendUp size={16} className="text-[var(--text-muted)] shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[12px] text-[var(--text-secondary)] mt-3"><span className="font-semibold text-[var(--text-primary)] tabular-nums">{selected.length}</span> workflow{selected.length !== 1 ? "s" : ""} selected</p>
              </div>

              {/* Selected summary */}
              <div className="flex flex-col bg-white border border-[var(--color-grey-100)] rounded-xl p-5 xl:sticky xl:top-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", selected.length ? "bg-green-500" : "bg-[var(--color-grey-300)]")} /> Data sources
                </span>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] mt-2">{selected.length} workflow{selected.length !== 1 ? "s" : ""} selected</p>
                {selected.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-muted)] mt-2 leading-relaxed">Select at least one workflow — Petavue uses its data to track this goal.</p>
                ) : (
                  <div className="flex flex-col gap-2 mt-2.5">
                    {selectedWf.map((w) => (
                      <div key={w.id} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                        <TrendUp size={14} className="text-[var(--text-muted)] shrink-0" />
                        <span className="truncate">{w.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed review footer — present on both steps */}
      <div className="shrink-0 w-full px-6 py-3 border-t border-[var(--color-grey-100)] bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <PvButton variant="ghost" size="md" label="Cancel" onClick={() => navigate("/goals")} />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden md:block text-[12px] text-[var(--text-muted)] truncate max-w-[440px]">
            {step === 0
              ? "Next: pick the workflows Petavue tracks, then it calibrates targets and triggers with you."
              : "Petavue will read your selected workflows and propose the metrics, thresholds, and triggers this goal needs."}
          </span>
          {step === 0 ? (
            <PvButton variant="primary" size="md" label="Continue to workflows" icon={CaretRight} iconPosition="suffix" disabled={!canProceed} onClick={() => setStep(1)} />
          ) : (
            <PvButton variant="primary" size="md" label={create.isPending ? "Creating…" : "Confirm goal"} disabled={!canConfirm || create.isPending} onClick={() => create.mutate()} />
          )}
        </div>
      </div>
    </div>
  );
}
