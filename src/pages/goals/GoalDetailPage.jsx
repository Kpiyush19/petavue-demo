import { useState, useRef, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, CircleNotch, CheckCircle, Target, Eye, Lightning, MagnifyingGlass,
  CaretRight, X, ClockCounterClockwise, Play, Question, WaveSine, Pulse, Warning, XCircle, PencilSimple, NotePencil,
  Clock, UserCircle, TrendUp, ChartPieSlice, PaperPlaneTilt, PaperPlaneRight, ArrowsClockwise, Info,
  CurrencyDollar, Fire, Funnel, Tag, Code, CaretDown, ChatCircle, Sparkle, Sliders,
  DotsThree, Trash, ShareNetwork,
} from "@phosphor-icons/react";
import { Tooltip } from "@/ui";

// Category icon + accent per finding type. Paid-media keys first, legacy
// deal-tracking keys kept as a fallback for any older seeded data.
const REC_ICONS = {
  spend: CurrencyDollar, headroom: MagnifyingGlass, fatigue: Fire, landing: Funnel, brand: Tag,
  query: MagnifyingGlass, pacing: Clock, device: Pulse, geo: Target, scale: TrendUp,
  stale: Clock, owner: UserCircle, stuck: TrendUp, concentration: ChartPieSlice, threshold: Target,
};
import { toast } from "sonner";
import SageWidget, { SAGE_GRADIENT } from "./SageWidget";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import { Button as PvButton } from "@/ui";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../api";
import { cn } from "../../utils/cn";
import RecommendationDrawer from "./RecommendationDrawer";
import { StepIndicator } from "../skills-v2/SetupProgress";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;

/* ───────── Wizard shell: titled content panel · sticky footer ───────── */

// Page-wide footer slot — GoalDetailPage renders a full-width bar below the
// scroll area and shares its DOM node here; WizardFooter portals into it so the
// footer spans the whole page instead of the centered content column.
const FooterSlot = createContext(null);

// Page-wide footer: Cancel/status on the left, actions on the right.
function WizardFooter({ left, right }) {
  const slot = useContext(FooterSlot);
  const bar = (
    <div className="w-full px-6 py-3 border-t border-[var(--border-primary)] bg-white flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0 text-[14px] text-[#757A97]">{left}</div>
      <div className="flex items-center gap-2 shrink-0">{right}</div>
    </div>
  );
  return slot ? createPortal(bar, slot) : bar;
}

/* ───────── Calibration — the same two-pane setup UX as a skill run: a left rail
   card-list of the 6 steps (active one expands to show its description) and a
   right pane that either explains the step or asks a clarification. ───────── */

const PROGRESS_STEPS = [
  { label: "Reading your data", desc: "Looking through your selected workflow and history to work out what's measurable for this goal." },
  { label: "Building your catalog", desc: "Cataloging the metrics and fields available to track this goal." },
  { label: "Targets", desc: "Turning your goal into measurable targets." },
  { label: "Monitoring signals", desc: "Defining the signals we'll watch on every check-in." },
  { label: "Recommended moves", desc: "Drafting the actions we may recommend." },
  { label: "Ready for your review", desc: "Confirming the targets and rules before this goal starts running." },
];
const STEP_EASE = "cubic-bezier(0.23,1,0.32,1)";

// Row morphs between compact and expanded rather than swapping, so the active
// step reveals its description without the list jumping (same as a skill run).
function CalibrationStepRow({ label, desc, status }) {
  const expanded = status === "active";
  const showDesc = expanded && !!desc;
  return (
    <li className={cn("px-2 py-2 rounded-lg border border-[var(--color-grey-100)] transition-colors duration-200", expanded && "bg-[var(--color-primary-50)]")}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5"><StepIndicator status={status} /></span>
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "block text-[14px] transition-colors duration-200",
              expanded ? "font-semibold text-[var(--color-primary-500)]"
                : status === "completed" ? "font-medium text-[var(--text-primary)] truncate"
                : "text-[var(--color-text-disabled)] truncate"
            )}
          >
            {label}
          </span>
          <div
            className="grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none"
            style={{ gridTemplateRows: showDesc ? "1fr" : "0fr", opacity: showDesc ? 1 : 0, transitionTimingFunction: STEP_EASE }}
          >
            <div className="overflow-hidden">
              <p className="text-[12px] leading-snug mt-1 text-[#757A97]">{desc}</p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// Left rail (6 steps) + right content pane, with the "leave and it keeps
// running" banner on top and a Cancel-run footer.
function CalibrationLayout({ activeIndex, waiting, onDelete, children }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 flex">
        <div className="w-[340px] shrink-0 flex flex-col min-h-0 bg-white border border-[var(--color-grey-100)] border-r-0 rounded-l-2xl overflow-hidden">
          <div className="flex items-center h-12 px-4 shrink-0">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] truncate">Building your goal triggers</h2>
          </div>
          <ul className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {PROGRESS_STEPS.map((s, i) => {
              const status = i < activeIndex ? "completed" : i === activeIndex ? "active" : "pending";
              const label = status === "active" && waiting ? "Waiting for your answers" : s.label;
              const desc = status === "active" && waiting ? "Petavue needs a few answers from you before it can continue." : s.desc;
              return <CalibrationStepRow key={s.label} label={label} desc={desc} status={status} />;
            })}
          </ul>
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white border border-[var(--color-grey-100)] rounded-r-2xl overflow-hidden">
          {children}
        </div>
      </div>
      <WizardFooter left={<PvButton variant="secondary" size="md" label="Cancel run" onClick={onDelete} />} right={<span />} />
    </div>
  );
}

// Right pane when there's nothing to answer — a centered line on what's
// happening now (mirrors the skill-run setup pane).
function CalibrationEmpty({ icon: Icon, copy, detail }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-3.5">
          <Icon size={20} />
        </div>
        <p className="text-[14px] text-[#757A97] leading-relaxed">{copy}</p>
        {detail && <p className="text-[12px] text-[var(--text-muted)] mt-2 leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── Calibrating ───────────────────────── */
function Calibrating({ goal, onCancel }) {
  return (
    <CalibrationLayout activeIndex={0} onDelete={onCancel}>
      <CalibrationEmpty
        icon={WaveSine}
        copy="Reading your selected workflow and history to work out what this goal can be measured against."
        detail="Petavue is cataloging the metrics and fields it can track."
      />
    </CalibrationLayout>
  );
}

/* ───────────────────────── Building ───────────────────────── */
// Our three build sub-steps land on Targets · Monitoring signals · Recommended
// moves in the rail (Reading data + catalog already done by this phase).
const BUILD_STEPS = [
  { active: 2, icon: Target, copy: "Turning your goal into measurable targets — reading the workspace files to anchor each one to real numbers." },
  { active: 3, icon: Pulse, copy: "Setting up what to watch — the conditions Petavue will evaluate on every check-in." },
  { active: 4, icon: Lightning, copy: "Preparing the moves we may recommend, and saving the proposals for your review." },
];
function Building({ goal, onCancel }) {
  const p = Math.min(goal.buildProgress || 0, BUILD_STEPS.length - 1);
  const s = BUILD_STEPS[p];
  return (
    <CalibrationLayout activeIndex={s.active} onDelete={onCancel}>
      <CalibrationEmpty icon={s.icon} copy={s.copy} />
    </CalibrationLayout>
  );
}

/* ───────────────────────── Decisions ───────────────────────── */
function Decisions({ goal, refetch, onCancel }) {
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  // Free text behind "Something else…", kept per question so navigating back
  // and forth doesn't lose what was typed.
  const [otherText, setOtherText] = useState({});
  const q = goal.questions[idx];
  const total = goal.questions.length;

  // "other" is only a marker — it never reaches the engine; the typed text does.
  const resolvedAnswers = () =>
    Object.fromEntries(Object.entries(answers).map(([qid, val]) => [qid, val === "other" ? (otherText[qid] || "").trim() : val]));

  const submit = useMutation({
    mutationFn: () => apiPost(`/api/goals/${goal.id}/answer`, { answers: resolvedAnswers() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goal", goal.id] }); refetch(); },
  });

  const choose = (optId) => setAnswers((a) => ({ ...a, [q.id]: optId }));
  const next = () => {
    if (idx < total - 1) setIdx(idx + 1);
    else submit.mutate();
  };
  const chosen = answers[q.id];
  // Choosing "Something else…" isn't an answer until it's actually written.
  const answered = !!chosen && (chosen !== "other" || (otherText[q.id] || "").trim().length > 0);

  return (
    <CalibrationLayout activeIndex={1} waiting onDelete={onCancel}>
      <div className="flex-1 overflow-y-auto px-6 py-3">
      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">A few questions</h2>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4">Question {idx + 1} of {total}</p>
      <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug mt-1">{q.text}</p>
      {q.found && (
        <div className="flex items-start gap-2 px-4 py-3 mt-3 rounded-lg bg-primary-50 border border-primary-100">
          <Question size={16} className="text-primary-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#757A97]"><span className="font-semibold text-[var(--text-primary)]">What we found:</span> {q.found}</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5 mt-4">
        {q.options.map((o) => (
          <button
            key={o.id}
            onClick={() => choose(o.id)}
            className={cn(
              "flex items-start gap-3 px-4 py-3.5 rounded-lg border text-left transition-colors",
              chosen === o.id ? "border-primary-500 bg-primary-50" : "border-[var(--border-primary)] hover:border-primary-300 bg-white"
            )}
          >
            <span className={cn("shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center", chosen === o.id ? "border-primary-500" : "border-[var(--border-primary)]")}>
              {chosen === o.id && <span className="w-2 h-2 rounded-full bg-primary-500" />}
            </span>
            <span className="flex-1 text-[14px] text-[var(--text-primary)] leading-relaxed">{o.label}</span>
            {o.recommended && <span className="shrink-0 px-2 py-0.5 text-[12px] font-medium rounded-full bg-violet-50 text-violet-700 border border-violet-200">recommended</span>}
          </button>
        ))}
        {/* "Something else…" becomes the input in place, so the row itself is
            where you write the answer. */}
        <div
          onClick={() => { if (chosen !== "other") choose("other"); }}
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-lg border text-left transition-colors",
            chosen === "other" ? "border-primary-500 bg-primary-50 cursor-text" : "border-[var(--border-primary)] hover:border-primary-300 bg-white cursor-pointer"
          )}
        >
          <span className={cn("shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center", chosen === "other" ? "border-primary-500" : "border-[var(--border-primary)]")}>
            {chosen === "other" && <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </span>
          {chosen === "other" ? (
            <input
              type="text"
              autoFocus
              value={otherText[q.id] || ""}
              onChange={(e) => setOtherText((t) => ({ ...t, [q.id]: e.target.value }))}
              placeholder="Tell us how to anchor this instead…"
              className="flex-1 min-w-0 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          ) : (
            <span className="text-[14px] text-[#757A97]">Something else…</span>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <PvButton variant="primary" size="md" label={idx < total - 1 ? "Next" : (submit.isPending ? "Building…" : "Done")} icon={ArrowRight} iconPosition="suffix" disabled={!answered || submit.isPending} onClick={next} />
      </div>
      </div>
    </CalibrationLayout>
  );
}

/* ───────────────────────── Review ───────────────────────── */
/* Labelled facet inside an expanded review card (What this means / found / how). */
function ReviewFacet({ label, text, tint, mono }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
      <p className={cn("text-[13px] text-[#757A97] leading-relaxed", tint && "rounded-lg bg-grey-50 px-3 py-2", mono && "font-mono text-[12px] text-[var(--text-primary)]")}>{text}</p>
    </div>
  );
}

/* One expandable target / signal card: title + one-line summary + View details.
   Collapsed header is grey; the body animates open/closed. */
function ReviewCard({ title, summary, open, onToggle, children }) {
  return (
    <div className="rounded-lg border border-[var(--color-grey-100)] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-start justify-between gap-3 p-3.5 text-left bg-grey-50 hover:bg-grey-100/70 transition-colors border-none cursor-pointer active:scale-100">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--text-primary)] leading-snug">{title}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-primary-600 mt-0.5">
          {open ? "Hide details" : "View details"} <CaretDown size={12} className={cn("transition-transform duration-200", open && "rotate-180")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden bg-white"
          >
            <div className="px-3.5 pb-3.5 pt-3 flex flex-col gap-3 border-t border-[var(--color-grey-100)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Review({ goal, refetch, onCancel }) {
  const qc = useQueryClient();
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState(goal.name || "");
  const [openIds, setOpenIds] = useState(() => new Set());
  const toggleOpen = (id) => setOpenIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState("");
  const [chatWidth, setChatWidth] = useState(380);

  // Drag the left edge of the adjust panel to resize it (300–620px).
  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    const onMove = (ev) => setChatWidth(Math.min(620, Math.max(300, startW + (startX - ev.clientX))));
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const adjust = useMutation({
    mutationFn: (text) => apiPost(`/api/goals/${goal.id}/adjust`, { text }),
    onSuccess: (res, text) => {
      setChat((c) => [...c, { role: "user", text }, { role: "assistant", text: res.reply }]);
      qc.invalidateQueries({ queryKey: ["goal", goal.id] });
      refetch();
    },
  });
  const save = useMutation({
    mutationFn: () => apiPost(`/api/goals/${goal.id}/save`, { name: name.trim() || goal.name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); qc.invalidateQueries({ queryKey: ["goal", goal.id] }); refetch(); },
  });

  const sendAdjust = () => { if (!draft.trim()) return; adjust.mutate(draft.trim()); setDraft(""); };


  return (
    <>
      <div className="flex-1 flex min-h-0 bg-white border border-[var(--color-grey-100)] rounded-xl overflow-hidden">
        {/* Left: titled content */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Review your goal</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-50 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Draft ready</span>
          </div>
          <p className="text-[14px] text-[#757A97] mt-1 mb-5">Here's how we'll measure and watch it. Adjust on the right, then save.</p>

          <div className="flex flex-col gap-4">
            {/* Derived goal statement */}
            <section className="rounded-xl border border-[var(--color-grey-100)] p-4">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Derived goal statement</h2>
              <div className="mt-2.5 rounded-lg border border-primary-100 bg-primary-50/40 px-3.5 py-3">
                <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{goal.statement}</p>
              </div>
            </section>

            {/* Targets */}
            <section className="rounded-xl border border-[var(--color-grey-100)] p-4">
              <div className="flex items-center gap-2">
                <Target size={16} weight="fill" className="text-primary-500 shrink-0" />
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Your targets — how we'll know you hit the goal</h2>
              </div>
              <p className="text-[12px] text-[#757A97] mt-0.5 mb-3">Your goal breaks into these measurable targets. Petavue checks each one every run — expand any to see exactly how it's measured.</p>
              <div className="flex flex-col gap-2">
                {goal.targets.map((t) => (
                  <ReviewCard key={t.id} title={t.label} summary={t.meaning || t.why} open={openIds.has(t.id)} onToggle={() => toggleOpen(t.id)}>
                    {(t.meaning || t.why) && <ReviewFacet label="What this means" text={t.meaning || t.why} />}
                    {t.found && <ReviewFacet label="What we found" text={t.found} tint />}
                    {t.formula && <ReviewFacet label="How Petavue measures this" text={t.formula} />}
                  </ReviewCard>
                ))}
              </div>
            </section>

            {/* Signals */}
            <section className="rounded-xl border border-[var(--color-grey-100)] p-4">
              <div className="flex items-center gap-2">
                <WaveSine size={16} weight="fill" className="text-primary-500 shrink-0" />
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Signals we'll watch each run</h2>
              </div>
              <p className="text-[12px] text-[#757A97] mt-0.5 mb-3">Early-warning signals. If any drifts, Petavue surfaces it before it can derail the goal.</p>
              <div className="flex flex-col gap-2">
                {goal.conditions.map((c) => (
                  <ReviewCard key={c.id} title={c.label} summary={c.description} open={openIds.has(c.id)} onToggle={() => toggleOpen(c.id)}>
                    {c.description && <ReviewFacet label="What this means" text={c.description} />}
                    {c.meaning && <ReviewFacet label="When it counts" text={c.meaning} />}
                    {(c.formula || c.logic) && <ReviewFacet label="How Petavue measures this" text={c.formula || c.logic} mono={!c.formula} />}
                  </ReviewCard>
                ))}
              </div>
            </section>

            {/* Moves */}
            {goal.moves.length > 0 && (
              <section className="rounded-xl border border-[var(--color-grey-100)] p-4">
                <div className="flex items-center gap-2">
                  <Lightning size={16} weight="fill" className="text-primary-500 shrink-0" />
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Moves we may recommend</h2>
                </div>
                <p className="text-[12px] text-[#757A97] mt-0.5 mb-3">When a target or condition fires, these are the plays Petavue can suggest — always for your approval, never automatic.</p>
                <ul className="flex flex-col gap-2 list-disc pl-5">
                  {goal.moves.map((m) => (
                    <li key={m.id} className="text-[12px] text-[var(--text-primary)] leading-snug marker:text-[var(--text-muted)]">{m.label}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* Right rail: adjust chat (always open) */}
        <div style={{ width: chatWidth }} className="relative shrink-0 border-l border-[var(--color-grey-100)] flex flex-col">
            {/* Drag handle to resize the panel width */}
            <div
              onMouseDown={startResize}
              className="group absolute left-0 top-0 bottom-0 -ml-1 w-2 z-20 cursor-col-resize flex items-center justify-center"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
            >
              <span className="w-[2px] h-full bg-transparent group-hover:bg-primary-300 transition-colors" />
            </div>
            <div className="shrink-0 px-4 py-3.5 border-b border-[var(--color-grey-100)]">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">Want to adjust anything?</p>
              <p className="text-[12px] text-[#757A97] mt-1 leading-snug">Tell us in plain language — we'll change the setup and tell you what moved. We only adjust the goal here; we won't run analysis.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {chat.map((m, i) => (
                <div key={i} className={cn("text-[14px] leading-relaxed px-3 py-2 rounded-2xl max-w-[85%]", m.role === "user" ? "self-end bg-primary-500 text-white rounded-br-md" : "self-start bg-grey-100 text-[var(--text-primary)] rounded-bl-md")}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="shrink-0 p-3 border-t border-[var(--color-grey-100)] flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendAdjust(); } }}
                rows={1}
                placeholder="e.g. Tighten the CPL target to $600"
                className="flex-1 min-w-0 text-[14px] px-3 py-2 rounded-[8px] border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none placeholder:text-[#adb2ce]"
              />
              <button onClick={sendAdjust} disabled={!draft.trim() || adjust.isPending} className="flex items-center justify-center w-9 h-9 rounded-[8px] bg-primary-500 text-white disabled:opacity-40 shrink-0 cursor-pointer border-none transition-opacity" aria-label="Send">
                {adjust.isPending ? <Spinner size={16} /> : <PaperPlaneTilt size={16} weight="fill" />}
              </button>
            </div>
        </div>
      </div>

      <WizardFooter
        right={
          <>
            <PvButton variant="secondary" size="md" label="Cancel" onClick={onCancel} />
            <PvButton variant="primary" size="md" label="Save goal" icon={CheckCircle} onClick={() => setShowSave(true)} />
          </>
        }
      />

      {showSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSave(false)} />
          <div className="relative w-[440px] max-w-[94vw] bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">Save goal</h3>
              <PvButton variant="ghost" size="sm" icon={X} aria-label="Close" onClick={() => setShowSave(false)} />
            </div>
            <label className="block text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">Name this goal</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full text-[14px] px-3.5 py-2.5 rounded-lg border border-primary-500 outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <PvButton variant="secondary" size="md" label="Cancel" onClick={() => setShowSave(false)} />
              <PvButton variant="primary" size="md" label={save.isPending ? "Saving…" : "Save goal"} disabled={save.isPending} onClick={() => save.mutate()} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────── Active dashboard ───────────────────────── */
const SNOOZE_OPTIONS = ["1 day", "3 days", "1 week", "2 weeks", "Until next check-in"];

function RecommendationCard({ goal, rec, refetch, onOpen }) {
  const qc = useQueryClient();
  // pending = the action awaiting input ({ action }); reason = the note; snoozeFor = the snooze duration.
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [snoozeFor, setSnoozeFor] = useState("");
  const act = useMutation({
    mutationFn: (body) => apiPost(`/api/goals/${goal.id}/recommendations/${rec.id}/act`, body),
    onSuccess: () => { setPending(null); setReason(""); setSnoozeFor(""); qc.invalidateQueries({ queryKey: ["goal", goal.id] }); refetch(); },
  });
  const done = rec.status !== "open";
  const actNow = rec.severity === "act-now";
  const Icon = REC_ICONS[rec.iconKey] || Lightning;
  const tint = done
    ? { chip: "bg-grey-100 text-[var(--text-muted)]" }
    : actNow
      ? { chip: "bg-rose-50 text-rose-600" }
      : { chip: "bg-amber-50 text-amber-600" };
  const resolved = {
    acted: { icon: CheckCircle, cls: "text-green-600", label: "Done" },
    rejected: { icon: XCircle, cls: "text-[var(--text-muted)]", label: "Dismissed" },
    snoozed: { icon: ClockCounterClockwise, cls: "text-amber-600", label: rec.snoozeLabel ? `Snoozed · ${rec.snoozeLabel}` : "Snoozed" },
  }[rec.status];

  return (
    <div onClick={() => onOpen?.(rec.id)} className={cn("flex flex-col h-full p-4 rounded-xl border border-grey-100/50 transition-colors bg-white cursor-pointer dropshadow-card", done ? "opacity-80" : "hover:border-primary-300 hover:bg-primary-50")}>
      {/* Header: category + severity */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("flex items-center justify-center w-7 h-7 rounded-full shrink-0", tint.chip)}>
            <Icon size={15} weight="fill" />
          </span>
          <span className="text-[12px] font-medium text-[var(--text-muted)] truncate">{rec.category || rec.groupLabel}</span>
        </div>
        {!done && (
          <span className={cn("shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full", actNow ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
            {actNow ? "Now" : "Watch"}
          </span>
        )}
      </div>

      {/* Headline + body */}
      <p className={cn("text-[14px] font-semibold leading-snug mb-1.5", done ? "text-[#757A97]" : "text-[var(--text-primary)]")}>{rec.title}</p>
      <p className="text-[14px] text-[#757A97] leading-relaxed mb-3 line-clamp-3">{rec.body}</p>

      {/* Impact strip */}
      {rec.impact && (
        <div className="flex items-baseline gap-2 px-3 py-2 mb-3 rounded-lg bg-grey-50 border border-[var(--color-grey-100)]">
          <span className="text-[16px] font-semibold text-[var(--text-primary)] leading-none">{rec.impact.value}</span>
          <span className="text-[12px] text-[#757A97]">{rec.impact.label}</span>
          {rec.impact.sub && <span className="ml-auto text-[12px] text-[var(--text-muted)] whitespace-nowrap">{rec.impact.sub}</span>}
        </div>
      )}

      {/* Actions pinned to the bottom so cards align in the grid */}
      <div onClick={(e) => e.stopPropagation()} className="mt-auto pt-3 border-t border-[var(--color-grey-100)]">
        {done ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", resolved.cls)}>
                {(() => { const I = resolved.icon; return <I size={14} weight="fill" />; })()} {resolved.label}
              </span>
              <button onClick={() => act.mutate({ action: "open" })} className="text-[12px] font-medium text-[var(--text-muted)] hover:text-primary-600 bg-transparent border-none cursor-pointer">Undo</button>
            </div>
            {rec.reason && <p className="text-[12px] text-[var(--text-muted)] italic leading-snug">“{rec.reason}”</p>}
          </div>
        ) : pending ? (
          <div className="flex flex-col gap-2">
            {pending.action === "snoozed" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">Snooze for</label>
                <input
                  value={snoozeFor}
                  onChange={(e) => setSnoozeFor(e.target.value)}
                  autoFocus
                  placeholder="e.g. 2 weeks · until next month · after the launch"
                  className="w-full text-[12px] px-2.5 py-2 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setSnoozeFor(opt)}
                      className={cn("text-[12px] px-2 py-1 rounded-full border cursor-pointer transition-colors",
                        snoozeFor === opt ? "border-primary-400 text-primary-600 bg-primary-50" : "border-[var(--border-primary)] text-[#757A97] bg-white hover:border-primary-400")}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[12px] font-medium text-[var(--text-primary)]">
              {pending.action === "rejected" ? "Why are you dismissing this? (optional)"
                : pending.action === "acted" ? "What did you do? (optional)"
                : "Anything to note? (optional)"}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              autoFocus={pending.action !== "snoozed"}
              placeholder={pending.action === "rejected" ? "e.g. Never pause Brand Search, it's our best demo source" : "Add context for the next run…"}
              className="w-full text-[12px] px-2.5 py-2 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <PvButton
                variant="primary" size="sm"
                label={act.isPending ? "Saving…" : "Submit"}
                disabled={act.isPending || (pending.action === "snoozed" && !snoozeFor.trim())}
                onClick={() => act.mutate({ action: pending.action, snooze: snoozeFor.trim() || undefined, reason: reason.trim() || undefined })}
              />
              <button onClick={() => { setPending(null); setReason(""); setSnoozeFor(""); }} className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setReason(""); setPending({ action: "acted" }); }} disabled={act.isPending}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[14px] font-medium text-green-600 hover:bg-green-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <CheckCircle size={14} /> Acted
            </button>
            <button onClick={() => { setReason(""); setPending({ action: "rejected" }); }} disabled={act.isPending}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[14px] font-medium text-rose-600 hover:bg-rose-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <XCircle size={14} /> Reject
            </button>
            <button onClick={() => { setReason(""); setSnoozeFor(""); setPending({ action: "snoozed" }); }} disabled={act.isPending}
              className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[14px] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50 transition-colors">
              <ClockCounterClockwise size={14} /> Snooze
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Compact stat tile — used in the Overview and Monitor summary strips so each
   tab opens with a scannable status line before any detail. */
function StatTile({ icon: Icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 bg-white border border-[var(--color-grey-100)] rounded-xl">
      <span className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", tone || "bg-grey-100 text-[var(--text-muted)]")}>
        <Icon size={18} weight="fill" />
      </span>
      <div className="min-w-0">
        <p className="text-[18px] font-semibold text-[var(--text-primary)] leading-none">{value}</p>
        <p className="text-[12px] text-[#757A97] mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

/* Overview status card — uppercase label + icon on top, a colored figure, and a
   one-line read of what it means. Drives the Overview status strip. */
function OverviewStat({ label, icon: Icon, iconClass, num, numClass, word, desc }) {
  return (
    <div className="flex flex-col bg-white border border-grey-100/50 rounded-lg px-4 py-3.5 dropshadow-card">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{label}</span>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon size={20} weight="fill" className={iconClass} />}
        <span className="text-[14px] font-semibold leading-none">
          <span className={numClass}>{num}</span>{word && <span className="text-[var(--text-primary)]"> {word}</span>}
        </span>
      </div>
      <p className="text-[12px] text-[#757A97] leading-snug">{desc}</p>
    </div>
  );
}

/* One IMPACT / TRIGGER / SIGNAL sub-card inside the Top finding panel. */
function FindingStat({ label, value, sub }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-grey-100/50 bg-grey-50/50 px-3 py-2.5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug mt-1">{value}</p>
    </div>
  );
}

/* The single most important finding from the latest check-in, shown on the
   Overview tab. Makes the reasoning chain visible — finding · evidence · why it
   fired · worth · next best action — without opening the Recommendations tab. */
function TopFindingPanel({ rec, onOpen }) {
  const actNow = rec.severity === "act-now";
  const Icon = REC_ICONS[rec.iconKey] || Lightning;
  return (
    <div className="rounded-xl border border-grey-100/50 bg-white overflow-hidden dropshadow-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("flex items-center justify-center w-7 h-7 rounded-full shrink-0", actNow ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600")}><Icon size={15} weight="fill" /></span>
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">Top finding · {rec.category}</span>
        </div>
        <span className={cn("shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full", actNow ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>{actNow ? "Act now" : "Watch"}</span>
      </div>
      <div className="px-4 pb-4 flex flex-col gap-4">
        <div>
          <p className="text-[16px] font-semibold text-[var(--text-primary)] leading-snug">{rec.title}</p>
          {rec.body && <p className="text-[12px] text-[#757A97] leading-relaxed mt-1.5">{rec.body}</p>}
        </div>

        {/* Impact · Trigger · Signal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FindingStat label="Impact" value={rec.impact?.value} sub={rec.impact?.label} />
          <FindingStat label="Trigger" value={rec.triggerLabel} />
          <FindingStat label="Signal" value={rec.signal} />
        </div>

        <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-[var(--color-grey-100)]">
          <div className="min-w-[180px] flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Next best action</p>
            <p className="text-[14px] text-[var(--text-primary)] leading-snug mt-1">{rec.tldr}</p>
          </div>
          <div className="ml-auto shrink-0">
            <PvButton variant="primary" size="md" label="Open finding" icon={ArrowRight} iconPosition="suffix" onClick={() => onOpen(rec.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Parse the leading number (with $ / k / m) out of a target/current string.
function statusNum(s) {
  if (s == null) return null;
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([km])?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const u = (m[2] || "").toLowerCase();
  if (u === "k") n *= 1e3;
  if (u === "m") n *= 1e6;
  return n;
}

/* Goal status — the "am I winning?" reference at the top of the Overview, shown
   as attainment bars. Each bar reads "closeness to passing" (fuller = closer to
   winning, whichever direction the rule runs); amber for off, green for met, so
   it stays quiet under the hero finding. */
function GoalStatusLine({ targets }) {
  if (!targets?.length) return null;
  const onTrack = targets.filter((t) => t.met).length;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Goal status</p>
        <span className="text-[12px] text-[var(--text-muted)]"><span className="font-medium text-[var(--text-primary)]">{onTrack}</span> of {targets.length} on track</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {targets.map((t) => {
          const c = statusNum(t.current), tg = statusNum(t.target);
          // Closeness to passing: 100% when met; otherwise the failing side's
          // ratio toward the boundary (works for both "higher" and "lower" rules).
          const closeness = t.met ? 1 : (c != null && tg ? (c < tg ? c / tg : tg / c) : 0.3);
          const fill = Math.max(5, Math.min(100, closeness * 100));
          return (
            <div key={t.id} className="flex flex-col gap-2 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={cn("text-[16px] font-semibold leading-none", t.met ? "text-green-600" : "text-amber-600")}>{t.current ?? "—"}</span>
                <span className="text-[12px] text-[var(--text-muted)] tabular-nums">target {t.target}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-grey-100 overflow-hidden">
                <div className={cn("h-full rounded-full transition-[width]", t.met ? "bg-green-500" : "bg-amber-500")} style={{ width: `${fill}%` }} />
              </div>
              <span className="text-[12px] text-[#757A97] leading-snug line-clamp-2">{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* A quiet "door" to a deeper tab — low-contrast, flat. Used in the Overview's
   third tier so more findings / monitors are reachable without adding weight. */
function OverviewLink({ icon: Icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-3 px-3.5 py-3 rounded-lg border border-dashed border-primary-300 bg-primary-50/40 hover:bg-primary-50 hover:border-primary-400 text-left cursor-pointer transition-colors w-full">
      <Icon size={17} weight="fill" className="text-primary-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">{label}</p>
        {sub && <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      <ArrowRight size={15} weight="bold" className="shrink-0 text-primary-500 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

/* Monitor health — a compact read of the goal's monitors on the Overview tab,
   fired first. Sits beside the Top finding panel. */
function MonitorHealthPanel({ conditions, firingCount, onViewAll }) {
  const sorted = [...conditions].sort((a, b) => (b.state === "fired" ? 1 : 0) - (a.state === "fired" ? 1 : 0));
  return (
    <div className="rounded-xl border border-grey-100/50 bg-white overflow-hidden dropshadow-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">Monitor health</p>
        {firingCount > 0
          ? <span className="text-[12px] font-semibold text-amber-600">{firingCount} firing</span>
          : <span className="text-[12px] font-medium text-green-600">All quiet</span>}
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        {sorted.map((c) => {
          const fired = c.state === "fired";
          return (
            <div key={c.id} className={cn("flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg", fired ? "bg-rose-50/60 border border-rose-100" : "border border-transparent")}>
              <p className={cn("text-[12px] leading-snug", fired ? "text-[var(--text-primary)] font-medium" : "text-[#757A97]")}>{c.label}</p>
              <span className={cn("shrink-0 text-[10px] font-semibold", fired ? "text-rose-600" : "text-green-600")}>{fired ? "Fired" : "Quiet"}</span>
            </div>
          );
        })}
      </div>
      {onViewAll && (
        <button onClick={onViewAll} className="w-full px-4 py-2.5 text-[12px] font-medium text-primary-600 hover:bg-grey-50 bg-transparent border-none border-t border-[var(--color-grey-100)] cursor-pointer text-left">
          View all monitors →
        </button>
      )}
    </div>
  );
}

/* Monitor tab's right column: what to do next, derived from the top open
   finding — gives the side column a clear job beyond notes. */
function NextStepCard({ rec, firingCount, onOpen }) {
  if (!rec) {
    return (
      <div className="bg-white border border-[var(--border-primary)] rounded-xl p-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2"><CheckCircle size={15} weight="fill" className="text-green-500" /><p className="text-[14px] font-semibold text-[var(--text-primary)]">Next step</p></div>
        <p className="text-[12px] text-[#757A97] leading-relaxed">Monitors are quiet; nothing needs action right now. The moment a rule fires, the next step lands here.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-grey-100/50 rounded-xl overflow-hidden dropshadow-card">
      <div className="px-4 py-3 flex items-center gap-2">
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">Next step</p>
      </div>
      <div className="px-4 pb-3 flex flex-col gap-3">
        <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">{rec.title}</p>
        <p className="text-[12px] text-[#757A97] leading-relaxed">{rec.tldr}</p>
        {rec.impact && <p className="text-[12px] text-[var(--text-muted)]">{rec.impact.label}: <span className="font-semibold text-[var(--text-primary)]">{rec.impact.value}</span></p>}
        <PvButton variant="primary" size="md" label="Open finding" icon={ArrowRight} iconPosition="suffix" onClick={() => onOpen(rec.id)} />
      </div>
    </div>
  );
}

/* One monitored condition on the Monitor tab: human-readable label first, with
   the raw rule logic tucked behind "View rule logic" for the audit-minded. */
// Render a rule string with `code` chips for the numeric values.
function renderRuleText(text) {
  return text.split(/(`[^`]+`)/g).map((p, i) =>
    p.startsWith("`") && p.endsWith("`")
      ? <code key={i} className="px-1.5 py-0.5 rounded bg-grey-100 text-[12px] font-mono text-[var(--text-primary)]">{p.slice(1, -1)}</code>
      : <span key={i}>{p}</span>
  );
}

/* One labelled detail row inside an expanded monitor — a tree-connected line
   with an optional value chip (clean run-trace style). */
function MonitorDetail({ label, children }) {
  return (
    <div className="relative flex items-start gap-2 pl-4 py-1">
      <span className="absolute left-0 top-0 bottom-1/2 w-3 border-l border-b border-[var(--color-grey-200)] rounded-bl" />
      <span className="text-[12px] text-[var(--text-muted)] shrink-0 mt-0.5 min-w-[52px]">{label}</span>
      <div className="text-[12px] text-[#757A97] leading-relaxed min-w-0">{children}</div>
    </div>
  );
}

/* A monitoring signal as a clickable card (title + one-line description) that
   opens the trigger drawer. Replaces the in-place expand. */
function SignalCard({ condition, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-lg border border-[var(--color-grey-100)] bg-white p-4 hover:border-primary-300 hover:bg-[var(--color-primary-50)]/50 transition-colors cursor-pointer flex flex-col"
    >
      <div className="flex items-start gap-2">
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug flex-1">{condition.label}</p>
      </div>
      {(condition.description || condition.rule) && (
        <p className="text-[12px] text-[#757A97] leading-snug mt-1.5 line-clamp-2">{condition.description || condition.rule}</p>
      )}
      <span className="text-[12px] font-medium text-primary-600 mt-2.5">View details</span>
    </button>
  );
}

/* One labelled block in the trigger drawer. */
function TriggerSection({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

// Quick-fill prompts for the "describe the change" edit flow.
const TRIGGER_EDIT_SUGGESTIONS = [
  { label: "Require sustained evidence", text: "Keep this trigger, but only fire after two consecutive weeks above the threshold so a single-week spike doesn't set it off." },
  { label: "Add a quality threshold", text: "Add a quality guardrail: only fire when the downstream booked-demo rate stays within 5 percentage points of its baseline." },
  { label: "Make it a watch condition", text: "Make this a watch condition instead of act-now — hold it for confirmation before it recommends anything." },
];

/* Trigger detail drawer — same floaty right-side overlay as a recommendation's
   "View details", showing the metric/threshold checks, meaning, formula,
   feasibility, and recent values — plus a natural-language edit-trigger flow. */
function TriggerDrawer({ condition, onClose }) {
  const [editing, setEditing] = useState(false);
  const [changeText, setChangeText] = useState("");
  useEffect(() => { setEditing(false); setChangeText(""); }, [condition]);
  if (!condition) return <ChatOverlay isOpen={false} onClose={onClose} floating heading="Trigger details">{null}</ChatOverlay>;

  const checks = condition.checks || [[condition.label, condition.rule || condition.description || "—"]];
  const meaning = condition.meaning;
  const formula = condition.formula || condition.logic;
  const feasibility = condition.feasibility || "Passed — this monitor computes cleanly from the selected workflow.";
  const periods = condition.periods || [];

  return (
    <ChatOverlay isOpen={!!condition} onClose={onClose} floating heading="Trigger details" title={condition.label} headerIcon={Sliders} headerIconWeight="bold">
      <div className="h-full overflow-y-auto p-5 flex flex-col gap-4 bg-[var(--bg-primary)]">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{condition.label}</h3>
          {(condition.rule || condition.description) && <p className="text-[13px] text-[#757A97] mt-1.5 leading-relaxed">{condition.rule || condition.description}</p>}
        </div>

        <div className="rounded-lg border border-[var(--color-grey-100)] bg-grey-50 px-3.5 py-2.5 text-[12.5px] text-[#757A97] leading-snug">
          <span className="font-semibold text-[var(--text-primary)]">Active</span> · Derived from this goal's definition and evaluated against the selected workflow.
        </div>

        {editing ? (
          <>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Describe the change</p>
              <h4 className="text-[14px] font-semibold text-[var(--text-primary)] mt-1">What would you like to change about this trigger?</h4>
              <p className="text-[12px] text-[#757A97] mt-1 leading-snug">Petavue will translate your request into updated metrics and thresholds, then check that the workflow can support it.</p>
            </div>
            <textarea
              value={changeText}
              onChange={(e) => setChangeText(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Example: Keep this trigger, but require two consecutive weeks above the CPL threshold and only fire when booked-demo rate stays within 5 percentage points of baseline."
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none placeholder:text-[var(--text-muted)] leading-relaxed"
            />
            <div className="flex flex-wrap gap-1.5">
              {TRIGGER_EDIT_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setChangeText(s.text)}
                  className="text-[12px] font-medium px-2.5 py-1 rounded-full border border-[var(--border-primary)] text-primary-600 bg-white hover:border-primary-400 hover:bg-primary-50 cursor-pointer transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-snug">Changes are checked against the selected workflow before activation.</p>
            <div className="flex items-center gap-2 pt-1">
              <PvButton variant="secondary" size="md" label="Back to goal" icon={ArrowLeft} onClick={() => setEditing(false)} />
              <PvButton variant="primary" size="md" label="Save trigger change" disabled={!changeText.trim()} onClick={() => { toast.success("Trigger change submitted for review"); setEditing(false); setChangeText(""); }} className="ml-auto" />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {checks.map(([metric, threshold], i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Metric</p>
                    <p className="text-[12.5px] text-[var(--text-primary)] mt-0.5 leading-snug">{metric}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Threshold</p>
                    <p className="text-[12.5px] text-[var(--text-primary)] mt-0.5 leading-snug">{threshold}</p>
                  </div>
                </div>
              ))}
            </div>

            {meaning && <TriggerSection label="What this means"><p className="text-[12.5px] text-[#757A97] leading-relaxed">{meaning}</p></TriggerSection>}
            {formula && (
              <TriggerSection label="How Petavue calculates it">
                <div className="rounded-lg bg-grey-50 border border-[var(--color-grey-100)] px-3 py-2.5 text-[12px] font-mono text-[var(--text-primary)] leading-relaxed">{formula}</div>
              </TriggerSection>
            )}
            <TriggerSection label="Feasibility check">
              <p className="text-[12.5px] text-green-700 leading-snug">{feasibility}</p>
            </TriggerSection>
            {periods.length > 0 && (
              <TriggerSection label="Recent values">
                <div className="flex flex-wrap gap-1.5">
                  {periods.map((p, i) => <span key={i} className="px-2 py-1 rounded-md bg-grey-100 text-[12px] text-[#757A97] tabular-nums">{p}</span>)}
                </div>
              </TriggerSection>
            )}

            <div className="pt-1">
              <PvButton variant="secondary" size="md" label="Edit trigger" icon={PencilSimple} onClick={() => setEditing(true)} />
            </div>
          </>
        )}
      </div>
    </ChatOverlay>
  );
}

function MonitorRow({ condition, defaultOpen, onOpenFinding }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const fired = condition.state === "fired";
  const rule = condition.rule || condition.logic;
  return (
    <div>
      {/* Header — clickable, chevron on the right */}
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 w-full px-4 py-3 bg-transparent border-none cursor-pointer text-left hover:bg-grey-50 transition-colors">
        {fired
          ? <Warning size={16} className="shrink-0 text-rose-500" />
          : <Eye size={16} className="shrink-0 text-[var(--text-muted)]" />}
        <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--text-primary)] truncate">{condition.label}</span>
        <CaretDown size={16} className={cn("shrink-0 text-[var(--text-muted)] transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Body — animated, tree-indented details */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pl-[42px] pr-4 pb-4 flex flex-col gap-1">
              {condition.description && <p className="text-[12px] text-[#757A97] leading-relaxed mb-1">{condition.description}</p>}
              {condition.creates && (
                <MonitorDetail label="Creates">
                  {condition.findingCategory ? (
                    <button onClick={() => onOpenFinding?.(condition)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[12px] font-medium border-none cursor-pointer hover:bg-primary-100 transition-colors">
                      {condition.creates} <ArrowRight size={12} weight="bold" />
                    </button>
                  ) : (
                    <span className="text-[#757A97]">{condition.creates}</span>
                  )}
                </MonitorDetail>
              )}
              {rule && (
                <MonitorDetail label="Rule">
                  {condition.rule ? renderRuleText(condition.rule) : <code className="px-1.5 py-0.5 rounded bg-grey-100 text-[12px] font-mono text-[var(--text-primary)]">{condition.logic}</code>}
                </MonitorDetail>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Feedback tab — everything the customer has told us on this goal: decisions
   captured on recommendations (Acted / Dismissed / Snoozed + the reason) and
   comments left via the Comment panel. Read straight from the stored records. */
function FeedbackTab({ goal }) {
  const decisions = goal.checkIns.flatMap((ci) => ci.recommendations).filter((r) => r.status !== "open");
  const comments = goal.notes || [];
  const meta = {
    acted: { icon: CheckCircle, cls: "text-green-600", bg: "bg-green-50", label: "Acted" },
    rejected: { icon: XCircle, cls: "text-rose-600", bg: "bg-rose-50", label: "Dismissed" },
    snoozed: { icon: ClockCounterClockwise, cls: "text-amber-600", bg: "bg-amber-50", label: "Snoozed" },
  };

  if (!decisions.length && !comments.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 border border-dashed border-[var(--border-primary)] rounded-xl bg-white text-center">
        <ChatCircle size={26} className="text-[var(--text-muted)]" />
        <p className="text-[16px] font-medium text-[var(--text-primary)]">No feedback yet</p>
        <p className="text-[12px] text-[#757A97] max-w-[440px]">When you act on, dismiss, or snooze a recommendation (or leave a comment), it shows up here, and the engine factors it into the next check-in.</p>
      </div>
    );
  }

  // Unify decisions + comments into one readable activity timeline.
  const items = [
    ...decisions.map((r) => {
      const m = meta[r.status] || meta.acted;
      return {
        id: r.id, Icon: m.icon, cls: m.cls, bg: m.bg,
        label: m.label + (r.status === "snoozed" && r.snoozeLabel ? ` · ${r.snoozeLabel}` : ""),
        context: r.category, time: r.actedAgo, title: r.title,
        reason: r.reason, needsReason: true,
      };
    }),
    ...comments.map((n) => ({
      id: n.id, Icon: ChatCircle, cls: "text-primary-600", bg: "bg-primary-50",
      label: "Comment", context: null, time: n.at, title: null,
      reason: n.text, needsReason: false,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          const { Icon } = it;
          return (
            <li key={it.id} className="relative flex gap-3 pb-5 last:pb-0">
              {/* connector rail */}
              {!last && <span aria-hidden className="absolute left-[13.5px] top-8 -bottom-1 w-px bg-[var(--color-grey-100)]" />}
              <span className={cn("relative z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0 ring-4 ring-[#fcfcfc]", it.bg, it.cls)}><Icon size={15} weight="fill" /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={cn("text-[14px] font-semibold", it.cls)}>{it.label}</span>
                  {it.context && <span className="text-[12px] text-[var(--text-muted)]">· {it.context}</span>}
                  {it.time && <span className="ml-auto text-[12px] text-[var(--text-muted)] shrink-0">{it.time}</span>}
                </div>
                {it.title && <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug mt-1">{it.title}</p>}
                {it.reason
                  ? <p className="text-[14px] text-[#757A97] leading-relaxed mt-1">{it.reason}</p>
                  : it.needsReason && <p className="text-[12px] text-[var(--text-muted)] mt-1">No reason captured.</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[12px] text-[var(--text-muted)] flex items-start gap-1.5 pt-3 border-t border-[var(--color-grey-100)]"><Info size={14} className="mt-px shrink-0" /> The engine reads this on the next check-in: dismissed findings won't re-flag for the same reason, and snoozed ones return when their timer is up.</p>
    </div>
  );
}

/* Section card for the goal detail body — kicker + title + optional action.
   Same card language as the rest of Goals (white, grey-100 border, rounded-lg). */
function DetailCard({ kicker, title, copy, action, children }) {
  return (
    <div className="flex flex-col bg-white border border-[var(--color-grey-100)] rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{kicker}</p>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mt-0.5">{title}</h3>
        </div>
        {action}
      </div>
      {copy && <p className="text-[12px] text-[#757A97] mt-1 leading-snug">{copy}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* KPI stat — label + icon, big value, delta chip. `alert` tints the whole card
   when the number is the one demanding attention. */
// How far a metric has come toward its threshold, in both directions
// (a "≤ / <" target improves as the number falls).
function metricProgress(t) {
  const cur = parseFloat(String(t.current).replace(/[^0-9.]/g, ""));
  const tgt = parseFloat(String(t.target).replace(/[^0-9.]/g, ""));
  if (!isFinite(cur) || !isFinite(tgt) || !tgt || !cur) return t.met ? 100 : 55;
  const lowerIsBetter = /[≤<]/.test(String(t.target));
  const pct = lowerIsBetter ? (tgt / cur) * 100 : (cur / tgt) * 100;
  return Math.max(4, Math.min(100, Math.round(pct)));
}

/* A tracked metric as a progress row — label, bar toward the threshold, and the
   current reading. */
function MetricProgressRow({ target }) {
  const pct = metricProgress(target);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-[var(--text-primary)] truncate">{target.label}</span>
        <span className="shrink-0 text-[12px] text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">{target.current}</span> / {target.target}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 rounded-full bg-grey-100 overflow-hidden">
          <div className={cn("h-full rounded-full", target.met ? "bg-green-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
        </div>
        <span className={cn("shrink-0 text-[12px] font-semibold tabular-nums", target.met ? "text-green-600" : "text-rose-600")}>{pct}%</span>
      </div>
      {target.why && <p className="text-[11.5px] text-[var(--text-muted)] leading-snug">{target.why}</p>}
    </div>
  );
}

/* Signal row — an id-style chip on the left, a severity word on the right, and
   the plain-English line beneath. Used for triggers. */
function SignalRow({ chip, chipTone, severity, severityTone, text, onClick }) {
  const Wrap = onClick ? "button" : "div";
  return (
    <Wrap
      onClick={onClick}
      className={cn(
        "w-full text-left px-3.5 py-2.5 bg-transparent border-none",
        onClick && "cursor-pointer hover:bg-[var(--color-primary-50)] transition-colors"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap", chipTone)}>{chip}</span>
        <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide", severityTone)}>{severity}</span>
      </div>
      <p className="text-[13px] text-[var(--text-primary)] leading-snug">{text}</p>
    </Wrap>
  );
}

/* One tracked metric — label, where it stands vs its threshold, and why it matters. */
function GoalMetricRow({ target }) {
  return (
    <div className="rounded-lg border border-[var(--color-grey-100)] bg-grey-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">{target.label}</p>
        <span className={cn("shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap", target.met ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-700")}>
          {target.met ? "On target" : "Off target"}
        </span>
      </div>
      <div className="flex items-center gap-2.5 mt-1.5 text-[12px]">
        <span className="text-[#757A97]">Now <span className="font-semibold text-[var(--text-primary)] tabular-nums">{target.current}</span></span>
        <span className="text-[var(--color-grey-300)]">|</span>
        <span className="text-[#757A97]">Target <span className="font-semibold text-[var(--text-primary)] tabular-nums">{target.target}</span></span>
      </div>
      {target.why && <p className="text-[11.5px] text-[var(--text-muted)] mt-1.5 leading-snug">{target.why}</p>}
    </div>
  );
}

/* Compact recommendation row for the goal's active / archived queues. */
function GoalRecRow({ rec, onOpen }) {
  const done = rec.status !== "open";
  const meta = done
    ? { label: rec.status === "rejected" ? "Dismissed" : rec.status === "snoozed" ? "Snoozed" : "Acted", cls: "bg-green-50 text-green-600", Icon: CheckCircle }
    : rec.severity === "act-now"
      ? { label: "Act now", cls: "bg-rose-50 text-rose-600", Icon: Lightning }
      : { label: "Watch", cls: "bg-amber-50 text-amber-700", Icon: Eye };
  return (
    <button
      onClick={() => onOpen(rec.id)}
      className="w-full text-left rounded-lg border border-[var(--color-grey-100)] bg-white px-3 py-2.5 hover:bg-[var(--color-primary-50)] hover:border-primary-300 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap", meta.cls)}>
          <meta.Icon size={10} weight="fill" />{meta.label}
        </span>
        <span className="text-[11px] text-[var(--text-muted)] truncate">{rec.category}</span>
      </div>
      <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2">{rec.title}</p>
      {rec.impact?.value && (
        <p className="text-[12px] text-[#757A97] mt-1">Impact <span className="font-medium text-[var(--text-primary)]">{rec.impact.value}</span></p>
      )}
    </button>
  );
}

function ActiveGoal({ goal, refetch, showComment, setShowComment }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [recId, setRecId] = useState(null);
  const [triggerCond, setTriggerCond] = useState(null);
  const [tab, setTab] = useState("overview");
  const lastCheckIn = goal.checkIns[0];
  // Auto-grow the comment input up to 3 lines, then scroll (same as Sage's).
  const commentRef = useRef(null);
  const MAX_COMMENT_H = 80;
  useEffect(() => {
    const el = commentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMMENT_H)}px`;
    el.style.overflowY = el.scrollHeight > MAX_COMMENT_H ? "auto" : "hidden";
  }, [note, showComment]);

  const check = useMutation({
    mutationFn: () => apiPost(`/api/goals/${goal.id}/check-in`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goal", goal.id] }); refetch(); },
  });
  const addNote = useMutation({
    mutationFn: () => apiPost(`/api/goals/${goal.id}/notes`, { text: note.trim() }),
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: ["goal", goal.id] }); refetch(); },
  });

  const recs = lastCheckIn?.recommendations || [];
  const openRecs = recs.filter((r) => r.status === "open");
  const actNow = openRecs.filter((r) => r.severity === "act-now").length;
  const watching = openRecs.filter((r) => r.severity === "watch").length;
  const firingCount = goal.conditions.filter((c) => c.state === "fired").length;
  // Open the finding a monitor produced — links "Creates: X" to the recommendation.
  const openFinding = (condition) => {
    const rec = recs.find((r) => r.category === condition.findingCategory);
    if (rec) setRecId(rec.id);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">{goal.name}</h1>
          <p className="text-[14px] text-[#757A97] mt-1">{goal.statement}</p>
        </div>
      </div>

      {(() => {
        const fired = goal.conditions.filter((c) => c.state === "fired");
        const quietList = goal.conditions.filter((c) => c.state !== "fired");
        const archivedRecs = goal.checkIns.flatMap((ci) => ci.recommendations).filter((r) => r.status !== "open");
        return (
          <div className="flex flex-col gap-3 mt-5">
            {/* Headline — the check-in narrative, with a blue accent so it reads
                first. Falls back to a plain status line if there's no summary. */}
            {(() => {
              const status = actNow > 0
                ? `${actNow} recommendation${actNow > 1 ? "s" : ""} need${actNow > 1 ? "" : "s"} your decision`
                : firingCount > 0
                  ? `${firingCount} trigger${firingCount > 1 ? "s" : ""} firing — nothing to act on yet`
                  : "On track — all triggers quiet";
              const text = goal.checkIns?.[0]?.summary || status;
              return (
                <div className="rounded-xl border border-primary-100 bg-primary-50/40 px-4 py-3.5">
                  <p className="inline-flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-wider text-primary-600 mb-1.5">
                    <Sparkle size={13} weight="fill" /> Headline
                  </p>
                  <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{text}</p>
                </div>
              );
            })()}

            {/* Tabs — each area gets the full width instead of competing for it */}
            <div className="flex w-full shrink-0 border-b border-[var(--color-grey-100)]">
              <div className="flex items-start gap-6">
                {[
                  { k: "overview", label: "Overview" },
                  { k: "recommendations", label: "Recommendations", badge: openRecs.length },
                  { k: "monitor", label: "Monitor", badge: firingCount },
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className={cn(
                      "relative flex items-center gap-2 h-11 px-1 bg-transparent border-none cursor-pointer text-[14px] transition-colors",
                      tab === t.k ? "text-primary-500 font-medium" : "text-[var(--text-primary)] hover:text-primary-500"
                    )}
                  >
                    {t.label}
                    {t.badge > 0 && (
                      <span className={cn("px-1.5 py-0.5 text-[12px] font-semibold rounded-full", tab === t.k ? "bg-primary-500 text-white" : "bg-grey-100 text-[var(--text-muted)]")}>{t.badge}</span>
                    )}
                    {tab === t.k && (
                      <motion.span
                        layoutId="goalTabUnderline"
                        className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-primary-500"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Overview — the definition and where every number stands ── */}
            {tab === "overview" && (
              <div className="flex flex-col gap-3">
                <DetailCard kicker="Goal definition" title="What Petavue is working toward">
                  <p className="text-[13px] text-[#757A97] leading-relaxed">{goal.statement}</p>
                </DetailCard>

                <DetailCard kicker="Metrics being tracked" title="Where each number stands">
                  {goal.targets.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)]">No metrics bound yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {goal.targets.map((t) => (
                        <div key={t.id} className="rounded-lg border border-[var(--color-grey-100)] bg-grey-50 p-4">
                          <p className="text-[12px] text-[#757A97] leading-snug line-clamp-2">{t.label}</p>
                          <div className="flex items-baseline gap-2 mt-2.5">
                            <span className="text-[16px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">{t.current}</span>
                            <span className={cn("text-[12px] font-semibold", t.met ? "text-green-600" : "text-amber-600")}>{t.met ? "On target" : "Off target"}</span>
                          </div>
                          <p className="text-[12px] text-[var(--text-muted)] mt-1.5">Target {t.target}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </DetailCard>
              </div>
            )}

            {/* ── Recommendations — the queue this goal produced, live and closed ── */}
            {tab === "recommendations" && (
              <div className="flex flex-col gap-3">
                <DetailCard kicker="Current queue" title="Active recommendations" copy="Open, review-soon, and watchlist findings currently tied to this goal.">
                  {openRecs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-10 rounded-lg border border-dashed border-[var(--border-primary)] text-center">
                      <CheckCircle size={22} weight="fill" className="text-green-500" />
                      <p className="text-[13px] text-[#757A97]">Nothing open for this goal.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {[...openRecs].sort((a, b) => (a.severity === "act-now" ? 0 : 1) - (b.severity === "act-now" ? 0 : 1))
                        .map((r) => <GoalRecRow key={r.id} rec={r} onOpen={setRecId} />)}
                    </div>
                  )}
                </DetailCard>

                <DetailCard kicker="Recommendation history" title="Archived recommendations" copy="Recommendations that were acted on or closed for this goal.">
                  {archivedRecs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-10 rounded-lg border border-dashed border-[var(--border-primary)] text-center">
                      <ClockCounterClockwise size={22} className="text-[var(--text-muted)]" />
                      <p className="text-[13px] text-[#757A97]">No decisions recorded yet.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--color-grey-100)] overflow-hidden divide-y divide-[var(--color-grey-100)]">
                      {archivedRecs.map((r) => (
                        <SignalRow
                          key={r.id}
                          chip={r.category}
                          chipTone="bg-grey-100 text-[#757A97]"
                          severity={r.status === "rejected" ? "Dismissed" : r.status === "snoozed" ? "Snoozed" : "Acted"}
                          severityTone={r.status === "rejected" ? "text-[var(--text-muted)]" : r.status === "snoozed" ? "text-amber-600" : "text-green-600"}
                          text={r.title}
                          onClick={() => setRecId(r.id)}
                        />
                      ))}
                    </div>
                  )}
                </DetailCard>
              </div>
            )}

            {/* ── Monitor — the signals as cards; click one for its full detail ── */}
            {tab === "monitor" && (
              <DetailCard
                kicker="Monitoring signals"
                title="Signals set for this goal"
                copy="These signals define when Petavue creates, holds, or closes a recommendation. Open one for its metric, threshold, and how it's calculated."
              >
                {goal.conditions.length === 0 ? (
                  <p className="text-[12px] text-[var(--text-muted)]">No signals bound yet.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    {[...goal.conditions].sort((a, b) => (a.state === "fired" ? 0 : 1) - (b.state === "fired" ? 0 : 1))
                      .map((c) => <SignalCard key={c.id} condition={c} onOpen={() => setTriggerCond(c)} />)}
                  </div>
                )}
              </DetailCard>
            )}
          </div>
        );
      })()}

      {triggerCond && <TriggerDrawer condition={triggerCond} onClose={() => setTriggerCond(null)} />}


      {recId && <RecommendationDrawer goalId={goal.id} recId={recId} onClose={() => setRecId(null)} />}

      {/* Comment panel — same right-side drawer chrome as Sage, for consistency */}
      <ChatOverlay isOpen={showComment} onClose={() => setShowComment(false)} floating heading="Comments" headerIcon={ChatCircle} headerIconWeight="regular">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
            {goal.notes.length === 0 ? (
              <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">Leave a comment or instruction for this goal. It stays attached to its monitors and carries into future check-ins.</p>
            ) : (
              goal.notes.map((n) => (
                <div key={n.id} className="flex flex-col gap-1 px-3 py-2 bg-grey-50 rounded-lg">
                  <p className="text-[14px] text-[var(--text-primary)] leading-snug">{n.text}</p>
                  <span className="text-[12px] text-[var(--text-muted)]">{n.at}</span>
                </div>
              ))
            )}
          </div>
          <div className="shrink-0 p-3 flex items-end gap-2">
            <textarea
              ref={commentRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (note.trim()) addNote.mutate(); } }}
              rows={1}
              autoFocus
              placeholder="Add a comment, e.g. “Never pause Brand Search”"
              style={{ minHeight: "36px", maxHeight: `${MAX_COMMENT_H}px` }}
              className="flex-1 text-[14px] px-3 py-2 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none"
            />
            <PvButton variant="primary" size="md" icon={PaperPlaneRight} disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()} aria-label="Send" className="shrink-0" />
          </div>
        </div>
      </ChatOverlay>
    </>
  );
}

/* Header overflow menu: edit name/description · share with team · delete. */
function GoalMenu({ goal, onEdit, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => apiDelete(`/api/goals/${goal.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Goal deleted"); onDeleted(); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };
  const share = () => {
    setOpen(false);
    const url = window.location.href;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => toast.success("Goal link copied — share it with your team")).catch(() => toast.success("Goal link copied"));
    else toast.success("Goal link copied");
  };
  const remove = () => {
    setOpen(false);
    if (window.confirm(`Delete “${goal.name}”? This can't be undone.`)) del.mutate();
  };
  const item = "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left bg-transparent border-none cursor-pointer";
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={toggle} aria-label="Goal actions" className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-muted)] hover:bg-grey-100 hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer">
        <DotsThree size={20} weight="bold" />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="fixed z-[61] w-[230px] bg-white border border-[var(--border-primary)] rounded-lg shadow-lg py-1" style={{ top: pos.top, right: pos.right }}>
            <button onClick={() => { setOpen(false); onEdit(); }} className={cn(item, "hover:bg-grey-50 text-[var(--text-primary)]")}><PencilSimple size={16} className="text-[var(--text-muted)] shrink-0" /> Edit name &amp; description</button>
            <button onClick={share} className={cn(item, "hover:bg-grey-50 text-[var(--text-primary)]")}><ShareNetwork size={16} className="text-[var(--text-muted)] shrink-0" /> Share with team</button>
            <div className="my-1 border-t border-[var(--color-grey-100)]" />
            <button onClick={remove} className={cn(item, "hover:bg-rose-50 text-rose-600")}><Trash size={16} className="shrink-0" /> Delete</button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

/* Edit goal name & description modal. */
function EditGoalModal({ goal, onClose, onSaved }) {
  const [name, setName] = useState(goal.name || "");
  const [statement, setStatement] = useState(goal.statement || "");
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => apiPatch(`/api/goals/${goal.id}`, { name: name.trim(), statement: statement.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goal", goal.id] }); qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Goal updated"); onSaved(); },
    onError: (e) => toast.error("Update failed: " + e.message),
  });
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-[560px] max-w-[94vw] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border-t-[3px] border-[var(--color-primary-500)]"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)]">
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)] m-0">Edit goal</h3>
          <PvButton variant="ghost" size="sm" icon={X} aria-label="Close" onClick={onClose} />
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-primary)]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name"
              className="w-full text-[14px] px-3.5 py-2.5 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none text-[var(--text-primary)] placeholder:text-[#adb2ce]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-primary)]">Description</label>
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} placeholder="What this goal is about"
              className="w-full text-[14px] px-3.5 py-3 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none text-[var(--text-primary)] placeholder:text-[#adb2ce]" />
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-primary)]">
          <PvButton variant="secondary" size="md" label="Cancel" onClick={onClose} />
          <PvButton variant="primary" size="md" label={save.isPending ? "Saving…" : "Save"} disabled={save.isPending || !name.trim()} onClick={() => save.mutate()} />
        </div>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Router ───────────────────────── */
export default function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: goal, isLoading, refetch } = useQuery({
    queryKey: ["goal", id],
    queryFn: () => apiGet(`/api/goals/${id}`),
    refetchInterval: 1200,
  });

  const cancel = () => navigate("/goals");
  const crumb = goal?.name || "Goal";
  const [footerEl, setFooterEl] = useState(null);
  const [showComment, setShowComment] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sageOpen, setSageOpen] = useState(false);
  // Header actions (Comment / Ask Sage / Last checked) only apply to a live goal,
  // not the calibrating → review wizard phases.
  const goalIsActive = goal && !["calibrating", "decisions", "building", "review"].includes(goal.status);
  const lastCheckIn = goal?.checkIns?.[0] || null;
  const qc = useQueryClient();
  const runCheckIn = useMutation({
    mutationFn: () => apiPost(`/api/goals/${id}/check-in`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goal", id] }); refetch(); toast.success("Check-in complete"); },
  });

  return (
    <div className="flex flex-col w-full h-full">
      {/* Standard app header bar with breadcrumb (consistent with Dashboards) */}
      <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate("/goals")} className="text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0">Goals</button>
          <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
          <span className="block truncate text-[16px] leading-[24px] font-medium max-w-[420px] text-grey-900">{crumb}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {goalIsActive && lastCheckIn && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Last check-in <span className="font-medium text-[#757A97]">{lastCheckIn.at}</span>
            </span>
          )}
          {goalIsActive && (
            <>
              <PvButton
                variant="secondary" size="md"
                label={runCheckIn.isPending ? "Running…" : "Run check-in"}
                icon={runCheckIn.isPending ? CircleNotch : Play}
                disabled={runCheckIn.isPending}
                onClick={() => runCheckIn.mutate()}
                className={runCheckIn.isPending ? "[&_svg]:animate-spin" : undefined}
              />
              <button
                onClick={() => setSageOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium text-white border-none cursor-pointer transition-[filter] hover:brightness-105"
                style={{ background: SAGE_GRADIENT }}
              >
                <Sparkle size={14} weight="fill" /> Ask Sage
              </button>
            </>
          )}
          {goal && <GoalMenu goal={goal} onEdit={() => setEditOpen(true)} onDeleted={() => navigate("/goals")} />}
        </div>
      </div>

      <FooterSlot.Provider value={footerEl}>
        <div className="flex-1 min-h-0 overflow-y-auto bg-grey-50 p-4">
          <div className={cn(
            // The active goal grows to contain all its content (Goal rules included)
            // and the outer area scrolls; the wizard phases keep h-full so their own
            // panels can scroll internally.
            "flex flex-col min-h-full w-full bg-[#fcfcfc] rounded-xl",
            goal && ["calibrating", "decisions", "building", "review"].includes(goal.status)
              ? "h-full"
              : "border border-[var(--color-grey-100)] p-3"
          )}>
            {isLoading || !goal ? (
              <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)] mt-8"><Spinner size={18} /> Loading…</div>
            ) : goal.status === "calibrating" ? (
              <Calibrating goal={goal} onCancel={cancel} />
            ) : goal.status === "decisions" ? (
              <Decisions goal={goal} refetch={refetch} onCancel={cancel} />
            ) : goal.status === "building" ? (
              <Building goal={goal} onCancel={cancel} />
            ) : goal.status === "review" ? (
              <Review goal={goal} refetch={refetch} onCancel={cancel} />
            ) : (
              <ActiveGoal goal={goal} refetch={refetch} showComment={showComment} setShowComment={setShowComment} />
            )}
          </div>
        </div>
      </FooterSlot.Provider>

      {/* Page-wide footer slot — wizard phases portal their footer here */}
      <div ref={setFooterEl} className="shrink-0 w-full" />

      {editOpen && goal && <EditGoalModal goal={goal} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); refetch(); }} />}

      {/* Sage — launched from the header "Ask Sage" button; overlay only (no FAB) */}
      <SageWidget
        title={crumb}
        hidden={showComment}
        goal={goal ? { id: goal.id, name: goal.name } : null}
        open={sageOpen}
        onOpenChange={setSageOpen}
        fab={false}
      />
    </div>
  );
}
