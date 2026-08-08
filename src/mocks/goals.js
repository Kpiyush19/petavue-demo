// Mock store + engine for the Goals experience (/goals).
// Goal lifecycle: calibrating → decisions → review → active.
// Calibration auto-advances on timers (server-driven, like skillRun) so the
// detail page can poll and animate the progress checklist.

let SEQ = 700;
const nid = (p) => `${p}-${(SEQ++).toString(16)}${Math.floor((SEQ * 97) % 9999).toString(16)}`;

// Format a check-in timestamp in Vantapay's timezone (Central European Time, UTC+1)
// as absolute date · time · tz, so each goal carries its own last-checked moment
// (computed once at seed time, so it's stable and varied per goal).
function checkedAt(hoursAgo = 0) {
  const d = new Date(Date.now() - hoursAgo * 3600000);
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d);
  return `${s} CET`;
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
  company: "",
  process: "",
  icp: "",
  additional: "",
};

// ── Reusable proposed config for Vantapay's "efficient paid spend" goal ──
// Conditions carry both a human-readable `label` (what a marketer reads) and the
// raw `logic` (the audit-grade rule the engine evaluates), so the Monitor tab can
// lead with plain language and tuck the logic behind "View rule logic".
function paidEfficiencyGoalConfig() {
  return {
    targets: [
      {
        id: nid("tgt"),
        label: "Bring blended Salesforce CPL from $642 to ~$610",
        target: "≤$610", current: "$642", met: false,
        why: "A 5% efficiency improvement on the $642 blended Salesforce CPL baseline lands at ~$610.",
        meaning: "Blended cost per Salesforce-attributed lead across every paid channel should come down from $642 to ~$610 — a 5% efficiency improvement — without cutting lead volume.",
        found: "Blended Salesforce CPL is $642, above the ~$610 target. LinkedIn running 21% over its own baseline is the biggest single drag on the number.",
        formula: "Source: paid-media spend + Salesforce-attributed leads · total paid spend ÷ Salesforce-attributed leads over the trailing window, blended across channels.",
      },
      {
        id: nid("tgt"),
        label: "Keep every channel's trailing CPL within its 90-day baseline",
        target: "≤ baseline", current: "LinkedIn +21%", met: false,
        why: "LinkedIn trailing CPL is $1,140 vs a $940 baseline; channels drifting above baseline are where the waste is.",
        meaning: "No channel should run above its own 90-day Salesforce CPL baseline. When one drifts above — after enough spend and a complete lookback — that channel is where budget is leaking.",
        found: "LinkedIn's trailing 7-day CPL is $1,140 vs its $940 baseline (+21%). Meta is drifting too but hasn't cleared the confirmation window yet.",
        formula: "Source: per-channel spend + Salesforce-attributed leads · trailing 7-day CPL vs the channel's 90-day baseline, gated on minimum spend and a complete lookback.",
      },
      {
        id: nid("tgt"),
        label: "No channel spends over $1.5K in 7 days while above its CPL baseline",
        target: "$1.5K · over baseline", current: "LinkedIn $3.9K", met: false,
        why: "LinkedIn spent $3.9K in the trailing 7 days at a $1,140 CPL, well over baseline. A spend ceiling on above-baseline channels stops waste compounding.",
        meaning: "A hard waste ceiling: no channel should keep spending more than $1.5K over 7 days while its Salesforce CPL is above baseline.",
        found: "LinkedIn spent $3.9K over the trailing 7 days at a $1,140 CPL — past both the $1.5K ceiling and its own baseline.",
        formula: "Source: per-channel spend + Salesforce leads · 7-day spend by channel vs Salesforce CPL relative to the 90-day baseline.",
      },
    ],
    conditions: [
      { id: nid("cnd"), label: "A channel's trailing Salesforce CPL is materially above baseline", description: "The core waste detector: when a channel's trailing 7-day Salesforce CPL runs above its 90-day baseline — after enough spend and a complete lookback — that channel is where budget is leaking.", logic: "trailing_cpl_7d(channel) > channel_cpl_baseline_90d AND spend_7d > $1,500 AND lookback_days >= 3", state: "fired", count: 1 },
      { id: nid("cnd"), label: "Meta's Salesforce CPL is drifting above baseline", description: "An early-warning watch: Meta's CPL is trending above baseline but hasn't cleared the confirmation window, so it's held for review rather than acted on — avoiding a reaction to one-day noise.", logic: "meta_trailing_cpl_7d > meta_cpl_baseline_90d AND lookback_incomplete", state: "fired", count: 1 },
      { id: nid("cnd"), label: "Blended Salesforce CPL is trending above the 5% improvement path", description: "Watches the blended CPL trend against the ~$610 target and holds quiet until a 7-day reading clears it, so one noisy day doesn't trigger a reaction.", logic: "blended_cpl_7d > $610", state: "quiet", count: 0 },
      { id: nid("cnd"), label: "Broad-match Search is buying off-intent queries with no Salesforce leads", description: "Fires when broad match spends on a rising share of queries that never become Salesforce-attributed leads — recoverable spend behind negative keywords.", logic: "broad_match_offintent_spend_share_30d > 15%", state: "quiet", count: 0 },
      { id: nid("cnd"), label: "A channel's spend is pacing above plan while its CPL is above baseline", description: "Catches waste that compounds: a channel over both its pacing plan and its CPL baseline is spending more to buy leads that already cost too much.", logic: "channel_pace_vs_plan > 10% AND trailing_cpl_7d(channel) > channel_cpl_baseline_90d", state: "quiet", count: 0 },
      { id: nid("cnd"), label: "Salesforce-attributed lead volume on a channel drops while spend holds", description: "An efficiency early-warning: if a channel's Salesforce lead output falls while spend stays flat, CPL is about to climb — surfaced before it clears baseline.", logic: "sf_leads_7d(channel) < 0.7 × sf_leads_baseline AND spend_7d(channel) >= spend_baseline", state: "quiet", count: 0 },
    ],
    moves: [
      { id: nid("mv"), label: "Cap the over-baseline channel's daily budget by ~12% until trailing Salesforce CPL returns toward baseline" },
      { id: nid("mv"), label: "Hold a drifting channel through the 3-day confirmation window before capping" },
      { id: nid("mv"), label: "Shift the freed budget into channels running below their Salesforce CPL baseline" },
      { id: nid("mv"), label: "Add negatives / tighten broad match where Search buys off-intent, no-lead queries" },
      { id: nid("mv"), label: "Review campaigns above the spend ceiling for lead quality before cutting" },
      { id: nid("mv"), label: "Flag a channel for manager review when CPL stays above baseline after the lookback" },
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
// Each is grounded in Vantapay's own paid data and carries the full reasoning
// chain the UI now makes visible: cause (why it fired) · evidence · trigger ·
// action · worth (impact) · derivation (how we got here).
function makeRecommendations() {
  const base = [
    {
      category: "Wasted spend", iconKey: "spend", severity: "act-now", tier: 1, age: "New · day 1",
      title: "PMax + Demand Gen burned $16.9K for 2 demos in 14 days",
      tldr: "Cap the worst PMax / Demand Gen campaigns and move the budget into capped high-intent Search.",
      cause: "PMax and Demand Gen together spent over $2K in 14 days while booking effectively zero qualified demos.",
      body: "Performance Max and Demand Gen spent $16,900 over the last 14 days and booked 2 demos, a $8,450 cost-per-demo, 50× your $170 target. 72% of the impressions landed on broad, low-intent placements that don't convert for Vantapay.",
      evidence: "$16.9K spent · 2 demos · $8.45K per demo vs a $170 target. 72% of impressions were broad, low-intent placements.",
      impact: { label: "Recoverable spend / 14 days", value: "$15.3K", sub: "redeployable to Search" },
      triggerLabel: "Spend without demos", signal: "$8.45K cost / demo",
      metrics: [
        { label: "Spend (14d)", value: "$16.9K", note: "PMax + Demand Gen" },
        { label: "Demos booked", value: "2", note: "$8.45K each" },
        { label: "Cost-per-demo", value: "$8.45K", note: "50× the $170 target" },
        { label: "Low-intent impressions", value: "72%", note: "broad placements" },
      ],
      trigger: "Fires when a campaign type spends over $2K in 14 days with zero booked demos",
      steps: ["Cap or pause the worst-converting PMax / Demand Gen campaigns", "Redeploy the freed budget into capped high-intent Search"],
      derivation: [
        "Spend and conversions pulled from `google_ads_campaigns.csv`, grouped by `campaign_type`.",
        "Cost-per-demo = `spend_14d` ÷ `demos_booked_14d` = **$8,450**.",
        "Low-intent share = impressions on broad placements ÷ total impressions = **72%** for these campaigns.",
        "Verified: demos joined on `gclid` → CRM `demo_booked` events, ruling out untracked conversions.",
      ],
    },
    {
      category: "Missed demand", iconKey: "headroom", severity: "act-now", tier: 1, age: "New · day 1",
      title: "High-intent Search is capped: you're losing 38% of the demos you could buy",
      tldr: "Raise budget on converting Search terms to recover the lost impression share.",
      cause: "Search impression share on converting terms fell below 60% while losing double-digit share to budget.",
      body: "Your converting Search terms (corporate card, expense management, spend management) run at 54% impression share and lose 38% of impressions to budget, not to competitors' bids. These are your cheapest demos at $135 each, and the demand is going unanswered.",
      evidence: "54% impression share · 38% lost to budget · $135 cost-per-demo, the cheapest paid demos Vantapay buys.",
      impact: { label: "Demos left on the table / mo", value: "~52", sub: "at $135 each · ~$7.0K" },
      triggerLabel: "Search headroom", signal: "54% impression share",
      metrics: [
        { label: "Impression share", value: "54%", note: "converting terms" },
        { label: "Lost to budget", value: "38%", note: "not to rank" },
        { label: "Cost-per-demo", value: "$135", note: "cheapest channel" },
        { label: "Recoverable demos", value: "~52 / mo", note: "if uncapped" },
      ],
      trigger: "Fires when Search impression share on converting terms drops below 60% while losing budget",
      steps: ["Raise budget on the converting Search term groups", "Fund it from the paused PMax / Demand Gen spend"],
      derivation: [
        "Search terms and impression-share metrics pulled from `google_ads_search_terms.csv`.",
        "Lost-to-budget = `search_lost_is_budget` = **38%** on the converting term group.",
        "Converting-term set derived from Vantapay's own `gclid` → demo joins, no external keyword list.",
        "Verified: rank-lost share is under 6%, isolating budget (not competitiveness) as the cap.",
      ],
    },
    {
      category: "Creative fatigue", iconKey: "fatigue", severity: "watch", tier: 2, age: "Day 3", confidence: "fresh",
      title: "Your top Meta creative hit frequency 6.4: CTR is down 37%",
      tldr: "Refresh the fatigued Meta creative before CPMs climb further.",
      cause: "A Meta creative's 7-day frequency passed 4.0 while its CTR trended down over 21 days.",
      body: "Your top Meta creative has run to an average frequency of 6.4 over 21 days. CTR has fallen 37% and CPM is up 33% as the same audience sees it repeatedly, textbook creative fatigue. Meta's cost-per-demo has drifted from $185 to $265.",
      evidence: "Frequency 6.4 · CTR −37% · CPM +33% over 21 days; Meta cost-per-demo $185 → $265.",
      impact: { label: "Cost-per-demo drift", value: "+$80", sub: "Meta · 21 days" },
      triggerLabel: "Creative fatigue", signal: "6.4 frequency",
      metrics: [
        { label: "Frequency (7d)", value: "6.4", note: "past 4.0 saturation" },
        { label: "CTR trend (21d)", value: "−37%", note: "falling" },
        { label: "CPM trend", value: "+33%", note: "same audience" },
        { label: "Cost-per-demo", value: "$265", note: "was $185" },
      ],
      trigger: "Fires when a Meta creative's 7-day frequency passes 4.0 with a falling CTR",
      steps: ["Rotate in a fresh creative concept", "Cap frequency or widen the audience to reset it"],
      derivation: [
        "Creative-level delivery pulled from `meta_ads_creatives.csv` over a 21-day window.",
        "Frequency = impressions ÷ reach = **6.4** on the top-spend creative.",
        "CTR and CPM trends are 21-day slopes on the same creative, a like-for-like read.",
        "Verified: audience size steady, so the CPM rise is fatigue, not a targeting change.",
      ],
    },
    {
      category: "Conversion leak", iconKey: "landing", severity: "watch", tier: 2, age: "Day 5", confidence: "partial",
      title: "The /demo landing page is converting paid traffic at half its usual rate",
      tldr: "Investigate the /demo page: paid conversion halved this week.",
      cause: "Landing-page conversion on paid traffic fell below 60% of its baseline.",
      body: "Paid traffic to /demo converted at 4.2% this week versus an 8.4% baseline. The drop is isolated to paid (organic is steady), which points at message-match or a page issue on the paid experience rather than traffic quality.",
      evidence: "4.2% paid conversion vs 8.4% baseline, a 50% drop, isolated to paid traffic.",
      impact: { label: "Conversion vs baseline", value: "−50%", sub: "/demo · paid only" },
      triggerLabel: "Conversion drop", signal: "4.2% vs 8.4%",
      metrics: [
        { label: "Paid conversion (7d)", value: "4.2%", note: "was 8.4%" },
        { label: "Organic conversion", value: "8.1%", note: "steady" },
        { label: "Paid sessions affected", value: "~2,300 / wk", note: "" },
      ],
      trigger: "Fires when a live campaign's landing-page conversion drops below 60% of baseline",
      steps: ["Audit /demo for a broken form or slow load on paid", "A/B a fixed variant against the current page"],
      derivation: [
        "Session and conversion data pulled from `web_analytics_landing.csv`, split by `traffic_source`.",
        "Paid conversion = paid demo forms ÷ paid sessions = **4.2%**, vs a trailing **8.4%** baseline.",
        "Organic held at 8.1%, isolating the drop to the paid experience, not traffic quality.",
        "Verified: no tracking change deployed this week, ruling out a measurement artifact.",
      ],
    },
    {
      category: "Spend overlap", iconKey: "brand", severity: "watch", tier: 3, age: "Day 5",
      title: "PMax is bidding on your brand terms, paying for demand you'd get free",
      tldr: "Exclude brand terms from PMax so you stop paying for organic demand.",
      cause: "PMax served on branded 'vantapay' queries above the overlap threshold this week.",
      body: "PMax served on 'vantapay' brand queries 1,480 times this week, demand that already converts through organic and brand Search at near-zero cost. You're paying PMax rates for traffic you'd capture anyway.",
      evidence: "1,480 PMax impressions on brand queries; brand demand already converts near-free via organic.",
      impact: { label: "Avoidable brand spend / mo", value: "~$3.8K", sub: "PMax on brand" },
      triggerLabel: "Brand overlap", signal: "1,480 impressions",
      metrics: [
        { label: "Brand impressions (PMax)", value: "1,480 / wk", note: "" },
        { label: "Est. avoidable spend", value: "~$3.8K / mo", note: "" },
        { label: "Organic brand capture", value: "91%", note: "already free" },
      ],
      trigger: "Fires when PMax serves over 500 impressions on brand queries in 7 days",
      steps: ["Add a brand-term negative / exclusion list to PMax", "Let organic and brand Search keep capturing brand demand"],
      derivation: [
        "PMax query data pulled from `google_ads_pmax_queries.csv` (brand-term matched).",
        "Brand impressions = queries matching `vantapay*` = **1,480** in the last 7 days.",
        "Avoidable spend estimated from PMax's brand-query CPC × impressions × CTR.",
        "Verified: organic already captures **91%** of brand demand, so the overlap is redundant.",
      ],
    },
    {
      category: "Retargeting waste", iconKey: "spend", severity: "act-now", tier: 2, age: "New · day 1",
      title: "Retargeting is spending $4.3K/mo on people who already booked",
      tldr: "Exclude converters and 30-day-stale visitors from your retargeting audiences.",
      cause: "Retargeting audiences still include users who already converted or have gone cold.",
      body: "38% of retargeting impressions this month hit users who already booked a demo or last visited over 30 days ago. That's $4.3K/mo re-serving ads to people who won't convert again, budget that should chase fresh, in-market visitors.",
      evidence: "38% of retargeting impressions hit already-converted or 30-day-stale users, $4.3K/mo.",
      impact: { label: "Wasted retargeting / mo", value: "$4.3K", sub: "converters + stale" },
      triggerLabel: "Retargeting waste", signal: "38% wasted",
      metrics: [
        { label: "Retargeting spend / mo", value: "$11.2K", note: "" },
        { label: "Wasted share", value: "38%", note: "converted or stale" },
        { label: "Recoverable", value: "$4.3K / mo", note: "" },
      ],
      trigger: "Fires when over 30% of retargeting impressions hit converted or 30-day-stale users",
      steps: ["Add a converters exclusion list to retargeting", "Cap the retargeting window at 30 days"],
      derivation: [
        "Retargeting delivery pulled from `meta_ads_audiences.csv`, joined to CRM demo events.",
        "Wasted share = impressions to converted or 30-day-stale users ÷ total = **38%**.",
        "Recoverable spend = wasted share × monthly retargeting spend = **$4.3K**.",
        "Verified: converters matched on hashed email → CRM `demo_booked`, ruling out false matches.",
      ],
    },
    {
      category: "Query waste", iconKey: "query", severity: "watch", tier: 2, age: "Day 2",
      title: "Broad-match Search is buying $3.0K/mo of off-intent clicks",
      tldr: "Add negatives: broad match is matching searches that never book a demo.",
      cause: "Broad-match keywords matched a rising share of queries with no buying intent (free tools, jobs, unrelated brands).",
      body: "26% of broad-match Search spend this month went to queries with no buying intent: 'free expense tracker', 'accounting jobs', unrelated brand names. That's $3.0K/mo of clicks that never book a demo, and the share is climbing week over week.",
      evidence: "26% of broad-match spend on zero-intent queries, $3.0K/mo across ~35 query themes.",
      impact: { label: "Recoverable Search spend / mo", value: "$3.0K", sub: "add negatives" },
      triggerLabel: "Irrelevant queries", signal: "26% off-intent",
      metrics: [
        { label: "Broad-match spend / mo", value: "$11.5K", note: "" },
        { label: "Off-intent share", value: "26%", note: "no demo intent" },
        { label: "Recoverable", value: "$3.0K / mo", note: "with negatives" },
        { label: "Query themes to block", value: "~35", note: "jobs, free tools" },
      ],
      trigger: "Fires when over 15% of broad-match spend lands on zero-intent queries in 30 days",
      steps: ["Add the off-intent query themes as negative keywords", "Tighten broad-match to phrase on the loosest ad groups"],
      derivation: [
        "Search queries pulled from `google_ads_search_terms.csv`, matched to spend.",
        "Off-intent share = spend on no-demo-intent queries ÷ broad-match spend = **26%**.",
        "Intent labelled from Vantapay's own `gclid` → demo joins, queries that never convert.",
        "Verified: excluded branded and clearly-converting terms before counting waste.",
      ],
    },
    {
      category: "Budget pacing", iconKey: "pacing", severity: "watch", tier: 2, age: "Day 4",
      title: "Your best Search campaign will run dry 10 days before month-end",
      tldr: "Lift the monthly cap or smooth pacing: the cheapest demo engine goes dark early.",
      cause: "Daily spend on the top-converting Search campaign is pacing 48% above plan and will hit its monthly cap early.",
      body: "Your best-converting Search campaign is pacing to spend its full monthly budget by day 20, then it goes dark for the last 10 days of the month, exactly when it books your cheapest demos. Demand doesn't stop; only the ads do.",
      evidence: "Pacing 48% over plan: budget exhausts on day 20 of 30, dark for 10 days.",
      impact: { label: "Demo-days lost / mo", value: "~10 days", sub: "best campaign dark" },
      triggerLabel: "Pacing over plan", signal: "48% over pace",
      metrics: [
        { label: "Pace vs plan", value: "+48%", note: "over budget curve" },
        { label: "Budget exhausts", value: "Day 20", note: "of 30" },
        { label: "Dark days", value: "~10", note: "no delivery" },
        { label: "Channel", value: "Search", note: "cheapest demos" },
      ],
      trigger: "Fires when a campaign paces to exhaust its monthly budget before day 24",
      steps: ["Raise the monthly cap on the top-converting Search campaign", "Or switch it to standard pacing to spread delivery"],
      derivation: [
        "Daily spend pulled from `google_ads_campaigns.csv` against the monthly budget.",
        "Projected exhaustion = budget ÷ trailing-7-day daily spend = **day 20**.",
        "Pace = trailing daily spend ÷ even-pacing target = **+48%**.",
        "Verified: this campaign has the lowest cost-per-demo, so dark days cost real pipeline.",
      ],
    },
    {
      category: "Device gap", iconKey: "device", severity: "watch", tier: 3, age: "Day 6",
      title: "Mobile is 57% of paid spend but converts at half the desktop rate",
      tldr: "Shift bids toward desktop or fix the mobile demo flow: mobile demos cost 2×.",
      cause: "Mobile cost-per-demo is running roughly double desktop while mobile takes the majority of spend.",
      body: "Mobile takes 57% of paid spend but books demos at a $335 cost-per-demo, nearly double desktop's $180. The gap is widest on the /demo form, which points at a mobile UX problem, not audience quality.",
      evidence: "Mobile 57% of spend · $335 cost-per-demo vs $180 on desktop, a 1.9× gap.",
      impact: { label: "Efficiency gap", value: "1.9×", sub: "mobile vs desktop" },
      triggerLabel: "Device gap", signal: "$335 vs $180",
      metrics: [
        { label: "Mobile spend share", value: "57%", note: "" },
        { label: "Mobile cost-per-demo", value: "$335", note: "" },
        { label: "Desktop cost-per-demo", value: "$180", note: "" },
        { label: "Mobile form completion", value: "2.4%", note: "vs 5.2% desktop" },
      ],
      trigger: "Fires when mobile cost-per-demo exceeds desktop by more than 50% at material spend",
      steps: ["Apply a negative mobile bid adjustment until the gap closes", "Audit the mobile /demo form for friction (length, load, autofill)"],
      derivation: [
        "Spend and conversions pulled from `google_ads_campaigns.csv`, split by `device`.",
        "Cost-per-demo = spend ÷ demos per device = **$335 mobile**, **$180 desktop**.",
        "Form-completion split from `web_analytics_landing.csv` isolates the /demo step.",
        "Verified: audience and geo mix hold across devices, isolating UX as the driver.",
      ],
    },
    {
      category: "Geo waste", iconKey: "geo", severity: "watch", tier: 3, age: "Day 6",
      title: "24% of paid spend is landing outside your target regions",
      tldr: "Tighten geo targeting: nearly a quarter of spend is outside your ICP regions.",
      cause: "A share of paid impressions served outside Vantapay's target Nordic regions with near-zero demo conversion.",
      body: "24% of paid spend this month served outside your target regions, regions where Vantapay has almost no pipeline. These clicks convert at a fifth of your in-region rate, so the spend is effectively unrecoverable.",
      evidence: "24% of spend outside target regions, converting at ~0.2× the in-region rate.",
      impact: { label: "Recoverable geo spend / mo", value: "~$3.4K", sub: "off-ICP regions" },
      triggerLabel: "Off-geo spend", signal: "24% out of region",
      metrics: [
        { label: "Off-region spend share", value: "24%", note: "" },
        { label: "In-region cost-per-demo", value: "$175", note: "" },
        { label: "Off-region cost-per-demo", value: "$875", note: "5× worse" },
        { label: "Recoverable", value: "~$3.4K / mo", note: "" },
      ],
      trigger: "Fires when over 10% of spend serves outside target regions in 30 days",
      steps: ["Tighten location targeting to the target regions", "Add off-region locations as exclusions on broad campaigns"],
      derivation: [
        "Spend by region pulled from `google_ads_geo.csv`, matched to CRM pipeline by region.",
        "Off-region share = spend outside target regions ÷ total = **24%**.",
        "Off-region cost-per-demo = **$875** vs **$175** in-region, a 5× gap.",
        "Verified: target-region list matches Vantapay's serviceable market, not just billing geo.",
      ],
    },
    {
      category: "Scale opportunity", iconKey: "scale", severity: "watch", tier: 2, age: "New · day 1",
      title: "A new Meta creative is beating your account average by 2.3×",
      tldr: "Scale the 'finance team' creative before it fatigues: it's your cheapest Meta demo.",
      cause: "A recently launched Meta creative is converting well above the account average while still on a small budget.",
      body: "Your new 'finance team' Meta creative is booking demos at $110 (2.3× more efficient than the Meta average of $255), but it's only getting 11% of Meta budget. There's room to scale it before frequency climbs and the edge fades.",
      evidence: "$110 cost-per-demo vs a $255 Meta average, 2.3× better, on just 11% of budget.",
      impact: { label: "Efficient demos if scaled / mo", value: "~34", sub: "at $110 each" },
      triggerLabel: "Scale winner", signal: "$110 cost / demo",
      metrics: [
        { label: "Creative cost-per-demo", value: "$110", note: "vs $255 avg" },
        { label: "Efficiency vs average", value: "2.3×", note: "better" },
        { label: "Budget share today", value: "11%", note: "room to grow" },
        { label: "Frequency", value: "1.6", note: "far from fatigue" },
      ],
      trigger: "Fires when a creative beats the channel cost-per-demo by 2× on under 15% of budget",
      steps: ["Shift budget from the fatigued creative into this one", "Build 2–3 variants of the winning concept before it saturates"],
      derivation: [
        "Creative-level performance pulled from `meta_ads_creatives.csv` over 14 days.",
        "Cost-per-demo = spend ÷ demos = **$110** vs a **$255** channel average.",
        "Budget share = creative spend ÷ total Meta spend = **11%**.",
        "Verified: frequency is **1.6**, so the efficiency isn't a small-sample fluke or early-fatigue spike.",
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
  // ── Single hero use case for the guided demo: paid-spend efficiency. The goal
  //    carries the live recommendations that seed the recommendation → create-goal
  //    flow; the New-goal flow rebuilds the same use case via paidEfficiencyGoalConfig. ──
  seedGoal({
    name: "Reduce inefficient daily paid spend by 5%",
    statement: "Cap channels running above their Salesforce CPL baseline and hold blended Salesforce CPL on a 5% improvement path.",
    target: "≤$610 CPL",
    targets: [
      { label: "Bring blended Salesforce CPL from $642 to ~$610", target: "≤$610", current: "$642", met: false, why: "A 5% efficiency improvement on the $642 blended Salesforce CPL baseline lands at ~$610." },
      { label: "Keep every channel's trailing CPL within its 90-day baseline", target: "≤ baseline", current: "LinkedIn +21%", met: false, why: "LinkedIn trailing CPL is $1,140 vs a $940 baseline; channels drifting above baseline are where the waste is." },
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
        periods: ["LinkedIn · $1,140", "Google · $940 baseline"] },
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
        category: "Attribution", iconKey: "spend", severity: "act-now", tier: 1, age: "New · day 1",
        title: "Move budget toward the campaigns creating qualified pipeline.",
        tldr: "$18.4K in prospecting produced 46 conversions but 0 qualified opps, while retargeting is creating real pipeline.",
        cause: "\"CISO Cold Outreach Q3\" and \"Security Leaders LinkedIn Blast\" spent $18.4K over 30 days for 46 platform conversions and zero qualified Salesforce opportunities, while \"CISO Webinar Retargeting\" spent $6.7K and produced 12 qualified opps.",
        body: "The comparison uses the approved sourced-and-influenced pipeline definition, the same 30-day attribution window, and the same account exclusions across both cohorts, so the gap is real rather than a measurement artifact. Retargeting is generating 2.1x more qualified pipeline per dollar than prospecting.",
        evidence: "Prospecting spent $18.4K over 30 days for 46 platform conversions and 0 qualified opps; retargeting spent $6.7K for 12 qualified opps and $284K influenced pipeline.",
        impact: { label: "Pipeline per dollar", value: "2.1x", sub: "retargeting vs prospecting" },
        triggerLabel: "Attribution", signal: "0 qualified opps",
        metrics: [
          { label: "Pipeline / $", value: "2.1x", note: "retargeting vs prospecting" },
          { label: "Platform conv.", value: "46", note: "from low-quality campaigns" },
          { label: "Qualified opps", value: "0", note: "from those conversions" },
        ],
        trigger: "Trigger when a campaign's platform conversions rise but it produces no qualified Salesforce opportunities over the attribution window.",
        steps: [
          "Reduce \"CISO Cold Outreach Q3\" and \"Security Leaders LinkedIn Blast\" by 40% (~$7.4K/mo) and move the freed budget into \"CISO Webinar Retargeting\" inside the approved ceiling",
          "Add both campaigns to the weekly platform-vs-CRM conversion review, so scaling requires opportunities, not just platform conversions",
          "Re-evaluate after 14 days once retargeting frequency has held under the 4.5 ceiling",
        ],
        derivation: [
          "Prospecting spend `$18.4K / 30d` with `46 platform conversions` and `0 qualified opps`.",
          "Retargeting spend `$6.7K / 30d` with `12 qualified opps` and `$284K influenced pipeline`.",
          "Both cohorts use the same `30-day` attribution window and identical account exclusions.",
          "Pipeline uses the approved sourced-and-influenced definition.",
        ],
        scenario: "Reallocating ~$7.4K/mo from the two prospecting campaigns into retargeting should add roughly $30K to $45K of qualified pipeline over the next 30 days, on the 2.1x pipeline-per-dollar retargeting already shows. Not guaranteed; assumes retargeting holds efficiency as spend scales under the 4.5 frequency ceiling.",
        guardrails: {
          continueIf: [
            "Retargeting stays at or above 2.0x pipeline per dollar.",
            "Retargeting frequency holds under the 4.5 ceiling.",
            "The two prospecting campaigns keep producing zero qualified opps at the reduced spend.",
          ],
          reverseIf: [
            "Retargeting pipeline per dollar falls below 1.5x after the shift.",
            "Frequency breaches 4.5 and CPMs climb.",
            "The prospecting campaigns start producing qualified opps at the lower budget.",
          ],
        },
        readBeforeDeciding: [
          "Both cohorts use the same 30-day attribution window and the approved sourced-and-influenced definition.",
          "Attribution stops at the campaign-vs-campaign level; account-level credit is not claimed here.",
        ],
        timeline: { window: "Next 30 days", review: "After 14 days", reversible: "Yes, budgets restored on breach" },
        whatHappensNext: {
          works: "Keep the reallocation and consider trimming prospecting further.",
          fails: "Restore the prospecting budgets and hold retargeting at current spend.",
          unclear: "Wait for opps to mature; do not claim success on platform conversions alone.",
        },
      }),
      wrapRec({
        category: "Incrementality", iconKey: "geo", severity: "watch", tier: 2, age: "Day · 6h ago",
        title: "Validate incremental lift before scaling \"CISO Brand Search - NAM\".",
        tldr: "Brand Search conversions move with organic demand 79% of the time, so credit may overstate true lift.",
        cause: "Branded organic demand and \"CISO Brand Search - NAM\" conversions rose together in 79% of the last 12 weeks. The campaign carries $164K sourced pipeline this quarter, but incremental lift is unproven.",
        body: "A controlled geo holdout will answer this more cleanly than reassigning credit through an attribution model. Test regions are chosen so paid-demand overlap is minimized. Until the holdout runs, the right move is to hold, not scale.",
        evidence: "Brand paid and organic demand correlated 79% over the trailing 12 weeks, while Brand Search sourced pipeline this quarter is $164K.",
        impact: { label: "Decision", value: "Hold", sub: "pending causal evidence" },
        triggerLabel: "Incrementality", signal: "79% overlap",
        metrics: [
          { label: "Overlap", value: "79%", note: "paid + organic brand demand" },
          { label: "Test window", value: "4 wk", note: "recommended holdout" },
          { label: "Decision", value: "Hold", note: "pending evidence" },
        ],
        trigger: "Watch when a brand-search campaign's conversions move with organic demand, so credit may overstate incremental lift.",
        steps: [
          "Hold \"CISO Brand Search - NAM\" spend flat at $8.4K/mo across all regions for the next 4 weeks",
          "Run a two-region geo holdout with a $12K pipeline-lift threshold as the go/no-go for further budget",
          "Escalate for a full account review only if the holdout shows less than 60% incremental lift",
        ],
        derivation: [
          "Brand paid and organic demand correlated `79%` over trailing `12 weeks`.",
          "Brand Search sourced pipeline this quarter: `$164K`.",
          "Recommended holdout: `4 weeks` across `2 regions`.",
          "Go / no-go threshold: `$12K` pipeline lift or `60%` incremental share.",
        ],
      }),
      wrapRec({
        category: "Budget pacing", iconKey: "pacing", severity: "act-now", tier: 2, age: "Closed · Jul 7",
        title: "Cap \"CIO Brand Search - Enterprise\" and move the surplus to retargeting.",
        tldr: "Closed after restoring Brand Search to its four-week baseline and moving the $1.7K/wk surplus into enterprise retargeting.",
        cause: "Brand Search spend hit $6.1K/wk versus a $4.4K four-week baseline (+38%) while opportunity volume stayed flat at 8/week, and retargeting was producing 2.1x more qualified pipeline per dollar.",
        body: "The move preserved the approved monthly ceiling and reallocated only the amount above Brand Search's stable operating range.",
        evidence: "Restored Brand Search to $4.4K/wk and moved the freed $1.7K/wk into \"CIO Enterprise Retargeting\" within the approved ceiling.",
        impact: { label: "Recorded impact", value: "$1.7K/wk", sub: "reallocated to retargeting" },
        triggerLabel: "Budget pacing", signal: "Acted Jul 7",
        metrics: [
          { label: "Spend", value: "+38%", note: "vs four-week baseline" },
          { label: "Opportunities", value: "Flat", note: "despite higher spend" },
          { label: "Reallocated", value: "$1.7K/wk", note: "to retargeting" },
        ],
        trigger: "Trigger when a campaign paces above its four-week baseline while opportunity volume stays flat.",
        steps: [
          "Restore \"CIO Brand Search - Enterprise\" to $4.4K/wk (its four-week baseline), freeing $1.7K/wk",
          "Move the freed $1.7K/wk to \"CIO Enterprise Retargeting\" within the approved ceiling",
          "Recheck both after 7 to 10 days; flag if Brand Search opps drop below 6/week",
        ],
        derivation: [
          "Brand Search spend `$6.1K/wk` versus a `$4.4K` four-week baseline (`+38%`).",
          "Opportunity volume flat at `8/week` despite the higher spend.",
          "Retargeting pipeline-per-dollar `2.1x` higher over the same window.",
          "Available to reallocate this week: `$1.7K`.",
        ],
      }),
      wrapRec({
        category: "Forecasting", iconKey: "scale", severity: "watch", tier: 2, age: "Closed · Jul 5",
        title: "Put the new budget into enterprise retargeting.",
        tldr: "Closed after loading enterprise retargeting first, reserving high-intent search, and holding a slice for a CFO creative test.",
        cause: "Enterprise retargeting had $18K/mo of capacity before frequency hit its 4.5 ceiling, high-intent search had $8K/mo of headroom before CPC efficiency dropped, and broad paid social was already down 12% in pipeline-per-dollar.",
        body: "The forecast weighed qualified pipeline, cost limits, and audience capacity rather than platform conversions alone, and kept CAC inside the $8.4K downside limit across every scenario.",
        evidence: "Allocated the $30K: $18K to enterprise retargeting, $8K reserved for high-intent search at a $9.20 CPC floor, and $4K held for a CFO-segment creative test.",
        impact: { label: "Recorded impact", value: "+$184K", sub: "illustrative base-case pipeline / qtr" },
        triggerLabel: "Forecasting", signal: "Closed Jul 5",
        metrics: [
          { label: "Pipeline range", value: "+$184K", note: "illustrative base case" },
          { label: "Frequency", value: "<5.0", note: "inside approved ceiling" },
          { label: "CAC", value: "Inside", note: "downside-case limit" },
        ],
        trigger: "Trigger when new budget is available and the plan needs a capacity-aware allocation across channels.",
        steps: [
          "Put $18K into enterprise retargeting first, the highest expected pipeline within capacity",
          "Reserve $8K for high-intent search, capped at a $9.20 CPC floor",
          "Hold $4K for a CFO-segment creative test and reforecast after 14 days",
        ],
        derivation: [
          "Enterprise retargeting capacity: `$18K/mo` before the `4.5` frequency ceiling.",
          "High-intent search headroom: `$8K/mo` before CPC efficiency drops.",
          "Broad paid social pipeline-per-dollar: `-12%` versus the 90-day baseline.",
          "CAC stays inside the `$8.4K` downside limit across all scenarios.",
        ],
      }),
      wrapRec({
        category: "Segment performance", iconKey: "device", severity: "act-now", tier: 1, age: "New · day 1",
        title: "Cut the placements and geographies burning spend without pipeline.",
        tldr: "27% of the enterprise campaign's spend is going to Audience Network and out-of-coverage APAC with zero qualified opps.",
        cause: "The LinkedIn Audience Network extension on \"CIO Enterprise Prospecting\" spent $2.1K over 30 days across low-signal 3rd-party inventory with zero qualified opportunities, and APAC delivery absorbed another $1.4K outside the approved US/EMEA region, also with zero opps. Combined, that is 27% of the campaign's spend against zero pipeline.",
        body: "The pattern is stable across the trailing 4 weeks after normalizing for click volume and the approved 14-day qualification window.",
        evidence: "Audience Network $2.1K/30d and out-of-coverage APAC $1.4K/30d each produced 0 qualified opps, 27% of the campaign's spend, releasing $3.5K/mo.",
        impact: { label: "Spend on affected segments", value: "27%", sub: "$3.5K/mo to release" },
        triggerLabel: "Segment performance", signal: "0 opps · 27%",
        metrics: [
          { label: "Spend share", value: "27%", note: "on affected segments" },
          { label: "Qualified opps", value: "0", note: "inside the review window" },
          { label: "Released", value: "$3.5K", note: "monthly budget" },
        ],
        trigger: "Trigger when a delivery segment (placement, geography, device, or daypart) spends without producing qualified pipeline.",
        steps: [
          "Disable Audience Network on all enterprise campaigns; keep delivery on native LinkedIn inventory only",
          "Exclude APAC and other out-of-coverage geographies at the account level",
          "Redirect the released $3.5K to the top native-inventory placements ranked by post-click engagement, then re-audit after 21 days",
        ],
        derivation: [
          "LinkedIn Audience Network spend: `$2.1K / 30d` with `0 qualified opps`.",
          "APAC (out-of-coverage) spend: `$1.4K / 30d` with `0 qualified opps`.",
          "Combined share of enterprise-campaign spend: `27%`.",
          "Monthly budget released for reallocation: `$3.5K`.",
        ],
        scenario: "Cutting Audience Network and out-of-coverage APAC frees $3.5K/mo with no expected pipeline loss, since both segments produced zero qualified opps. Redeployed into the top native placements, the illustrative gain is a few additional qualified opps per month.",
        guardrails: {
          continueIf: [
            "Native LinkedIn placements keep converting at or above current rates.",
            "Enterprise reach stays within the approved US/EMEA region.",
            "No qualified opps trace back to the cut segments.",
          ],
          reverseIf: [
            "Native-only delivery cannot spend the freed budget efficiently.",
            "A qualified opp is later attributed to Audience Network or APAC.",
            "Post-click engagement on native placements drops materially.",
          ],
        },
        readBeforeDeciding: [
          "The pattern is stable across the trailing 4 weeks after normalizing for click volume.",
          "Judged on the approved 14-day qualification window.",
        ],
        timeline: { window: "Effective immediately", review: "After 21 days", reversible: "Yes, segments can be re-enabled" },
        whatHappensNext: {
          works: "Keep the exclusions and reallocate more toward the top native placements.",
          fails: "Re-enable the affected segments and restore the prior delivery mix.",
          unclear: "Hold the exclusions and re-audit engagement after another cycle.",
        },
      }),
      wrapRec({
        category: "Search intent", iconKey: "query", severity: "act-now", tier: 2, age: "New · day 1",
        title: "Stop paying for research traffic that cannot become pipeline.",
        tldr: "47 tutorial, template, and job-seeker terms drove 892 clicks and 31 form fills but zero sales-accepted opps, wasting $1.9K/mo.",
        cause: "47 tutorial, template, and job-seeker search terms drove 892 clicks and 31 form fills over 30 days and zero sales-accepted opportunities. Wasted spend on those terms is $1.9K/mo.",
        body: "The terms share a consistent low-intent pattern across landing-page behavior (2.8s average dwell, 71% bounce) and downstream CRM outcomes.",
        evidence: "$1.9K/30d wasted on 47 low-intent terms, 31 form fills, 0 sales-accepted opps, 2.8s dwell and 71% bounce.",
        impact: { label: "Wasted spend", value: "$1.9K", sub: "last 30 days" },
        triggerLabel: "Search intent", signal: "0 sales-accepted",
        metrics: [
          { label: "Wasted spend", value: "$1.9K", note: "last 30 days" },
          { label: "Form fills", value: "31", note: "from affected terms" },
          { label: "Sales-accepted", value: "0", note: "from those fills" },
        ],
        trigger: "Trigger when non-brand search terms drive clicks and form fills but no sales-accepted opportunities.",
        steps: [
          "Add the 47 identified terms to the account-wide negative keyword list",
          "Tighten two match types from broad to phrase on the affected ad groups",
          "Keep the high-intent variants running for a 30-day comparison window",
        ],
        derivation: [
          "Wasted spend on those 47 terms: `$1.9K / 30d`.",
          "Form fills from those terms: `31`; sales-accepted opps: `0`.",
          "Avg landing-page dwell: `2.8s`; bounce rate: `71%`.",
          "Terms flagged: `47`, sharing a job-seeker / research intent pattern.",
        ],
        scenario: "Adding the 47 terms as negatives recovers ~$1.9K/mo with no expected loss of sales-accepted pipeline, since those terms produced zero. Redeploying to the high-intent variants should modestly raise qualified lead volume.",
        guardrails: {
          continueIf: [
            "The 47 terms stay at zero sales-accepted opps over the next 30 days.",
            "High-intent variants keep converting.",
            "Blended non-brand CPL does not rise after the change.",
          ],
          reverseIf: [
            "A negated term is later linked to a sales-accepted opportunity.",
            "High-intent variant volume drops materially after tightening match types.",
            "Overall non-brand lead quality declines.",
          ],
        },
        readBeforeDeciding: [
          "The terms share a consistent low-intent pattern (2.8s dwell, 71% bounce) and zero CRM outcomes.",
          "Branded and clearly-converting terms were excluded before counting waste.",
        ],
        timeline: { window: "Effective immediately", review: "After 30 days", reversible: "Yes, negatives can be removed" },
        whatHappensNext: {
          works: "Keep the negatives and extend the list to similar patterns.",
          fails: "Remove the negatives and restore broad match on the affected ad groups.",
          unclear: "Hold and compare against the 30-day high-intent window before expanding.",
        },
      }),
      wrapRec({
        category: "Audience & ICP", iconKey: "headroom", severity: "watch", tier: 2, age: "Day 2",
        title: "Shift reach from low-fit companies to undercovered target accounts.",
        tldr: "34% of LinkedIn reach falls outside the approved ICP and produced no closed-won, while 86 high-fit accounts stay undercovered.",
        cause: "34% of current LinkedIn reach falls outside the approved ICP. Those out-of-ICP impressions produced 4 opportunities in 90 days, none past Stage 2, and $0 closed-won. Only 22% of the 86 undercovered target accounts have entered the golden path that historically leads to revenue.",
        body: "Fit is judged not just by reach but by whether accounts are entering the sequence that historically converts. Accounts that hit at least 3 of 5 golden-path touchpoints converted at 4.1x the rate and closed at 2.6x.",
        evidence: "34% of reach outside ICP, 86 high-fit accounts undercovered, frequency ceiling 4.5, 128K/30d on the broad prospecting audience.",
        impact: { label: "Reach outside ICP", value: "34%", sub: "86 high-fit accounts undercovered" },
        triggerLabel: "Audience & ICP", signal: "34% off-ICP",
        metrics: [
          { label: "Outside ICP", value: "34%", note: "of paid reach" },
          { label: "Undercovered", value: "86", note: "high-fit accounts" },
          { label: "Frequency", value: "<4.5", note: "approved limit" },
        ],
        trigger: "Watch when paid reach falls outside the ICP definition or high-fit target accounts stay undercovered.",
        steps: [
          "Narrow the audience to the approved ICP filters",
          "Add the 86 undercovered accounts to a matched-audience layer sequenced to mirror the golden path",
          "Keep frequency at 4.5 per account across both segments",
          "Track golden-path entry and completion for the 86 accounts over 60 days, not just impressions",
        ],
        derivation: [
          "Share of reach outside the ICP definition: `34%`.",
          "High-fit named accounts under-covered: `86`.",
          "Approved frequency ceiling: `4.5` per account.",
          "Reach on the broad prospecting audience: `128K / 30d`.",
        ],
      }),
      wrapRec({
        category: "Suppression", iconKey: "brand", severity: "act-now", tier: 1, age: "New · day 1",
        title: "Stop prospecting to customers and active opportunities.",
        tldr: "Stale suppression lists are still targeting 214 customer domains and 37 active opps; 18% of last month's spend reached people already in CRM.",
        cause: "Three prospecting audiences on LinkedIn and Meta are still targeting 214 customer domains and 37 active Salesforce opportunities because the suppression lists have not refreshed in 62 days. 18% of last month's spend on these audiences reached people already in CRM.",
        body: "These people are already in CRM stages the team has excluded from acquisition campaigns.",
        evidence: "214 customer domains and 37 open opps still targetable, lists last refreshed 62 days ago, 18% of affected spend.",
        impact: { label: "Affected spend", value: "18%", sub: "of three audiences" },
        triggerLabel: "Suppression", signal: "62d stale",
        metrics: [
          { label: "Affected spend", value: "18%", note: "of three audiences" },
          { label: "Customers", value: "214", note: "still targetable" },
          { label: "Open opps", value: "37", note: "still targetable" },
        ],
        trigger: "Trigger when suppression lists go stale and prospecting reaches customers or active opportunities.",
        steps: [
          "Refresh the suppression lists today and set them to auto-sync every 24 hours",
          "Check audience counts before the next campaign runs; expect a ~9% drop in targetable pool",
          "Add a monthly check to catch refresh gaps before they recur",
        ],
        derivation: [
          "Customer domains still targetable across the 3 audiences: `214`.",
          "Active Salesforce opportunities still targetable: `37`.",
          "Suppression lists last refreshed: `62 days` ago.",
          "Share of affected spend across the 3 audiences: `18%`.",
        ],
        scenario: "Refreshing suppression removes ~214 customers and 37 open opps from prospecting, recovering the 18% of affected spend (roughly $2K to $3K/mo) and redirecting it to net-new reach. The targetable pool drops about 9%.",
        guardrails: {
          continueIf: [
            "Suppression lists auto-sync every 24 hours without gaps.",
            "Prospecting reach stays on net-new accounts.",
            "The targetable pool stays within ~9% of the prior size.",
          ],
          reverseIf: [
            "Auto-sync fails and the lists go stale again.",
            "Net-new reach collapses after the exclusions.",
            "A material share of demand was actually coming from the excluded groups.",
          ],
        },
        readBeforeDeciding: [
          "These people are already in CRM stages excluded from acquisition campaigns.",
          "Expect a ~9% drop in the targetable pool after the refresh.",
        ],
        timeline: { window: "Refresh today", review: "Monthly check", reversible: "Yes, suppression can be relaxed" },
        whatHappensNext: {
          works: "Keep the 24-hour auto-sync and the monthly gap check.",
          fails: "Relax the suppression and investigate the reach drop.",
          unclear: "Hold the refresh and monitor pool size and lead flow for one cycle.",
        },
      }),
      wrapRec({
        category: "Landing page", iconKey: "landing", severity: "act-now", tier: 1, age: "New · day 1",
        title: "Redirect qualified traffic while the form bottleneck is fixed.",
        tldr: "High-intent visitors are dropping off the /pricing form at 63% vs 21% on /pricing/v2, putting ~$48K of demand at risk this week.",
        cause: "High-intent paid visitors are dropping off the /pricing form at a 63% rate versus 21% on /pricing/v2, putting an estimated $48K of open demand at risk this week.",
        body: "Traffic quality is strong going into the form. The loss is isolated to this page version, not the campaign itself.",
        evidence: "63% form drop on the affected version vs 21% stable, 71% of affected visits are high-intent, ~$48K at risk.",
        impact: { label: "Pipeline at risk", value: "$48K", sub: "illustrative open demand this week" },
        triggerLabel: "Landing page", signal: "63% form drop",
        metrics: [
          { label: "Form drop", value: "63%", note: "at one step" },
          { label: "High-intent", value: "71%", note: "of affected visits" },
          { label: "Pipeline risk", value: "$48K", note: "illustrative open demand" },
        ],
        trigger: "Trigger when a paid campaign generates clicks but the destination page or form fails to convert.",
        steps: [
          "Route paid traffic to /pricing/v2 until the issue is fixed",
          "Hold spend on the affected campaigns so the leak does not scale",
          "Run a form test; expected fix in 5 business days",
          "Build dedicated landing pages by persona so form length and content match each buyer's intent",
        ],
        derivation: [
          "Form drop at step 4: `63%` on the affected version vs `21%` stable.",
          "Share of affected visits that qualify as high-intent: `71%`.",
          "Illustrative open-demand pipeline at risk this week: `$48K`.",
          "Stable form version: `/pricing/v2`, same messaging.",
        ],
        scenario: "Routing paid traffic to /pricing/v2 while /pricing is fixed protects an estimated $48K of open demand this week by cutting the form drop from 63% back toward 21%. Assumes v2 holds its conversion rate at the higher volume.",
        guardrails: {
          continueIf: [
            "/pricing/v2 keeps its ~21% drop rate under the added volume.",
            "High-intent share of routed traffic stays near 71%.",
            "No new leak appears on v2.",
          ],
          reverseIf: [
            "The v2 drop rate climbs materially under load.",
            "Routed campaigns lose lead volume.",
            "The fix on /pricing lands and outperforms v2.",
          ],
        },
        readBeforeDeciding: [
          "Traffic quality is strong going into the form; the loss is isolated to the page version, not the campaign.",
          "This is a temporary route until the /pricing form is fixed.",
        ],
        timeline: { window: "Until /pricing is fixed", review: "Expected fix in 5 business days", reversible: "Yes, route back on fix" },
        whatHappensNext: {
          works: "Keep routing to v2 and ship the persona-specific pages next.",
          fails: "Route back to /pricing and escalate the form investigation.",
          unclear: "Hold spend and keep both versions in a controlled comparison.",
        },
      }),
      wrapRec({
        category: "Lead quality", iconKey: "device", severity: "watch", tier: 2, age: "Day 3",
        title: "Reduce the campaign with the lowest CPL but the weakest pipeline quality.",
        tldr: "\"Broad Reach A\" has the account's lowest CPL at $42 but only 3% of leads reach sales acceptance vs an 18% median.",
        cause: "\"Broad Reach A\" has the lowest CPL in the account at $42, but only 3% of its leads reach sales acceptance versus an 18% account median. Its pipeline per dollar is 0.4x the peer-campaign average.",
        body: "Petavue compares leads through the same 14-day lead-to-acceptance window, not just at form submission.",
        evidence: "CPL $42 (lowest), 3% acceptance vs 18% median, 0.4x pipeline per dollar, ~$5.6K/mo freed by the recommended cut.",
        impact: { label: "Sales acceptance", value: "3%", sub: "vs 18% account median" },
        triggerLabel: "Lead quality", signal: "3% accepted",
        metrics: [
          { label: "CPL", value: "$42", note: "lowest in account" },
          { label: "Acceptance", value: "3%", note: "vs 18% median" },
          { label: "Pipeline / $", value: "0.4x", note: "vs peer campaigns" },
        ],
        trigger: "Watch when a low-CPL campaign produces leads that rarely become qualified opportunities or revenue.",
        steps: [
          "Reduce \"Broad Reach A\" spend by 60%, from $9.4K to ~$3.8K/mo",
          "Move the freed budget to \"Enterprise Retargeting B\", which shows a 22% acceptance rate",
          "Share the lead-quality breakdown with sales to confirm the rejection reasons align with the data",
          "Review the acceptance-criteria SLA with sales before scaling any similar broad-reach campaign",
        ],
        derivation: [
          "Campaign CPL: `$42`, the lowest in the account.",
          "Sales acceptance rate: `3%` vs the `18%` account median.",
          "Pipeline per dollar: `0.4x` vs peer campaigns.",
          "Illustrative freed budget from the recommended cut: `$5.6K/mo`.",
        ],
      }),
      wrapRec({
        category: "Warm accounts", iconKey: "geo", severity: "watch", tier: 2, age: "Day · 5h ago",
        title: "Add paid coverage for warm target accounts with no active opportunity.",
        tldr: "8 high-fit accounts crossed the engagement threshold in 21 days but have no assigned AE and no paid retargeting coverage.",
        cause: "Eight high-fit accounts have crossed the engagement threshold (score >= 85 across paid, website, and content) in the trailing 21 days but have no assigned AE and no paid retargeting coverage.",
        body: "Each account cleared the threshold and falls outside suppression and open-opportunity rules. The recommendation stays inside the approved retargeting ceiling.",
        evidence: "8 warm accounts above threshold, 0 paid retargeting coverage, 0 open opps, engagement score >= 85 across paid + website + content.",
        impact: { label: "Warm accounts", value: "8", sub: "above hand-off threshold, no coverage" },
        triggerLabel: "Warm accounts", signal: "8 uncovered",
        metrics: [
          { label: "Warm accounts", value: "8", note: "above hand-off threshold" },
          { label: "Paid coverage", value: "0", note: "for those accounts" },
          { label: "Open opps", value: "0", note: "confirmed in CRM" },
        ],
        trigger: "Watch when target accounts show engagement but lack retargeting coverage, ownership, or follow-up.",
        steps: [
          "Add all 8 accounts to the enterprise retargeting audience (frequency ceiling 4.5)",
          "Route each account to an AE with the engagement timeline attached",
          "Suppress the 8 accounts from prospecting audiences to avoid paid + outbound overlap",
        ],
        derivation: [
          "Warm accounts above the hand-off threshold: `8`.",
          "Paid retargeting coverage on those accounts: `0`.",
          "Open Salesforce opportunities on those accounts: `0`.",
          "Engagement score threshold: `>= 85` across paid + website + content.",
        ],
      }),
      wrapRec({
        category: "Creative fatigue", iconKey: "fatigue", severity: "watch", tier: 2, age: "Day 4",
        title: "Refresh the message before frequency turns into wasted spend.",
        tldr: "\"CFO Testimonial v3\" crossed 7.1 frequency vs a 5.0 ceiling and CTR is down 29%, while newer cohorts still respond.",
        cause: "\"CFO Testimonial v3\" crossed 7.1 frequency (vs a 5.0 ceiling) on the enterprise audience. CTR is down 29% over the last 3 check-ins, while newer cohorts still respond close to baseline.",
        body: "The decline is isolated to the repeatedly-exposed audience. The message still works; this specific creative has fatigued.",
        evidence: "Frequency 7.1 vs 5.0 ceiling, CTR -29% from baseline, 3 consecutive check-ins declining, newer-cohort response stable.",
        impact: { label: "Frequency", value: "7.1", sub: "vs a 5.0 ceiling" },
        triggerLabel: "Creative fatigue", signal: "CTR -29%",
        metrics: [
          { label: "Frequency", value: "7.1", note: "vs 5.0 ceiling" },
          { label: "CTR", value: "-29%", note: "from stable baseline" },
          { label: "New cohorts", value: "Stable", note: "message still resonates" },
        ],
        trigger: "Watch when a creative's frequency exceeds the ceiling and CTR declines on the exposed audience.",
        steps: [
          "Rotate \"CFO Testimonial v3\" out of the enterprise audience today",
          "Brief two fresh variants on the same message for the enterprise audience",
          "Cap frequency at 4.5 on the new variant and auto-rotate the next when it hits the ceiling",
        ],
        derivation: [
          "Current frequency on \"CFO Testimonial v3\": `7.1` vs a `5.0` ceiling.",
          "CTR change from the stable baseline: `-29%`.",
          "Consecutive check-ins showing decline: `3`.",
          "Newer-cohort response: stable; execution fatigued, not the message.",
        ],
      }),
      wrapRec({
        category: "Growth experiment", iconKey: "scale", severity: "watch", tier: 3, age: "Day 5",
        title: "Turn the CFO engagement signal into a controlled paid test.",
        tldr: "Finance leaders show 14% higher CTR and 2.3x MQL-to-opp on the evidence-trail message but have never been run as their own campaign.",
        cause: "Finance leaders (Head of Finance, VP Finance, CFO at 500-5,000-employee firms) show 14% higher CTR and 2.3x MQL-to-opp conversion on the \"evidence trail\" message versus the general enterprise segment. This segment has not been run as its own isolated campaign yet.",
        body: "The signal is strong enough to justify a bounded test, not yet strong enough to shift broad budget.",
        evidence: "+14% CTR and 2.3x MQL-to-opp for the CFO-finance segment, $6K test ceiling over 4 weeks, -25% CTR stop rule set before launch.",
        impact: { label: "Test budget", value: "$6K", sub: "fixed ceiling, 4-week window" },
        triggerLabel: "Growth experiment", signal: "2.3x MQL-opp",
        metrics: [
          { label: "Test budget", value: "$6K", note: "fixed ceiling" },
          { label: "Window", value: "4 wk", note: "measurement period" },
          { label: "Stop rule", value: "Set", note: "before launch" },
        ],
        trigger: "Watch when a promising segment, message, or channel deserves a bounded, controlled test.",
        steps: [
          "Launch a new campaign targeting the CFO-Finance segment only, using the \"evidence trail\" message, capped at $6K over 4 weeks",
          "Track qualified pipeline against a matched control period",
          "Check CTR weekly; if it drops more than 25% below baseline for 2 straight weeks, pause early",
        ],
        derivation: [
          "CFO-finance segment CTR: `+14%` vs general enterprise.",
          "MQL-to-opp conversion on the segment: `2.3x` general enterprise.",
          "Test budget ceiling: `$6K` over a `4-week` window.",
          "Stop rule set before launch: `-25%` CTR for `2` consecutive weeks.",
        ],
      }),
    ], [
      { category: "Budget pacing", action: "acted", hoursAgo: 216, reason: "Restored CIO Brand Search - Enterprise to its four-week baseline and moved the $1.7K/wk surplus into enterprise retargeting." },
      { category: "Forecasting", action: "acted", hoursAgo: 264, reason: "Allocated the new $30K/mo budget: $18K to enterprise retargeting, $8K reserved for high-intent search, $4K held for a CFO creative test." },
    ]),
    checkedAgoHours: 2,
    notes: [
      { text: "Finance wants us on a 5% efficiency path this quarter. Weight recommendations toward Salesforce CPL, not platform CPL.", at: "2d ago" },
    ],
  }),

  // ── Populate-only paid-media goals for a realistic list. Not part of the guided
  //    flow (no live recommendations); they just give the Objectives tab context. ──
  makeGoal({
    name: "Grow paid-sourced qualified pipeline to $1.5M",
    statement: "Grow paid-sourced qualified pipeline to $1.5M and hold paid win rate above 25% by Sep 30",
    target: "$1.5M",
    targets: [
      { label: "Grow paid-sourced qualified pipeline to $1.5M by Sep 30", target: "$1.5M", current: "$0.94M", met: false, why: "Paid-sourced qualified pipeline sits at $0.94M; $1.5M gives 3× coverage on the $500K paid new-ARR target for the quarter." },
      { label: "Hold paid-sourced win rate at or above 25%", target: "≥25%", current: "29%", met: true, why: "Trailing-90-day win rate on paid-sourced deals is 29%; staying above 25% is what converts the pipeline into target." },
    ],
    conditions: [
      { label: "Paid-sourced qualified pipeline created this week below the weekly pace to hit $1.5M", description: "Leading indicator for the quarter: if weekly paid-sourced pipeline creation drops below the run-rate needed to reach $1.5M, the target is slipping before it shows up in the total." },
      { label: "Win rate on paid-sourced closed deals in the last 30 days dips under 25%", description: "Protects conversion quality as paid volume grows: a falling win rate means more pipeline is needed to hit the same number." },
    ],
  }),
  makeGoal({
    name: "Keep paid budget pacing within 5% of the $100k monthly plan",
    statement: "Keep total paid-media spend pacing within 5% of the $100k monthly plan",
    target: "±5%",
    targets: [
      { label: "End the month within 5% of the $100k plan", target: "±5%", current: "+7% projected", met: false, why: "At the current daily pace, paid spend is projected to finish 7% over the $100k plan." },
    ],
    conditions: [
      { label: "Projected end-of-month paid spend drifts more than 5% from plan", description: "Catches pacing drift early: if the end-of-month projection moves outside ±5% of the $100k plan, there's still time to smooth or reallocate before the cap is breached." },
    ],
  }),
  makeGoal({
    name: "Cut paid cost per qualified opportunity below $2,400",
    statement: "Bring paid cost per qualified opportunity under $2,400 without losing opportunity volume",
    target: "<$2,400",
    targets: [
      { label: "Bring paid cost per qualified opportunity under $2,400", target: "<$2,400", current: "$2,910", met: false, why: "Trailing paid cost per qualified opportunity is $2,910; $2,400 keeps paid payback under 12 months at current close rates." },
      { label: "Hold paid opportunity volume within 10% of plan", target: "±10%", current: "on plan", met: true, why: "A lower cost per opportunity can't come from simply buying fewer, cheaper opportunities." },
    ],
    conditions: [
      { label: "Trailing paid cost per qualified opportunity rises above $2,400", description: "The efficiency guardrail: once trailing paid cost per qualified opportunity climbs past $2,400, paid payback slips beyond 12 months — a signal to review channel allocation." },
    ],
  }),
  makeGoal({
    name: "Lift paid coverage of named ICP accounts to 70%",
    statement: "Reach 70% of named ICP accounts with paid without inflating frequency",
    target: "70%",
    targets: [
      { label: "Reach 70% of named ICP accounts with paid this quarter", target: "70%", current: "58%", met: false, why: "58% of named ICP accounts have paid coverage; 70% closes the gap on high-intent accounts with no paid touch." },
      { label: "Keep average frequency under 6 on covered accounts", target: "<6", current: "4.8", met: true, why: "Coverage can't come at the cost of over-serving the same accounts into fatigue." },
    ],
    conditions: [
      { label: "A block of high-intent ICP accounts has no paid coverage", description: "Finds demand you're leaving on the table: named ICP accounts showing intent with zero paid touch are the cheapest coverage to add." },
    ],
  }),
  makeGoal({
    name: "Prove incremental lift on retargeting before scaling",
    statement: "Run a controlled holdout to prove retargeting drives incremental pipeline before scaling its budget",
    target: "≥15% lift",
    targets: [
      { label: "Show ≥15% incremental pipeline lift vs a matched holdout", target: "≥15%", current: "test running", met: false, why: "Retargeting reports strong attribution, but many reached accounts are already active in CRM; a holdout separates incremental from attributed." },
    ],
    conditions: [
      { label: "Retargeting reach overlaps heavily with already-active CRM accounts", description: "The incrementality risk: when most reached accounts already have open pipeline, attributed credit overstates the true incremental effect until a holdout proves otherwise." },
    ],
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
        confidence: rec.confidence || null, disposition: rec.disposition || null,
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

export function updateGoal(id, patch = {}) {
  const g = find(id);
  if (!g) return { detail: "not found" };
  if (typeof patch.name === "string" && patch.name.trim()) g.name = patch.name.trim();
  if (typeof patch.statement === "string") g.statement = patch.statement.trim();
  return { goal: getGoal(id) };
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
      `${recs.length} recommendations across your high-value pipeline, ${recs.filter((r) => r.severity === "act-now").length} need action now, the rest are worth watching. Start with the stale $275K deal whose close date is 198 days overdue.`,
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
