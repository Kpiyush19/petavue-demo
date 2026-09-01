import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X, CheckCircle, CaretDown, Lightning, Eye, MagnifyingGlass, Sparkle, Funnel, Warning,
} from "@phosphor-icons/react";
import {
  apiGet, apiPost, getApiBase, getAuthToken,
} from "../../api";
import { Tooltip } from "@/ui";
import { cn } from "../../utils/cn";
import { FilterMenu } from "./FilterMenu";
import { AGENTS } from "../../mocks/agentWorkflows";
import WorkflowGlyph from "../../components/WorkflowGlyph";
import { RecommendationDetail } from "./RecommendationDrawer";
import { SAGE_GRADIENT } from "./SageWidget";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import { AnalyticsChat } from "../../components/dashboards/analytics-chat-widget";
import { PUSHER_KEY, PUSHER_CLUSTER } from "../../config";
import "../../components/dashboards/dashboard-viewer-widget/styles.css";
import "../../components/dashboards/analytics-chat-widget/styles.css";






/* One mutually-exclusive bucket per goal — drives the "Your goals" filter tabs
   so a long list can be narrowed to a subset instead of scrolled. */
function goalBucket(g) {
  if (g.health === "setup") return "attention"; // needs setup / your input
  if (g.actNow > 0) return "actnow";
  if (g.watching > 0) return "watching";
  return "ontrack";
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


/* ── Recommendation status filter — a single button that opens the shared
   menu, rather than a row of pills that had to scroll sideways. ── */
function RecFilterDropdown({ value, onChange, counts, options }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const current = options.find((f) => f.k === value) || options[0];
  const count = value === "all" ? counts.all : counts[value] || 0;
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: Math.max(200, r.width) });
    }
    setOpen((o) => !o);
  };
  return (
    <div ref={ref} className="shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[12px] font-medium bg-white border border-[var(--color-grey-200)] text-[var(--text-primary)] cursor-pointer hover:border-primary-300 transition-colors"
      >
        <Funnel size={14} className="text-[var(--text-muted)]" />
        {current.label}
        <span className="tabular-nums text-[var(--text-muted)]">{count}</span>
        <CaretDown size={13} className={cn("text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
      </button>
      {open && pos && (
        <FilterMenu
          pos={pos}
          value={value}
          onSelect={onChange}
          onClose={() => setOpen(false)}
          minWidth={200}
          options={options.map((f) => ({
            id: f.k,
            label: f.label,
            count: f.k === "all" ? counts.all : counts[f.k] || 0,
          }))}
        />
      )}
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
// Filters speak the same language as the chips on the cards. They used to be
// lifecycle states (Open / Snoozed / Accepted / Rejected / Archived), which
// meant a queue full of "ACT NOW" chips had no way to filter to act-now, and
// three of the six options were permanently zero. These keys are recMeta()'s.
const REC_FILTERS = [
  { k: "all", label: "All" },
  { k: "act-now", label: "Act now" },
  { k: "needs-review", label: "Review soon" },
  { k: "watchlist", label: "Watch" },
  { k: "archived", label: "Done" },
];

// A queue row, not a card: the data-hub sidebar pattern — flat, hairline
// separated, 3px accent on the active one. Only the title. The chip, the agent
// mark and the workflow name all repeat on the detail pane a few hundred pixels
// to the right, so on the row they were noise you read twice.
function RecCard({ item, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        // Every edge width set explicitly. `border-0` here silently beat the
        // container's divide-y, the same way `border-none` once killed the tab
        // underline — so the separator lives on the row itself.
        "w-full text-left flex items-center min-h-[46px] px-3 py-2.5 cursor-pointer transition-colors",
        "border-solid border-t-0 border-r-0 border-b border-b-[var(--color-grey-100)] border-l-[3px] border-l-transparent",
        selected ? "bg-primary-50 border-l-primary-500" : "bg-transparent hover:bg-primary-50",
        item.status !== "open" && !selected && "opacity-60",
      )}
    >
      {/* One line. The full sentence is on hover and, in full, on the detail
          pane beside it. */}
      <Tooltip title={item.title} placement="right">
        <span
          className={cn(
            "min-w-0 truncate text-[14px] text-[var(--text-primary)]",
            selected && "font-medium",
          )}
        >
          {item.title}
        </span>
      </Tooltip>
    </button>
  );
}

// Sage opens on the recommendation you are looking at, not on the queue.
// Asking "what should I approve first" while staring at one specific decision
// was answering a question nobody had. Follow-ups name the agent and the
// workflow behind THIS finding.
function recFollowups(ctx) {
  const qs = [
    "Why is this being recommended?",
    ctx.agentLabel ? `What did ${ctx.agentLabel} actually find?` : "What did the agent actually find?",
    "What happens if I don't act on this?",
  ];
  return qs.map((q) => ({ question: q, grounded_in: ctx.name, grounded_type: "recommendation" }));
}

function GoalSagePanel({ context }) {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  useEffect(() => {
    let alive = true;
    setSessionId(null);
    // The chat session is still opened against the goal underneath; what the
    // user sees and what Sage is told to talk about is the recommendation.
    apiPost(`/api/goals/${context.goalId}/chat`, {}).then((res) => {
      if (alive) setSessionId(res?.session_id || res?.session?.session_id || null);
    });
    return () => { alive = false; };
  }, [context.goalId, context.id]);

  if (!sessionId) {
    return <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-muted)]">Starting Sage…</div>;
  }
  return (
    <AnalyticsChat
      externalQueryClient={qc}
      sessionId={sessionId}
      dashboardName={context.name}
      apiUrl={getApiBase()}
      authToken={getAuthToken()}
      pusherKey={PUSHER_KEY}
      pusherCluster={PUSHER_CLUSTER}
      timezone="UTC"
      welcomeSubtitle={
        context.workflowName
          ? `Found by ${context.agentLabel} in ${context.workflowName}. Ask why it fired, what the numbers behind it are, or what happens if you don't act.`
          : "Ask why this fired, what the numbers behind it are, or what happens if you don't act."
      }
      welcomeCtas={[]}
      followups={recFollowups(context)}
      inputPlaceholder="Ask about this recommendation…"
    />
  );
}

// Sage, scoped to whatever the queue is showing. It used to refuse to open
// until you picked a goal; there is nothing to pick now — the scope is the
// workflow, and the goal id is only plumbing for the chat endpoint.
function RecSageDrawer({ open, onClose, context }) {
  return (
    <ChatOverlay isOpen={open} onClose={onClose} floating heading="Sage" title={context?.name || "Sage"}>
      {context ? (
        <GoalSagePanel key={context.id} context={context} />
      ) : (
        <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-muted)]">
          Select a recommendation to ask about it.
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
      <div className="w-[300px] max-w-[300px] shrink-0 flex flex-col border-r border-[var(--color-grey-100)] overflow-hidden">
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
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["goals-recommendations"], queryFn: () => apiGet("/api/goals/recommendations"), refetchInterval: 2500 });
  const items = data?.items || [];
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("all");
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState(params.get("workflow") || "all");
  const [sageOpen, setSageOpen] = useState(false);

  // Distinct workflows present in the queue. Every recommendation is the output
  // of one, so this is the axis the queue is organised on.
  const workflowOptions = [...new Map(items.map((i) => [i.workflowId, i.workflowName])).entries()]
    .filter(([id]) => id)
    .map(([id, name]) => ({ id, name }));
  const scoped = scope === "all" ? items : items.filter((i) => i.workflowId === scope);
  const scopedWorkflow = scope === "all" ? null : workflowOptions.find((w) => w.id === scope) || null;

  const counts = { all: scoped.length };
  REC_FILTERS.forEach((f) => { if (f.k !== "all") counts[f.k] = scoped.filter((i) => recMeta(i).key === f.k).length; });
  // Only offer buckets that actually have something in them, so the menu never
  // lists a dead option.
  const filterOptions = REC_FILTERS.filter((f) => f.k === "all" || counts[f.k] > 0);
  const filtered = filter === "all" ? scoped : scoped.filter((i) => recMeta(i).key === filter);
  const selected = filtered.find((i) => i.recId === sel) || filtered[0];
  // Sage is about the recommendation on screen. The goal id is plumbing for the
  // chat endpoint; everything the user sees names the finding.
  const sageContext = selected
    ? {
        id: selected.recId,
        goalId: selected.goalId,
        name: selected.title,
        agentLabel: AGENTS[selected.agent]?.label,
        workflowName: selected.workflowName,
      }
    : null;

  const scopeSelect = (id) => {
    setScope(id);
    setSel(null);
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("workflow"); else next.set("workflow", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Standard page header — the same bar Workflows and Agents use. Ask Sage
          lives here rather than over the list: it answers questions about the
          whole surface, not about whatever the queue is filtered to. */}
      <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
        <span className="text-[16px] leading-[24px] font-medium">Recommendations</span>
        <button
          type="button"
          onClick={() => setSageOpen(true)}
          className="inline-flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-[8px] text-[12px] font-medium text-white border-none cursor-pointer transition-[filter] hover:brightness-105"
          style={{ background: SAGE_GRADIENT }}
        >
          <Sparkle size={14} weight="fill" /> Ask Sage
        </button>
      </div>

      <RecSageDrawer open={sageOpen} onClose={() => setSageOpen(false)} context={sageContext} />

      {/* Dashboards-style frame: grey-50 padded area with the page in a white panel */}
      <div className="flex-1 min-h-0 p-4 bg-grey-50 overflow-hidden">
        <div className="flex flex-col w-full h-full bg-white rounded-xl border border-[var(--color-grey-100)] overflow-hidden">
          {isLoading ? (
            <RecSkeleton />
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
              <CheckCircle size={26} weight="fill" className="text-green-500" />
              <p className="text-[16px] font-medium text-[var(--text-primary)]">You&rsquo;re all caught up</p>
              <p className="text-[14px] text-[#757A97] max-w-[380px]">No moves to make right now. We&rsquo;ll flag anything wasting spend or leaving demand on the table the moment it shows up.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex">
              {/* Left: the queue, under a heading that stays put while it scrolls. */}
              <div className="w-[300px] max-w-[300px] shrink-0 flex flex-col border-r border-[var(--color-grey-100)] overflow-hidden">
                <div className="shrink-0 flex items-center justify-between gap-2 h-[52px] px-3 border-b border-[var(--color-grey-100)]">
                  {scopedWorkflow ? (
                    <span className="inline-flex items-center gap-1.5 min-w-0 h-7 pl-2.5 pr-1 rounded-[8px] text-[12px] font-medium bg-primary-50 border border-primary-200 text-primary-700">
                      <WorkflowGlyph size={14} className="shrink-0" />
                      <span className="truncate">{scopedWorkflow.name}</span>
                      <button
                        type="button"
                        onClick={() => scopeSelect("all")}
                        aria-label="Show all workflows"
                        className="grid place-items-center w-5 h-5 shrink-0 rounded bg-transparent border-none cursor-pointer text-primary-600 hover:bg-primary-100"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ) : (
                    <span className="min-w-0 truncate text-[14px] font-semibold text-[var(--text-primary)]">
                      From your workflows
                    </span>
                  )}
                  <RecFilterDropdown
                    value={filter}
                    onChange={(k) => { setFilter(k); setSel(null); }}
                    counts={counts}
                    options={filterOptions}
                  />
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col">
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
                {selected && (
                  <RecommendationDetail
                    key={selected.recId}
                    goalId={selected.goalId}
                    recId={selected.recId}
                    onOpenGoal={onOpenGoal}
                    source={{
                      workflowId: selected.workflowId,
                      workflowName: selected.workflowName,
                      agent: selected.agent,
                      onOpenWorkflow: (id) => navigate(`/workflows/${id}`),
                  onOpenAgent: (k) => navigate(`/agents/${k}`),
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const navigate = useNavigate();

  // Goal detail pages still exist and are still reachable by URL; nothing on
  // this page links to them any more. Kept so the drawer's older callers work.
  const openGoal = (goalOrId) => {
    const id = typeof goalOrId === "string" ? goalOrId : goalOrId?.id;
    if (id) navigate(`/goals/${id}`);
  };

  return <RecommendationsPanel onOpenGoal={openGoal} />;
}
