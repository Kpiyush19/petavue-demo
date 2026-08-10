// In-memory fixture store for the mock backend. Mutations (create session,
// rename, delete, etc.) persist for the lifetime of the page so the UI feels
// real. Reloading the page resets everything.

let idCounter = 1000;
export function newId(prefix = "id") {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

const now = Date.now();
const minsAgo = (m) => new Date(now - m * 60000).toISOString();

export const TENANT_ID = "tenant-demo";
export const USER_ID = "user-demo";

export const currentUser = {
  _id: USER_ID,
  userId: USER_ID,
  email: "alex.morgan@petavue.com",
  name: "Alex Morgan",
  tenantId: TENANT_ID,
  role: "admin",
  userRole: "admin",
};

// The primary dashboard session the app lands on. Its workspace contains a
// React dashboard so the Verify & Publish flow is immediately accessible.
export const DASH_SESSION_ID = "q2-revenue-dashboard";

// Recipe extracted from the dashboard session — the steps the Verify & Publish
// flow executes and hardens. `card` sections power the "Annotated" view.
export const DASH_RECIPE = {
  version: 3,
  target_file: "output/dashboard/revenue_dashboard.html",
  dashboard_mode: "react",
  steps: [
    {
      id: "step_1",
      tool: "query_athena",
      input: { query: "SELECT month, SUM(amount) AS revenue\nFROM ns_demo_orders\nWHERE order_date >= DATE_ADD('quarter', -1, CURRENT_DATE)\nGROUP BY month\nORDER BY month" },
      code: "SELECT month, SUM(amount) AS revenue\nFROM ns_demo_orders\nWHERE order_date >= DATE_ADD('quarter', -1, CURRENT_DATE)\nGROUP BY month\nORDER BY month",
      status: "completed",
      outputs: ["data/revenue_by_month.csv"],
      summary: { title: "Pull monthly revenue", explanation: "Aggregate order amounts by month for the current quarter.", card: { instructions: ["Sum order {{amount}} grouped by {{month}}", "Limit to the last quarter via a dynamic date window"], conditions: [], outputs: ["data/revenue_by_month.csv"] } },
    },
    {
      id: "step_2",
      tool: "query_athena",
      input: { query: "SELECT account_name, SUM(arr) AS arr, health\nFROM ns_demo_accounts\nGROUP BY account_name, health\nORDER BY arr DESC\nLIMIT 5" },
      code: "SELECT account_name, SUM(arr) AS arr, health\nFROM ns_demo_accounts\nGROUP BY account_name, health\nORDER BY arr DESC\nLIMIT 5",
      status: "completed",
      outputs: ["data/top_accounts.csv"],
      summary: { title: "Rank top accounts by ARR", explanation: "Find the five highest-ARR accounts with their health status.", card: { instructions: ["Sum {{arr}} per account and order descending", "Keep the top 5"], conditions: [], outputs: ["data/top_accounts.csv"] } },
    },
    {
      id: "step_3",
      tool: "execute_code",
      input: { code: "import pandas as pd\nrev = pd.read_csv('data/revenue_by_month.csv')\nkpis = {\n  'total_revenue': int(rev.revenue.sum()),\n  'qoq_growth': 0.142,\n  'win_rate': 0.274,\n}\nimport json; json.dump(kpis, open('data/kpis.json','w'))" },
      code: "import pandas as pd\nrev = pd.read_csv('data/revenue_by_month.csv')\nkpis = {\n  'total_revenue': int(rev.revenue.sum()),\n  'qoq_growth': 0.142,\n  'win_rate': 0.274,\n}\nimport json; json.dump(kpis, open('data/kpis.json','w'))",
      status: "completed",
      outputs: ["data/kpis.json"],
      summary: { title: "Compute headline KPIs", explanation: "Derive total revenue and growth metrics for the scoreboard.", card: { instructions: ["Read the monthly revenue file", "Compute total revenue and growth rates"], conditions: [], outputs: ["data/kpis.json"] } },
    },
    {
      id: "step_4",
      tool: "write_file",
      input: { path: "output/dashboard/widgets/revenue_trend.jsx" },
      code: "export default function RevenueTrend({ data }) { /* bar chart */ }",
      status: "completed",
      outputs: ["output/dashboard/widgets/revenue_trend.jsx"],
      summary: { title: "Build Revenue-by-Month chart", explanation: "Render the monthly revenue bar chart widget.", card: { instructions: ["Render a bar per month from {{revenue_by_month}}"], conditions: [], outputs: ["widgets/revenue_trend.jsx"] } },
    },
    {
      id: "step_5",
      tool: "write_file",
      input: { path: "output/dashboard/widgets/top_accounts.jsx" },
      code: "export default function TopAccounts({ data }) { /* table */ }",
      status: "completed",
      outputs: ["output/dashboard/widgets/top_accounts.jsx"],
      summary: { title: "Build Top-Accounts table", explanation: "Render the top accounts table widget.", card: { instructions: ["Render a row per account from {{top_accounts}}", "Show a health pill per account"], conditions: [], outputs: ["widgets/top_accounts.jsx"] } },
    },
    {
      id: "step_6",
      tool: "write_file",
      input: { path: "output/dashboard/revenue_dashboard.html" },
      code: "<!DOCTYPE html> ... dashboard shell ...",
      status: "completed",
      outputs: ["output/dashboard/revenue_dashboard.html"],
      summary: { title: "Assemble dashboard shell", explanation: "Compose the widgets into the final dashboard page.", card: { instructions: ["Lay out the scoreboard, chart, and table widgets"], conditions: [], outputs: ["output/dashboard/revenue_dashboard.html"] } },
    },
  ],
  groups: [
    { id: "g_1", name: "Source data", steps: ["step_1", "step_2"], summary: "Query revenue and account data" },
    { id: "g_2", name: "Transforms", steps: ["step_3"], summary: "Compute KPIs" },
    { id: "g_3", name: "Widgets", steps: ["step_4", "step_5", "step_6"], summary: "Render widgets and assemble the page" },
  ],
  widget_map: {
    revenue_trend: { steps: ["step_1", "step_4"], widget_file: "widgets/revenue_trend.jsx", data_file: "data/revenue_by_month.csv" },
    top_accounts: { steps: ["step_2", "step_5"], widget_file: "widgets/top_accounts.jsx", data_file: "data/top_accounts.csv" },
    scoreboard: { steps: ["step_3", "step_6"], widget_file: "widgets/scoreboard.jsx", data_file: "data/kpis.json" },
  },
};

// Steps that the hardening pass "adjusts" (vs merely reviews), with the diffs
// shown in the adjustments view.
export const HARDENED_STEPS = {
  step_1: { reason: "Replaced the literal quarter boundary with a dynamic DATE_ADD window so the query stays correct on every refresh." },
  step_3: { reason: "Added a guard so KPI computation handles an empty revenue file without crashing." },
};

// ── Scripted demo conversation: "Paid Media ROI" ──────────────────────────
// The landing session (DASH_SESSION_ID) opens pre-loaded with this transcript
// so the Verify & Publish + artifact flow is immediately demoable. The chat
// renderer (components/sessions) reads db.history[id]; assistant `text` is full
// GFM markdown (bold, inline code, tables); consecutive `tool_call` entries
// collapse into a "Completed · N tools" group whose count == number of entries.
export const PMR_PROMPT =
  "Which paid channels are actually driving demos, and where am I wasting spend?";

// A pre-answer reasoning turn (renders as a Sage message ahead of the answer).
const PMR_REASONING = `Good. The tenant's default conversion event is **closed-won**, not demo. The user said "demos" — that's a leading-indicator view. I should confirm before building.

The right response here is a **short clarifying question**. No queries yet. This is exactly the "if ambiguous, ask ONE clarifying question — don't guess" rule.

Here's what I know:
- The tenant has 3 paid channels wired up (Google, LinkedIn, Meta) with a defined channel taxonomy
- Default attribution conversion event is **closed-won**, not demo
- There's a full \`paid-media-roi\` skill that grades channels against closed-won revenue
- The user said "demos" — could mean (a) literal demo-booked events, (b) SQLs, (c) a proxy for "top-of-funnel conversions," or (d) they're using "demos" casually and really mean pipeline/revenue

Rather than guessing, one quick question saves me from building the wrong thing.`;

export const PMR_CLARIFY = `Great question — and one I can answer well, but I want to nail the conversion event before I build so the ranking actually reflects what you care about.

Your tenant's default attribution conversion event is **closed-won opportunities**, and there's a full **Paid Media ROI skill** ready to run that grades LinkedIn / Google / Meta ROAS against closed-won revenue (not platform-reported ROAS) and calls out where spend is being wasted. That's the board-defensible answer.

But you said **"demos"** — which is a leading indicator, not closed-won. Two ways to go:

**Option A — Real ROAS against closed-won** (the locked definition)
Run the full Paid Media ROI dashboard: CRM-grounded ROAS by channel, spend-reallocation moves for this week, ICP accounts to hand to sales, winning-journey patterns. Every dollar traces to a deal. This is what you'd defend to the board.

**Option B — Demo-conversion view** (leading indicator)
Rank channels by cost-per-demo and demo-to-opp conversion rate. Faster signal, but weaker downstream truth — a channel that books cheap demos that never close is still wasted spend. I'd need to know what counts as a "demo" in your stack:
- A specific Salesforce activity type (e.g., \`Demo Scheduled\`)?
- An opportunity stage (e.g., \`Discovery\` or \`Demo\`)?
- A HubSpot lifecycle stage transition?
- A GA4 conversion event?

**My recommendation: Option A**, because "where am I wasting spend" is a closed-won question — a channel isn't wasteful if its demos convert; it's wasteful if the pipeline it sources never closes. If you also want the demo-conversion cut layered on top as a leading indicator, I can add it as a supplementary block.

Which do you want — A, B, or A + B layered? And if B is in play, how do you define a demo?`;

export const PMR_REPORT = `### Paid Media ROI — the honest picture

**Finding:** Your paid channels are actually working — you're returning **$3.61 in closed-won revenue for every $1 spent** across LinkedIn / Google / Meta. But the platforms are telling you the wrong story, and one channel is dead weight.

**Where the money is working**
- **Google Ads → 4.81× true ROAS.** $77K spend, $373K closed-won across your paid channels. Google reports 0.65× — it's under-crediting itself by 7×. Every closed-won journey pattern in your top-3 starts with Google.
- **LinkedIn Ads → 3.14× true ROAS.** $61K spend, $192K closed-won. Platform reports 1.28×. LinkedIn is your ABM workhorse — the top ICP accounts engaging with your ads (12 in the hand-off queue) are LinkedIn-touched.

**Where you're wasting spend**
- **Meta Ads → 0.98× true ROAS.** $25K spend, $24K closed-won. Meta reports 1.18× — it's the only channel where the platform *overstates* impact. Real revenue barely covers the spend. This is the flag in section 3.
- \`G_Search_NonBrand_Automation\` **(Google search)** — trending down WoW; ranked as this week's #1 pause candidate in section 3.

**The two-second version**

| Channel | You spent | You won | Platform claims | Real ROAS | Verdict |
| --- | --- | --- | --- | --- | --- |
| Google | $77K | $373K | 0.65× | **4.81×** | Scale |
| LinkedIn | $61K | $192K | 1.28× | **3.14×** | Hold |
| Meta | $25K | $24K | 1.18× | **0.98×** | Cut |
| **Blended** | **$163K** | **$588K** | **0.96×** | **3.61×** | — |

**Honest caveats on the numbers**
- **78% of closed-won deals have no paid lead source.** Only 22% of wins carry \`opportunity.leadsource IN (paid channels)\` — the rest are organic search, email, referral, outbound. Paid attribution here is a floor, not the whole picture.
- **Ad data is 85 days behind CRM.** Ad tables end 2026-04-13, CRM extends to today (2026-07-07). The 90d window is anchored to the ad-data max date, not today. If your ads syncs are broken, that's the first thing to fix before acting on any spend move.
- **Attribution is via \`opportunity.leadsource\` per your Key Definition.** This is a last-touch-via-opp model — not a multi-touch reconstruction (you don't have a unified touch table).
- **Campaign-level "True ROAS" allocates platform-level CRM revenue proportionally** to campaign spend, because CRM does not carry campaign IDs.

The full dashboard — six sections, this week's 3 moves, the 12 ICP accounts your sales team should be calling, and the 3 winning journey patterns — is published as **Paid Media ROI** in the artifact panel.`;

const toToolCall = ([tool, input_summary]) => ({ type: "tool_call", tool, input_summary });

// 6 lightweight context reads before the clarifying question (no queries yet).
export const PMR_DISCOVERY_TOOLS = [
  ["get_tenant_config", "Read default conversion event (closed-won) + attribution model"],
  ["list_connectors", "Enumerate connected paid channels: Google, LinkedIn, Meta"],
  ["read_key_definitions", "Load canonical Key Definitions: ROAS formula, leadsource attribution"],
  ["search_skills", "Match the request to the skill catalog → paid-media-roi"],
  ["get_channel_taxonomy", "Read the tenant's defined paid-channel taxonomy"],
  ["check_data_freshness", "Compare the ad-data max date against CRM recency"],
];

// 47 tools for the full skill run (Option A).
export const PMR_RUN_TOOLS = [
  ["connect_source", "Connect Salesforce — opportunities, accounts, activities"],
  ["connect_source", "Connect Google Ads — spend, campaigns"],
  ["connect_source", "Connect LinkedIn Ads — spend, campaigns"],
  ["connect_source", "Connect Meta Ads — spend, campaigns"],
  ["get_schema", "Read opportunity schema — leadsource, amount, stage, close_date"],
  ["get_schema", "Read ad_spend schema — channel, campaign, spend, date"],
  ["check_data_freshness", "Ad tables end 2026-04-13; CRM extends to 2026-07-07"],
  ["query_db", "Total paid spend by channel over the 90d ad-data window"],
  ["query_db", "Closed-won amount where leadsource IN (paid channels)"],
  ["query_db", "Closed-won revenue attributed to Google"],
  ["query_db", "Closed-won revenue attributed to LinkedIn"],
  ["query_db", "Closed-won revenue attributed to Meta"],
  ["query_db", "Pull platform-reported ROAS — Google Ads"],
  ["query_db", "Pull platform-reported ROAS — LinkedIn Ads"],
  ["query_db", "Pull platform-reported ROAS — Meta Ads"],
  ["query_db", "Leadsource coverage — % of wins carrying a paid leadsource"],
  ["query_db", "Week-over-week spend + conversion trend by campaign"],
  ...Array.from({ length: 14 }, (_, i) => [
    "query_db",
    `Allocate CRM revenue to campaign ${i + 1} of 14 (proportional to spend)`,
  ]),
  ["execute_code", "Compute true ROAS per channel (CRM-grounded)"],
  ["execute_code", "Compute blended ROAS across LinkedIn / Google / Meta"],
  ["execute_code", "Assign Scale / Hold / Cut verdicts by channel"],
  ["execute_code", "Rank campaigns → this week's #1 pause candidate"],
  ["execute_code", "Mine the top-3 closed-won journey patterns"],
  ["execute_code", "Score ICP accounts engaging paid ads → hand-off queue (12)"],
  ["write_file", "Section 1 — ROAS scoreboard by channel"],
  ["write_file", "Section 2 — platform-claimed vs true ROAS"],
  ["write_file", "Section 3 — wasted-spend flags + pause candidates"],
  ["write_file", "Section 4 — this week's 3 spend-reallocation moves"],
  ["write_file", "Section 5 — 12 ICP accounts for sales to call"],
  ["write_file", "Section 6 — 3 winning journey patterns"],
  ["verify_step", "Reconcile channel revenue totals against CRM closed-won"],
  ["verify_step", "Confirm every value is source-linked to SQL + contributing rows"],
  ["render_dashboard", "Assemble the Paid Media ROI dashboard (6 sections)"],
  ["publish_artifact", "Publish output/dashboard/paid_media_roi.html"],
];

const PMR_T0 = now - 5 * 24 * 60 * 60000; // ~5 days ago

export const db = {
  // Runtime registries (populated during the Verify & Publish flow)
  execSessions: {},      // execSessionId -> { sessionId, recipe, channel, statuses, hardening }
  recipesBySession: { [DASH_SESSION_ID]: DASH_RECIPE },
  dashboardWidgets: {},  // sessionId -> [{ id, file, name, verified, verified_at }]
  publishedWorkflows: {},// workflowId -> { dashboard_id }

  sessions: [
    {
      session_id: DASH_SESSION_ID,
      name: "Paid Media ROI",
      session_type: "regular",
      status: "active",
      provider: "anthropic",
      dashboard_mode: "react",
      created_at: minsAgo(7200),
      updated_at: minsAgo(7195),
      last_active_at: minsAgo(7195),
      turn_count: 2,
      total_tokens: 48200,
      context_tokens: 48200,
      agent_running: false,
    },
  ],

  // session_id -> file tree (workspace tray)
  fileTree: {
    [DASH_SESSION_ID]: [
      {
        name: "output", path: "output", type: "folder", content_type: "folder",
        children: [
          {
            name: "dashboard", path: "output/dashboard", type: "folder", content_type: "folder",
            children: [
              { name: "paid_media_roi.html", path: "output/dashboard/paid_media_roi.html", type: "file", content_type: "html" },
              { name: "manifest.json", path: "output/dashboard/manifest.json", type: "file", content_type: "json" },
              {
                name: "widgets", path: "output/dashboard/widgets", type: "folder", content_type: "folder",
                children: [
                  { name: "scoreboard.jsx", path: "output/dashboard/widgets/scoreboard.jsx", type: "file", content_type: "html" },
                  { name: "revenue_trend.jsx", path: "output/dashboard/widgets/revenue_trend.jsx", type: "file", content_type: "html" },
                  { name: "top_accounts.jsx", path: "output/dashboard/widgets/top_accounts.jsx", type: "file", content_type: "html" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "data", path: "data", type: "folder", content_type: "folder",
        children: [
          { name: "kpis.json", path: "data/kpis.json", type: "file", content_type: "json" },
          { name: "revenue_by_month.csv", path: "data/revenue_by_month.csv", type: "file", content_type: "csv" },
          { name: "top_accounts.csv", path: "data/top_accounts.csv", type: "file", content_type: "csv" },
        ],
      },
    ],
  },

  // session_id -> history messages
  history: {
    [DASH_SESSION_ID]: [
      { type: "user", text: PMR_PROMPT, timestamp: PMR_T0 },
      ...PMR_DISCOVERY_TOOLS.map(toToolCall),
      { type: "assistant", text: PMR_REASONING, timestamp: PMR_T0 + 30000 },
      { type: "assistant", text: PMR_CLARIFY, timestamp: PMR_T0 + 45000 },
      { type: "user", text: "option A", timestamp: PMR_T0 + 120000 },
      ...PMR_RUN_TOOLS.map(toToolCall),
      { type: "assistant", text: PMR_REPORT, timestamp: PMR_T0 + 300000 },
      { type: "outputs", outputs: [{ path: "output/dashboard/paid_media_roi.html", title: "Paid Media ROI" }] },
    ],
  },

  workflows: [
    {
      _id: "wf-demo-1",
      workflow_id: "wf-demo-1",
      name: "Daily Revenue Snapshot",
      status: "active",
      shared: true,
      auto_refresh: true,
      trigger: { type: "cron", cron: "0 9 * * *", timezone: "UTC" },
      tenant_timezone: "UTC",
      latest_run: { status: "success", refreshed_at: minsAgo(200) },
      created_at: minsAgo(5000),
      updated_at: minsAgo(200),
      blocks: [
        { id: "b1", type: "athena_query", label: "Pull monthly revenue", config: { query: "SELECT month, SUM(amount) AS revenue\nFROM ns_demo_orders\nWHERE order_date >= DATE_ADD('quarter', -1, CURRENT_DATE)\nGROUP BY month\nORDER BY month" } },
        { id: "b2", type: "athena_query", label: "Rank top accounts by ARR", config: { query: "SELECT account_name, SUM(arr) AS arr, health\nFROM ns_demo_accounts\nGROUP BY account_name, health\nORDER BY arr DESC\nLIMIT 5" } },
        { id: "b3", type: "python_code", label: "Compute headline KPIs", config: { code: "import pandas as pd\nrev = pd.read_csv('data/revenue_by_month.csv')\nkpis = { 'total_revenue': int(rev.revenue.sum()), 'qoq_growth': 0.142 }\nimport json; json.dump(kpis, open('data/kpis.json','w'))" } },
        { id: "b4", type: "write_file", label: "Build dashboard widgets", config: {} },
        { id: "b5", type: "ai_summarize", label: "Generate AI summary", config: { prompt: "Summarize this quarter's revenue trends and at-risk accounts." } },
        { id: "b6", type: "send_slack", label: "Post summary to #revenue", config: { channels: ["revenue"] } },
      ],
      owner_id: USER_ID,
    },
    {
      _id: "wf-demo-2",
      workflow_id: "wf-demo-2",
      name: "Weekly Pipeline Health",
      status: "active",
      shared: false,
      auto_refresh: false,
      trigger: { type: "Manual" },
      tenant_timezone: "UTC",
      latest_run: { status: "success", refreshed_at: minsAgo(1200) },
      created_at: minsAgo(9000),
      updated_at: minsAgo(1200),
      blocks: [
        { id: "w1", type: "athena_query", label: "Pull open pipeline by stage", config: { query: "SELECT stage, COUNT(*) AS deals, SUM(amount) AS value\nFROM ns_demo_opps\nWHERE status = 'open'\nGROUP BY stage" } },
        { id: "w2", type: "python_code", label: "Compute win-rate & velocity", config: { code: "import pandas as pd\n# win rate, avg deal age, stage conversion" } },
        { id: "w3", type: "ai_analyze", label: "Flag at-risk deals", config: { prompt: "Identify deals slipping or stalled and explain why." } },
        { id: "w4", type: "send_slack", label: "Post to #gtm-leadership", config: { channels: ["gtm-leadership"] } },
      ],
      owner_id: USER_ID,
    },
  ],

  // Workflows already linked to the dashboard session — surfaced by
  // /api/workflows/check so the "Edit existing workflow" path is demoable.
  // Shape mirrors what PublishView's updateMode-populate effect expects:
  // blocks[] (ai_summarize / send_slack / publish_dashboard) + schedule.
  linkedWorkflows: [
    {
      workflow_id: "wf-q2-weekly",
      name: "Q2 Revenue, Weekly",
      dashboard_name: "Q2 Revenue Dashboard",
      dashboard_id: "dash-demo-1",
      blocks: [
        { type: "publish_dashboard", config: { name: "Q2 Revenue Dashboard", shared: false, include_link: true, message: "" } },
        { type: "ai_summarize", config: { prompt: "Summarize the week's revenue movement and flag at-risk accounts.", output_file: "agent_memo/weekly_summary.md", save_memo: true } },
        { type: "send_slack", config: { channels: ["C2"], dm_users: [], mode: "content_from", content_from: "agent_memo/weekly_summary.md" } },
      ],
      schedule: { type: "custom", cron: "0 9 * * 1", timezone: "America/New_York" },
    },
    {
      workflow_id: "wf-q2-sync",
      name: "Q2 Revenue, On data sync",
      dashboard_name: "Q2 Revenue Dashboard",
      dashboard_id: "dash-demo-1",
      blocks: [
        { type: "publish_dashboard", config: { name: "Q2 Revenue Dashboard", shared: true, include_link: true, message: "" } },
      ],
      schedule: { type: "data_sync" },
    },
  ],

  dashboards: [
    {
      _id: "dash-paid-media-roi",
      dashboard_id: "dash-paid-media-roi",
      id: "dash-paid-media-roi",
      name: "Paid Media ROI",
      title: "Paid Media ROI",
      shared: true,
      status: "published",
      source: "workflow",
      workflow_id: "wf-paid-media-roi",
      owner_id: USER_ID,
      target_file: "output/dashboard/paid_media_roi.html",
      tenant_timezone: "UTC",
      latest_run: { status: "success", refreshed_at: minsAgo(15) },
      created_at: minsAgo(7200),
      updated_at: minsAgo(15),
      widgets: [],
    },
    {
      _id: "dash-creative-ad-perf",
      dashboard_id: "dash-creative-ad-perf",
      id: "dash-creative-ad-perf",
      name: "Creative & Ad Performance",
      title: "Creative & Ad Performance",
      shared: true,
      status: "published",
      source: "workflow",
      owner_id: USER_ID,
      target_file: "output/dashboard/creative_ad_performance.html",
      tenant_timezone: "UTC",
      latest_run: { status: "success", refreshed_at: minsAgo(45) },
      created_at: minsAgo(9000),
      updated_at: minsAgo(45),
      widgets: [],
    },
    {
      _id: "dash-target-account-journey",
      dashboard_id: "dash-target-account-journey",
      id: "dash-target-account-journey",
      name: "Target Account Journey",
      title: "Target Account Journey",
      shared: true,
      status: "published",
      source: "workflow",
      owner_id: USER_ID,
      target_file: "output/dashboard/target_account_journey.html",
      tenant_timezone: "UTC",
      latest_run: { status: "success", refreshed_at: minsAgo(60) },
      created_at: minsAgo(9500),
      updated_at: minsAgo(60),
      widgets: [],
    },
    // Catalog placeholders — shown in the list but not clickable (no built view yet).
    ...[
      ["dash-ph-mt-attribution", "Multi-Touch Revenue Attribution", 120],
      ["dash-ph-influenced-pipeline", "Marketing-Influenced Pipeline", 240],
      ["dash-ph-budget-pacing", "Budget Pacing — Weekly Review", 60],
      ["dash-ph-search-intent", "Search Term Intent Analysis", 480],
      ["dash-ph-audience-perf", "Audience Performance Dashboard", 720],
      ["dash-ph-suppression", "Suppression List Health", 1440],
      ["dash-ph-abm-funnel", "ABM Account Funnel", 300],
      ["dash-ph-landing-leakage", "Landing Page & Form Leakage", 180],
      ["dash-ph-lead-source", "Lead Source Effectiveness", 2880],
      ["dash-ph-warm-handoff", "Warm Account Hand-off Report", 90],
      ["dash-ph-cfo-snapshot", "CFO-Ready Pipeline Snapshot", 4320],
      ["dash-ph-quarterly-review", "Quarterly Pipeline Review", 10080],
    ].map(([id, name, mins], i) => ({
      _id: id,
      dashboard_id: id,
      id,
      name,
      title: name,
      shared: true,
      status: "published",
      source: "workflow",
      placeholder: true,
      owner_id: USER_ID,
      target_file: "",
      tenant_timezone: "UTC",
      latest_run: { status: "success", refreshed_at: minsAgo(mins) },
      created_at: minsAgo(8000 + i * 400),
      updated_at: minsAgo(mins),
      widgets: [],
    })),
  ],

  skills: [
    {
      _id: "skill-demo-1",
      id: "skill-demo-1",
      name: "Quarterly Revenue Dashboard",
      description: "Pull revenue by month, rank top accounts, and build a board-ready dashboard with headline KPIs.",
      category: "Revenue",
      scope: "tenant",
      tier: "tenant",
      is_active: true,
      active: true,
      output_type: "dashboard",
      tags: ["Revenue", "Snowflake", "KPIs", "Board"],
    },
    {
      _id: "skill-demo-2",
      id: "skill-demo-2",
      name: "Churn Risk Scoring",
      description: "Score accounts by churn likelihood from product usage and engagement signals.",
      category: "Predictive",
      scope: "tenant",
      tier: "tenant",
      is_active: true,
      active: true,
      output_type: "memo",
      tags: ["Churn", "Accounts", "Predictive"],
    },
    {
      _id: "skill-demo-3",
      id: "skill-demo-3",
      name: "Pipeline Coverage Analysis",
      description: "Compare open pipeline against quota by segment and flag coverage gaps for the next two quarters.",
      category: "Sales",
      scope: "tenant",
      tier: "tenant",
      is_active: true,
      active: true,
      output_type: "dashboard",
      tags: ["Pipeline", "Quota", "Salesforce"],
    },
    {
      _id: "skill-demo-4",
      id: "skill-demo-4",
      name: "Cohort Retention Curves",
      description: "Build retention curves by signup cohort and surface the cohorts driving net revenue retention.",
      category: "Analytics",
      scope: "tenant",
      tier: "tenant",
      is_active: true,
      active: true,
      output_type: "dashboard",
      tags: ["Retention", "Cohorts", "NRR"],
    },
    {
      _id: "skill-demo-5",
      id: "skill-demo-5",
      name: "Weekly Revenue Recap",
      description: "Summarize the week's biggest movers, at-risk accounts, and key metric changes into a shareable memo.",
      category: "Revenue",
      scope: "tenant",
      tier: "tenant",
      is_active: true,
      active: true,
      output_type: "memo",
      tags: ["Recap", "Slack", "Weekly"],
    },
    {
      _id: "skill-demo-6",
      id: "skill-demo-6",
      name: "Paid Media ROI",
      description: "Grade every paid channel against closed-won revenue — not platform-reported ROAS — and surface where to move spend this week.",
      category: "Marketing",
      scope: "tenant",
      tier: "tenant",
      is_active: true,
      active: true,
      output_type: "dashboard",
      tags: ["ROAS", "Attribution", "Spend"],
    },
  ],

  schedules: [
    {
      schedule_id: "sched-demo-1",
      name: "Daily Revenue Snapshot",
      cron: "0 9 * * *",
      timezone: "America/New_York",
      status: "active",
      enabled: true,
      created_at: minsAgo(5000),
      next_run: minsAgo(-600),
      recent_runs: [],
    },
  ],
};
