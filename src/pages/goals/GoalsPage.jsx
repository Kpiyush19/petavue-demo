import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, Target, CheckCircle, ClockCounterClockwise, Play, CircleNotch, CaretRight, CaretDown, Lightning,
  DotsThree, XCircle, ArrowSquareOut, Lightbulb, Eye, Clock, Flag, Pulse, FlowArrow, MagnifyingGlass, Trash,
  Sparkle, PaperPlaneRight, Funnel, Info, Warning, ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Tooltip } from "@/ui";
import { Button as PvButton } from "@/ui";
import { apiGet, apiPost, apiPut, apiDelete } from "../../api";
import { cn } from "../../utils/cn";
import { FilterMenu } from "./FilterMenu";
import { RecommendationDetail } from "./RecommendationDrawer";
import { SageChat, SAGE_GRADIENT } from "./SageWidget";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import "../../components/dashboards/dashboard-viewer-widget/styles.css";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;

const HEALTH = {
  attention: { dot: "bg-rose-500", label: "Act now", text: "text-rose-600" },
  ontrack: { dot: "bg-green-500", label: "On track", text: "text-green-600" },
  setup: { dot: "bg-amber-500", label: "In setup", text: "text-amber-600" },
};
const SETUP_LABEL = { calibrating: "Calibrating", decisions: "Ready for review", review: "Ready for review" };

const NEEDS_COLS = "minmax(0,1fr) 180px 200px 84px 36px";
// Shared column layout for both goal lists: Goal · What we found · Priority ·
// Activity · Checked · kebab.
const GOALS_COLS = "minmax(0,1.3fr) minmax(0,1.9fr) 132px 150px 110px 44px";

/* ── Row kebab menu (portaled so it escapes section overflow) ── */
function RowMenu({ items, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 192) });
    }
    setOpen((o) => !o);
  };
  return (
    <div className="flex justify-center">
      <button ref={btnRef} onClick={toggle} disabled={disabled}
        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-grey-100 bg-transparent border-none cursor-pointer disabled:opacity-50" aria-label="Actions">
        <DotsThree size={18} weight="bold" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                className="fixed z-[61] w-48 bg-white border border-[var(--border-primary)] rounded-lg shadow-lg py-1"
                style={{ top: pos.top, left: pos.left, transformOrigin: "top right" }}
              >
                {items.map((it) => (
                  <button key={it.label} onClick={(e) => { e.stopPropagation(); it.onClick(); setOpen(false); }}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-left bg-transparent border-none cursor-pointer hover:bg-grey-50", it.danger ? "text-rose-600" : "text-[var(--text-primary)]")}>
                    {it.icon && <it.icon size={15} />} {it.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ── ThoughtSpot-style insight card: color-coded 2px top border, sharp corners,
      subtle hover lift. Used for the portfolio "Highlights" row. ── */
const INSIGHT_COLOR = {
  red: { bar: "#ef4444", txt: "text-rose-600" },
  amber: { bar: "#f59e0b", txt: "text-amber-600" },
  green: { bar: "#22c55e", txt: "text-green-600" },
  blue: { bar: "var(--color-primary-500)", txt: "text-primary-600" },
};
function InsightCard({ kind, color, icon: Icon, value, desc, foot, footIcon: FootIcon, onClick }) {
  const c = INSIGHT_COLOR[color] || INSIGHT_COLOR.blue;
  return (
    <div className="flex flex-col h-full bg-white border border-[var(--color-grey-100)] rounded-[8px] px-4 py-3.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{kind}</span>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon size={16} className={c.txt} />}
        <span className="text-[24px] font-semibold leading-none text-[var(--text-primary)]">{value}</span>
      </div>
      <p className="text-[12px] text-[#757A97] leading-snug">{desc}</p>
    </div>
  );
}

/* ── Column header cell with a Phosphor icon ── */
function HeaderCell({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--color-grey-500)] font-medium text-xs px-2">
      {Icon && <Icon size={13} />} {label}
    </span>
  );
}

/* ── Collapsible section with a proper heading ── */
function Section({ title, icon: Icon, iconClass, count, badge, open, onToggle, headerRight, children }) {
  return (
    <section className="bg-white border border-[var(--color-grey-100)] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.14)]">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-grey-50/60 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={18} weight="fill" className={cn("shrink-0", iconClass || "text-[var(--text-muted)]")} />}
          <h2 className="text-[14px] font-normal text-[var(--text-primary)] tracking-[-0.01em]">{title}</h2>
          {typeof count === "number" && (
            <span className={cn("px-1.5 py-0.5 text-[12px] font-semibold rounded-full", badge || "bg-grey-100 text-[var(--text-muted)]")}>{count}</span>
          )}
          <CaretDown size={15} className={cn("text-[var(--text-muted)] transition-transform ml-0.5", !open && "-rotate-90")} />
        </div>
        {headerRight}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── An "act now" recommendation row ── */
function AttentionRow({ item, onOpen, onOpenRec }) {
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: (action) => apiPost(`/api/goals/${item.goalId}/recommendations/${item.recId}/act`, { action, note: action === "snoozed" ? "Snoozed from home" : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals-attention"] }); qc.invalidateQueries({ queryKey: ["goals"] }); },
  });
  return (
    <motion.div
      layout
      initial={false}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="grid items-center gap-3 px-5 py-3 border-t border-[var(--color-grey-100)] hover:bg-grey-50/70 transition-colors overflow-hidden"
      style={{ gridTemplateColumns: NEEDS_COLS }}
    >
      <button onClick={() => onOpenRec(item.goalId, item.recId)} className="flex items-center gap-2 min-w-0 bg-transparent border-none p-0 cursor-pointer text-left">
        <Lightning size={14} weight="fill" className="text-rose-500 shrink-0" />
        <span className="text-[14px] font-medium text-[var(--text-primary)] truncate hover:text-primary-600">{item.title}</span>
      </button>
      <button onClick={() => onOpen(item.goalId)} className="text-[12px] font-medium text-primary-600 hover:underline truncate text-left bg-transparent border-none p-0 cursor-pointer">{item.goalName}</button>
      <span className="text-[12px] text-[#757A97] truncate">{item.groupLabel}</span>
      <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">{item.at}</span>
      <RowMenu
        disabled={act.isPending}
        items={[
          { label: "Mark done", icon: CheckCircle, onClick: () => act.mutate("acted") },
          { label: "Snooze", icon: ClockCounterClockwise, onClick: () => act.mutate("snoozed") },
          { label: "Dismiss", icon: XCircle, danger: true, onClick: () => act.mutate("rejected") },
        ]}
      />
    </motion.div>
  );
}

/* One mutually-exclusive bucket per goal — drives the "Your goals" filter tabs
   so a long list can be narrowed to a subset instead of scrolled. */
function goalBucket(g) {
  if (g.health === "setup") return "attention"; // needs setup / your input
  if (g.actNow > 0) return "actnow";
  if (g.watching > 0) return "watching";
  return "ontrack";
}
const GOAL_FILTERS = [
  { k: "all", label: "All" },
  { k: "actnow", label: "Act now" },
  { k: "attention", label: "Needs attention" },
  { k: "ontrack", label: "On track" },
  { k: "watching", label: "Watching" },
];

/* Filter for "Your goals" — design-system button trigger + portaled menu of
   buckets with live counts. */
function GoalFilterDropdown({ value, onChange, counts, total }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const current = GOAL_FILTERS.find((f) => f.k === value) || GOAL_FILTERS[0];
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: Math.max(8, r.right - 240) });
    }
    setOpen((o) => !o);
  };
  return (
    <div ref={ref} className="relative shrink-0">
      <PvButton variant="secondary" size="md" icon={Funnel} aria-label={`Filter goals: ${current.label}`} onClick={toggle} />
      {value !== "all" && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white pointer-events-none" />}
      {open && pos && (
        <FilterMenu
          pos={pos}
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
          options={GOAL_FILTERS.map((f) => ({ id: f.k, label: f.label, count: f.k === "all" ? total : (counts[f.k] || 0) }))}
        />
      )}
    </div>
  );
}

/* Priority pill — the first thing a triager reads: what should I do about this
   goal? Act now → Watch → On track → setup states. */
function goalPriority(goal) {
  const b = goalBucket(goal);
  if (b === "actnow") return { label: "Act now", icon: Lightning, cls: "bg-rose-50 text-rose-600" };
  if (b === "attention") return { label: "Needs attention", icon: Warning, cls: "bg-amber-50 text-amber-700" };
  if (b === "watching") return { label: "Watching", icon: Eye, cls: "bg-blue-50 text-blue-700" };
  return { label: "On track", icon: CheckCircle, cls: "bg-green-50 text-green-600" };
}

/* Shared row actions (open · delete) for both the triage cards and the table. */
function useGoalRowMenu(goal, onFull) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => apiDelete(`/api/goals/${goal.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goals-attention"] });
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] });
      toast.success("Goal deleted");
    },
    onError: (e) => toast.error("Couldn't delete: " + e.message),
  });
  const removeGoal = () => { if (window.confirm(`Delete “${goal.name}”? This can't be undone.`)) del.mutate(); };
  const items = [
    { label: "Open full view", icon: ArrowSquareOut, onClick: () => onFull(goal.id) },
    { label: del.isPending ? "Deleting…" : "Delete goal", icon: Trash, danger: true, onClick: removeGoal },
  ];
  return { items };
}

/* ── Shared column header for both goal lists. ── */
function GoalListHeader() {
  return (
    <div className="grid px-3 py-2 w-full" style={{ gridTemplateColumns: GOALS_COLS }}>
      <HeaderCell label="Goal" />
      <HeaderCell label="What we found" />
      <HeaderCell label="Priority" />
      <HeaderCell label="Activity" />
      <HeaderCell label="Checked" />
      <span />
    </div>
  );
}

/* ── The one goal row, used in BOTH "Where to act first" and "Your goals" so the
      two read as the same object — same columns, 12px, priority as a bg chip.
      Goal · Priority · Reason to open · Activity · Checked · menu. ── */
function GoalRow({ goal, onOpen, onFull }) {
  const { items: menuItems } = useGoalRowMenu(goal, onFull);
  const p = goalPriority(goal);
  const finding = goal.topFinding;
  const inSetup = goal.health === "setup";

  // Reason to open — the latest finding if there is one, otherwise a state line.
  const reason = finding
    ? finding.title
    : inSetup
      ? (goal.status === "calibrating" ? "Calibrating: reading your data" : "Ready for review: finish setup to start tracking")
      : "On track. Nothing needs action this check-in";

  return (
    <div
      className="grid items-center w-full px-3 h-[52px] shrink-0 bg-white border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all cursor-pointer"
      style={{ gridTemplateColumns: GOALS_COLS }}
      onClick={() => onOpen(goal)}
    >
      {/* Goal */}
      <span className="text-[12px] font-medium text-[var(--text-primary)] truncate px-2">{goal.name}</span>
      {/* What we found — secondary text */}
      <span className="text-[12px] text-[#757A97] truncate px-2">{reason}</span>
      {/* Priority — bg chip */}
      <span className="px-2">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap", p.cls)}><p.icon size={10} weight="fill" />{p.label}</span>
      </span>
      {/* Activity — parts joined by "|" */}
      <span className="px-2 flex items-center gap-1.5 min-w-0 text-[12px] text-[var(--text-muted)]">
        {(() => {
          const parts = [];
          if (goal.actNow > 0) parts.push(<span key="act" className="text-[var(--text-primary)] font-semibold whitespace-nowrap">{goal.actNow} to act</span>);
          if (goal.watching > 0 && goal.actNow === 0) parts.push(<span key="watch" className="whitespace-nowrap">{goal.watching} watching</span>);
          if (goal.firingCount > 0) parts.push(<span key="fire" className="whitespace-nowrap">{goal.firingCount} firing</span>);
          if (parts.length === 0) return <span>—</span>;
          return parts.flatMap((el, i) => i === 0 ? [el] : [<span key={`sep${i}`} className="text-[var(--color-grey-300)]">|</span>, el]);
        })()}
      </span>
      {/* Checked */}
      <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap truncate px-2">{goal.lastCheckIn || "Not run yet"}</span>
      {/* Action — kebab (Run check-in / Open full view / Delete live inside it) */}
      <div className="px-2 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
        <RowMenu items={menuItems} />
      </div>
    </div>
  );
}

/* ── Recommendations tab: highlights + filters + queue + detail ── */

// One bucket per recommendation — drives the status chip (our goalPriority
// language) and which filter it falls under.
function recMeta(item) {
  if (item.status !== "open")
    return { key: "archived", label: item.status === "rejected" ? "Dismissed" : "Acted", cls: "text-green-600 border border-green-200", icon: CheckCircle };
  if (item.severity === "act-now")
    return { key: "act-now", label: "Act now", cls: "text-rose-600 border border-rose-200", icon: Lightning };
  if ((item.tier || 2) <= 2)
    return { key: "needs-review", label: "Review soon", cls: "text-amber-700 border border-amber-200", icon: Warning };
  return { key: "watchlist", label: "Watch", cls: "text-blue-700 border border-blue-200", icon: Eye };
}

const parseMoney = (v) => {
  const m = String(v || "").match(/\$?\s*([\d.]+)\s*([KkMm])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (/[Kk]/.test(m[2] || "")) n *= 1000;
  if (/[Mm]/.test(m[2] || "")) n *= 1e6;
  return n;
};
const fmtMoney = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`);

// Recommendation lifecycle filters, keyed to rec.status. "Accepted" maps to our
// internal "acted" status; "Archived" is a distinct filed-away state.
const REC_FILTERS = [
  { k: "all", label: "All", status: null },
  { k: "open", label: "Open", status: "open" },
  { k: "snoozed", label: "Snoozed", status: "snoozed" },
  { k: "accepted", label: "Accepted", status: "acted" },
  { k: "rejected", label: "Rejected", status: "rejected" },
  { k: "archived", label: "Archived", status: "archived" },
];

// Queue card in our card language: goalPriority-style status chip, muted
// category + rank, primary-50 hover / selected, and Impact · Why now in the
// same label→value read as the detail panel's metric rows.
function RecCard({ item, selected, onClick }) {
  const m = recMeta(item);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-[8px] border bg-white p-3.5 transition-all cursor-pointer flex flex-col gap-2",
        selected
          ? "bg-primary-50 border-primary-500 shadow-[0_4px_4px_rgba(54,97,237,0.08)]"
          : "border-[var(--color-grey-100)] hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)]",
        item.status !== "open" && !selected && "opacity-70"
      )}
    >
      <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2">{item.title}</p>
      {item.tldr && <p className="text-[12px] text-[#757A97] leading-snug line-clamp-1">{item.tldr}</p>}
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide rounded-full whitespace-nowrap", m.cls)}>
          <m.icon size={10} weight="regular" />{m.label}
        </span>
      </div>
    </button>
  );
}

// Goal scope — a listbox-style title dropdown (truncating trigger + chevron,
// portaled radio menu), the product pattern rather than a native <select>.
function GoalScopeDropdown({ value, onChange, goals }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const allLabel = `All goals`;
  const label = value === "all" ? allLabel : (goals.find((g) => g.id === value)?.name || allLabel);
  const options = [{ id: "all", name: allLabel }, ...goals];
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: Math.max(320, Math.min(460, r.width + 160)) });
    }
    setOpen((o) => !o);
  };
  return (
    <div ref={ref} className="min-w-0">
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className="flex items-center gap-1.5 min-w-0 max-w-[440px] bg-transparent border-none p-0 cursor-pointer"
      >
        <span className="block truncate text-[14px] leading-[22px] font-normal text-[var(--text-primary)]">{label}</span>
        <CaretDown size={16} className={cn("shrink-0 text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
      </button>
      {open && pos && (
        <FilterMenu
          pos={pos}
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
          searchable
          searchPlaceholder="Search goals…"
          options={options.map((o) => ({ id: o.id, label: o.name }))}
        />
      )}
    </div>
  );
}

// Sage requires one goal for context. Rendered in the shared floaty ChatOverlay
// (full page height); it never dead-ends: with no goal scoped it opens on a goal
// picker, and once a goal is chosen it becomes the live Sage chat for that goal
// (that choice also scopes the queue).
function RecSageDrawer({ open, onClose, goals, selected, onSelect }) {
  return (
    <ChatOverlay isOpen={open} onClose={onClose} floating heading="Sage" title={selected ? selected.name : "Sage"}>
      {selected ? (
        <div className="flex flex-col h-full">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-grey-100)] bg-grey-50">
            <Target size={13} className="text-[var(--text-muted)] shrink-0" />
            <span className="text-[12px] text-[#757A97] truncate flex-1">Context: <span className="font-medium text-[var(--text-primary)]">{selected.name}</span></span>
            <button onClick={() => onSelect("all")} className="shrink-0 text-[12px] text-primary-600 hover:underline bg-transparent border-none cursor-pointer">Change</button>
          </div>
          <div className="flex-1 min-h-0">
            <SageChat key={selected.id} goal={selected} />
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-4 flex flex-col gap-3">
          <div className="rounded-lg border border-[var(--color-grey-100)] bg-grey-50 p-3.5">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">Sage needs a goal for context</p>
            <p className="text-[12px] text-[#757A97] mt-1 leading-relaxed">Pick the goal you want to ask about. Sage answers against that goal's target, monitors, and recommendations.</p>
          </div>
          <div className="flex flex-col gap-2">
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => onSelect(g.id)}
                className="flex items-center gap-2.5 text-left px-3.5 py-3 rounded-lg border border-[var(--color-grey-100)] bg-white hover:border-primary-400 hover:bg-primary-50 cursor-pointer transition-colors"
              >
                <Target size={15} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-[13px] font-medium text-[var(--text-primary)] flex-1 min-w-0">{g.name}</span>
                <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </ChatOverlay>
  );
}

// One shimmering grey block — the skeleton primitive.
const Skel = ({ className }) => <div className={cn("rounded bg-grey-100 animate-pulse", className)} />;

// Loading placeholder that mirrors the two-pane recommendations layout: a queue
// of card skeletons on the left, a decision-panel skeleton on the right.
function RecSkeleton() {
  return (
    <div className="flex-1 min-h-0 flex">
      {/* Left: filter + queue cards */}
      <div className="w-[400px] shrink-0 flex flex-col border-r border-[var(--color-grey-100)] overflow-hidden">
        <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-[var(--color-grey-100)]">
          <Skel className="h-5 w-28" />
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[8px] border border-[var(--color-grey-100)] bg-white p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Skel className="h-4 w-16 rounded-full" />
                <Skel className="h-3 w-24" />
              </div>
              <Skel className="h-4 w-full" />
              <Skel className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
      {/* Right: decision panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-5 py-4 flex flex-col gap-[10px]">
          <Skel className="h-6 w-2/3" />
          <Skel className="h-4 w-1/2" />
          <div className="flex items-center justify-between gap-3">
            <Skel className="h-4 w-40" />
            <Skel className="h-8 w-28 rounded-[8px]" />
          </div>
          <div className="grid grid-cols-3 gap-px rounded-[8px] border border-[var(--color-grey-100)] overflow-hidden bg-[var(--color-grey-100)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white px-3 py-2.5 flex flex-col gap-1.5">
                <Skel className="h-2.5 w-16" />
                <Skel className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-4 flex flex-col gap-5">
          <Skel className="h-20 w-full rounded-[8px]" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <Skel className="h-3 w-24" />
              <Skel className="h-4 w-full" />
              <Skel className="h-4 w-11/12" />
              <Skel className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecommendationsPanel({ onOpenGoal }) {
  const { data, isLoading } = useQuery({ queryKey: ["goals-recommendations"], queryFn: () => apiGet("/api/goals/recommendations"), refetchInterval: 2500 });
  const items = data?.items || [];
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("all");
  const [goalScope, setGoalScope] = useState("all");
  const [sageOpen, setSageOpen] = useState(false);

  // Distinct goals present in the queue — drive both the scope selector and the
  // Sage goal picker so a single choice governs both.
  const goalOptions = [...new Map(items.map((i) => [i.goalId, i.goalName])).entries()].map(([id, name]) => ({ id, name }));
  const selectedGoal = goalScope === "all" ? null : goalOptions.find((g) => g.id === goalScope) || null;
  const scoped = goalScope === "all" ? items : items.filter((i) => i.goalId === goalScope);

  const counts = { all: scoped.length };
  REC_FILTERS.forEach((f) => { if (f.status != null) counts[f.k] = scoped.filter((i) => i.status === f.status).length; });
  const curF = REC_FILTERS.find((f) => f.k === filter) || REC_FILTERS[0];
  const filtered = curF.status == null ? scoped : scoped.filter((i) => i.status === curF.status);
  const selected = filtered.find((i) => i.recId === sel) || filtered[0];

  // Summary strip — the paid-spend use case's headline signals. The first tile
  // (Needs review) reflects the scoped act-now count; the rest read from the goal.
  const actNowCount = scoped.filter((i) => recMeta(i).key === "act-now").length;
  const summaryTiles = [
    { kind: "Needs review", color: "red", icon: Lightning, value: String(actNowCount), desc: "act-now recommendations" },
    { kind: "Inefficient spend", color: "amber", icon: Flag, value: "$2.4K", desc: "LinkedIn above CPL baseline / wk" },
    { kind: "Blended CPL", color: "blue", icon: Target, value: "$642", desc: "target ≤ $610" },
  ];

  const scopeSelect = (id) => { setGoalScope(id); setSel(null); };

  return (
    <div className="relative flex flex-col h-full">
      {/* Scope + Ask Sage, then the summary strip */}
      <div className="shrink-0 border-b border-[var(--color-grey-100)] px-4 py-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Target size={15} weight="bold" className="text-[var(--text-muted)] shrink-0" />
            <GoalScopeDropdown value={goalScope} onChange={scopeSelect} goals={goalOptions} />
          </div>
          <button
            type="button"
            onClick={() => setSageOpen(true)}
            className="inline-flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-[8px] text-[12px] font-medium text-white border-none cursor-pointer transition-[filter] hover:brightness-105"
            style={{ background: SAGE_GRADIENT }}
          >
            <Sparkle size={14} weight="fill" /> Ask Sage
          </button>
        </div>
        <div className="hidden grid-cols-3 gap-1 p-1 rounded-lg bg-grey-50 border border-[var(--color-grey-100)]">
          {summaryTiles.map((t, i) => (
            <InsightCard key={i} kind={t.kind} color={t.color} icon={t.icon} value={t.value} desc={t.desc} />
          ))}
        </div>
      </div>

      <RecSageDrawer open={sageOpen} onClose={() => setSageOpen(false)} goals={goalOptions} selected={selectedGoal} onSelect={scopeSelect} />

      {isLoading ? (
        <RecSkeleton />
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
          <CheckCircle size={26} weight="fill" className="text-green-500" />
          <p className="text-[16px] font-medium text-[var(--text-primary)]">You're all caught up</p>
          <p className="text-[14px] text-[#757A97] max-w-[380px]">No moves to make right now. We'll flag anything wasting spend or leaving demand on the table the moment it shows up.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">
          {/* Left: filters + rich queue */}
          <div className="w-[400px] shrink-0 flex flex-col border-r border-[var(--color-grey-100)] overflow-hidden">
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[var(--color-grey-100)] overflow-x-auto">
              {REC_FILTERS.map((f) => {
                const active = filter === f.k;
                const count = f.k === "all" ? counts.all : (counts[f.k] || 0);
                return (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => { setFilter(f.k); setSel(null); }}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium border transition-colors whitespace-nowrap cursor-pointer",
                      active
                        ? "bg-primary-50 border-primary-500 text-primary-700"
                        : "bg-white border-[var(--color-grey-100)] text-[var(--text-muted)] hover:bg-grey-50"
                    )}
                  >
                    {f.label}
                    <span className={cn("tabular-nums text-[11px]", active ? "text-primary-600" : "text-[var(--text-muted)]")}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
                  <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                  <p className="text-[13px] text-[#757A97]">Nothing in this filter.</p>
                </div>
              ) : (
                filtered.map((it) => (
                  <RecCard key={it.recId} item={it} selected={selected?.recId === it.recId} onClick={() => setSel(it.recId)} />
                ))
              )}
            </div>
          </div>
          {/* Right: decision detail (+ its own View details drawer) */}
          <div className="flex-1 min-w-0">
            {selected && <RecommendationDetail key={selected.recId} goalId={selected.goalId} recId={selected.recId} onOpenGoal={onOpenGoal} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("recommendations");
  const [goalFilter, setGoalFilter] = useState("all");
  const [goalSearch, setGoalSearch] = useState("");
  // "Run now" — force an immediate check-in instead of waiting for the schedule.
  const [checking, setChecking] = useState(false);
  const [ranJustNow, setRanJustNow] = useState(false);
  const runNow = () => {
    setChecking(true);
    Promise.all([
      qc.invalidateQueries({ queryKey: ["goals"] }),
      qc.invalidateQueries({ queryKey: ["goals-recommendations"] }),
      qc.invalidateQueries({ queryKey: ["goals-attention"] }),
    ]).finally(() => { setChecking(false); setRanJustNow(true); toast.success("Check-in complete"); });
  };
  const { data: recData } = useQuery({ queryKey: ["goals-recommendations"], queryFn: () => apiGet("/api/goals/recommendations"), refetchInterval: 2500 });
  const recCount = (recData?.items || []).filter((r) => r.status === "open").length;
  const { data: goalsData } = useQuery({ queryKey: ["goals"], queryFn: () => apiGet("/api/goals"), refetchInterval: 2500 });
  const { data: attn } = useQuery({ queryKey: ["goals-attention"], queryFn: () => apiGet("/api/goals/attention"), refetchInterval: 2500 });
  const goals = goalsData?.goals || [];
  const items = attn?.items || [];
  const attentionGoals = goals.filter((g) => g.health === "attention").length;
  const onTrack = goals.filter((g) => g.health === "ontrack").length;
  const setup = goals.filter((g) => g.health === "setup").length;

  // Portfolio "Highlights" — four lenses on the goal portfolio: what to do now,
  // what's off track, what's healthy, and what's being watched (lower priority).
  // Derived from the live check-in queue, so the counts stay honest: goals that
  // need a decision, watch items awaiting confirmation, and goals still inside
  // their guardrails.
  const openRecs = (recData?.items || []).filter((r) => r.status === "open");
  const monitoredGoalIds = new Set((recData?.items || []).map((r) => r.goalId));
  const actNowGoalIds = new Set(openRecs.filter((r) => r.severity === "act-now").map((r) => r.goalId));
  const needsReviewGoals = actNowGoalIds.size;
  const watchlistCount = openRecs.filter((r) => r.severity === "watch" && (r.tier || 2) <= 2).length;
  const onTrackGoals = Math.max(0, monitoredGoalIds.size - actNowGoalIds.size);
  const insights = [
    { kind: "Needs review", color: "red", icon: Lightning, value: String(needsReviewGoals),
      desc: `goal${needsReviewGoals !== 1 ? "s" : ""} with act-now recommendations` },
    { kind: "Watchlist", color: "blue", icon: Eye, value: String(watchlistCount),
      desc: `recommendation${watchlistCount !== 1 ? "s" : ""} held for confirmation` },
    { kind: "On track", color: "green", icon: CheckCircle, value: String(onTrackGoals),
      desc: `goal${onTrackGoals !== 1 ? "s" : ""} currently within guardrails` },
  ];

  // Every goal opens its full detail page (no overlay).
  const openGoal = (goalOrId) => {
    const id = typeof goalOrId === "string" ? goalOrId : goalOrId?.id;
    if (id) navigate(`/goals/${id}`);
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Sub-tab bar (Goals · Recommendations) */}
      <div className="flex w-full shrink-0 bg-white border-b border-[var(--color-grey-100)]">
        <div className="flex items-start gap-6 px-4">
          {[{ k: "recommendations", label: "Recommendations" }, { k: "goals", label: "Goals" }].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                "flex items-center gap-2 h-12 px-2 border-b-2 bg-transparent cursor-pointer text-[14px] transition-colors",
                tab === t.k ? "text-primary-500 font-medium border-primary-500" : "text-[var(--text-primary)] border-transparent hover:text-primary-500"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboards-style frame: grey-50 padded area with the page in a white panel */}
      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">
          {tab === "goals" ? (
            <div className="w-full h-full overflow-y-auto">
              <div className="flex flex-col w-full p-3">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-grey-50 border border-[var(--color-grey-100)] mb-8">
                  {insights.map((ins) => <InsightCard key={ins.kind} {...ins} />)}
                </div>

                {/* ── Your goals — full list, columnar row + header ── */}
                {(() => {
                  const q = goalSearch.trim().toLowerCase();
                  const counts = goals.reduce((m, g) => { const b = goalBucket(g); m[b] = (m[b] || 0) + 1; return m; }, {});
                  const filtered = goals.filter((g) =>
                    (goalFilter === "all" || goalBucket(g) === goalFilter) &&
                    (!q || g.name.toLowerCase().includes(q))
                  );
                  return (
                    <>
                      <div id="your-goals" className="flex items-center gap-3 mb-3 scroll-mt-4 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-[14px] font-normal text-[var(--text-primary)] tracking-[-0.01em]">Your goals</h2>
                          <span className="px-1.5 py-0.5 text-[12px] font-semibold rounded-full bg-grey-100 text-[var(--text-muted)]">{goals.length}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          {goals.length > 0 && (
                            <>
                              {/* Search — consistent 320px design-system style */}
                              <div className="flex items-center gap-2 w-80 h-8 border border-grey-200 rounded-lg bg-white focus-within:border-primary-500 hover:border-primary-300 px-3 transition-colors">
                                <MagnifyingGlass size={16} weight="regular" className="text-grey-500 shrink-0" />
                                <input
                                  value={goalSearch}
                                  onChange={(e) => setGoalSearch(e.target.value)}
                                  placeholder="Search goals"
                                  className="flex-1 min-w-0 border-none outline-none bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-grey-500 p-0"
                                />
                              </div>
                              {/* Filter — 32×32 icon-only secondary button, after the search */}
                              <GoalFilterDropdown value={goalFilter} onChange={setGoalFilter} counts={counts} total={goals.length} />
                            </>
                          )}
                          <PvButton variant="primary" size="md" label="Manage Goals" icon={Target} onClick={() => {}} />
                        </div>
                      </div>

                      {goals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-14 border border-[var(--border-primary)] rounded-lg text-center">
                          <Target size={24} className="text-[var(--text-muted)]" />
                          <p className="text-[14px] text-[#757A97] max-w-[460px]">No goals yet. Once a goal is set, we'll watch your paid spend for waste and the demand you're missing, and tell you where the next dollar should go.</p>
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-10 border border-dashed border-[var(--border-primary)] rounded-lg text-center">
                          <MagnifyingGlass size={20} className="text-[var(--text-muted)]" />
                          <p className="text-[14px] text-[#757A97]">No goals match{q ? ` “${goalSearch.trim()}”` : " this filter"}.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col w-full">
                          <GoalListHeader />
                          <div className="flex flex-col gap-2">
                            {filtered.map((g) => <GoalRow key={g.id} goal={g} onOpen={openGoal} onFull={(gid) => navigate(`/goals/${gid}`)} />)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <RecommendationsPanel onOpenGoal={openGoal} />
          )}
        </div>
      </div>

    </div>
  );
}
