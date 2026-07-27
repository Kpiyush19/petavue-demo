// Mock store + engine for the Goals experience (/goals).
// Goal lifecycle: calibrating → decisions → review → active.
// Calibration auto-advances on timers (server-driven, like skillRun) so the
// detail page can poll and animate the progress checklist.

let SEQ = 700;
const nid = (p) => `${p}-${(SEQ++).toString(16)}${Math.floor((SEQ * 97) % 9999).toString(16)}`;

// Format a check-in timestamp in AlaanPay's timezone (Gulf Standard Time, UTC+4)
// as absolute date · time · tz, so each goal carries its own last-checked moment
// (computed once at seed time, so it's stable and varied per goal).
function checkedAt(hoursAgo = 0) {
  const d = new Date(Date.now() - hoursAgo * 3600000);
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d);
  return `${s} GST`;
}
// Compact relative label for list/feed cells (the detail header shows the full
// absolute `at` in its tooltip instead).
function agoLabel(hoursAgo = 0) {
  if (hoursAgo < 1) return "Just now";
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  return `${Math.round(hoursAgo / 24)}d ago`;
}

// Workflows available to feed a goal (the dashboard flows that refresh daily).
export const GOAL_WORKFLOWS = [
  { id: "wf-hubspot-gap", name: "HubSpot Data Gap Audit Dashboard", schedule: "Custom schedule", lastRun: "last run 18d ago" },
  { id: "wf-row-count", name: "HubSpot Table Row Count Comparison: Weekly", schedule: "On data sync", lastRun: "last run 5d ago" },
  { id: "wf-pipeline-health", name: "Sales Pipeline Health", schedule: "On data sync", lastRun: "last run 21d ago" },
  { id: "wf-rev-snapshot", name: "Daily Revenue Snapshot", schedule: "Daily · 6:00 AM", lastRun: "last run 3h ago" },
  { id: "wf-cpl-monitor", name: "Paid Media CPL Monitor", schedule: "Weekly · Mon", lastRun: "last run 2d ago" },
  { id: "wf-churn-signals", name: "Account Churn Signals", schedule: "On data sync", lastRun: "last run 6h ago" },
  { id: "wf-ssl-expiry", name: "Expiring SSL Certificates", schedule: "Daily · 9:00 AM", lastRun: "last run 11h ago" },
  { id: "wf-deal-hygiene", name: "Pipeline Hygiene: Stale Deals", schedule: "Custom schedule", lastRun: "last run 4d ago" },
];

// Calibration checklist (right rail). The driver advances `progress` through these.
export const CALIBRATION_STEPS = [
  { key: "workflows", label: "Loaded your workflows" },
  { key: "history", label: "Read your history" },
  { key: "targets", label: "Targets" },
  { key: "conditions", label: "Conditions" },
  { key: "moves", label: "Recommended moves" },
  { key: "review", label: "Ready for your review" },
];

const config = {
  company: "AlaanPay: B2B fintech (corporate cards + spend management) for finance teams in the UAE. Paid-led acquisition across Google (Search, Performance Max, Demand Gen) and Meta; the north star is efficient, provable demo pipeline.",
  process: "",
  icp: "",
  additional: "",
};

// ── Reusable proposed config for AlaanPay's "efficient paid spend" goal ──
// Conditions carry both a human-readable `label` (what a marketer reads) and the
// raw `logic` (the audit-grade rule the engine evaluates), so the Monitor tab can
// lead with plain language and tuck the logic behind "View rule logic".
function paidEfficiencyGoalConfig() {
  return {
    targets: [
      {
        id: nid("tgt"),
        label: "Keep blended cost-per-demo under $180",
        target: "<$180", current: "$214", met: false,
        why: "Trailing cost-per-demo is $214. $180 is the level where paid payback stays under 9 months at AlaanPay's current demo→win rate (11%).",
      },
      {
        id: nid("tgt"),
        label: "Hold Search impression share above 65% on converting, high-intent terms",
        target: "≥65%", current: "58%", met: false,
        why: "Your converting Search terms are capped at 58% impression share. You're losing ~34% of the cheapest demos you can buy to budget, not to competitors' bids.",
      },
      {
        id: nid("tgt"),
        label: "No campaign type spends over $2K in 14 days with zero demos",
        target: "$2K · 0 demos", current: "$18.4K · 2 demos", met: false,
        why: "PMax + Demand Gen burned $18.4K in 14 days for 2 demos. A hard waste ceiling stops spend rotting in channels that don't convert for AlaanPay.",
      },
    ],
    conditions: [
      { id: nid("cnd"), label: "PMax and Demand Gen spend isn't booking demos", logic: "spend_14d(campaign_type IN ['pmax','demand_gen']) > $2,000 AND demos_booked_14d = 0", state: "fired", count: 2 },
      { id: nid("cnd"), label: "Search is leaving high-intent impression share on the table", logic: "search_impression_share(converting_terms) < 65% AND impression_share_lost_to_budget > 10%", state: "fired", count: 1 },
      { id: nid("cnd"), label: "A Meta creative's frequency is past saturation", logic: "meta_frequency_7d > 4.0 AND ctr_trend_21d < 0", state: "fired", count: 1 },
      { id: nid("cnd"), label: "Blended cost-per-demo is drifting above target", logic: "cost_per_demo_7d > $180", state: "quiet", count: 0 },
      { id: nid("cnd"), label: "A live campaign's landing page conversion is dropping", logic: "lp_conversion_7d < 0.6 × lp_conversion_baseline", state: "quiet", count: 0 },
      { id: nid("cnd"), label: "PMax is overlapping paid spend onto your brand terms", logic: "pmax_brand_query_impressions_7d > 500", state: "quiet", count: 0 },
    ],
    moves: [
      { id: nid("mv"), label: "Cap or pause a PMax / Demand Gen campaign that's spending without booking demos" },
      { id: nid("mv"), label: "Shift the freed budget into capped high-intent Search where impressions are available" },
      { id: nid("mv"), label: "Refresh the fatigued Meta creative / rotate in a new concept" },
      { id: nid("mv"), label: "Raise Search budget on converting term groups to recover lost impression share" },
      { id: nid("mv"), label: "Tighten PMax audience signals and exclude junk placements" },
      { id: nid("mv"), label: "Fix or A/B the underperforming landing page" },
      { id: nid("mv"), label: "Flag for manager review" },
    ],
  };
}

function defaultQuestions() {
  return [
    {
      id: nid("q"),
      text: "Your goal targets the MQL→SQL conversion rate (sqls / mqls), defined on hubspot_contacts.lifecyclestage. But the only history copied for the linked 'Sales Pipeline Health' workflow is deal-stage data. There is NO contact/lifecyclestage pool in the copied history to bind this rate to. How should I anchor the target?",
      found: "Searched all 38 history files: zero matches for lifecyclestage/mql/sql. raw_deals.csv (497 rows) starts at deal stages 'appointmentscheduled'/'qualifiedtobuy', already past the MQL→SQL marketing handoff.",
      options: [
        { id: "a", label: "Keep the true metric: author MQL→SQL rate = sqls/mqls (lifecyclestage) as an UNVERIFIED custom target at ≥40%, badged unverified until contact lifecycle data is linked.", recommended: true },
        { id: "b", label: "Re-anchor to a bindable deal-funnel proxy in raw_deals.csv (e.g. share of deals advancing past the earliest stage), a DIFFERENT metric, not true MQL→SQL.", recommended: false },
        { id: "c", label: "Hold targets. I plan to link a contacts/lifecyclestage workflow so the rate can bind to real copied history.", recommended: false },
      ],
    },
    {
      id: nid("q"),
      text: "What time window should we measure the target over?",
      found: "raw_deals.csv spans the last 92 days of activity; the trailing 30 days has the densest, most representative volume (213 of 497 rows).",
      options: [
        { id: "a", label: "Trailing 30 days: densest, most current signal.", recommended: true },
        { id: "b", label: "Trailing 90 days: smoother but slower to react.", recommended: false },
        { id: "c", label: "Quarter-to-date: aligns to the sales quarter.", recommended: false },
      ],
    },
  ];
}

// A goal surfaces several findings per check-in — one per condition that fired.
// Each is grounded in AlaanPay's own paid data and carries the full reasoning
// chain the UI now makes visible: cause (why it fired) · evidence · trigger ·
// action · worth (impact) · derivation (how we got here).
function makeRecommendations() {
  const base = [
    {
      category: "Wasted spend", iconKey: "spend", severity: "act-now", tier: 1, age: "New · day 1",
      title: "PMax + Demand Gen burned $18.4K for 2 demos in 14 days",
      tldr: "Cap the worst PMax / Demand Gen campaigns and move the budget into capped high-intent Search.",
      cause: "PMax and Demand Gen together spent over $2K in 14 days while booking effectively zero qualified demos.",
      body: "Performance Max and Demand Gen spent $18,400 over the last 14 days and booked 2 demos, a $9,200 cost-per-demo, 51× your $180 target. 78% of the impressions landed on broad, low-intent placements that don't convert for AlaanPay.",
      evidence: "$18.4K spent · 2 demos · $9.2K per demo vs a $180 target. 78% of impressions were broad, low-intent placements.",
      impact: { label: "Recoverable spend / 14 days", value: "$16.8K", sub: "redeployable to Search" },
      triggerLabel: "Spend without demos", signal: "$9.2K cost / demo",
      metrics: [
        { label: "Spend (14d)", value: "$18.4K", note: "PMax + Demand Gen" },
        { label: "Demos booked", value: "2", note: "$9.2K each" },
        { label: "Cost-per-demo", value: "$9.2K", note: "51× the $180 target" },
        { label: "Low-intent impressions", value: "78%", note: "broad placements" },
      ],
      trigger: "Fires when a campaign type spends over $2K in 14 days with zero booked demos",
      steps: ["Cap or pause the worst-converting PMax / Demand Gen campaigns", "Redeploy the freed budget into capped high-intent Search"],
      derivation: [
        "Spend and conversions pulled from `google_ads_campaigns.csv`, grouped by `campaign_type`.",
        "Cost-per-demo = `spend_14d` ÷ `demos_booked_14d` = **$9,200**.",
        "Low-intent share = impressions on broad placements ÷ total impressions = **78%** for these campaigns.",
        "Verified: demos joined on `gclid` → CRM `demo_booked` events, ruling out untracked conversions.",
      ],
    },
    {
      category: "Missed demand", iconKey: "headroom", severity: "act-now", tier: 1, age: "New · day 1",
      title: "High-intent Search is capped: you're losing 34% of the demos you could buy",
      tldr: "Raise budget on converting Search terms to recover the lost impression share.",
      cause: "Search impression share on converting terms fell below 65% while losing double-digit share to budget.",
      body: "Your converting Search terms (corporate card, expense management, spend management) run at 58% impression share and lose 34% of impressions to budget, not to competitors' bids. These are your cheapest demos at $120 each, and the demand is going unanswered.",
      evidence: "58% impression share · 34% lost to budget · $120 cost-per-demo, the cheapest paid demos AlaanPay buys.",
      impact: { label: "Demos left on the table / mo", value: "~46", sub: "at $120 each · ~$5.5K" },
      triggerLabel: "Search headroom", signal: "58% impression share",
      metrics: [
        { label: "Impression share", value: "58%", note: "converting terms" },
        { label: "Lost to budget", value: "34%", note: "not to rank" },
        { label: "Cost-per-demo", value: "$120", note: "cheapest channel" },
        { label: "Recoverable demos", value: "~46 / mo", note: "if uncapped" },
      ],
      trigger: "Fires when Search impression share on converting terms drops below 65% while losing budget",
      steps: ["Raise budget on the converting Search term groups", "Fund it from the paused PMax / Demand Gen spend"],
      derivation: [
        "Search terms and impression-share metrics pulled from `google_ads_search_terms.csv`.",
        "Lost-to-budget = `search_lost_is_budget` = **34%** on the converting term group.",
        "Converting-term set derived from AlaanPay's own `gclid` → demo joins, no external keyword list.",
        "Verified: rank-lost share is under 8%, isolating budget (not competitiveness) as the cap.",
      ],
    },
    {
      category: "Creative fatigue", iconKey: "fatigue", severity: "watch", tier: 2, age: "Day 3",
      title: "Your top Meta creative hit frequency 5.8: CTR is down 41%",
      tldr: "Refresh the fatigued Meta creative before CPMs climb further.",
      cause: "A Meta creative's 7-day frequency passed 4.0 while its CTR trended down over 21 days.",
      body: "Your top Meta creative has run to an average frequency of 5.8 over 21 days. CTR has fallen 41% and CPM is up 28% as the same audience sees it repeatedly, textbook creative fatigue. Meta's cost-per-demo has drifted from $165 to $240.",
      evidence: "Frequency 5.8 · CTR −41% · CPM +28% over 21 days; Meta cost-per-demo $165 → $240.",
      impact: { label: "Cost-per-demo drift", value: "+$75", sub: "Meta · 21 days" },
      triggerLabel: "Creative fatigue", signal: "5.8 frequency",
      metrics: [
        { label: "Frequency (7d)", value: "5.8", note: "past 4.0 saturation" },
        { label: "CTR trend (21d)", value: "−41%", note: "falling" },
        { label: "CPM trend", value: "+28%", note: "same audience" },
        { label: "Cost-per-demo", value: "$240", note: "was $165" },
      ],
      trigger: "Fires when a Meta creative's 7-day frequency passes 4.0 with a falling CTR",
      steps: ["Rotate in a fresh creative concept", "Cap frequency or widen the audience to reset it"],
      derivation: [
        "Creative-level delivery pulled from `meta_ads_creatives.csv` over a 21-day window.",
        "Frequency = impressions ÷ reach = **5.8** on the top-spend creative.",
        "CTR and CPM trends are 21-day slopes on the same creative, a like-for-like read.",
        "Verified: audience size steady, so the CPM rise is fatigue, not a targeting change.",
      ],
    },
    {
      category: "Conversion leak", iconKey: "landing", severity: "watch", tier: 2, age: "Day 5",
      title: "The /demo landing page is converting paid traffic at half its usual rate",
      tldr: "Investigate the /demo page: paid conversion halved this week.",
      cause: "Landing-page conversion on paid traffic fell below 60% of its baseline.",
      body: "Paid traffic to /demo converted at 3.9% this week versus a 7.8% baseline. The drop is isolated to paid (organic is steady), which points at message-match or a page issue on the paid experience rather than traffic quality.",
      evidence: "3.9% paid conversion vs 7.8% baseline, a 50% drop, isolated to paid traffic.",
      impact: { label: "Conversion vs baseline", value: "−50%", sub: "/demo · paid only" },
      triggerLabel: "Conversion drop", signal: "3.9% vs 7.8%",
      metrics: [
        { label: "Paid conversion (7d)", value: "3.9%", note: "was 7.8%" },
        { label: "Organic conversion", value: "7.6%", note: "steady" },
        { label: "Paid sessions affected", value: "~1,900 / wk", note: "" },
      ],
      trigger: "Fires when a live campaign's landing-page conversion drops below 60% of baseline",
      steps: ["Audit /demo for a broken form or slow load on paid", "A/B a fixed variant against the current page"],
      derivation: [
        "Session and conversion data pulled from `web_analytics_landing.csv`, split by `traffic_source`.",
        "Paid conversion = paid demo forms ÷ paid sessions = **3.9%**, vs a trailing **7.8%** baseline.",
        "Organic held at 7.6%, isolating the drop to the paid experience, not traffic quality.",
        "Verified: no tracking change deployed this week, ruling out a measurement artifact.",
      ],
    },
    {
      category: "Spend overlap", iconKey: "brand", severity: "watch", tier: 3, age: "Day 5",
      title: "PMax is bidding on your brand terms, paying for demand you'd get free",
      tldr: "Exclude brand terms from PMax so you stop paying for organic demand.",
      cause: "PMax served on branded 'alaanpay' queries above the overlap threshold this week.",
      body: "PMax served on 'alaanpay' brand queries 1,240 times this week, demand that already converts through organic and brand Search at near-zero cost. You're paying PMax rates for traffic you'd capture anyway.",
      evidence: "1,240 PMax impressions on brand queries; brand demand already converts near-free via organic.",
      impact: { label: "Avoidable brand spend / mo", value: "~$3.1K", sub: "PMax on brand" },
      triggerLabel: "Brand overlap", signal: "1,240 impressions",
      metrics: [
        { label: "Brand impressions (PMax)", value: "1,240 / wk", note: "" },
        { label: "Est. avoidable spend", value: "~$3.1K / mo", note: "" },
        { label: "Organic brand capture", value: "94%", note: "already free" },
      ],
      trigger: "Fires when PMax serves over 500 impressions on brand queries in 7 days",
      steps: ["Add a brand-term negative / exclusion list to PMax", "Let organic and brand Search keep capturing brand demand"],
      derivation: [
        "PMax query data pulled from `google_ads_pmax_queries.csv` (brand-term matched).",
        "Brand impressions = queries matching `alaanpay*` = **1,240** in the last 7 days.",
        "Avoidable spend estimated from PMax's brand-query CPC × impressions × CTR.",
        "Verified: organic already captures **94%** of brand demand, so the overlap is redundant.",
      ],
    },
    {
      category: "Retargeting waste", iconKey: "spend", severity: "act-now", tier: 2, age: "New · day 1",
      title: "Retargeting is spending $4.2K/mo on people who already booked",
      tldr: "Exclude converters and 30-day-stale visitors from your retargeting audiences.",
      cause: "Retargeting audiences still include users who already converted or have gone cold.",
      body: "42% of retargeting impressions this month hit users who already booked a demo or last visited over 30 days ago. That's $4.2K/mo re-serving ads to people who won't convert again, budget that should chase fresh, in-market visitors.",
      evidence: "42% of retargeting impressions hit already-converted or 30-day-stale users, $4.2K/mo.",
      impact: { label: "Wasted retargeting / mo", value: "$4.2K", sub: "converters + stale" },
      triggerLabel: "Retargeting waste", signal: "42% wasted",
      metrics: [
        { label: "Retargeting spend / mo", value: "$9.8K", note: "" },
        { label: "Wasted share", value: "42%", note: "converted or stale" },
        { label: "Recoverable", value: "$4.2K / mo", note: "" },
      ],
      trigger: "Fires when over 30% of retargeting impressions hit converted or 30-day-stale users",
      steps: ["Add a converters exclusion list to retargeting", "Cap the retargeting window at 30 days"],
      derivation: [
        "Retargeting delivery pulled from `meta_ads_audiences.csv`, joined to CRM demo events.",
        "Wasted share = impressions to converted or 30-day-stale users ÷ total = **42%**.",
        "Recoverable spend = wasted share × monthly retargeting spend = **$4.2K**.",
        "Verified: converters matched on hashed email → CRM `demo_booked`, ruling out false matches.",
      ],
    },
    {
      category: "Query waste", iconKey: "query", severity: "watch", tier: 2, age: "Day 2",
      title: "Broad-match Search is buying $2.3K/mo of off-intent clicks",
      tldr: "Add negatives: broad match is matching searches that never book a demo.",
      cause: "Broad-match keywords matched a rising share of queries with no buying intent (free tools, jobs, unrelated brands).",
      body: "23% of broad-match Search spend this month went to queries with no buying intent: 'free expense tracker', 'accounting jobs', unrelated brand names. That's $2.3K/mo of clicks that never book a demo, and the share is climbing week over week.",
      evidence: "23% of broad-match spend on zero-intent queries, $2.3K/mo across ~40 query themes.",
      impact: { label: "Recoverable Search spend / mo", value: "$2.3K", sub: "add negatives" },
      triggerLabel: "Irrelevant queries", signal: "23% off-intent",
      metrics: [
        { label: "Broad-match spend / mo", value: "$10.0K", note: "" },
        { label: "Off-intent share", value: "23%", note: "no demo intent" },
        { label: "Recoverable", value: "$2.3K / mo", note: "with negatives" },
        { label: "Query themes to block", value: "~40", note: "jobs, free tools" },
      ],
      trigger: "Fires when over 15% of broad-match spend lands on zero-intent queries in 30 days",
      steps: ["Add the off-intent query themes as negative keywords", "Tighten broad-match to phrase on the loosest ad groups"],
      derivation: [
        "Search queries pulled from `google_ads_search_terms.csv`, matched to spend.",
        "Off-intent share = spend on no-demo-intent queries ÷ broad-match spend = **23%**.",
        "Intent labelled from AlaanPay's own `gclid` → demo joins, queries that never convert.",
        "Verified: excluded branded and clearly-converting terms before counting waste.",
      ],
    },
    {
      category: "Budget pacing", iconKey: "pacing", severity: "watch", tier: 2, age: "Day 4",
      title: "Your best Search campaign will run dry 9 days before month-end",
      tldr: "Lift the monthly cap or smooth pacing: the cheapest demo engine goes dark early.",
      cause: "Daily spend on the top-converting Search campaign is pacing 41% above plan and will hit its monthly cap early.",
      body: "Your best-converting Search campaign is pacing to spend its full monthly budget by day 21, then it goes dark for the last 9 days of the month, exactly when it books your cheapest demos. Demand doesn't stop; only the ads do.",
      evidence: "Pacing 41% over plan: budget exhausts on day 21 of 30, dark for 9 days.",
      impact: { label: "Demo-days lost / mo", value: "~9 days", sub: "best campaign dark" },
      triggerLabel: "Pacing over plan", signal: "41% over pace",
      metrics: [
        { label: "Pace vs plan", value: "+41%", note: "over budget curve" },
        { label: "Budget exhausts", value: "Day 21", note: "of 30" },
        { label: "Dark days", value: "~9", note: "no delivery" },
        { label: "Channel", value: "Search", note: "cheapest demos" },
      ],
      trigger: "Fires when a campaign paces to exhaust its monthly budget before day 24",
      steps: ["Raise the monthly cap on the top-converting Search campaign", "Or switch it to standard pacing to spread delivery"],
      derivation: [
        "Daily spend pulled from `google_ads_campaigns.csv` against the monthly budget.",
        "Projected exhaustion = budget ÷ trailing-7-day daily spend = **day 21**.",
        "Pace = trailing daily spend ÷ even-pacing target = **+41%**.",
        "Verified: this campaign has the lowest cost-per-demo, so dark days cost real pipeline.",
      ],
    },
    {
      category: "Device gap", iconKey: "device", severity: "watch", tier: 3, age: "Day 6",
      title: "Mobile is 61% of paid spend but converts at half the desktop rate",
      tldr: "Shift bids toward desktop or fix the mobile demo flow: mobile demos cost 2×.",
      cause: "Mobile cost-per-demo is running roughly double desktop while mobile takes the majority of spend.",
      body: "Mobile takes 61% of paid spend but books demos at a $310 cost-per-demo, nearly double desktop's $165. The gap is widest on the /demo form, which points at a mobile UX problem, not audience quality.",
      evidence: "Mobile 61% of spend · $310 cost-per-demo vs $165 on desktop, a 1.9× gap.",
      impact: { label: "Efficiency gap", value: "1.9×", sub: "mobile vs desktop" },
      triggerLabel: "Device gap", signal: "$310 vs $165",
      metrics: [
        { label: "Mobile spend share", value: "61%", note: "" },
        { label: "Mobile cost-per-demo", value: "$310", note: "" },
        { label: "Desktop cost-per-demo", value: "$165", note: "" },
        { label: "Mobile form completion", value: "2.1%", note: "vs 4.8% desktop" },
      ],
      trigger: "Fires when mobile cost-per-demo exceeds desktop by more than 50% at material spend",
      steps: ["Apply a negative mobile bid adjustment until the gap closes", "Audit the mobile /demo form for friction (length, load, autofill)"],
      derivation: [
        "Spend and conversions pulled from `google_ads_campaigns.csv`, split by `device`.",
        "Cost-per-demo = spend ÷ demos per device = **$310 mobile**, **$165 desktop**.",
        "Form-completion split from `web_analytics_landing.csv` isolates the /demo step.",
        "Verified: audience and geo mix hold across devices, isolating UX as the driver.",
      ],
    },
    {
      category: "Geo waste", iconKey: "geo", severity: "watch", tier: 3, age: "Day 6",
      title: "18% of paid spend is landing outside your target emirates",
      tldr: "Tighten geo targeting: nearly a fifth of spend is outside your ICP regions.",
      cause: "A share of paid impressions served outside AlaanPay's target UAE regions with near-zero demo conversion.",
      body: "18% of paid spend this month served outside your target emirates, regions where AlaanPay has almost no pipeline. These clicks convert at a fifth of your in-region rate, so the spend is effectively unrecoverable.",
      evidence: "18% of spend outside target emirates, converting at ~0.2× the in-region rate.",
      impact: { label: "Recoverable geo spend / mo", value: "~$2.7K", sub: "off-ICP regions" },
      triggerLabel: "Off-geo spend", signal: "18% out of region",
      metrics: [
        { label: "Off-region spend share", value: "18%", note: "" },
        { label: "In-region cost-per-demo", value: "$185", note: "" },
        { label: "Off-region cost-per-demo", value: "$920", note: "5× worse" },
        { label: "Recoverable", value: "~$2.7K / mo", note: "" },
      ],
      trigger: "Fires when over 10% of spend serves outside target regions in 30 days",
      steps: ["Tighten location targeting to the target emirates", "Add off-region locations as exclusions on broad campaigns"],
      derivation: [
        "Spend by region pulled from `google_ads_geo.csv`, matched to CRM pipeline by region.",
        "Off-region share = spend outside target emirates ÷ total = **18%**.",
        "Off-region cost-per-demo = **$920** vs **$185** in-region, a 5× gap.",
        "Verified: target-region list matches AlaanPay's serviceable market, not just billing geo.",
      ],
    },
    {
      category: "Scale opportunity", iconKey: "scale", severity: "watch", tier: 2, age: "New · day 1",
      title: "A new Meta creative is beating your account average by 2.3×",
      tldr: "Scale the 'finance team' creative before it fatigues: it's your cheapest Meta demo.",
      cause: "A recently launched Meta creative is converting well above the account average while still on a small budget.",
      body: "Your new 'finance team' Meta creative is booking demos at $105 (2.3× more efficient than the Meta average of $240), but it's only getting 8% of Meta budget. There's room to scale it before frequency climbs and the edge fades.",
      evidence: "$105 cost-per-demo vs a $240 Meta average, 2.3× better, on just 8% of budget.",
      impact: { label: "Efficient demos if scaled / mo", value: "~30", sub: "at $105 each" },
      triggerLabel: "Scale winner", signal: "$105 cost / demo",
      metrics: [
        { label: "Creative cost-per-demo", value: "$105", note: "vs $240 avg" },
        { label: "Efficiency vs average", value: "2.3×", note: "better" },
        { label: "Budget share today", value: "8%", note: "room to grow" },
        { label: "Frequency", value: "1.4", note: "far from fatigue" },
      ],
      trigger: "Fires when a creative beats the channel cost-per-demo by 2× on under 15% of budget",
      steps: ["Shift budget from the fatigued creative into this one", "Build 2–3 variants of the winning concept before it saturates"],
      derivation: [
        "Creative-level performance pulled from `meta_ads_creatives.csv` over 14 days.",
        "Cost-per-demo = spend ÷ demos = **$105** vs a **$240** channel average.",
        "Budget share = creative spend ÷ total Meta spend = **8%**.",
        "Verified: frequency is **1.4**, so the efficiency isn't a small-sample fluke or early-fatigue spike.",
      ],
    },
  ];
  return base.map((r) => ({ id: nid("rec"), status: "open", groupLabel: r.category, ...r }));
}

// Pull a fresh copy of the findings matching the given categories (fresh ids so
// each goal owns its own recommendation records).
function pickFindings(...cats) {
  return makeRecommendations().filter((r) => cats.includes(r.category));
}

// Wrap a hand-authored finding into the same record shape makeRecommendations()
// emits (fresh id + open status + groupLabel), so seedGoal can carry it directly.
const wrapRec = (r) => ({ id: nid("rec"), status: "open", groupLabel: r.category, ...r });

// Pre-resolve some findings with captured feedback (action + reason + when), so
// the Feedback tab is populated on first view. Each entry: { category, action,
// reason, snooze, hoursAgo }.
function applyFeedback(recs, entries = []) {
  for (const e of entries) {
    const rec = recs.find((r) => r.category === e.category && r.status === "open");
    if (!rec) continue;
    rec.status = e.action; // acted | rejected | snoozed
    if (e.reason) rec.reason = e.reason;
    if (e.action === "snoozed") rec.snoozeLabel = e.snooze || "until next run";
    rec.actedAt = checkedAt(e.hoursAgo ?? 4);
    rec.actedAgo = agoLabel(e.hoursAgo ?? 4);
  }
  return recs;
}

// Build an active goal with its own rules, monitors and (optionally) a check-in
// carrying a curated set of findings — lets several distinct goals each surface
// their own act-now work, so the home strip populates realistically.
function seedGoal({ name, statement, target, targets = [], conditions = [], moves = [], recs = [], checkedAgoHours = 3, notes = [] }) {
  const actNowCount = recs.filter((r) => r.severity === "act-now").length;
  return {
    id: nid("goal"),
    name,
    statement,
    status: "active",
    workflowIds: ["wf-pipeline-health"],
    progress: CALIBRATION_STEPS.length,
    targets: targets.map((t) => ({ id: nid("tgt"), ...t })),
    conditions: conditions.map((c) => ({ id: nid("cnd"), count: 0, state: "quiet", ...c })),
    moves: moves.map((m) => ({ id: nid("mv"), label: m })),
    questions: [],
    answers: {},
    checkIns: recs.length
      ? [{
          id: nid("ci"),
          at: checkedAt(checkedAgoHours),
          ago: agoLabel(checkedAgoHours),
          flaggedCount: actNowCount,
          summary: `${recs.length} findings from your latest check-in, ${actNowCount} need action now, the rest are worth watching. Start here: ${recs[0].tldr}`,
          recommendations: recs,
        }]
      : [],
    notes: notes.map((n) => ({ id: nid("note"), ...n })),
    target,
    createdAt: Date.now(),
  };
}

// A lightweight active goal with its own targets but no check-in yet — reads as
// "on track" and shows its Targets grid without deal-specific recommendations.
function makeGoal({ name, statement, target, targets = [], conditions = [], status = "active", workflowIds = ["wf-pipeline-health"] }) {
  return {
    id: nid("goal"),
    name,
    statement,
    status,
    workflowIds,
    progress: CALIBRATION_STEPS.length,
    targets: targets.map((t) => ({ id: nid("tgt"), ...t })),
    conditions: conditions.map((c) => ({ id: nid("cnd"), count: 0, state: "quiet", ...c })),
    moves: [],
    questions: [],
    answers: {},
    checkIns: [],
    notes: [],
    target,
    createdAt: Date.now(),
  };
}

const goals = [
  // ── Concept check-in: 3 paid goals + their live recommendations (from the
  //    shared recommendation prototype). Goal 1 — spend efficiency. ──
  seedGoal({
    name: "Reduce inefficient daily paid spend by 5%",
    statement: "Cap channels running above their Salesforce CPL baseline and hold blended Salesforce CPL on a 5% improvement path.",
    target: "≤$597 CPL",
    targets: [
      { label: "Bring blended Salesforce CPL from $628 to ~$597", target: "≤$597", current: "$628", met: false, why: "A 5% efficiency improvement on the $628 blended Salesforce CPL baseline lands at ~$597." },
      { label: "Keep every channel's trailing CPL within its 90-day baseline", target: "≤ baseline", current: "LinkedIn +22%", met: false, why: "LinkedIn trailing CPL is $1,188 vs a $972 baseline; channels drifting above baseline are where the waste is." },
    ],
    conditions: [
      { label: "Trailing channel CPL is materially above baseline",
        rule: "Composite check: trailing 7-day CPL is above the 90-day channel baseline, spend is above $1,500, and the lookback is complete.",
        description: "The core waste detector: when a channel's trailing 7-day Salesforce CPL runs above its own 90-day baseline — after enough spend and lookback to be real — that channel is where budget is leaking.",
        logic: "trailing_cpl_7d(channel) > channel_cpl_baseline_90d AND spend_7d > $1,500 AND lookback_days >= 3", state: "fired", count: 1,
        checks: [["Trailing 7-day channel CPL", "Above the 90-day channel baseline."], ["Channel spend", "Above $1,500 in the completed lookback."], ["Lookback", "A complete 7-day reading is available."]],
        meaning: "Only treat high CPL as a real signal when there is enough spend and a complete lookback to make the comparison reliable.",
        formula: "Source: paid-media spend + Salesforce-attributed leads · trailing 7-day spend ÷ Salesforce-attributed leads, compared with the 90-day channel baseline.",
        feasibility: "Passed — spend, leads, and lookback fields are available.",
        periods: ["LinkedIn · $1,188", "Google · $972 baseline"] },
      { label: "Trailing Meta CPL is drifting above baseline",
        rule: "Hold for confirmation when Meta CPL is above its 90-day baseline but minimum spend and lookback criteria are not yet met.",
        description: "An early-warning watch: Meta's CPL is trending above baseline but hasn't cleared the confirmation window, so it's held for review rather than acted on — avoiding a reaction to one-day noise.",
        logic: "meta_trailing_cpl_7d > meta_cpl_baseline_90d AND lookback_incomplete", state: "fired", count: 1,
        checks: [["Trailing Meta CPL", "Above its 90-day baseline."], ["Minimum spend", "Not yet above the minimum for an act-now signal."], ["Lookback", "Needs another complete reading."]],
        meaning: "Hold the recommendation until the channel has enough spend and history to distinguish drift from normal variation.",
        formula: "Source: Meta spend + Salesforce-attributed leads · trailing 7-day CPL compared with the 90-day Meta baseline.",
        feasibility: "Passed — the monitor can compute, but the signal is not yet mature enough to act." },
    ],
    moves: [
      "Cap LinkedIn daily budget by ~12% until trailing CPL returns toward baseline",
      "Hold Meta steady through the 3-day confirmation window before capping",
    ],
    recs: applyFeedback([
      wrapRec({
        category: "Spend efficiency", iconKey: "spend", severity: "act-now", tier: 1, age: "New · day 1",
        title: "LinkedIn CPL is running 22% above baseline",
        tldr: "Cap LinkedIn while trailing Salesforce CPL is high and attributed lead output is below pace.",
        cause: "Trailing 7-day CPL is $1,188 after $3.6K spend, above the $972 baseline, with Salesforce leads below pace.",
        body: "This is not a single-day spike. LinkedIn has spent above expected pace across the trailing 7-day window while Salesforce-attributed lead output has stayed soft. A modest cap is safer than a full pause because downstream quality could still justify some variance.",
        evidence: "LinkedIn spent $3.6K in the trailing 7 days and produced 3 Salesforce-attributed leads, putting trailing CPL at $1,188 versus the $972 90-day baseline.",
        impact: { label: "Inefficient spend / wk", value: "$2.1K", sub: "cap or review before next check-in" },
        triggerLabel: "Spend efficiency", signal: "$1,188 CPL",
        metrics: [
          { label: "Trailing CPL", value: "$1,188", note: "vs $972 baseline" },
          { label: "Spend (7d)", value: "$3.6K", note: "LinkedIn" },
          { label: "SF leads", value: "3", note: "below pace" },
        ],
        trigger: "Trigger daily when trailing 7-day CPL is above the 90-day channel baseline after $1,500 spend and a 3-day lookback.",
        steps: [
          "Cap LinkedIn daily budget by 12% until trailing 7-day CPL returns toward ~$923",
          "Review campaigns with at least $1,500 spend and fewer than expected Salesforce leads",
          "Recheck blended Salesforce CPL after the next 3-day lookback before shifting more budget",
        ],
        derivation: [
          "LinkedIn trailing 7-day spend is `$3.6K` with `3 Salesforce-attributed leads`.",
          "Trailing CPL is `$1,188` versus the 90-day baseline of `$972`.",
          "The channel is above the minimum spend threshold and has a full `7-day` lookback.",
          "Salesforce lead joins were verified against paid campaign spend and click activity.",
        ],
      }),
      wrapRec({
        category: "CPL drift", iconKey: "fatigue", severity: "watch", tier: 2, age: "Day · 6h ago",
        title: "Meta CPL is above its 90-day baseline",
        tldr: "Keep Meta under observation until the minimum lookback confirms whether the drift persists.",
        cause: "Meta trailing 7-day Salesforce CPL is $511 versus a $468 baseline; the lookback isn't complete yet.",
        body: "Meta is the right watch item for this check-in: the trailing signal is moving in the wrong direction, but the evidence is not strong enough to recommend a pause. Holding the channel steady protects lead flow while preventing a single-day reaction.",
        evidence: "Meta trailing 7-day Salesforce CPL is $511 versus a $468 baseline, while spend and attributed lead output are stable enough to wait for confirmation.",
        impact: { label: "CPL variance", value: "$511 CPL", sub: "9.2% above the Meta baseline" },
        triggerLabel: "CPL drift", signal: "+9.2% vs base",
        metrics: [
          { label: "Trailing CPL", value: "$511", note: "vs $468 baseline" },
          { label: "Target CPL", value: "~$445", note: "5% improvement" },
          { label: "Lookback", value: "Incomplete", note: "hold to confirm" },
        ],
        trigger: "Watch when trailing 7-day Salesforce CPL is above the 90-day baseline but minimum spend and lookback thresholds are not yet met.",
        steps: [
          "Keep Meta live while the 3-day confirmation window completes",
          "Review ad sets above $1,500 trailing spend for lead quality, not platform CPL alone",
          "Cap only if Salesforce CPL remains above the ~$445 target after the lookback",
        ],
        derivation: [
          "Meta trailing 7-day Salesforce CPL is `$511` versus a `$468` baseline.",
          "The target for the 5% efficiency improvement is approximately `$445`.",
          "Spend and Salesforce-attributed lead output remain within the expected range.",
          "The minimum lookback is not yet complete for an automatic cap recommendation.",
        ],
      }),
      wrapRec({
        category: "Query waste", iconKey: "query", severity: "act-now", tier: 2, age: "Closed · Jul 7",
        title: "Broad-match Search bought off-intent queries",
        tldr: "Closed after 38 negative keywords were added and two ad groups were tightened.",
        cause: "Broad-match Search matched a rising share of off-intent queries with no Salesforce lead intent.",
        body: "Broad match was buying clicks that never became Salesforce-attributed leads. Adding negatives and tightening two ad groups recovered the wasted spend.",
        evidence: "Recovered $2.3K of trailing spend after 38 negative keywords and two ad-group tightenings.",
        impact: { label: "Recorded impact", value: "$2.3K", sub: "recovered spend" },
        triggerLabel: "Query waste", signal: "Acted Jul 7",
        metrics: [
          { label: "Recovered", value: "$2.3K", note: "trailing spend" },
          { label: "Negatives added", value: "38", note: "" },
          { label: "Closed", value: "Jul 7", note: "" },
        ],
        trigger: "Trigger when over 15% of broad-match spend lands on zero-intent queries in 30 days.",
        steps: ["Add the off-intent query themes as negative keywords", "Tighten broad match to phrase on the loosest ad groups"],
        derivation: [
          "Off-intent share = spend on no-lead queries ÷ broad-match spend.",
          "Intent labelled from Salesforce lead joins, queries that never converted.",
          "Verified: excluded branded and clearly-converting terms before counting waste.",
        ],
      }),
      wrapRec({
        category: "Demo efficiency", iconKey: "spend", severity: "watch", tier: 2, age: "Closed · Jul 5",
        title: "PMax and Demand Gen spend was not booking demos",
        tldr: "Closed after capping the low-converting PMax and Demand Gen campaigns.",
        cause: "PMax and Demand Gen spent into low-demo inventory without producing Salesforce-attributed leads.",
        body: "The campaigns were spending without booking demos. Capping them redeployed budget toward channels with real Salesforce contribution.",
        evidence: "Capped the low-converting PMax and Demand Gen campaigns after $3.1K of inefficient spend.",
        impact: { label: "Recorded impact", value: "$3.1K", sub: "redeployed" },
        triggerLabel: "Demo efficiency", signal: "Closed Jul 5",
        metrics: [
          { label: "Redeployed", value: "$3.1K", note: "" },
          { label: "Campaigns capped", value: "2", note: "PMax + Demand Gen" },
          { label: "Closed", value: "Jul 5", note: "" },
        ],
        trigger: "Trigger when a campaign type spends over $2K in 14 days with zero booked demos.",
        steps: ["Cap or pause the worst-converting campaigns", "Redeploy the freed budget into channels with Salesforce contribution"],
        derivation: [
          "Spend and conversions grouped by `campaign_type`.",
          "Cost-per-demo far above the account target on these campaigns.",
          "Verified: demos joined to Salesforce lead-creation events.",
        ],
      }),
    ], [
      { category: "Query waste", action: "acted", hoursAgo: 216, reason: "Added 38 negative keywords across the broad-match ad groups and tightened two to phrase match." },
      { category: "Demo efficiency", action: "acted", hoursAgo: 264, reason: "Capped the two low-converting PMax and Demand Gen campaigns and redeployed the budget." },
    ]),
    checkedAgoHours: 2,
    notes: [
      { text: "Finance wants us on a 5% efficiency path this quarter. Weight recommendations toward Salesforce CPL, not platform CPL.", at: "2d ago" },
    ],
  }),
  // Goal 2 — Salesforce-attributed lead flow.
  seedGoal({
    name: "Improve Salesforce-attributed lead flow by 5%",
    statement: "Protect Salesforce-attributed lead creation from paid so cheap platform leads don't mask a real drop.",
    target: "~398 SF leads",
    targets: [
      { label: "Grow Salesforce-attributed leads from 379 to ~398", target: "~398", current: "379", met: false, why: "A 5% lift on the 379 trailing Salesforce-attributed lead baseline lands at ~398 at the same spend." },
      { label: "Keep trailing Salesforce lead pace at or above expected", target: "≥ pace", current: "11 / 15", met: false, why: "Google is pacing 11 Salesforce leads vs 15 expected while spend and clicks stay normal." },
    ],
    conditions: [
      { label: "Salesforce-attributed lead flow is below expected pace",
        rule: "Trigger daily when trailing 7-day Salesforce lead volume is materially below expected pace while spend and click activity stay normal.",
        description: "Catches an attribution gap, not just a spend dip: paid clicks and platform leads look normal, but reliable Salesforce-attributed leads are landing below pace — so cheap platform volume can't mask a real shortfall.",
        logic: "sf_leads_7d(channel) << expected_pace AND spend_7d ~ normal AND clicks_7d ~ normal", state: "fired", count: 1,
        checks: [["Trailing 7-day Salesforce leads", "Below the expected weekly pace."], ["Paid spend", "Within the normal range."], ["Click activity", "Within the normal range."]],
        meaning: "A gap between normal spend/clicks and low Salesforce lead creation points at attribution or quality, not a spend problem — so it's reviewed before any budget change.",
        formula: "Source: Salesforce-attributed leads + paid-media spend · trailing 7-day Salesforce leads compared with the expected weekly pace at current spend.",
        feasibility: "Passed — Salesforce lead volume and paid-media context are available.",
        periods: ["Google · 11 vs 15 pace", "Blended CPL · $628 baseline"] },
    ],
    moves: [
      "Validate Google offline-conversion and Salesforce lead-creation joins before changing budgets",
      "Compare the trailing Salesforce leads against campaign, keyword, and landing-page cohorts",
    ],
    recs: [
      wrapRec({
        category: "SF lead flow", iconKey: "headroom", severity: "act-now", tier: 1, age: "New · 4h ago",
        title: "Google spend is normal but Salesforce leads are slipping",
        tldr: "Check the Google-to-Salesforce join before changing spend; platform leads are masking the gap.",
        cause: "Spend and click activity are within normal range while trailing 7-day Salesforce leads are 11 versus 15 expected.",
        body: "Google is not obviously under-delivering at the platform level. The important signal is the Salesforce join: paid traffic is still arriving, but fewer leads are becoming reliable Salesforce-attributed output. This should start as an attribution and quality review, not an automatic budget cut.",
        evidence: "Google spent $4.8K in the trailing 7 days with normal clicks and platform leads, but Salesforce-attributed leads fell to 11 versus an expected pace of 15.",
        impact: { label: "Salesforce lead gap / wk", value: "~4 leads", sub: "at current spend" },
        triggerLabel: "SF lead flow", signal: "11 / 15 pace",
        metrics: [
          { label: "SF leads (7d)", value: "11", note: "vs 15 expected" },
          { label: "Spend (7d)", value: "$4.8K", note: "normal clicks" },
          { label: "Blended CPL", value: "$628", note: "baseline" },
        ],
        trigger: "Trigger daily when trailing 7-day Salesforce lead volume is materially below expected pace while spend and click activity stay normal.",
        steps: [
          "Validate Google offline conversion and Salesforce lead creation joins before changing budgets",
          "Compare the 11 Salesforce leads against campaign, keyword, and landing-page cohorts",
          "Keep blended CPL at or below $628 while the attribution gap is investigated",
        ],
        derivation: [
          "Google trailing 7-day spend is `$4.8K` with normal click volume.",
          "Salesforce-attributed leads are `11` versus an expected pace of `15`.",
          "90-day Google Salesforce lead baseline is `161`; blended CPL baseline is `$628`.",
          "Platform leads are stable, but Salesforce lead creation is below expected pace.",
        ],
      }),
    ],
    checkedAgoHours: 4,
  }),
  // Goal 3 — budget pacing.
  seedGoal({
    name: "Keep paid budget pacing within 5% of the $100k monthly plan",
    statement: "Hold projected end-of-month paid spend inside the $95K–$105K guardrail while respecting Salesforce lead contribution.",
    target: "$95–105K EOM",
    targets: [
      { label: "Keep projected EOM spend between $95K and $105K", target: "$95–105K", current: "$110.2K", met: false, why: "Projected EOM spend is $110.2K, above the $105K ceiling on the $100K monthly plan." },
      { label: "Only shift budget where Salesforce lead contribution supports it", target: "quality-gated", current: "LinkedIn thin", met: false, why: "LinkedIn is pacing fast on a 3-lead sample; a cap shouldn't precede a downstream quality read." },
    ],
    conditions: [
      { label: "Projected EOM paid spend is outside the pacing band",
        rule: "Trigger when projected EOM spend moves outside $95K–$105K and a channel is consuming budget faster than its Salesforce contribution supports.",
        description: "The budget guardrail: projects end-of-month spend from month-to-date pace and flags it the moment it leaves the $95K–$105K band, especially when a channel is outspending its Salesforce contribution.",
        logic: "projected_eom_spend NOT BETWEEN $95K AND $105K AND channel_pacing > sf_contribution", state: "fired", count: 1,
        checks: [["Projected EOM spend", "Outside the $95K–$105K band."], ["Channel pacing", "Faster than Salesforce contribution supports."]],
        meaning: "Projects month-end spend from month-to-date pace so a budget overrun is caught before it lands, not after.",
        formula: "Source: month-to-date paid spend + monthly plan · projects EOM spend from MTD pace and compares with the $95K–$105K guardrail band.",
        feasibility: "Passed — month-to-date spend and plan values are available.",
        periods: ["MTD · $69.4K", "Projected EOM · $110.2K"] },
      { label: "A channel is pacing fast on a thin Salesforce lead sample",
        rule: "Watch when a channel is pacing high but its Salesforce lead sample is too small to judge downstream quality.",
        description: "A quality gate on pacing cuts: if a channel is burning budget fast but its Salesforce lead sample is too small to judge, the signal holds for a downstream quality read before recommending a cap.",
        logic: "channel_pacing_high AND sf_lead_sample < min_confidence", state: "fired", count: 1,
        checks: [["Channel pacing", "Running high."], ["Salesforce lead sample", "Below the minimum confidence threshold."]],
        meaning: "Prevents cutting a channel on cost alone when there aren't enough Salesforce leads to judge whether the spend is justified.",
        formula: "Source: channel spend pace + Salesforce lead sample size · compares pacing against a minimum-confidence lead-sample threshold.",
        feasibility: "Passed — the monitor can compare pacing and downstream quality." },
    ],
    moves: [
      "Hold LinkedIn daily budget for 3 days while pacing is outside the guardrail",
      "Reforecast end-of-month spend daily using MTD spend and Salesforce contribution",
    ],
    recs: [
      wrapRec({
        category: "Budget pacing", iconKey: "pacing", severity: "watch", tier: 2, age: "Day · 2h ago",
        title: "Paid budget is pacing above the monthly plan",
        tldr: "Hold LinkedIn daily budget to bring projected end-of-month spend inside the $95K–$105K guardrail.",
        cause: "Projected EOM spend is $110.2K, outside the $95K–$105K band; LinkedIn is consuming budget faster than its Salesforce contribution supports.",
        body: "The pacing issue is concentrated enough to act on without restructuring the whole account. A temporary LinkedIn hold brings the forecast closer to plan while preserving room to increase budgets later if Salesforce lead quality justifies the variance.",
        evidence: "MTD paid spend is $69.4K against a $66.7K day-20 pace, projecting $110.2K by month end — above the $95K–$105K guardrail.",
        impact: { label: "Projected overage", value: "+$5.2K", sub: "above the $100K plan" },
        triggerLabel: "Budget pacing", signal: "$110.2K EOM",
        metrics: [
          { label: "MTD spend", value: "$69.4K", note: "vs $66.7K pace" },
          { label: "Projected EOM", value: "$110.2K", note: "above $105K" },
          { label: "Plan band", value: "$95–105K", note: "$100K plan" },
        ],
        trigger: "Trigger when projected EOM spend moves outside $95K–$105K and a channel is consuming budget faster than its Salesforce contribution supports.",
        steps: [
          "Hold LinkedIn daily budget for the next 3 days while pacing is outside the guardrail",
          "Keep any budget adjustment below 15% of weekly channel budget without manual approval",
          "Reforecast end-of-month spend daily using MTD spend and channel Salesforce contribution",
        ],
        derivation: [
          "MTD paid spend is `$69.4K` versus a day-20 pace of `$66.7K`.",
          "Projected EOM spend is `$110.2K`, above the `$105K` ceiling.",
          "The monthly paid-media plan is `$100K`; the allowed band is `$95K–$105K`.",
          "LinkedIn is the fastest pacing channel relative to Salesforce-attributed lead contribution.",
        ],
      }),
      wrapRec({
        category: "Quality variance", iconKey: "query", severity: "watch", tier: 3, age: "Day 3",
        title: "LinkedIn lead quality needs a closer look",
        tldr: "Review LinkedIn MQL-to-opportunity progression before treating the CPL variance as justified.",
        cause: "LinkedIn CPL and pacing are high, but the Salesforce lead sample is too small to judge downstream quality confidently.",
        body: "This watchlist item keeps the team from over-correcting on cost alone. If LinkedIn leads progress to qualified opportunities at a healthy rate, the channel may deserve variance; if not, the current pace should be capped.",
        evidence: "LinkedIn produced 3 Salesforce-attributed leads from $3.6K trailing spend. The volume is thin, so downstream quality needs review before the variance is treated as justified.",
        impact: { label: "Salesforce lead quality", value: "3 leads", sub: "from $3.6K trailing spend" },
        triggerLabel: "Quality variance", signal: "3-lead sample",
        metrics: [
          { label: "SF leads", value: "3", note: "thin sample" },
          { label: "Trailing CPL", value: "$1,188", note: "vs $972" },
          { label: "Next step", value: "Review", note: "no shift yet" },
        ],
        trigger: "Watch when a channel is pacing high on a Salesforce lead sample too small to judge downstream quality.",
        steps: [
          "Compare LinkedIn MQL-to-opportunity progression against Meta and Google",
          "Keep budget changes within the 10–15% weekly guardrail while quality is reviewed",
          "Reopen as act-now only if quality is weak and trailing CPL remains above baseline",
        ],
        derivation: [
          "LinkedIn trailing spend is `$3.6K` with `3 Salesforce-attributed leads`.",
          "Trailing CPL is `$1,188` versus the `$972` baseline.",
          "The Salesforce lead sample is below the minimum confidence threshold for a quality judgment.",
        ],
      }),
    ],
    checkedAgoHours: 2,
  }),
  makeGoal({
    name: "Grow qualified pipeline to $1.5M",
    statement: "Grow qualified pipeline to $1.5M and hold win rate above 25% by Sep 30",
    target: "$1.5M",
    targets: [
      { label: "Grow qualified pipeline to $1.5M by Sep 30", target: "$1.5M", current: "$1.02M", met: false, why: "Qualified pipeline sits at $1.02M; $1.5M gives 3× coverage on the $500K new-ARR target for the quarter." },
      { label: "Hold win rate at or above 25%", target: "≥25%", current: "27%", met: true, why: "Trailing-90-day win rate is 27%; staying above 25% is what converts the $1.5M pipeline into target." },
      { label: "Keep pipeline coverage at 3× of quarterly target", target: "3×", current: "2.4×", met: false, why: "Below 3× coverage, 4 of the last 5 quarters missed target." },
    ],
    conditions: [
      { label: "Qualified pipeline created this week below the weekly pace to hit $1.5M", description: "Leading indicator for the quarter: if weekly qualified-pipeline creation drops below the run-rate needed to reach $1.5M, the target is slipping before it shows up in the total." },
      { label: "Win rate on closed deals in the last 30 days dips under 25%", description: "Protects conversion quality as volume grows: a falling win rate means more pipeline is needed to hit the same number, so it's flagged before it erodes coverage." },
      { label: "Coverage ratio (open pipeline ÷ remaining target) falls under 3×", description: "Below 3× coverage, historically 4 of the last 5 quarters missed. Watching the ratio catches a coverage gap while there's still time to build pipeline." },
    ],
  }),
  makeGoal({
    name: "Cut paid CPL below $120",
    statement: "Bring blended paid cost-per-lead under $120 this quarter without losing lead quality",
    target: "<$120",
    targets: [
      { label: "Bring blended paid cost-per-lead under $120", target: "<$120", current: "$146", met: false, why: "Trailing CPL is $146; $120 is the level where paid payback stays under 12 months at current close rates." },
      { label: "Hold MQL→SQL conversion at or above 40%", target: "≥40%", current: "41%", met: true, why: "Cheaper leads only help if they convert; 40% is the trailing-90-day median, so quality can't slip below it." },
    ],
    conditions: [
      { label: "Blended CPL over the last 7 days rises above $120", description: "The efficiency guardrail: if trailing 7-day blended cost-per-lead climbs past $120, paid payback slips beyond 12 months at current close rates — a signal to review spend allocation." },
      { label: "MQL→SQL conversion on recent cohorts falls under 40%", description: "Keeps cheaper leads honest: cutting CPL only helps if the leads still convert, so a drop below the 40% trailing-90-day median flags a quality trade-off." },
    ],
  }),
  makeGoal({
    name: "Lift net revenue retention above 110%",
    statement: "Lift net revenue retention above 110% by keeping churn low and growing expansion",
    target: ">110%",
    targets: [
      { label: "Lift net revenue retention above 110%", target: ">110%", current: "104%", met: false, why: "NRR is 104%; above 110% the business compounds on the existing base without needing new logos." },
      { label: "Keep gross monthly churn under 5%", target: "<5%", current: "4.2%", met: true, why: "Churn above 5% caps NRR regardless of how strong expansion is." },
      { label: "Grow expansion revenue to 8% of base", target: "8%", current: "6%", met: false, why: "Expansion is the lever that pushes NRR past 110%; 8% clears the churn drag with headroom." },
    ],
    conditions: [
      { label: "Trailing-30-day gross churn rises above 5%", description: "Churn caps NRR regardless of expansion: once trailing-30-day gross churn passes 5%, no amount of upsell keeps NRR above 110%, so it's the first thing to catch." },
      { label: "Net revenue retention on the latest cohort dips under 110%", description: "The headline metric itself: watching the latest cohort's NRR surfaces a downturn early, before it drags the blended number below target." },
      { label: "Expansion revenue rate falls under 8% of base", description: "Expansion is the lever that pushes NRR past 110%. If expansion revenue slips under 8% of base, the churn drag wins and the goal stalls." },
    ],
  }),
  {
    id: nid("goal"),
    name: "Improve our MQL-to-SQL conversion rate to 40%.",
    statement: "Improve our MQL-to-SQL conversion rate to 40%.",
    status: "calibrating",
    workflowIds: ["wf-pipeline-health"],
    progress: 1,
    targets: [], conditions: [], moves: [],
    questions: [], answers: {}, checkIns: [], notes: [],
    createdAt: Date.now(),
  },
  makeGoal({
    name: "Reach 60% activation within 14 days",
    statement: "Reach 60% new-account activation within 14 days of signup",
    target: "60%",
    status: "calibrating",
  }),
];

// Kick the seeded calibrating goal forward so it has somewhere to go.
goals.filter((g) => g.status === "calibrating").forEach(startCalibration);

// ── API ──
// Internal live reference (mutations operate on this).
function find(id) {
  return goals.find((g) => g.id === id) || null;
}
// Serializable clone for reads, so react-query sees a new reference each poll
// (the live object is mutated in place by timers/mutations).
function clone(g) {
  if (!g) return null;
  const { timers, ...rest } = g;
  return JSON.parse(JSON.stringify(rest));
}

export function listGoals() {
  return goals.map((g) => summarize(g));
}
export function getGoal(id) {
  return clone(find(id));
}

// Cross-goal "needs attention" feed — every open act-now recommendation, with
// the goal it belongs to, so the home can be a command center.
export function attentionFeed() {
  const items = [];
  for (const g of goals) {
    const last = g.checkIns[0];
    if (!last) continue;
    for (const rec of last.recommendations) {
      if (rec.severity === "act-now" && rec.status === "open") {
        items.push({
          goalId: g.id,
          goalName: g.name,
          recId: rec.id,
          tldr: rec.tldr,
          title: rec.title,
          groupLabel: rec.groupLabel,
          category: rec.category || rec.groupLabel,
          iconKey: rec.iconKey || null,
          impact: rec.impact || null,
          severity: rec.severity,
          at: last.ago || last.at,
        });
      }
    }
  }
  return { items };
}
// Every recommendation across goals — for the Recommendations tab (master list).
export function allRecommendations() {
  const items = [];
  for (const g of goals) {
    const last = g.checkIns[0];
    if (!last) continue;
    for (const rec of last.recommendations) {
      items.push({
        goalId: g.id, goalName: g.name, recId: rec.id,
        title: rec.title, tldr: rec.tldr, category: rec.category || rec.groupLabel,
        severity: rec.severity, status: rec.status, impact: rec.impact || null, age: rec.age || null,
        signal: rec.signal || null, tier: rec.tier || null, triggerLabel: rec.triggerLabel || null,
        at: last.ago || last.at,
      });
    }
  }
  const rank = (r) => (r.status !== "open" ? 2 : r.severity === "act-now" ? 0 : 1);
  return { items: items.sort((a, b) => rank(a) - rank(b)) };
}

export function getConfig() {
  return { ...config };
}
export function saveConfig(patch) {
  Object.assign(config, patch || {});
  return { ...config };
}

function summarize(g) {
  const last = g.checkIns[0];
  const openRecs = last ? last.recommendations.filter((r) => r.status === "open") : [];
  const actNow = openRecs.filter((r) => r.severity === "act-now").length;
  const watching = openRecs.filter((r) => r.severity === "watch").length;
  const firingCount = (g.conditions || []).filter((c) => c.state === "fired").length;
  const health = g.status !== "active" ? "setup" : actNow > 0 ? "attention" : "ontrack";
  // The single most important thing this check-in found — drives the Home
  // triage row's "what did it find / why open this" line.
  const lead = openRecs.find((r) => r.severity === "act-now") || openRecs[0] || null;
  return {
    id: g.id,
    name: g.name,
    statement: g.statement,
    status: g.status,
    health,
    targetSummary: g.targets?.[0]?.target || null,
    workflowCount: g.workflowIds.length,
    recommendationCount: last ? last.recommendations.length : 0,
    actNow,
    watching,
    firingCount,
    topFinding: lead ? { title: lead.title, tldr: lead.tldr, severity: lead.severity, impact: lead.impact || null } : null,
    flaggedCount: last?.flaggedCount || 0,
    lastCheckIn: last?.ago || last?.at || null,
  };
}

export function createGoal({ statement, workflowIds }) {
  const goal = {
    id: nid("goal"),
    name: statement?.slice(0, 60) || "New goal",
    statement: statement || "",
    status: "calibrating",
    workflowIds: workflowIds || [],
    progress: 0,
    targets: [], conditions: [], moves: [],
    questions: [], answers: {}, checkIns: [], notes: [],
    createdAt: Date.now(),
  };
  goals.unshift(goal);
  startCalibration(goal);
  return goal;
}

// Calibration only loads workflows/history, then pauses for the user's
// decisions. The goal config (targets/conditions/moves) is NOT built yet — that
// happens after the questions are answered (see answerGoal).
function startCalibration(goal) {
  if (!goal) return;
  goal.timers = goal.timers || [];
  goal.progress = 0;
  goal.timers.push(setTimeout(() => {
    goal.questions = defaultQuestions();
    goal.status = "decisions";
  }, 2600));
}

export function answerGoal(id, answers) {
  const g = find(id);
  if (!g) return null;
  g.answers = { ...g.answers, ...answers };
  // Now that the decisions are in, build the config, then walk a short "building"
  // phase (targets → conditions → moves) before landing on review.
  Object.assign(g, paidEfficiencyGoalConfig());
  g.buildProgress = 0;
  g.status = "building";
  startBuilding(g);
  return g;
}

// Advance the three build sub-steps, then move to review.
function startBuilding(goal) {
  if (!goal) return;
  goal.timers = goal.timers || [];
  const advance = (to, ms) => goal.timers.push(setTimeout(() => { goal.buildProgress = to; }, ms));
  advance(1, 900);   // targets ready
  advance(2, 1900);  // conditions ready
  advance(3, 2900);  // moves ready
  goal.timers.push(setTimeout(() => { goal.status = "review"; }, 3600));
}

export function adjustGoal(id, text) {
  const g = find(id);
  if (!g) return null;
  // Naive mock: if the user asks to remove something, drop the last move.
  if (/remove|delete|drop/i.test(text) && g.moves.length > 1) {
    const removed = g.moves.pop();
    return { goal: g, reply: `Removed "${removed.label}". ${g.moves.length} moves left. Targets and conditions are unchanged.` };
  }
  return { goal: g, reply: "Got it, noted. Tell me a threshold or scope to change (e.g. “track $1M instead of $1.5M”) and I'll update it." };
}

// Find the first open finding across active goals matching a predicate — lets
// Sage answer with the real finding (title · action · worth), not a platitude.
function findFinding(pred) {
  for (const g of goals) {
    const last = g.checkIns[0];
    if (!last) continue;
    const rec = last.recommendations.find((r) => r.status === "open" && pred(r));
    if (rec) return { goal: g, rec };
  }
  return null;
}
// Rough sort weight for a recommendation, so "biggest lever" surfaces the most
// valuable open item: act-now beats watch, then by the dollar figure in its impact.
function impactWeight(rec) {
  let w = rec.severity === "act-now" ? 1_000_000 : 0;
  const raw = rec.impact?.value || "";
  const m = raw.replace(/,/g, "").match(/([\d.]+)\s*([km])?/i);
  if (m) {
    let n = parseFloat(m[1]) || 0;
    const unit = (m[2] || "").toLowerCase();
    if (unit === "k") n *= 1_000;
    if (unit === "m") n *= 1_000_000;
    w += n;
  }
  return w;
}
function findingReply(hit) {
  const { goal, rec } = hit;
  const worth = rec.impact ? ` (${rec.impact.label.toLowerCase()}: ${rec.impact.value})` : "";
  return `On “${goal.name}”: ${rec.title}${worth}. Next best move: ${rec.tldr} Open the goal to act on it.`;
}

// Sage — portfolio-level assistant on the Goals page. Canned but grounded in the
// real findings, framed around the demand-gen job: efficient, provable spend.
export function sageChat(text) {
  const t = (text || "").toLowerCase().trim();
  const summaries = goals.map((g) => summarize(g));
  const attention = summaries.filter((g) => g.health === "attention");
  const onTrack = summaries.filter((g) => g.health === "ontrack");
  const setup = summaries.filter((g) => g.health === "setup");

  if (!t) {
    return { reply: "Ask me what's wasting spend, where you're leaving demos on the table, or which goal to open first." };
  }
  // Where is spend being wasted?
  if (/wast|spend|burn|budget|money|efficien|cpl|cost/.test(t)) {
    const hit = findFinding((r) => r.category === "Wasted spend" || /spend|burn|pmax|demand gen/i.test(r.title));
    if (hit) return { reply: findingReply(hit) };
  }
  // Where am I losing demos / missing demand?
  if (/demo|lead|losing|leav|missing|headroom|impression share|search|convert/.test(t)) {
    const hit = findFinding((r) => r.category === "Missed demand" || r.category === "Conversion leak" || /impression share|demo|search|convert/i.test(r.title));
    if (hit) return { reply: findingReply(hit) };
  }
  // What should I open / focus on first?
  if (/first|focus|priorit|open|start with|what should|where do i/.test(t)) {
    if (attention.length && attention[0].topFinding) {
      const g = attention[0];
      return { reply: `Open “${g.name}” first, ${g.actNow} finding${g.actNow !== 1 ? "s" : ""} need action. Start with: ${g.topFinding.title}. ${g.topFinding.tldr}` };
    }
    return { reply: "Nothing needs action right now; every active goal is on pace. Worth a glance at whichever goal you last shipped budget behind." };
  }
  if (/attention|act now|urgent|off track|risk|behind|wrong/.test(t)) {
    return attention.length
      ? { reply: `${attention.length} goal${attention.length !== 1 ? "s" : ""} need attention: ${attention.map((g) => g.name).join(", ")}. Biggest one first: ${attention[0].topFinding?.tldr || "open it to see the findings."}` }
      : { reply: "Nothing is off track right now; every active goal is on pace." };
  }
  if (/on track|healthy|good|fine|how are we/.test(t)) {
    return { reply: `${onTrack.length} of ${summaries.length} goal${summaries.length !== 1 ? "s are" : " is"} on track${setup.length ? `, and ${setup.length} still in setup.` : "."} ${attention.length ? `${attention.length} still need${attention.length === 1 ? "s" : ""} action.` : ""}`.trim() };
  }
  // Where to put the next dollar / where to invest.
  if (/dollar|invest|allocate|scale|double down|next.*spend|where.*put/.test(t)) {
    const hit = findFinding((r) => r.category === "Missed demand" || /impression share|headroom|search/i.test(r.title));
    return hit
      ? { reply: `Your next dollar goes furthest on “${hit.goal.name}”: ${hit.rec.title}. ${hit.rec.tldr} That's demand you're already qualified for and leaving on the table, cheaper than buying new reach.` }
      : { reply: "Clear the wasted spend first; every goal is efficient right now, so the next dollar is best held until a headroom finding opens up." };
  }
  if (/how many|count|list|which goals|what goals/.test(t)) {
    return { reply: `You're tracking ${summaries.length} goal${summaries.length !== 1 ? "s" : ""}: ${summaries.map((g) => g.name).join(", ") || "none yet"}.` };
  }
  if (/new goal|create|add goal/.test(t)) {
    return { reply: "Use “New Goal” at the top right. Tell me the outcome you want (e.g. “cut cost-per-demo under $180”) and I'll calibrate the rules and monitors from your data." };
  }
  return { reply: `You have ${summaries.length} goal${summaries.length !== 1 ? "s" : ""}, ${attention.length} need action, ${onTrack.length} on track. Ask me what's wasting spend, where you're losing demos, or what to open first.` };
}

// Sage scoped to a single goal (the goal detail page) — answers about this goal
// specifically, grounded in its own findings, monitors, and target.
export function sageChatGoal(id, text) {
  const g = find(id);
  if (!g) return { reply: "I couldn't find that goal." };
  const t = (text || "").toLowerCase().trim();
  const last = g.checkIns[0];
  const openRecs = last ? last.recommendations.filter((r) => r.status === "open") : [];
  const actNow = openRecs.filter((r) => r.severity === "act-now");
  const lead = actNow[0] || openRecs[0] || null;
  const primary = g.targets?.[0];

  if (!t) {
    return { reply: `Ask me about “${g.name}”: what's driving it, what to do next, or why a number moved.` };
  }
  // Biggest waste / most impactful thing to fix.
  if (/wast|biggest|most impact|worth|roi|where.*money|save/.test(t)) {
    const byImpact = [...openRecs].sort((a, b) => (impactWeight(b) - impactWeight(a)));
    const top = byImpact[0];
    return top
      ? { reply: `The biggest lever here is “${top.title}”${top.impact ? ` (${top.impact.label.toLowerCase()} ${top.impact.value})` : ""}. ${top.tldr} Want me to walk through the evidence?` }
      : { reply: "Nothing is bleeding budget on this goal right now; spend is tracking efficiently." };
  }
  if (/next|do next|action|fix|first|move/.test(t)) {
    return lead
      ? { reply: `Start with: ${lead.title}. ${lead.tldr}${actNow.length > 1 ? ` After that, ${actNow.length - 1} more need${actNow.length - 1 === 1 ? "s" : ""} a look.` : ""}` }
      : { reply: "Nothing needs action on this goal right now. It's on pace. I'll flag the moment a monitor trips." };
  }
  if (/why|driv|chang|move|cause|reason/.test(t)) {
    return lead
      ? { reply: `${lead.title}: ${lead.cause || lead.evidence || lead.tldr}` }
      : { reply: "No findings this run; the goal's metrics are holding steady versus last check." };
  }
  if (/status|how are we|on track|target|winning|hitting|pace|reach|forecast|hit target/.test(t)) {
    return primary
      ? { reply: `${primary.label}: currently ${primary.current ?? "—"} vs target ${primary.target}, ${primary.met ? "on target" : "off target"}. ${actNow.length ? `${actNow.length} finding${actNow.length !== 1 ? "s" : ""} between you and it.` : "Nothing standing in the way right now."}` }
      : { reply: `“${g.name}” is being tracked against your latest data, no target set yet, so I'm watching for drift.` };
  }
  if (/monitor|firing|watch|trigger|alert/.test(t)) {
    const firing = (g.conditions || []).filter((c) => c.state === "fired");
    const quiet = (g.conditions || []).filter((c) => c.state !== "fired");
    return firing.length
      ? { reply: `${firing.length} monitor${firing.length !== 1 ? "s" : ""} firing: ${firing.map((c) => c.label).join("; ")}.${quiet.length ? ` ${quiet.length} more are quiet.` : ""}` }
      : { reply: "No monitors are firing; everything's quiet on this goal. I'm still watching all of them each run." };
  }
  // Cheapest / best source of demos.
  if (/cheap|best source|which channel|where.*dollar|invest|allocate|scale|double down/.test(t)) {
    return { reply: `Brand Search is your cheapest demo source: highest intent, lowest cost-per-demo. Before scaling anything new, that's where an extra dollar pays back fastest.${lead ? ` But first clear “${lead.title}”; it's costing you more than a scale-up would earn.` : ""}` };
  }
  return lead
    ? { reply: `On “${g.name}”: ${actNow.length} to act, ${Math.max(0, openRecs.length - actNow.length)} to watch. Top move: ${lead.tldr} Ask me “why” for the evidence, or “what's on track” for the wins.` }
    : { reply: `“${g.name}” is on pace; nothing needs action right now. Ask me how it's tracking or which monitors I'm watching.` };
}

export function saveGoal(id, name) {
  const g = find(id);
  if (!g) return null;
  if (name) g.name = name;
  g.status = "active";
  return g;
}

export function deleteGoal(id) {
  const i = goals.findIndex((g) => g.id === id);
  if (i >= 0) goals.splice(i, 1);
  return { ok: true };
}

export function runCheckIn(id) {
  const g = find(id);
  if (!g) return null;
  const recs = makeRecommendations();
  const ci = {
    id: nid("ci"),
    at: checkedAt(0),
    ago: "Just now",
    flaggedCount: recs.filter((r) => r.severity === "act-now").length,
    summary:
      `${recs.length} recommendations across your high-value pipeline, ${recs.filter((r) => r.severity === "act-now").length} need action now, the rest are worth watching. Start with the stale $250K deal whose close date is 211 days overdue.`,
    recommendations: recs,
  };
  // mark a couple of conditions as fired
  g.conditions.forEach((c, i) => { if (i >= g.conditions.length - 2) { c.state = "fired"; c.count = 1; } });
  g.checkIns.unshift(ci);
  return g;
}

// ── Run history ──
// Token usage per agent/task within a run, so the run-history screen can show
// cost per agent and drill into transcripts. Raw numbers; the UI formats them.
const tok = (input, cacheRead, cacheWrite, out) => ({ input, cacheRead, cacheWrite, out });

function runAgents() {
  return [
    { name: "Analyst", kind: "agent", tokens: tok(222, 1400000, 41200, 27100) },
    { name: "Strategist", kind: "agent", tokens: tok(180, 1300000, 108700, 27200) },
    { name: "Critic", kind: "agent", tokens: tok(168, 784700, 48100, 14500) },
    { name: "Deep diagnosis", via: "Analyst", index: 1, kind: "task", tokens: tok(427, 35800, 9400, 2100) },
    { name: "Deep diagnosis", via: "Analyst", index: 2, kind: "task", tokens: tok(485, 99400, 15000, 7600) },
    { name: "Deep diagnosis", via: "Analyst", index: 3, kind: "task", tokens: tok(554, 183200, 23000, 7800) },
    { name: "Signal scan", via: "Strategist", index: 1, kind: "task", tokens: tok(312, 220400, 18200, 5400) },
    { name: "Signal scan", via: "Strategist", index: 2, kind: "task", tokens: tok(298, 140900, 11700, 4300) },
    { name: "Evidence pull", via: "Critic", index: 1, kind: "task", tokens: tok(341, 96500, 8800, 3600) },
    { name: "Evidence pull", via: "Critic", index: 2, kind: "task", tokens: tok(276, 71200, 6400, 2900) },
    { name: "Threshold check", via: "Analyst", index: 4, kind: "task", tokens: tok(198, 44100, 5200, 1800) },
    { name: "Owner lookup", via: "Strategist", index: 3, kind: "task", tokens: tok(164, 33800, 4100, 1400) },
    { name: "Concentration model", via: "Analyst", index: 5, kind: "task", tokens: tok(389, 128700, 13900, 6100) },
    { name: "Recommendation draft", via: "Strategist", index: 4, kind: "task", tokens: tok(512, 210300, 22400, 9200) },
    { name: "Recommendation review", via: "Critic", index: 3, kind: "task", tokens: tok(233, 88600, 7300, 3100) },
    { name: "Synthesis", via: "Strategist", index: 5, kind: "task", tokens: tok(447, 156800, 19600, 8400) },
  ];
}

export function runHistory(id) {
  const g = find(id);
  if (!g) return null;
  const source = g.checkIns.length ? g.checkIns : [null];
  const runs = source.map((ci, i) => ({
    id: ci?.id || `run-${i}`,
    at: ci && ci.at !== "Just now" ? ci.at : `${1 - i} Jul, 04:${22 - i * 7}`.replace("0 Jul", "30 Jun"),
    status: "success",
    duration: i === 0 ? "40m 30s" : "37m 12s",
    recCount: ci?.recommendations?.length ?? 6,
    sessionId: "57b619356c59464c",
    models: [{ name: "claude-opus-4-8", agents: runAgents() }],
  }));
  return {
    goalName: g.name,
    calibration: { duration: "4m 37s", tokens: tok(234, 430800, 36400, 20700) },
    runs,
  };
}

export function actOnRecommendation(id, recId, action, payload) {
  const g = find(id);
  if (!g) return null;
  for (const ci of g.checkIns) {
    const rec = ci.recommendations.find((r) => r.id === recId);
    if (rec) {
      rec.status = action; // acted | rejected | snoozed
      if (payload?.reason) rec.reason = payload.reason; // captured feedback, used next run
      else if (action === "open") rec.reason = undefined; // cleared on undo
      if (payload?.note) rec.actionNote = payload.note;
      if (action === "snoozed") rec.snoozeLabel = payload?.snooze || "until next run";
      // Stamp when the decision was made, for the Feedback tab timeline.
      if (action === "open") { rec.actedAt = undefined; rec.actedAgo = undefined; }
      else { rec.actedAt = checkedAt(0); rec.actedAgo = "Just now"; }
      break;
    }
  }
  return g;
}

export function addNote(id, text) {
  const g = find(id);
  if (!g) return null;
  g.notes.unshift({ id: nid("note"), text, at: "Just now" });
  return g;
}
