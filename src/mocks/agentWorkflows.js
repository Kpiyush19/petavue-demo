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
// One deep, saturated hue per family — no two adjacent on the wheel — plus a
// distinct Phosphor icon rendered filled. `icon` is a Phosphor icon name
// resolved at the render site — families are told apart by icon first, colour
// second, so the grid stays readable for anyone who can't separate the hues.
//
// `owns` is the one recurring decision the family exists to make. `does` are
// the concrete jobs it performs inside a workflow — deliberately phrased as
// grunt work a human would otherwise do by hand.
export const AGENTS = {
  measurement: {
    key: "measurement", label: "Measurement & attribution", mark: "ME", color: "#3661ED", tint: "#E0EBFE",
    icon: "ChartLineUp", platforms: ["Google Search", "LinkedIn", "Web", "CRM"],
    owns: "What actually happened, and what it cost",
    blurb: "Joins ad spend and exposure to CRM outcomes on every run, so the numbers match your funnel and not the platform's.",
    does: [
      "Joins ad platform spend to CRM outcomes",
      "Benchmarks cost per KPI, per campaign",
      "Keeps the lineage behind every number",
    ],
  },
  budget: {
    key: "budget", label: "Budget & allocation", mark: "BU", color: "#0F7B6C", tint: "#E3F4F1",
    icon: "Wallet", platforms: ["Google Search", "LinkedIn"],
    owns: "Where the money should sit",
    blurb: "Works out where budget should sit: which campaigns have a cheaper cost per KPI and room to scale.",
    does: [
      "Sizes reallocations between campaigns",
      "Quantifies spend released by an exclusion",
      "Holds campaigns above their learning floor",
    ],
  },
  delivery: {
    key: "delivery", label: "Campaign & delivery", mark: "CD", color: "#E0620D", tint: "#FDEEE2",
    icon: "Broadcast", platforms: ["Google Search", "LinkedIn"],
    owns: "Who sees the ad, when and where",
    blurb: "Checks delivery in detail: day-part, geography, frequency, and which accounts are taking more than their share.",
    does: [
      "Trends performance by day-part and geo",
      "Finds accounts soaking up impressions",
      "Isolates delivery below campaign baseline",
    ],
  },
  demand: {
    key: "demand", label: "Demand selection", mark: "DS", color: "#C4106A", tint: "#FCE7F1",
    icon: "Target", platforms: ["Google Search", "LinkedIn", "Web"],
    owns: "Which accounts and intent are worth paying for",
    blurb: "Matches search intent and account behaviour against your ICP to decide what is worth paying for.",
    does: [
      "Classifies search intent behind the spend",
      "Scores delivered audiences against ICP bands",
      "Ranks accounts by readiness, suppresses the rest",
    ],
  },
  creative: {
    key: "creative", label: "Creative & message", mark: "CR", color: "#643BCF", tint: "#EBE3FA",
    icon: "PaintBrush", platforms: ["LinkedIn", "Google Search"],
    owns: "Which message keeps working",
    blurb: "Tracks how each creative is wearing out and protects the best performer so a rotation can be judged fairly.",
    does: [
      "Separates creative decay from audience change",
      "Protects the winning control asset",
      "Selects replacements from approved creative",
    ],
  },
  conversion: {
    key: "conversion", label: "Conversion", mark: "CO", color: "#8A5524", tint: "#F5EBE1",
    icon: "FunnelSimple", platforms: ["Web", "CRM", "Pipeline"],
    owns: "What happens after the click",
    blurb: "Follows what happens after the click, so a media problem can be told apart from a landing-page one.",
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
  return WORKFLOWS.filter((w) => w.steps.some((s) => s.agent === key));
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

// Each workflow's `steps` is the real execution sequence — the same list the
// engine runs (queries, code, model calls, writes), just tagged with the agent
// family that owns each step. Consecutive steps by the same family group under
// one agent heading on the detail page; behind it it's one sequence, which is
// exactly how this is meant to be presented.
export const WORKFLOWS = [
  {
    id: "icp-guardrails",
    nextRun: "Tomorrow, 7:00 AM",
    reads: ["LinkedIn Ads", "CRM"],
    runs: [
      { at: "Today, 7:04 AM", status: "success", ms: 8180, produced: "12 attributes flagged" , evaluated: "1,842 campaigns · 96 audience facets" },
      { at: "Yesterday, 7:03 AM", status: "success", ms: 7920, produced: "9 attributes flagged" , evaluated: "1,780 campaigns · 94 audience facets" },
      { at: "Sat, 7:05 AM", status: "success", ms: 8410, produced: "11 attributes flagged" , evaluated: "1,795 campaigns · 95 audience facets" },
      { at: "Fri, 7:04 AM", status: "failed", ms: 2100, produced: "LinkedIn API rate limit" , evaluated: "—" },
      { at: "Thu, 7:03 AM", status: "success", ms: 8050, produced: "14 attributes flagged" , evaluated: "1,760 campaigns · 92 audience facets" },
    ],
    recommendation: {
      headline: "Exclude 12 audience attributes across 4 campaigns",
      impact: "$4,200 a week of exposure landing outside your ICP bands",
      waiting: 2,
    },
    found: [
      { agent: "measurement", text: "Joined 30 days of LinkedIn delivery to CRM outcomes", specialistNames: ["Campaign Mapping", "Entity Attribution", "Conversion Signal"], config: [["Attribution window", "90 days"], ["Qualified event", "Sales-accepted opportunity"], ["Sources joined", "LinkedIn Ads + CRM"], ["Refresh", "On every daily run"]] },
      { agent: "demand", text: "Scored every delivered attribute against your ICP bands", specialistNames: ["LinkedIn Prof. Audience", "LinkedIn ABM"], config: [["ICP employee band", "200 to 2,000"], ["ICP industries", "B2B SaaS, Fintech"], ["Seniority floor", "Manager and above"], ["Geographies", "US, UK, DACH"]] },
      { agent: "delivery", text: "Ranked the attributes carrying spend with no ICP relevance", specialistNames: ["Campaign Delivery", "Placement & Network"], config: [["Flag threshold", "Attribute over 2% of campaign spend"], ["Minimum exposure", "5,000 impressions"], ["Scope", "Campaign level"]] },
    ],
    specialists: 7,
    approvalRequired: true,
    n: 4,
    name: "ICP guardrails",
    platform: "linkedin",
    // "What it automates" — the grunt work, in the practitioner's words.
    automates: "Checks every campaign for exposure landing outside your ICP.",
    // "What you get" — the concrete deliverable. Never a percentage promise.
    deliverable: "Audience attributes to exclude, per campaign",
    status: "active",
    cadence: "Daily · 7:00 AM",
    lastRun: "Today, 7:04 AM",
    lastRunOk: true,
    pending: 2,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Pull delivery by audience attribute", ms: 1840,
        code: "SELECT campaign_id, facet_type, facet_value,\n       SUM(impressions) AS impr, SUM(cost) AS spend\nFROM linkedin_ad_delivery\nWHERE date >= CURRENT_DATE - INTERVAL '30' DAY\nGROUP BY 1,2,3" },
      { agent: "measurement", type: "athena_query", label: "Join to CRM outcomes", ms: 960,
        code: "SELECT a.account_id, o.stage, o.amount\nFROM ad_accounts a\nLEFT JOIN crm_opportunities o USING (account_id)" },
      { agent: "demand", type: "python_code", label: "Score each attribute against the ICP bands", ms: 1420,
        code: "bands = icp['bands']  # size, industry, seniority, geo\ndf['in_band'] = df.apply(lambda r: match(r, bands), axis=1)\ndf['out_of_band_spend'] = df.loc[~df.in_band, 'spend']" },
      { agent: "demand", type: "ai_analyze", label: "Read ambiguous job titles against the ICP", ms: 3100,
        prompt: "For each job-title facet, decide whether it plausibly sits inside the customer's stated ICP seniority band. Return in_band true/false with a one-line reason." },
      { agent: "delivery", type: "python_code", label: "Rank attributes by wasted exposure", ms: 640,
        code: "leak = df[~df.in_band].groupby('facet_value')\n         .agg(spend=('spend','sum'), impr=('impr','sum'))\n         .sort_values('spend', ascending=False)" },
      { agent: "delivery", type: "write_file", label: "Draft the exclusion list per campaign", ms: 310 },
      { kind: "approval", label: "Your approval", detail: "Review the exclusions before anything touches the ad account." },
      { kind: "system", label: "LinkedIn Campaign Manager", detail: "Applies the approved attribute exclusions at campaign level." },
    ],
  },
  {
    id: "audience-sharpening",
    nextRun: "Tomorrow, 7:00 AM",
    reads: ["LinkedIn Ads", "Target account list"],
    runs: [
      { at: "Today, 7:06 AM", status: "success", ms: 7040, produced: "9 accounts capped" , evaluated: "3,410 target accounts" },
      { at: "Yesterday, 7:06 AM", status: "success", ms: 6890, produced: "7 accounts capped" , evaluated: "3,388 target accounts" },
      { at: "Sat, 7:07 AM", status: "success", ms: 7250, produced: "8 accounts capped" , evaluated: "3,395 target accounts" },
      { at: "Fri, 7:06 AM", status: "success", ms: 6980, produced: "6 accounts capped" , evaluated: "3,362 target accounts" },
      { at: "Thu, 7:05 AM", status: "success", ms: 7110, produced: "9 accounts capped" , evaluated: "3,344 target accounts" },
    ],
    recommendation: {
      headline: "Cap 9 over-delivered accounts, free reach for 38 more",
      impact: "31% of impressions are going to 4% of your target list",
      waiting: 3,
    },
    found: [
      { agent: "measurement", text: "Measured frequency and share of voice per target account", specialistNames: ["Campaign Mapping", "Journey Measurement"], config: [["Window", "Active flight"], ["Unit", "Impressions per target account"], ["Sources joined", "LinkedIn Ads + target list"]] },
      { agent: "delivery", text: "Found the accounts crowding others out of the auction", specialistNames: ["Campaign Delivery", "Placement & Network"], config: [["Crowding threshold", "Over 4% share of campaign impressions"], ["Frequency ceiling", "6 per account per week"], ["Minimum flight age", "7 days"]] },
      { agent: "demand", text: "Sized the cap that frees reach without losing the account", specialistNames: ["LinkedIn ABM"], config: [["Cap formula", "60% of current impressions"], ["Protected accounts", "Open opportunities excluded"], ["Refresh", "Daily"]] },
    ],
    specialists: 6,
    approvalRequired: true,
    n: 5,
    name: "Audience sharpening",
    platform: "linkedin",
    automates: "Finds accounts taking more impressions than their share, leaving others unseen.",
    deliverable: "Per-account impression caps, refreshed daily",
    status: "active",
    cadence: "Daily · 7:00 AM",
    lastRun: "Today, 7:06 AM",
    lastRunOk: true,
    pending: 3,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Pull impressions per target account", ms: 2100,
        code: "SELECT account_id, campaign_id,\n       SUM(impressions) AS impr, COUNT(DISTINCT member_id) AS reach\nFROM linkedin_ad_delivery\nWHERE flight_id = :flight\nGROUP BY 1,2" },
      { agent: "measurement", type: "python_code", label: "Compute frequency and share of voice", ms: 780,
        code: "df['frequency'] = df.impr / df.reach\ndf['share'] = df.impr / df.groupby('campaign_id').impr.transform('sum')" },
      { agent: "delivery", type: "python_code", label: "Find the accounts crowding the auction", ms: 910,
        code: "crowding = df[(df.share > 0.04) & (df.frequency > 6)]\nstarved  = target_list[~target_list.account_id.isin(df.account_id)]" },
      { agent: "delivery", type: "ai_analyze", label: "Check the crowding isn't real demand", ms: 2600,
        prompt: "For each over-delivered account, weigh engagement depth and pipeline stage. Flag any where high frequency is justified rather than wasteful." },
      { agent: "demand", type: "python_code", label: "Size the cap that frees reach", ms: 520,
        code: "caps = crowding.assign(cap=lambda d: (d.impr * 0.6).round())\nfreed = (crowding.impr - caps.cap).sum()" },
      { agent: "demand", type: "write_file", label: "Draft daily include / exclude list", ms: 280 },
      { kind: "approval", label: "Your approval", detail: "Confirm the caps and the accounts they apply to." },
      { kind: "system", label: "LinkedIn Campaign Manager", detail: "Applies daily include/exclude against the approved caps." },
    ],
  },
  {
    id: "sales-handoff",
    nextRun: "Tomorrow, 8:00 AM",
    reads: ["LinkedIn Ads", "Website", "CRM"],
    runs: [
      { at: "Today, 8:03 AM", status: "success", ms: 9230, produced: "14 accounts prioritised" , evaluated: "12,640 web sessions · 3,410 accounts" },
      { at: "Yesterday, 8:02 AM", status: "success", ms: 8870, produced: "11 accounts prioritised" , evaluated: "12,180 web sessions · 3,388 accounts" },
      { at: "Sat, 8:04 AM", status: "success", ms: 9410, produced: "13 accounts prioritised" , evaluated: "12,905 web sessions · 3,395 accounts" },
      { at: "Fri, 8:03 AM", status: "success", ms: 9050, produced: "10 accounts prioritised" , evaluated: "11,870 web sessions · 3,362 accounts" },
      { at: "Thu, 8:02 AM", status: "success", ms: 8990, produced: "12 accounts prioritised" , evaluated: "12,240 web sessions · 3,344 accounts" },
    ],
    recommendation: {
      headline: "Hand 14 accounts to sales this week",
      impact: "All 14 are solution-aware and have no open opportunity",
      waiting: 1,
    },
    found: [
      { agent: "measurement", text: "Resolved web sessions, form fills and ad engagement to accounts", specialistNames: ["Campaign Mapping", "Entity Attribution", "Journey Measurement"], config: [["Lookback", "14 days"], ["Identity resolution", "Identity graph + form fills"], ["Sources joined", "Web + LinkedIn + CRM"]] },
      { agent: "conversion", text: "Read awareness from visit depth and who engaged", specialistNames: ["Landing Page Conversion", "Form Quality"], config: [["Awareness signal", "Pages viewed x avg. duration"], ["Repeat threshold", "More than 2 sessions"], ["Seniority floor", "Director and above"]] },
      { agent: "demand", text: "Ranked by readiness and suppressed anything already in pipeline", specialistNames: ["LinkedIn ABM", "LinkedIn Retargeting", "LinkedIn Prof. Audience"], config: [["Rank by", "Readiness score"], ["Suppression", "Open opportunity, customer, disqualified"], ["Hand-off cap", "15 accounts per week"]] },
    ],
    specialists: 8,
    approvalRequired: true,
    n: 6,
    name: "Sales handoff signals",
    platform: "linkedin-web",
    automates: "Joins site visits, leads and ad engagement to find accounts already aware of you.",
    deliverable: "A prioritised account list for sales to work",
    status: "active",
    cadence: "Daily · 8:00 AM",
    lastRun: "Today, 8:03 AM",
    lastRunOk: true,
    pending: 1,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Resolve web sessions to accounts", ms: 2450,
        code: "SELECT account_id, session_id, page_path, duration_s\nFROM web_sessions s\nJOIN identity_graph g ON s.visitor_id = g.visitor_id\nWHERE s.date >= CURRENT_DATE - INTERVAL '14' DAY" },
      { agent: "measurement", type: "athena_query", label: "Join ad engagement and form fills", ms: 1180,
        code: "SELECT account_id, SUM(clicks) AS clicks, MAX(form_submitted) AS mql\nFROM linkedin_engagement GROUP BY 1" },
      { agent: "conversion", type: "python_code", label: "Score awareness from behaviour", ms: 690,
        code: "df['depth']  = df.pages_viewed * df.avg_duration_s\ndf['repeat'] = df.sessions > 2\ndf['senior'] = df.max_seniority >= 'Director'" },
      { agent: "conversion", type: "ai_analyze", label: "Read intent from the pages they chose", ms: 3400,
        prompt: "Given each account's page sequence, judge whether the behaviour reads as solution-aware evaluation or incidental browsing." },
      { agent: "demand", type: "python_code", label: "Rank by readiness and suppress", ms: 430,
        code: "ranked = df.sort_values('readiness', ascending=False)\nranked = ranked[~ranked.account_id.isin(open_opps)]" },
      { agent: "demand", type: "write_file", label: "Draft the prioritised account list", ms: 260 },
      { kind: "approval", label: "Your approval", detail: "Confirm the accounts before they reach a rep's queue." },
      { kind: "system", label: "CRM · SDR queue", detail: "Creates the task and assigns the owner." },
    ],
  },
  {
    id: "wasted-spend",
    reads: ["Google Ads", "CRM"],
    specialists: 6,
    approvalRequired: true,
    n: 1,
    name: "Wasted-spend cleanup",
    platform: "google-search",
    automates: "Reads every search term you paid for and separates relevant from irrelevant.",
    deliverable: "Negative keywords to add, per campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Split the spend", detail: "Relevant vs irrelevant search spend, as a share of the total." },
      { agent: "demand", type: "python_code", label: "Read intent", detail: "Classify the search terms actually triggering your ads." },
      { agent: "budget", type: "python_code", label: "Size the waste", detail: "Cost carried by each irrelevant term cluster." },
      { kind: "approval", label: "Your approval", detail: "Review the negative keyword list before it is applied." },
      { kind: "system", label: "Google Ads", detail: "Adds the approved negatives at campaign level." },
    ],
  },
  {
    id: "spend-to-pipeline",
    reads: ["Google Ads", "CRM"],
    specialists: 5,
    approvalRequired: true,
    n: 2,
    name: "Spend-to-pipeline rebalancing",
    platform: "google-search",
    automates: "Benchmarks each campaign on your KPI and what that KPI costs.",
    deliverable: "A sized budget move, campaign to campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Benchmark cost per KPI", detail: "Each campaign against your funnel KPI, not platform conversions." },
      { agent: "budget", type: "python_code", label: "Find headroom", detail: "Where cheaper KPI is available and still scalable." },
      { kind: "approval", label: "Your approval", detail: "Confirm the amount and the direction of the move." },
      { kind: "system", label: "Google Ads", detail: "Applies the approved budget change." },
    ],
  },
  {
    id: "delivery-leaks",
    reads: ["Google Ads"],
    specialists: 7,
    approvalRequired: true,
    n: 3,
    name: "Leak detection in campaign delivery",
    platform: "google-search",
    automates: "Works through day-part and geography performance campaign by campaign.",
    deliverable: "Day, time and geo exclusions, per campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Trend by hour and place", detail: "Performance sliced by day-part and geography." },
      { agent: "delivery", type: "python_code", label: "Isolate the leaks", detail: "Windows and locations consistently below campaign baseline." },
      { agent: "budget", type: "python_code", label: "Quantify recovery", detail: "Spend released by each proposed exclusion." },
      { kind: "approval", label: "Your approval", detail: "Review the schedule and location changes." },
      { kind: "system", label: "Google Ads", detail: "Applies the approved exclusions." },
    ],
  },
];

// Portfolio counters for the header strip. Kept derived so the numbers can
// never drift from the list underneath them.
export function summary(recItems) {
  const live = listWorkflows(recItems).filter((w) => w.status === "active");
  return {
    pending: live.reduce((n, w) => n + w.pending, 0),
    live: live.length,
    total: WORKFLOWS.length,
    actionsTaken: 84,
    approved: 72,
    rejected: 12,
    // Distinct agent families actually at work in the live workflows — the
    // answer to "how", derived so it can't drift from the pipelines.
    agentsDeployed: new Set(
      live.flatMap((w) => w.steps.filter((n) => n.agent).map((n) => n.agent))
    ).size,
  };
}

// ── Which workflow produced a recommendation ─────────────────────────
//
// Under the pivot every recommendation is the output of a workflow — that is
// the whole model: the workflow runs, the agents do the grunt work, and one
// specific action comes out the other side for you to approve. So a
// recommendation with no workflow behind it has no place in the queue.
//
// The goals mock predates all of this and keys its findings by `category`.
// This table is the join. `agent` is the family that did the finding, so the
// queue can say who found it rather than leaving it anonymous.
//
// Deliberately partial: categories that no live workflow could have produced
// (creative fatigue, landing-page conversion, growth experiments) are absent
// and get filtered out rather than being attributed to a workflow that would
// never have looked for them.
export const REC_SOURCE = {
  "Audience & ICP":      { workflowId: "icp-guardrails",      agent: "demand" },
  Attribution:           { workflowId: "icp-guardrails",      agent: "measurement" },
  Incrementality:        { workflowId: "icp-guardrails",      agent: "measurement" },
  "Budget pacing":       { workflowId: "icp-guardrails",      agent: "budget" },
  Suppression:           { workflowId: "audience-sharpening", agent: "demand" },
  "Segment performance": { workflowId: "audience-sharpening", agent: "delivery" },
  Forecasting:           { workflowId: "audience-sharpening", agent: "budget" },
  "Warm accounts":       { workflowId: "sales-handoff",       agent: "demand" },
  "Lead quality":        { workflowId: "sales-handoff",       agent: "conversion" },
};

// Stamp a recommendation with the workflow and agent behind it. Returns null
// for anything no workflow produced, so callers can drop it.
export function attributeRecommendation(item) {
  const src = REC_SOURCE[item.category];
  if (!src) return null;
  const wf = WORKFLOWS.find((w) => w.id === src.workflowId);
  if (!wf) return null;
  return { ...item, workflowId: wf.id, workflowName: wf.name, workflowPlatform: wf.platform, agent: src.agent };
}

export function attributeRecommendations(items) {
  return items.map(attributeRecommendation).filter(Boolean);
}

// Pending counts come FROM the queue rather than being written by hand, so a
// workflow row and the recommendations surface can never disagree about how
// many decisions are waiting.
export function listWorkflows(recItems) {
  if (!recItems) return WORKFLOWS;
  const open = attributeRecommendations(recItems).filter((r) => r.status === "open");
  return WORKFLOWS.map((w) => {
    const pending = open.filter((r) => r.workflowId === w.id).length;
    return {
      ...w,
      pending,
      recommendation: w.recommendation ? { ...w.recommendation, waiting: pending } : w.recommendation,
    };
  });
}
