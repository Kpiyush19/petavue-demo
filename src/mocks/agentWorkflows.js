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
    key: "measurement", label: "Measurement", mark: "ME", color: "#3661ED", tint: "#E0EBFE",
    icon: "ChartLineUp", platforms: ["Google Search", "LinkedIn", "Web", "CRM"],
    owns: "What actually happened, and what it cost",
    blurb: "This family joins advertising and web activity to CRM outcomes so the workflows compare campaigns using the same definitions.",
    specialists: ["Qualified Outcome Analyst", "Pipeline Measurement Analyst", "Delivery Outcome Analyst", "Targeting Evidence Analyst", "Account Delivery Analyst", "Account Journey Analyst"],
    does: [
      "Joins ad platform spend to CRM outcomes",
      "Benchmarks cost per KPI, per campaign",
      "Keeps the lineage behind every number",
    ],
  },
  budget: {
    key: "budget", label: "Budget", mark: "BU", color: "#0F7B6C", tint: "#E3F4F1",
    icon: "Wallet", platforms: ["Google Search", "LinkedIn"],
    owns: "Where the money should sit",
    blurb: "This family compares campaign efficiency and prepares budget moves that respect learning, pacing, frequency, and cost guardrails.",
    specialists: ["Budget Allocation Analyst", "Spend Reallocation Planner"],
    does: [
      "Sizes reallocations between campaigns",
      "Quantifies spend released by an exclusion",
      "Holds campaigns above their learning floor",
    ],
  },
  delivery: {
    key: "delivery", label: "Campaign", mark: "CD", color: "#E0620D", tint: "#FDEEE2",
    icon: "Broadcast", platforms: ["Google Search", "LinkedIn"],
    owns: "Who sees the ad, when and where",
    blurb: "This family evaluates and prepares changes to campaign structure, schedule, location, and delivery settings.",
    specialists: ["Negative Keyword Planner", "Delivery Guardrail Analyst", "Schedule and Geography Analyst", "Cap and Rotation Planner"],
    does: [
      "Trends performance by day-part and geo",
      "Finds accounts soaking up impressions",
      "Isolates delivery below campaign baseline",
    ],
  },
  demand: {
    key: "demand", label: "Audience", mark: "DS", color: "#C4106A", tint: "#FCE7F1",
    icon: "Target", platforms: ["Google Search", "LinkedIn", "Web"],
    owns: "Which accounts and intent are worth paying for",
    blurb: "This family evaluates the queries, titles, audiences, and accounts that campaigns pay to reach.",
    specialists: ["Search Intent Analyst", "Title Strategy Analyst", "Title Delivery Analyst", "Account Reach Analyst", "Sales Eligibility Validator"],
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
    blurb: "This family measures creative performance, message response, fatigue, and test results.",
    specialists: ["Creative Performance", "Message & Offer", "Creative Fatigue", "Creative Testing"],
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
    blurb: "This family evaluates outcome definitions, CRM evidence, and account-level buying signals that can create pipeline.",
    specialists: ["Buyer Outcome Validator", "Buying Signal Analyst"],
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
  // Creative/Messaging is not one of the five families in this demo and no
  // pilot workflow analyzes creatives (doc 17, appendix 10.1).
  return Object.values(AGENTS).filter((a) => a.key !== "creative").map((a) => {
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

// Channel vocabulary is fixed: Google Ads, LinkedIn Ads, Meta Ads. Campaign
// types ("Google Search", "LinkedIn + Web") are not channels and must never be
// shown as one — a prospect reads a channel badge as a product we integrate
// with, and "LinkedIn + Web" is not a product.
const PLATFORMS = {
  "google-search": { label: "Google Ads", short: "Google Ads" },
  linkedin: { label: "LinkedIn Ads", short: "LinkedIn Ads" },
  "linkedin-web": { label: "LinkedIn Ads", short: "LinkedIn Ads" },
};
// The five agents as the sales deck names them. This is the vocabulary the
// workflow storytelling uses: every step keeps its own agent name, and its
// tag says which of the five it belongs to. The mapping is presentation only
// (Campaign spans the delivery and budget keys); the underlying keys, colors,
// and detail pages stay as they are.
export const DECK_FAMILY = {
  measurement: "Measurement",
  demand: "Audience",
  delivery: "Campaign",
  budget: "Budget",
  conversion: "Conversion",
};
export const deckFamilyOf = (key) => DECK_FAMILY[key] || AGENTS[key]?.label || "";

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
    family: "Measurement \u00b7 Audience \u00b7 Conversion",
    n: 4,
    nextRun: null,
    reads: ["LinkedIn Ads", "HubSpot"],
    outcomes: ["% impressions inside ICP bands", "$ exposure redirected per month", "SQL rate per 1K impressions"],
    // Never deployed, so it has no run history yet.
    runs: [],
    recommendation: {
      impact: "$4,200 a week of exposure landing outside your ICP bands",
      waiting: 2,
    },
    found: [
      {
        agent: "measurement", jobTitle: "Freeze the evidence baseline", specialist: "Targeting Evidence Analyst",
        text: "Fixes the scope, windows, and data limitations before any title is judged.",
        analyzes: "Freezes the campaign scope and a matched 90-day window, converts the approved ICP into explicit bands for title, seniority, function, industry, and company size, records reporting coverage honestly (title-level clicks, spend, and conversions are privacy-suppressed partial signals, so campaign totals stay the control numbers), and sets the timing gate: no claim about post-change behavior until at least seven complete reporting days exist after the configuration change.",
        uses: "The approved ICP document, current LinkedIn Ads campaign settings, and LinkedIn campaign and demographic reporting.",
        produces: "The campaign-level declared decision rules plus a written baseline of scope, windows, coverage, and known limitations.",
        config: [["Window", "Matched 90 days"], ["Control total", "Campaign grain"], ["Suppressed at title grain", "Clicks, spend, conversions"], ["Post-change gate", "7 complete days"]],
      },
      {
        agent: "demand", jobTitle: "Decode and classify the title strategy", specialist: "Title Strategy Analyst",
        text: "Builds the complete title universe and classifies every title so real peers can be compared.",
        analyzes: "Reads every configured inclusion and exclusion across the campaigns, including the targeting facets left empty, builds the complete title universe (every configured title plus every title actually reached), normalizes titles without overwriting the raw value, classifies each title's function, seniority, and specialty, and flags configuration inconsistencies: near-synonyms treated differently, a senior title excluded while its junior peer is included, and gaps where an intended title family is missing members. Ambiguous titles are flagged for review, never guessed.",
        uses: "The declared decision rules and baseline, LinkedIn demographic delivery, and current campaign targeting.",
        produces: "The classified title universe and the current inclusion/exclusion strategy matrix, with every inconsistency listed.",
        config: [["Universe", "Configured plus delivered titles"], ["Peer key", "Function \u00d7 seniority \u00d7 specialty"], ["Ambiguity rule", "Flagged, not guessed"]],
      },
      {
        agent: "demand", jobTitle: "Measure delivery and compare peers", specialist: "Title Delivery Analyst",
        text: "Establishes what LinkedIn actually delivered per title and finds the differences that matter between real peers.",
        analyzes: "Measures each title's delivery across the 90-day window in three 30-day slices plus the last 7 days, using each title's share of title-reported impressions rather than raw counts. Judges compliance only on the valid post-change window: an excluded title counts as leaking only when impressions appear after seven complete reporting days since the configuration change. Compares exact titles and peer groups across states and surfaces the outliers; low-volume titles receive insufficient evidence, not a trend verdict.",
        uses: "The classified universe and strategy matrix, and LinkedIn demographic delivery.",
        produces: "The title state matrix with trends, tiers, timing-unresolved marks, and named outliers.",
        config: [["Windows", "3 \u00d7 30 days plus last 7"], ["Share basis", "Title-report impressions"], ["State", "Status \u00d7 recency"], ["Leakage gate", "7 complete post-change days"]],
      },
      {
        agent: "conversion", jobTitle: "Validate outcomes and prepare the campaign edits", specialist: "Buyer Outcome Validator",
        text: "Brings in every outcome source the data honestly supports and turns the decisions into safe campaign edits.",
        analyzes: "Keeps the three outcome legs separate: platform conversions, CRM contacts and deals matched through exact campaign attribution, and identified website activity; never forces a join the data cannot support. Compares won-deal contact titles against the live targeting to find buyer titles no campaign currently reaches, evaluates every material title against the declared decision rules, attaches a confidence level with the limiting factor stated on every low-confidence call, forecasts audience size after each proposed edit, and routes borderline titles to Needs from you instead of deciding them.",
        uses: "The title state matrix, LinkedIn conversion definitions, HubSpot contacts and deals, and identified website activity.",
        produces: "The exact audience edits for each campaign, the evidence and confidence per title, and a separate list of titles that need the customer's decision.",
        config: [["Outcome legs", "Platform, CRM, website, kept separate"], ["Decisions", "Keep, add, exclude, reconsider, test, investigate, insufficient"], ["Confidence", "High, medium, low with stated limits"]],
      },
    ],
    specialists: 7,
    approvalRequired: true,
    n: 4,
    name: "LinkedIn buyer-title targeting",
    platform: "linkedin",
    // "What it automates" — the grunt work, in the practitioner's words.
    automates: "This workflow compares the audience reached by each LinkedIn Ads campaign with the approved ICP. It decides, title by title, what to keep, add, exclude, reconsider, or keep testing, and prepares the campaign edits.",
    manualWork: "A paid-media analyst currently exports LinkedIn demographic delivery, evaluates titles, seniorities, functions, industries, and company sizes against the ICP, and repeats the work for each campaign. The analyst must also compare campaign targeting with the titles found on won deals, and separate real signals from privacy-suppressed reporting. Reviewing 1.9 million impressions across four campaigns takes most of a day and becomes outdated quickly. This workflow refreshes the analysis daily.",
    problem: "LinkedIn campaigns reach titles and audience attributes outside the approved ICP while missing titles found on won deals.",
    customerOutput: "The workflow prepares campaign-level exclusion and inclusion lists and shows the evidence behind every title.",
    // "What you get" — the concrete deliverable. Never a percentage promise.
    deliverable: "Audience attributes to exclude, per campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    lastRunOk: null,
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
      { agent: "conversion", type: "python_code", label: "Rank attributes by wasted exposure", ms: 640,
        code: "leak = df[~df.in_band].groupby('facet_value')\n         .agg(spend=('spend','sum'), impr=('impr','sum'))\n         .sort_values('spend', ascending=False)" },
      { agent: "conversion", type: "write_file", label: "Draft the exclusion list per campaign", ms: 310 },
      { kind: "approval", label: "Your approval", detail: "Review the exclusions before anything touches the ad account." },
      { kind: "system", label: "LinkedIn Ads", detail: "Applies the approved attribute exclusions at campaign level." },
    ],
  },
  {
    id: "audience-sharpening",
    family: "Measurement \u00b7 Audience \u00b7 Campaign",
    n: 5,
    nextRun: "Sep 2, 7:00 AM",
    reads: ["LinkedIn Ads", "HubSpot"],
    outcomes: ["Tier-1 coverage %", "Top-8 impression share", "New engaged accounts per week"],
    runs: [
      { at: "Sep 1, 7:06 AM", status: "success", ms: 7600, produced: "1 recommendation", evaluated: "170 target accounts \u00b7 840K impressions" },
      { at: "Aug 31, 7:06 AM", status: "no-action", ms: 7400, produced: "", evaluated: "Caps refreshed, no rule change" },
      { at: "Aug 30, 7:05 AM", status: "no-action", ms: 7550, produced: "", evaluated: "Caps refreshed, no rule change" },
    ],
    recommendation: {
      impact: "31% of impressions are going to 4% of your target list",
      waiting: 3,
    },
    found: [
      {
        agent: "measurement", jobTitle: "Resolve impressions to named accounts", specialist: "Account Delivery Analyst",
        text: "Matched 30 days of company-level delivery to the 170-account target list.",
        analyzes: "Matches 30 days of company-level delivery to the 170-account target list and its tiers. It removes accounts with open opportunities or active sales sequences because sales already covers them.",
        uses: "LinkedIn Ads delivery, the target-account list, and HubSpot.",
        produces: "The impression distribution for every eligible account, grouped by tier.",
        config: [["Lookback", "30 days"], ["Target list", "170 accounts, by tier"], ["Excluded", "Open opportunities and active sales sequences"]],
      },
      {
        agent: "demand", jobTitle: "Find saturated accounts crowding out the list", specialist: "Account Reach Analyst",
        text: "Found the top eight accounts took 41% of impressions and produced no new pipeline.",
        analyzes: "Measures delivery concentration, engagement recency, and new pipeline from each account. In this run, the top eight accounts received 41% of impressions and produced no new pipeline in 60 days.",
        uses: "The eligible account distribution from the previous step.",
        produces: "A list of cap candidates and the under-served tier-1 accounts.",
        config: [["Concentration measure", "Top-8 impression share"], ["Pipeline lookback", "60 days"]],
      },
      {
        agent: "delivery", jobTitle: "Set daily caps and rotation", specialist: "Cap and Rotation Planner",
        text: "Calculated a 200 impressions per week cap that frees delivery without losing frequency.",
        analyzes: "Calculates a cap that releases impressions without removing useful frequency from engaged accounts. It also checks which under-served accounts can absorb the released delivery. This run recommends 200 impressions per week.",
        uses: "The cap candidates, account tiers, and current campaign delivery.",
        produces: "A daily account-cap and rotation plan.",
        config: [["Cap", "200 impressions per week"], ["Recalculated", "Daily at 7:00 AM"]],
      },
    ],
    specialists: 6,
    approvalRequired: true,
    n: 5,
    name: "Target-account reach balancing",
    platform: "linkedin",
    automates: "This workflow measures how LinkedIn Ads distributes impressions across the target-account list and recommends caps when a few accounts absorb too much delivery.",
    manualWork: "A paid-media analyst currently exports company-level delivery, matches it to the 170-account target list, groups accounts by tier, and recalculates caps for saturated accounts. The analyst also removes accounts that already have an open opportunity or an active sales sequence. This workflow refreshes that work every day.",
    problem: "A small number of accounts receive most impressions while priority accounts receive little or no delivery.",
    customerOutput: "The workflow recommends account-level impression caps and recalculates the eligible account list each day.",
    deliverable: "Per-account impression caps, refreshed daily",
    status: "active",
    cadence: "Daily · 7:00 AM",
    lastRun: "Sep 1, 7:06 AM",
    lastRunOk: true,
    pending: 3,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Pull impressions per target account", ms: 2100,
        code: "SELECT account_id, campaign_id,\n       SUM(impressions) AS impr, COUNT(DISTINCT member_id) AS reach\nFROM linkedin_ad_delivery\nWHERE flight_id = :flight\nGROUP BY 1,2" },
      { agent: "measurement", type: "python_code", label: "Compute frequency and share of voice", ms: 780,
        code: "df['frequency'] = df.impr / df.reach\ndf['share'] = df.impr / df.groupby('campaign_id').impr.transform('sum')" },
      { agent: "demand", type: "python_code", label: "Find the accounts crowding the auction", ms: 910,
        code: "crowding = df[(df.share > 0.04) & (df.frequency > 6)]\nstarved  = target_list[~target_list.account_id.isin(df.account_id)]" },
      { agent: "demand", type: "ai_analyze", label: "Check the crowding isn't real demand", ms: 2600,
        prompt: "For each over-delivered account, weigh engagement depth and pipeline stage. Flag any where high frequency is justified rather than wasteful." },
      { agent: "delivery", type: "python_code", label: "Size the cap that frees reach", ms: 520,
        code: "caps = crowding.assign(cap=lambda d: (d.impr * 0.6).round())\nfreed = (crowding.impr - caps.cap).sum()" },
      { agent: "delivery", type: "write_file", label: "Draft daily include / exclude list", ms: 280 },
      { kind: "approval", label: "Your approval", detail: "Confirm the caps and the accounts they apply to." },
      { kind: "system", label: "LinkedIn Ads", detail: "Applies daily include/exclude against the approved caps." },
    ],
  },
  {
    id: "sales-handoff",
    family: "Measurement \u00b7 Conversion \u00b7 Audience",
    n: 6,
    nextRun: "Sep 8, 8:00 AM",
    reads: ["LinkedIn Ads", "HubSpot", "GA4"],
    outcomes: ["Warm handoffs per week", "Handoff to meeting rate", "Days from signal to first touch"],
    runs: [
      { at: "Sep 1, 8:03 AM", status: "success", ms: 9100, produced: "1 recommendation", evaluated: "170 target accounts \u00b7 14 days of activity" },
      { at: "Aug 25, 8:02 AM", status: "success", ms: 8900, produced: "1 recommendation \u00b7 accepted", evaluated: "11 accounts pushed, confirmed in CRM \u00b7 4 meetings booked" },
      { at: "Aug 18, 8:03 AM", status: "no-action", ms: 8700, produced: "", evaluated: "Only 2 accounts cleared thresholds, below the 5-account handoff minimum" },
    ],
    recommendation: {
      impact: "All 14 are solution-aware and have no open opportunity",
      waiting: 1,
    },
    found: [
      {
        agent: "measurement", jobTitle: "Stitch touches into account journeys", specialist: "Account Journey Analyst",
        text: "Resolved 14 days of web, ad and contact activity to named accounts.",
        analyzes: "Resolves 14 days of web sessions, advertising engagement, and contact activity to named accounts using HubSpot and firmographic matching.",
        uses: "GA4, LinkedIn Ads, and HubSpot.",
        produces: "A dated journey timeline for every target account.",
        config: [["Window", "14 days"], ["Resolution", "HubSpot + firmographic match"], ["Sources joined", "GA4 + LinkedIn Ads + HubSpot"]],
      },
      {
        agent: "conversion", jobTitle: "Score solution-awareness", specialist: "Buying Signal Analyst",
        text: "Required two high-intent page visits in 14 days, then weighted depth and recency.",
        analyzes: "Requires at least two visits to high-intent pages in 14 days. It then weights contact depth, advertising engagement, and signal recency to calculate the final score.",
        uses: "The account journey timelines from the previous step.",
        produces: "A ranked shortlist with the evidence behind each account's score.",
        config: [["Minimum signal", "2 high-intent page visits in 14 days"], ["Weighted by", "Contact depth, engagement, recency"]],
      },
      {
        agent: "demand", jobTitle: "Suppress accounts sales already owns", specialist: "Sales Eligibility Validator",
        text: "Removed customers, open opportunities and anything contacted in the last 21 days.",
        analyzes: "Checks the shortlist against customers, open opportunities, and sales activity from the last 21 days. It removes any account that would create a duplicate or conflict with an active sales motion.",
        uses: "The ranked shortlist and HubSpot.",
        produces: "The final list of net-new accounts ready for review.",
        config: [["Suppressed", "Customers, open opportunities, contacted in last 21 days"], ["Destination", "Selected HubSpot queue"]],
      },
    ],
    specialists: 8,
    approvalRequired: true,
    n: 6,
    name: "Buying-signal sales handoff",
    platform: "linkedin-web",
    automates: "This workflow combines advertising, website, and CRM activity to identify accounts that show current buying intent and are not already owned by sales.",
    manualWork: "A revenue or paid-media analyst currently combines LinkedIn Ads engagement, GA4 visits, and HubSpot contact activity by account. The analyst checks which accounts meet the approved buying-intent model and removes customers, open opportunities, and recently contacted accounts. This workflow scores all 170 target accounts each week.",
    problem: "Sales does not see accounts that show strong buying signals unless someone submits a form.",
    customerOutput: "The workflow ranks qualified accounts, explains the signals for each account, and prepares the approved list for HubSpot.",
    deliverable: "A prioritised account list for sales to work",
    status: "active",
    cadence: "Weekly \u00b7 Tuesdays, 8:00 AM",
    lastRun: "Sep 1, 8:03 AM",
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
      { kind: "system", label: "HubSpot", detail: "Creates the task and assigns the owner." },
    ],
  },
  {
    id: "wasted-spend",
    family: "Measurement \u00b7 Audience \u00b7 Campaign",
    n: 1,
    nextRun: "Sep 8, 7:00 AM",
    runs: [
      { at: "Sep 1, 7:02 AM", status: "success", ms: 6400, produced: "1 recommendation", evaluated: "1,240 queries \u00b7 $9,800 spend" },
      { at: "Aug 25, 7:01 AM", status: "no-action", ms: 6100, produced: "", evaluated: "Irrelevant spend at 4.1%, inside target \u00b7 still watching 3 ambiguous queries below the spend threshold" },
      { at: "Aug 18, 7:02 AM", status: "success", ms: 6250, produced: "1 recommendation \u00b7 accepted", evaluated: "Impact assessed: \u2212$1,910/mo waste" },
      { at: "Aug 11, 7:00 AM", status: "failed", ms: 900, produced: "Google Ads token expired", evaluated: "Re-run succeeded Aug 12" },
    ],
    lastRunOk: true,
    reads: ["Google Ads", "HubSpot"],
    outcomes: ["Irrelevant-spend % (target < 5%)", "$ redirected per month", "SQLs per $1K search spend"],
    found: [
      {
        agent: "measurement", jobTitle: "Build the qualified-outcome baseline", specialist: "Qualified Outcome Analyst",
        text: "Joined every Google Ads conversion to its HubSpot lifecycle stage over 90 days.",
        analyzes: "Joins every Google Ads conversion to its HubSpot lifecycle stage over a rolling 90-day period. It waits 30 days before judging an outcome so recent clicks are not classified too early.",
        uses: "Google Ads clicks and conversions, HubSpot contacts, and HubSpot deals.",
        produces: "A query-level table with spend, clicks, and CRM-qualified outcomes.",
        config: [["Lookback", "90 days"], ["Maturity window", "30 days"], ["Qualified event", "HubSpot lifecycle stage"]],
      },
      {
        agent: "demand", jobTitle: "Classify every search query for buying fit", specialist: "Search Intent Analyst",
        text: "Classified about 1,240 queries against the 90-day qualified-outcome history.",
        analyzes: "Reviews about 1,240 queries from the last 30 days and compares them with the rolling 90-day outcome history. It classifies each query as product fit, competitor research, job-seeker intent, student or free-seeker intent, or customer-support intent, then checks whether each class has produced a qualified outcome.",
        uses: "The query-level baseline from the previous step.",
        produces: "The percentage of spend on relevant and irrelevant queries, plus the irrelevant query list with spend attached.",
        config: [["Queries reviewed", "About 1,240 over 30 days"], ["Intent classes", "Product fit, competitor, job-seeker, student, support"], ["Outcome history", "Rolling 90 days"]],
      },
      {
        agent: "delivery", jobTitle: "Prepare campaign-level negative lists", specialist: "Negative Keyword Planner",
        text: "Traced each irrelevant query to its campaign and checked it against the exception list.",
        analyzes: "Traces each irrelevant query to the campaign and ad group that matched it. It compares every proposed negative with the approved product and brand exception list before recommending a change.",
        uses: "The irrelevant query list and the approved exception list.",
        produces: "A reviewed negative keyword list for each affected campaign.",
        config: [["Exception list", "Approved product and brand terms"], ["Grain", "Query x campaign x ad group"]],
      },
    ],
    specialists: 6,
    approvalRequired: true,
    n: 1,
    name: "Search-query waste control",
    platform: "google-search",
    automates: "This workflow reviews every search query, connects it to HubSpot outcomes, and prepares negative keywords for queries that show no buying intent.",
    manualWork: "A paid-media analyst currently exports the search-terms report, reviews about 1,200 queries in a spreadsheet, checks the queries against CRM outcomes, and updates negative keyword lists for each campaign. A complete review takes most of a working day each week. This workflow applies the same classification rules to every query and repeats the analysis weekly.",
    problem: "Search terms with no buying intent consume budget and do not produce SQLs.",
    customerOutput: "The workflow separates relevant and irrelevant spend and prepares negative keywords for each campaign.",
    deliverable: "Negative keywords to add, per campaign",
    status: "active",
    cadence: "Weekly \u00b7 Tuesdays, 7:00 AM",
    lastRun: "Sep 1, 7:02 AM",
    pending: 0,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Pull every search term you paid for", ms: 1620,
        code: "SELECT campaign_id, search_term, match_type,\n       SUM(cost) AS spend, SUM(conversions) AS conv\nFROM google_search_terms\nWHERE date >= CURRENT_DATE - INTERVAL '90' DAY\nGROUP BY 1,2,3" },
      { agent: "measurement", type: "athena_query", label: "Join terms to booked demos", ms: 880,
        code: "SELECT t.search_term, d.demo_booked_at\nFROM search_term_clicks t\nLEFT JOIN crm_demos d USING (gclid)" },
      { agent: "demand", type: "ai_analyze", label: "Classify the intent behind each term", ms: 2740,
        prompt: "For each search term, decide whether it shows buying intent for this product, or is research, careers or competitor traffic. Return a class and a one-line reason." },
      { agent: "demand", type: "python_code", label: "Cluster the irrelevant terms", ms: 690,
        code: "waste = df[df.intent_class != 'solution']\nclusters = waste.groupby('root_token')\n           .agg(spend=('spend','sum'), terms=('search_term','count'))" },
      { agent: "delivery", type: "python_code", label: "Size what each cluster costs", ms: 540,
        code: "clusters['share'] = clusters.spend / campaign_spend\nflagged = clusters[clusters.share > 0.01]\n         .sort_values('spend', ascending=False)" },
      { agent: "delivery", type: "write_file", label: "Draft the negative keyword list", ms: 280 },
      { kind: "approval", label: "Your approval", detail: "Review the negative keyword list before it is applied." },
      { kind: "system", label: "Google Ads", detail: "Adds the approved negatives at campaign level." },
    ],
  },
  {
    id: "spend-to-pipeline",
    family: "Measurement \u00b7 Budget \u00b7 Campaign",
    n: 2,
    nextRun: null,
    // Never deployed, so it has no run history yet.
    runs: [],
    lastRunOk: null,
    reads: ["Google Ads", "HubSpot"],
    outcomes: ["Pipeline per $1K spend", "Cost per SQL by campaign", "% budget on above-benchmark campaigns"],
    found: [
      {
        agent: "measurement", jobTitle: "Join every campaign to the pipeline it created", specialist: "Pipeline Measurement Analyst",
        text: "Joined 90 days of Google Ads touches to HubSpot opportunities.",
        analyzes: "Joins 90 days of Google Ads touches to HubSpot opportunities using the approved attribution logic. It applies the same 30-day maturity window to every campaign before comparing performance.",
        uses: "Google Ads campaign data and HubSpot deals.",
        produces: "Cost per SQL and qualified pipeline per dollar for each campaign.",
        config: [["Lookback", "90 days"], ["Maturity window", "30 days"], ["Sources joined", "Google Ads + HubSpot"]],
      },
      {
        agent: "budget", jobTitle: "Size the move from weakest to strongest", specialist: "Budget Allocation Analyst",
        text: "Estimated how much more budget the stronger campaign can absorb before cost per SQL slips.",
        analyzes: "Compares each campaign with the account benchmark and estimates how much additional budget the stronger campaign can absorb before its cost per SQL is likely to deteriorate.",
        uses: "The campaign benchmark table from the previous step.",
        produces: "A specific source campaign, destination campaign, and transfer amount.",
        config: [["Benchmark", "Account cost per SQL"], ["Absorption test", "Before cost per SQL deteriorates"]],
      },
      {
        agent: "delivery", jobTitle: "Check delivery limits before the move", specialist: "Delivery Guardrail Analyst",
        text: "Checked learning floors, the 4.5 frequency cap and impression-share headroom.",
        analyzes: "Checks the minimum budget needed to preserve campaign learning, the receiving campaign's frequency against its 4.5 cap, and any impression-share ceiling.",
        uses: "The proposed transfer and the current delivery settings.",
        produces: "A validated transfer amount or a smaller amount that respects the guardrails.",
        config: [["Frequency cap", "4.5"], ["Learning floor", "Preserved on the source campaign"], ["Impression share", "Ceiling respected"]],
      },
    ],
    specialists: 5,
    approvalRequired: true,
    n: 2,
    name: "Pipeline-based budget rebalancing",
    platform: "google-search",
    automates: "This workflow connects campaign spend to qualified pipeline in HubSpot and recommends a specific budget move between campaigns.",
    manualWork: "A paid-media analyst currently joins campaign spend with CRM opportunities, resolves missing or inconsistent tracking values, applies the agreed attribution window, and compares cost per SQL across campaigns. Teams often complete this work only once a month or quarter because the spreadsheet takes several hours to rebuild. This workflow refreshes the same analysis every week using the approved logic.",
    problem: "Platform conversions can make a campaign look efficient even when it creates little qualified pipeline.",
    customerOutput: "The workflow recommends a specific budget move, names the source and destination campaigns, and estimates the pipeline effect.",
    deliverable: "A sized budget move, campaign to campaign",
    status: "available",
    cadence: "Not scheduled",
    lastRun: null,
    pending: 0,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Benchmark cost per KPI, per campaign", ms: 1480,
        code: "SELECT c.campaign_id, SUM(c.cost) AS spend,\n       COUNT(d.demo_id) AS demos,\n       SUM(c.cost)/NULLIF(COUNT(d.demo_id),0) AS cost_per_demo\nFROM google_campaign_cost c\nLEFT JOIN crm_demos d USING (gclid)\nGROUP BY 1" },
      { agent: "budget", type: "python_code", label: "Find where headroom exists", ms: 820,
        code: "df['capped'] = df.search_lost_is_budget > 0.10\ncheap = df[(df.cost_per_demo < target) & df.capped]\nexpensive = df[df.cost_per_demo > target * 1.5]" },
      { agent: "budget", type: "python_code", label: "Size the move both ways", ms: 610,
        code: "move = min(expensive.spend.sum() * 0.30,\n           cheap.headroom.sum())\nassert (expensive.spend - move).min() > learning_floor" },
      { agent: "delivery", type: "write_file", label: "Draft the budget change", ms: 240 },
      { kind: "approval", label: "Your approval", detail: "Confirm the amount and the direction of the move." },
      { kind: "system", label: "Google Ads", detail: "Applies the approved budget change." },
    ],
  },
  {
    id: "delivery-leaks",
    family: "Measurement \u00b7 Campaign \u00b7 Budget",
    n: 3,
    nextRun: "Sep 8, 7:00 AM",
    runs: [
      { at: "Sep 1, 7:05 AM", status: "success", ms: 7100, produced: "1 recommendation", evaluated: "$28,400 spend \u00b7 214 conversions" },
      { at: "Aug 27, 7:04 AM", status: "no-action", ms: 6900, produced: "", evaluated: "No segment cleared the flag threshold \u00b7 still watching Saturday mornings, below the volume threshold" },
      { at: "Aug 20, 7:05 AM", status: "success", ms: 7000, produced: "1 recommendation \u00b7 accepted", evaluated: "Impact assessed: cost/conv \u221231%" },
    ],
    lastRunOk: true,
    reads: ["Google Ads", "HubSpot", "GA4"],
    outcomes: ["% spend in converting windows", "Cost per conversion by daypart", "$ redirected per month"],
    found: [
      {
        agent: "measurement", jobTitle: "Set the comparable outcome window", specialist: "Delivery Outcome Analyst",
        text: "Selected conversions past the 30-day maturity window and mapped them to time and place.",
        analyzes: "Selects conversions that have completed the 30-day maturity window and maps each outcome to its campaign, delivery time, and location.",
        uses: "Google Ads, HubSpot, and GA4.",
        produces: "A comparable outcome table by campaign, hour, day, and state.",
        config: [["Maturity window", "30 days"], ["Grain", "Campaign x hour x day x state"], ["Sources joined", "Google Ads + HubSpot + GA4"]],
      },
      {
        agent: "delivery", jobTitle: "Find the hours and regions that spend without converting", specialist: "Schedule and Geography Analyst",
        text: "Flagged segments with enough spend to judge that converted at about 19 times the account cost.",
        analyzes: "Reviews 90 days of delivery by hour, day, and state. It flags segments with enough spend to judge that produced no conversions or a cost per conversion about 19 times worse than the account average. It removes low-volume segments that do not have enough evidence.",
        uses: "The comparable outcome table from the previous step.",
        produces: "The exact schedule and location exclusions for each campaign.",
        config: [["Lookback", "90 days"], ["Flag threshold", "No conversions, or about 19x account cost per conversion"], ["Low-volume segments", "Removed"]],
      },
      {
        agent: "budget", jobTitle: "Re-shape delivery into converting windows", specialist: "Spend Reallocation Planner",
        text: "Identified the business hours and 12 converting metros that can absorb the released spend.",
        analyzes: "Identifies the business hours and 12 converting metros that can absorb the released spend without exceeding daily budget limits.",
        uses: "The proposed exclusions and the current campaign budgets.",
        produces: "A delivery plan that redirects the released budget to the better-performing segments.",
        config: [["Reinvest to", "12 converting metros, business hours"], ["Ceiling", "Daily budget limits"]],
      },
    ],
    specialists: 7,
    approvalRequired: true,
    n: 3,
    name: "Campaign delivery leakage control",
    platform: "google-search",
    automates: "This workflow identifies time periods and locations that consume budget without producing mature qualified outcomes, then prepares the exact delivery changes.",
    manualWork: "A paid-media analyst currently exports delivery by hour, day, and location, combines three reports, and joins the segments to qualified CRM outcomes. The analyst must also separate a real performance problem from a segment with too little data. This workflow repeats that analysis each week for every campaign, hour band, and state.",
    problem: "Campaigns continue to spend during time periods and in locations that do not produce mature qualified outcomes.",
    customerOutput: "The workflow prepares the exact schedule and location changes for each affected campaign.",
    deliverable: "Day, time and geo exclusions, per campaign",
    status: "active",
    cadence: "Weekly \u00b7 Tuesdays, 7:00 AM",
    lastRun: "Sep 1, 7:05 AM",
    pending: 0,
    steps: [
      { agent: "measurement", type: "athena_query", label: "Slice performance by hour and geo", ms: 1910,
        code: "SELECT campaign_id, hour_of_day, geo_target,\n       SUM(cost) AS spend, SUM(conversions) AS conv,\n       SUM(clicks) AS clicks\nFROM google_campaign_delivery\nWHERE date >= CURRENT_DATE - INTERVAL '90' DAY\nGROUP BY 1,2,3" },
      { agent: "delivery", type: "python_code", label: "Compare each cell to its campaign baseline", ms: 1040,
        code: "base = df.groupby('campaign_id').cpa.transform('median')\ndf['delta'] = (df.cpa - base) / base\nleaks = df[(df.delta > 0.40) & (df.clicks >= 200)]" },
      { agent: "delivery", type: "python_code", label: "Keep only leaks that repeat", ms: 720,
        code: "weekly = leaks.groupby(['campaign_id','hour_of_day','geo_target'])\n        .week.nunique()\npersistent = leaks[weekly >= 3]" },
      { agent: "budget", type: "python_code", label: "Quantify the spend released", ms: 480,
        code: "recovered = persistent.groupby('campaign_id').spend_30d.sum()" },
      { agent: "budget", type: "write_file", label: "Draft the schedule and geo exclusions", ms: 260 },
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

// Activating a workflow. In the demo this is the real thing a prospect does
// after picking their three: it goes live on a schedule and starts producing.
// Mutates the in-memory store so the whole surface reacts — list row, rail,
// agent pages — rather than being a button that only changes its own label.
export function activateWorkflow(id) {
  const w = WORKFLOWS.find((x) => x.id === id);
  if (!w) return null;
  if (w.status === "active") return w;
  const resuming = w.status === "paused";
  w.status = "active";
  w.cadence = w.cadence && w.cadence !== "Not scheduled" ? w.cadence : "Daily · 7:00 AM";
  // A just-deployed workflow reads as Running: its first run is in flight,
  // so there is no next-run stamp and no history yet.
  w.nextRun = resuming ? "Tomorrow, 7:00 AM" : null;
  if (!resuming) w.lastRun = null;
  w.runs = w.runs || [];
  return w;
}

// Pausing is a distinct state from "available". An available workflow has never
// been turned on; a paused one was running and is now held, keeps its schedule
// so it can resume on it, and keeps the recommendations it already produced.
export function pauseWorkflow(id) {
  const w = WORKFLOWS.find((x) => x.id === id);
  if (!w || w.status !== "active") return w || null;
  w.status = "paused";
  w.nextRun = null;
  return w;
}

// Everything the agent detail page needs, joined in one place: where the family
// is deployed, what it contributed in each workflow, and what it has found.
// A family is a presentation of step-groups, so it has no runs and no schedule
// of its own — those belong to the workflow and are deliberately absent here.
export function agentDetail(key, recItems) {
  const a = AGENTS[key];
  if (!a) return null;
  const used = agentUsage(key);
  const deployments = used.map((w) => {
    const found = (w.found || []).find((f) => f.agent === key);
    return {
      id: w.id,
      name: w.name,
      platform: w.platform,
      status: w.status,
      deliverable: w.deliverable,
      contribution: found?.text || null,
      // The deployed job title: what this agent does in THIS workflow. The
      // canonical family name never changes, so the role has to be carried
      // alongside it or the page implies one agent does one job everywhere.
      role: found?.jobTitle || null,
      specialist: found?.specialist || null,
      steps: w.steps.filter((s) => s.agent === key).map((s) => s.label),
    };
  });
  return {
    ...a,
    workflowCount: used.length,
    liveCount: used.filter((w) => w.status === "active").length,
    deployments,
    findings: (recItems || []).filter((r) => r.agent === key),
    reads: [...new Set(used.flatMap((w) => w.reads || []))],
    // Where the approved action actually lands — the workflow's system node,
    // not the family's `platforms`. A family that measures acts on nothing, and
    // a family in no workflow acts nowhere.
    actsOn: [
      ...new Set(
        used
          .map((w) => w.steps.find((st) => st.kind === "system")?.label)
          .filter(Boolean),
      ),
    ],
  };
}

// Pending counts come FROM the queue rather than being written by hand, so a
// workflow row and the recommendations surface can never disagree about how
// many decisions are waiting.
export function listWorkflows(recItems) {
  if (!recItems) return WORKFLOWS;
  const open = recItems.filter((r) => r.lifecycle === "needs-decision");
  return WORKFLOWS.map((w) => {
    const pending = open.filter((r) => r.workflowId === w.id).length;
    const awaiting = open.filter((r) => r.workflowId === w.id && r.awaitingYou).length;
    return {
      ...w,
      pending,
      awaiting,
      // "Latest" is whatever the queue actually holds: the pending card if there
      // is one, otherwise the most recent decided card. It never falls back to
      // frozen copy — that is how the rail ended up claiming "Cap 9 accounts"
      // beside a recommendation that says 8.
      recommendation: w.recommendation
        ? {
            ...w.recommendation,
            waiting: pending,
            headline:
              open.find((r) => r.workflowId === w.id)?.title ||
              recItems.find((r) => r.workflowId === w.id)?.title ||
              null,
          }
        : w.recommendation,
    };
  });
}
