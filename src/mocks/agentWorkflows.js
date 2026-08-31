// Mock store for the agentic Workflows surface (/agent-workflows).
//
// Positioning note (see the Aug-2026 pivot): a "workflow" here is one of the six
// frozen paid-media pilot use cases. Each one automates a single deep analysis a
// paid-media team doesn't have time to do by hand, and ends in ONE specific
// action the customer approves. We do not promise quantified outcomes ("cut
// waste 50%") — the deliverable IS the promise.
//
// "Agents" are a presentation layer: contiguous groups of steps in the single
// underlying workflow, relabeled into the six families the pilot deck uses.
// Nothing here runs independently.

// ── The six agent families (pilot deck) ──────────────────────────────
// Colors are Petavue tokens, not ad-hoc hexes. `icon` is a Phosphor icon name
// resolved at the render site — families are told apart by icon first, colour
// second, so the grid stays readable for anyone who can't separate the hues.
//
// `owns` is the one recurring decision the family exists to make. `does` are
// the concrete jobs it performs inside a workflow — deliberately phrased as
// grunt work a human would otherwise do by hand.
export const AGENTS = {
  measurement: {
    key: "measurement", label: "Measurement", mark: "ME", color: "#825CDE", tint: "#EBE3FA",
    icon: "ChartLineUp", platforms: ["Google Search", "LinkedIn", "Web", "CRM"],
    owns: "What actually happened, and what it cost",
    blurb: "Rebuilds the numbers from source every run — spend, exposure and outcomes joined back to your funnel KPI rather than the platform's.",
    does: [
      "Joins ad platform spend to CRM outcomes",
      "Benchmarks cost per KPI, per campaign",
      "Keeps the lineage behind every number",
    ],
  },
  budget: {
    key: "budget", label: "Budget", mark: "BU", color: "#3661ED", tint: "#E0EBFE",
    icon: "Wallet", platforms: ["Google Search", "LinkedIn"],
    owns: "Where the money should sit",
    blurb: "Sizes the move. Finds headroom where a cheaper KPI is still scalable, and quantifies what each proposed change actually frees up.",
    does: [
      "Sizes reallocations between campaigns",
      "Quantifies spend released by an exclusion",
      "Holds campaigns above their learning floor",
    ],
  },
  delivery: {
    key: "delivery", label: "Delivery", mark: "DE", color: "#F87F00", tint: "#FEF3D5",
    icon: "Broadcast", platforms: ["Google Search", "LinkedIn"],
    owns: "Who sees the ad, when and where",
    blurb: "Goes through delivery at a depth nobody has time for by hand — day-part, geography, frequency and the accounts quietly crowding everyone else out.",
    does: [
      "Trends performance by day-part and geo",
      "Finds accounts soaking up impressions",
      "Isolates delivery below campaign baseline",
    ],
  },
  demand: {
    key: "demand", label: "Demand", mark: "DM", color: "#08BD50", tint: "#EBFFF3",
    icon: "Crosshair", platforms: ["Google Search", "LinkedIn", "Web"],
    owns: "Which accounts and intent are worth paying for",
    blurb: "Reads intent against your ICP — the search terms actually triggering your ads, and the accounts whose behaviour says they are in market.",
    does: [
      "Classifies search intent behind the spend",
      "Scores delivered audiences against ICP bands",
      "Ranks accounts by readiness, suppresses the rest",
    ],
  },
  creative: {
    key: "creative", label: "Creative", mark: "CR", color: "#B472F9", tint: "#F3E9FE",
    icon: "PaintBrush", platforms: ["LinkedIn", "Google Search"],
    owns: "Which message keeps working",
    blurb: "Watches message decay asset by asset and protects the control, so a rotation can be judged on its own rather than blamed on the audience.",
    does: [
      "Separates creative decay from audience change",
      "Protects the winning control asset",
      "Selects replacements from approved creative",
    ],
  },
  conversion: {
    key: "conversion", label: "Conversion", mark: "CO", color: "#24C1DA", tint: "#E4F8FB",
    icon: "FunnelSimple", platforms: ["Web", "CRM", "Pipeline"],
    owns: "What happens after the click",
    blurb: "Follows the session past the ad — depth of visit, form behaviour and who is engaging — to tell a media problem apart from a landing-page one.",
    does: [
      "Reads awareness from session and form behaviour",
      "Isolates where a funnel leak actually starts",
      "Separates lead quality from media quality",
    ],
  },
};

// Sage sits above the families as the orchestrator: it reads the outcome you
// care about and decides which agents a workflow deploys.
export const ORCHESTRATOR = {
  label: "Sage",
  role: "Orchestration",
  blurb: "Reads the outcome you care about, deploys the agents that workflow needs, and routes every proposed move back to you before anything touches an ad account.",
};

// Which workflows each family currently works in — derived, so it can never
// drift from the list below.
export function agentUsage(key) {
  return WORKFLOWS.filter((w) => w.pipeline.some((s) => s.kind === "agent" && s.agent === key));
}

export function listAgents() {
  return Object.values(AGENTS).map((a) => {
    const used = agentUsage(a.key);
    return { ...a, workflowCount: used.length, liveCount: used.filter((w) => w.status === "active").length };
  });
}

// Non-agent pipeline nodes. These are deliberately a different *kind* of thing
// from an agent — the canvas legend reads: agent · your approval · connected
// system. Approval is always on today; removing it is a future capability.
export const NODE_KINDS = {
  agent: { label: "Agent step" },
  approval: { label: "Your approval" },
  system: { label: "Connected system" },
};

const PLATFORMS = {
  "google-search": { label: "Google Search Ads", short: "Google Search" },
  linkedin: { label: "LinkedIn Ads", short: "LinkedIn" },
  "linkedin-web": { label: "LinkedIn Ads · Pipeline · Web", short: "LinkedIn + Web" },
};
export const platformOf = (id) => PLATFORMS[id] || { label: id, short: id };

// Last-run labels are fixed strings rather than clock arithmetic: they have to
// stay consistent with each workflow's stated cadence (a 7:00 AM daily job
// should read as having run just after 7:00), and they must not drift while a
// demo is on screen.

// Each workflow's `pipeline` is the sequence shown when the row is expanded:
// agent steps, then the approval gate, then where the action lands.
export const WORKFLOWS = [
  {
    id: "icp-guardrails",
    n: 4,
    name: "ICP guardrails",
    platform: "linkedin",
    // "What it automates" — the grunt work, in the practitioner's words.
    automates: "Reads your ICP, then checks every campaign for exposure landing outside the relevant bands.",
    // "What you get" — the concrete deliverable. Never a percentage promise.
    deliverable: "Audience attributes to exclude, per campaign",
    status: "active",
    cadence: "Daily · 7:00 AM",
    lastRun: "Today, 7:04 AM",
    lastRunOk: true,
    pending: 2,
    pipeline: [
      { kind: "agent", agent: "measurement", label: "Measure exposure", detail: "Impressions and spend by audience attribute, per campaign." },
      { kind: "agent", agent: "demand", label: "Score ICP fit", detail: "Match delivered attributes against the ICP bands you supplied." },
      { kind: "agent", agent: "delivery", label: "Isolate the leak", detail: "Rank the attributes carrying exposure with no ICP relevance." },
      { kind: "approval", label: "Your approval", detail: "Review the exclusions before anything touches the ad account." },
      { kind: "system", label: "LinkedIn Campaign Manager", detail: "Applies the approved attribute exclusions at campaign level." },
    ],
  },
  {
    id: "audience-sharpening",
    n: 5,
    name: "Audience sharpening",
    platform: "linkedin",
    automates: "Finds the over-engaged accounts soaking up impressions and starving everyone else.",
    deliverable: "Per-account impression caps, refreshed daily",
    status: "active",
    cadence: "Daily · 7:00 AM",
    lastRun: "Today, 7:06 AM",
    lastRunOk: true,
    pending: 3,
    pipeline: [
      { kind: "agent", agent: "measurement", label: "Measure frequency", detail: "Impressions per target account across the active flight." },
      { kind: "agent", agent: "delivery", label: "Find the crowding", detail: "Accounts consuming share that other in-band accounts never see." },
      { kind: "agent", agent: "demand", label: "Rebalance reach", detail: "Size the cap that frees impressions without losing the account." },
      { kind: "approval", label: "Your approval", detail: "Confirm the caps and the accounts they apply to." },
      { kind: "system", label: "LinkedIn Campaign Manager", detail: "Applies daily include/exclude against the approved caps." },
    ],
  },
  {
    id: "sales-handoff",
    n: 6,
    name: "Sales handoff signals",
    platform: "linkedin-web",
    automates: "Joins site visits, leads and ad engagement to find accounts that are already solution- and brand-aware.",
    deliverable: "A prioritised account list for sales to work",
    status: "active",
    cadence: "Daily · 8:00 AM",
    lastRun: "Today, 8:03 AM",
    lastRunOk: true,
    pending: 1,
    pipeline: [
      { kind: "agent", agent: "measurement", label: "Join the signals", detail: "Web sessions, form fills and ad engagement resolved to accounts." },
      { kind: "agent", agent: "conversion", label: "Read awareness", detail: "Depth of visit, repeat sessions and seniority of the people engaging." },
      { kind: "agent", agent: "demand", label: "Rank and suppress", detail: "Order by readiness; drop anything with an open opportunity." },
      { kind: "approval", label: "Your approval", detail: "Confirm the accounts before they reach a rep's queue." },
      { kind: "system", label: "CRM · SDR queue", detail: "Creates the task and assigns the owner." },
    ],
  },
  {
    id: "wasted-spend",
    n: 1,
    name: "Wasted-spend cleanup",
    platform: "google-search",
    automates: "Reads every search term you paid for and separates the relevant from the irrelevant.",
    deliverable: "Negative keywords to add, per campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    pipeline: [
      { kind: "agent", agent: "measurement", label: "Split the spend", detail: "Relevant vs irrelevant search spend, as a share of the total." },
      { kind: "agent", agent: "demand", label: "Read intent", detail: "Classify the search terms actually triggering your ads." },
      { kind: "agent", agent: "budget", label: "Size the waste", detail: "Cost carried by each irrelevant term cluster." },
      { kind: "approval", label: "Your approval", detail: "Review the negative keyword list before it is applied." },
      { kind: "system", label: "Google Ads", detail: "Adds the approved negatives at campaign level." },
    ],
  },
  {
    id: "spend-to-pipeline",
    n: 2,
    name: "Spend-to-pipeline rebalancing",
    platform: "google-search",
    automates: "Benchmarks every campaign on your KPI and what that KPI actually costs.",
    deliverable: "A sized budget move, campaign to campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    pipeline: [
      { kind: "agent", agent: "measurement", label: "Benchmark cost per KPI", detail: "Each campaign against your funnel KPI, not platform conversions." },
      { kind: "agent", agent: "budget", label: "Find headroom", detail: "Where cheaper KPI is available and still scalable." },
      { kind: "approval", label: "Your approval", detail: "Confirm the amount and the direction of the move." },
      { kind: "system", label: "Google Ads", detail: "Applies the approved budget change." },
    ],
  },
  {
    id: "delivery-leaks",
    n: 3,
    name: "Leak detection in campaign delivery",
    platform: "google-search",
    automates: "Goes through day-parting and geo performance at a depth nobody has time for by hand.",
    deliverable: "Day, time and geo exclusions, per campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    pipeline: [
      { kind: "agent", agent: "measurement", label: "Trend by hour and place", detail: "Performance sliced by day-part and geography." },
      { kind: "agent", agent: "delivery", label: "Isolate the leaks", detail: "Windows and locations consistently below campaign baseline." },
      { kind: "agent", agent: "budget", label: "Quantify recovery", detail: "Spend released by each proposed exclusion." },
      { kind: "approval", label: "Your approval", detail: "Review the schedule and location changes." },
      { kind: "system", label: "Google Ads", detail: "Applies the approved exclusions." },
    ],
  },
];

// Portfolio counters for the header strip. Kept derived so the numbers can
// never drift from the list underneath them.
export function summary() {
  const live = WORKFLOWS.filter((w) => w.status === "active");
  return {
    pending: live.reduce((n, w) => n + w.pending, 0),
    live: live.length,
    total: WORKFLOWS.length,
    actionsTaken: 84,
    approved: 72,
    rejected: 12,
  };
}

export function listWorkflows() {
  return WORKFLOWS;
}
