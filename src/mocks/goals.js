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
        category: "Spend efficiency", iconKey: "spend", severity: "act-now", tier: 1, age: "New · day 1",
        title: "LinkedIn CPL is running 21% above baseline",
        tldr: "Cap LinkedIn while trailing Salesforce CPL is high and attributed lead output is below pace.",
        cause: "Trailing 7-day CPL is $1,140 after $3.9K spend, above the $940 baseline, with Salesforce leads below pace.",
        body: "This is not a single-day spike. LinkedIn has spent above expected pace across the trailing 7-day window while Salesforce-attributed lead output has stayed soft. A modest cap is safer than a full pause because downstream quality could still justify some variance.",
        evidence: "LinkedIn spent $3.9K in the trailing 7 days and produced 3 Salesforce-attributed leads, putting trailing CPL at $1,140 versus the $940 90-day baseline.",
        impact: { label: "Inefficient spend / wk", value: "$2.4K", sub: "cap or review before next check-in" },
        triggerLabel: "Spend efficiency", signal: "$1,140 CPL",
        metrics: [
          { label: "Trailing CPL", value: "$1,140", note: "vs $940 baseline" },
          { label: "Spend (7d)", value: "$3.9K", note: "LinkedIn" },
          { label: "SF leads", value: "3", note: "below pace" },
        ],
        trigger: "Trigger daily when trailing 7-day CPL is above the 90-day channel baseline after $1,500 spend and a 3-day lookback.",
        steps: [
          "Cap LinkedIn daily budget by 12% until trailing 7-day CPL returns toward ~$893",
          "Review campaigns with at least $1,500 spend and fewer than expected Salesforce leads",
          "Recheck blended Salesforce CPL after the next 3-day lookback before shifting more budget",
        ],
        derivation: [
          "LinkedIn trailing 7-day spend is `$3.9K` with `3 Salesforce-attributed leads`.",
          "Trailing CPL is `$1,140` versus the 90-day baseline of `$940`.",
          "The channel is above the minimum spend threshold and has a full `7-day` lookback.",
          "Salesforce lead joins were verified against paid campaign spend and click activity.",
        ],
      }),
      wrapRec({
        category: "CPL drift", iconKey: "fatigue", severity: "watch", tier: 2, age: "Day · 6h ago",
        title: "Meta CPL is above its 90-day baseline",
        tldr: "Keep Meta under observation until the minimum lookback confirms whether the drift persists.",
        cause: "Meta trailing 7-day Salesforce CPL is $525 versus a $482 baseline; the lookback isn't complete yet.",
        body: "Meta is the right watch item for this check-in: the trailing signal is moving in the wrong direction, but the evidence is not strong enough to recommend a pause. Holding the channel steady protects lead flow while preventing a single-day reaction.",
        evidence: "Meta trailing 7-day Salesforce CPL is $525 versus a $482 baseline, while spend and attributed lead output are stable enough to wait for confirmation.",
        impact: { label: "CPL variance", value: "$525 CPL", sub: "8.9% above the Meta baseline" },
        triggerLabel: "CPL drift", signal: "+8.9% vs base",
        metrics: [
          { label: "Trailing CPL", value: "$525", note: "vs $482 baseline" },
          { label: "Target CPL", value: "~$458", note: "5% improvement" },
          { label: "Lookback", value: "Incomplete", note: "hold to confirm" },
        ],
        trigger: "Watch when trailing 7-day Salesforce CPL is above the 90-day baseline but minimum spend and lookback thresholds are not yet met.",
        steps: [
          "Keep Meta live while the 3-day confirmation window completes",
          "Review ad sets above $1,500 trailing spend for lead quality, not platform CPL alone",
          "Cap only if Salesforce CPL remains above the ~$458 target after the lookback",
        ],
        derivation: [
          "Meta trailing 7-day Salesforce CPL is `$525` versus a `$482` baseline.",
          "The target for the 5% efficiency improvement is approximately `$458`.",
          "Spend and Salesforce-attributed lead output remain within the expected range.",
          "The minimum lookback is not yet complete for an automatic cap recommendation.",
        ],
      }),
      wrapRec({
        category: "Query waste", iconKey: "query", severity: "act-now", tier: 2, age: "Closed · Jul 7",
        title: "Broad-match Search bought off-intent queries",
        tldr: "Closed after 34 negative keywords were added and two ad groups were tightened.",
        cause: "Broad-match Search matched a rising share of off-intent queries with no Salesforce lead intent.",
        body: "Broad match was buying clicks that never became Salesforce-attributed leads. Adding negatives and tightening two ad groups recovered the wasted spend.",
        evidence: "Recovered $2.6K of trailing spend after 34 negative keywords and two ad-group tightenings.",
        impact: { label: "Recorded impact", value: "$2.6K", sub: "recovered spend" },
        triggerLabel: "Query waste", signal: "Acted Jul 7",
        metrics: [
          { label: "Recovered", value: "$2.6K", note: "trailing spend" },
          { label: "Negatives added", value: "34", note: "" },
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
        evidence: "Capped the low-converting PMax and Demand Gen campaigns after $3.4K of inefficient spend.",
        impact: { label: "Recorded impact", value: "$3.4K", sub: "redeployed" },
        triggerLabel: "Demo efficiency", signal: "Closed Jul 5",
        metrics: [
          { label: "Redeployed", value: "$3.4K", note: "" },
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
      { category: "Query waste", action: "acted", hoursAgo: 216, reason: "Added 34 negative keywords across the broad-match ad groups and tightened two to phrase match." },
      { category: "Demo efficiency", action: "acted", hoursAgo: 264, reason: "Capped the two low-converting PMax and Demand Gen campaigns and redeployed the budget." },
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
