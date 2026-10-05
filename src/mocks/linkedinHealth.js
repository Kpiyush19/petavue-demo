// The LinkedIn Campaign Health report: what the Home chat builds, what Verify &
// Publish turns into a workflow, and what that workflow's agents then reason
// about. One example carried from the first question to the approved
// recommendation. The numbers match the run in pages/workflows/agents-run.

import { PMR_CSS } from "./dashboardAssets";
import { DASH_ROWS, FILES } from "../pages/workflows/agents-run/data";

export const LCH_TITLE = "LinkedIn Campaign Health";
export const LCH_DASHBOARD_PATH = "output/dashboard/linkedin_campaign_health.html";
export const LCH_REPORT_SESSION_ID = "linkedin-campaign-health";
// The one question this chat answers. Whatever is typed on Home, this is what
// is sent, so the reply always matches the question on screen.
export const LCH_PROMPT = "How are our LinkedIn campaigns doing against the $60 cost-per-lead target? Show me where we're over and where we could spend more.";

const TARGET = 60;
const money = (s) => +s.replace(/[$,]/g, "");

// ── Dashboard ─────────────────────────────────────────────────────────────
const KPIS = [
  { label: "Spend · 7 days", value: "$6,420", sub: "6 live campaigns" },
  { label: "Leads", value: "94", sub: "22 qualified in 30 days" },
  { label: "Cost per lead", value: "$68", sub: "$8 over the $60 target", hl: true },
  { label: "Capped campaigns", value: "1", sub: "Hits its daily cap 6 of 7 days" },
];

const kpis = KPIS.map((k) => `<div class="kpi${k.hl ? " kpi--hl" : ""}"><div class="kpi-lbl">${k.label}</div><div class="kpi-val">${k.value}</div><div class="kpi-sub">${k.sub}</div></div>`).join("");

const campaignRows = DASH_ROWS.map(([name, spend, leads, cpl]) => {
  const diff = money(cpl) - TARGET;
  const pill = diff <= 0
    ? `<span class="delta delta-up">$${Math.abs(diff)} under</span>`
    : `<span class="delta delta-down">$${diff} over</span>`;
  return `<tr><td>${name}</td><td class="num">${spend}</td><td class="num">${leads}</td><td class="num"><b>${cpl}</b></td><td class="num">${pill}</td></tr>`;
}).join("");

const tableRows = (t) => t.r.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("");
const tableHead = (t) => t.h.map((h, i) => `<th${i ? ' class="num"' : ""}>${h}</th>`).join("");

const SEC_HEADER = `
    <div class="hero">
      <div class="hero-top">
        <h1>${LCH_TITLE}</h1>
        <div class="hero-pills">
          <span class="pill">◎ Target: $60 cost per lead</span>
          <span class="pill">🗓 Last 7 days · refreshed Oct 1, 6:00 am</span>
        </div>
      </div>
      <p class="hero-sub">Spend, leads and cost per lead for every LinkedIn Ads campaign, measured against HubSpot leads, not LinkedIn's own conversions.</p>
      <div class="kpis">${kpis}</div>
    </div>`;

const SEC_CAMPAIGNS = `
    <div class="section section--solid">
      <span class="eyebrow">02 · Cost per lead by campaign</span>
      <h2>One campaign is well under target. One is more than three times over.</h2>
      <p class="section-sub">Each lead is counted once, from HubSpot. The target is <b>$60 per lead</b>.</p>
      <table class="tbl">
        <thead><tr><th>Campaign</th><th class="num">Spend · 7d</th><th class="num">Leads</th><th class="num">Cost per lead</th><th class="num">Against target</th></tr></thead>
        <tbody>${campaignRows}</tbody>
      </table>
      <div class="callout">"Q4 Demand Gen – CFOs" is the most efficient campaign at $41 per lead. "Retargeting – Pricing page visitors" is at $212 per lead with 2 leads in 14 days.</div>
    </div>`;

const SEC_PACING = `
    <div class="section section--dashed">
      <span class="eyebrow">03 · Daily budget pacing</span>
      <h2>The best campaign runs out of budget by early afternoon</h2>
      <p class="section-sub">Campaigns that reached their daily cap in the last 7 days, and when.</p>
      <table class="tbl">
        <thead><tr>${tableHead(FILES.capped.table)}</tr></thead>
        <tbody>${tableRows(FILES.capped.table)}</tbody>
      </table>
      <div class="tbl-foot"><span>✓ <b>4 other campaigns</b> never reached their cap</span><span>No action needed</span></div>
    </div>`;

const SEC_SIZES = `
    <div class="section section--solid">
      <span class="eyebrow">04 · Spend by company size</span>
      <h2>Nearly a quarter of ABM Tier 2 spend goes to companies that never qualify</h2>
      <p class="section-sub">"ABM – Tier 2" spend split by the company size of the people reached, with qualified leads over 30 days.</p>
      <table class="tbl">
        <thead><tr>${tableHead(FILES.sizes.table)}</tr></thead>
        <tbody>${tableRows(FILES.sizes.table)}</tbody>
      </table>
      <div class="callout">Companies with 1–10 employees took 22% of spend and produced no qualified leads in 30 days.</div>
    </div>`;

const SEC_METHOD = `
    <div class="method">
      <div class="method-title">Method and limits</div>
      <ul>
        <li>Leads come from HubSpot and are counted once per person, even after a re-import.</li>
        <li>A qualified lead follows your Key Definition "Qualified lead".</li>
        <li>Cost per lead is 7-day spend divided by 7-day leads. Campaigns with fewer than 3 leads move a lot from day to day.</li>
        <li>Cap times are when LinkedIn reported the daily budget as spent, in your account's time zone.</li>
      </ul>
      <div class="method-foot"><span>Source: LinkedIn Ads + HubSpot</span><span>Window: 7 days · company size over 30 days</span></div>
    </div>`;

const doc = (inner) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${LCH_TITLE}</title>
<style>${PMR_CSS}
  .wrap{padding:20px;}</style>
</head><body><div class="wrap">${inner}</div></body></html>`;

export const LINKEDIN_HEALTH_HTML = doc(SEC_HEADER + SEC_CAMPAIGNS + SEC_PACING + SEC_SIZES + SEC_METHOD);

// The sections a creator verifies one by one in Verify & Publish.
const SECTIONS = [
  ["lch_scorecard", "Scorecard", SEC_HEADER, "data/campaign_daily.csv"],
  ["lch_campaigns", "Cost per lead by campaign", SEC_CAMPAIGNS, "data/campaign_daily.csv"],
  ["lch_pacing", "Daily budget pacing", SEC_PACING, "data/capped_campaigns.csv"],
  ["lch_sizes", "Spend by company size", SEC_SIZES, "data/spend_by_company_size.csv"],
  ["lch_method", "Method and limits", SEC_METHOD, "data/methodology.json"],
];

export const LCH_WIDGETS = SECTIONS.map(([id, name, , data_source]) => ({ id, file: `widgets/${id}.html`, name, data_source }));

// Files any session can open by path: the dashboard and its sections.
export const LCH_FILES = {
  [LCH_DASHBOARD_PATH]: { content: LINKEDIN_HEALTH_HTML, contentType: "text/html" },
  ...Object.fromEntries(SECTIONS.map(([id, , html]) => [`output/dashboard/widgets/${id}.html`, { content: doc(html), contentType: "text/html" }])),
};

// The workspace tray for a chat that built this report (a flat list).
const dir = (path) => ({ name: path.split("/").pop(), path, type: "directory", content_type: "folder" });
const file = (path, content_type) => ({ name: path.split("/").pop(), path, type: "file", content_type });
export const LCH_TREE = [
  dir("output"),
  dir("output/dashboard"),
  file(LCH_DASHBOARD_PATH, "html"),
  dir("data"),
  file("data/campaign_daily.csv", "csv"),
];

// ── The chat turn that builds it ──────────────────────────────────────────
// Thirteen tool calls, as in the product: find the sources, read them, compute.
export const LCH_TOOLS = [
  ["list_connectors", "Connected sources: LinkedIn Ads, HubSpot, Salesforce"],
  ["read_key_definitions", "Cost per lead, Qualified lead"],
  ["get_schema", "linkedin_ads_campaign_daily"],
  ["get_schema", "linkedin_ads_campaign_budget"],
  ["get_schema", "hubspot_leads"],
  ["get_schema", "salesforce_campaigns"],
  ["query_db", "Daily spend per campaign, last 14 days"],
  ["query_db", "HubSpot leads per campaign, counted once per person"],
  ["query_db", "Daily budget caps and the time each cap was reached"],
  ["query_db", "ABM – Tier 2 spend and qualified leads by company size, 30 days"],
  ["execute_code", "CPL per campaign against the $60 target"],
  ["render_dashboard", "Assemble the LinkedIn Campaign Health dashboard"],
  ["publish_artifact", `Publish ${LCH_DASHBOARD_PATH}`],
];

// Same voice and layout as the product's own agent: what it checked, as a
// source table with a status per source; the result; then the detail.
export const LCH_REPORT = `I pulled this together from your connected data. Here's an honest picture of where you stand:

### LinkedIn Campaign CPL Analysis — $8 Over Target

I checked every relevant data source in your workspace:

| Source | Status | What's There |
|---|---|---|
| \`linkedin_ads_campaign_daily\` | 🟢 Connected | Daily spend, 6 campaigns |
| \`linkedin_ads_campaign_budget\` | 🟢 Connected | Daily caps and cap times |
| \`hubspot_leads\` | 🟢 Connected | Leads by campaign |
| \`hubspot_companies\` | 🟢 Connected | Company size |
| \`salesforce_campaigns\` | 🟡 Connected, but sparse | Only id, name, parentid |

**The result:** In the last 7 days you spent **$6,420** on LinkedIn Ads for **94 leads**. That is a CPL of **$68** against your $60 target. Four campaigns are over, one is far over, and your best campaign is running out of budget every afternoon.

#### Where you're over

| Campaign | Spend | Leads | CPL | vs $60 target |
|---|---|---|---|---|
| Retargeting – Pricing page visitors | $424 | 2 | **$212** | 🔴 $152 over |
| Brand – Finance leaders | $1,310 | 18 | $73 | 🟡 $13 over |
| ABM – Tier 2 | $1,540 | 22 | $70 | 🟡 $10 over |
| Retargeting – Demo no-shows | $816 | 12 | $68 | 🟡 $8 over |
| ABM – Tier 1 accounts | $1,980 | 31 | $64 | 🟡 $4 over |

#### Where you could spend more

| Campaign | Spend | Leads | CPL | vs $60 target |
|---|---|---|---|---|
| Q4 Demand Gen – CFOs | $350 | 9 | **$41** | 🟢 $19 under |

**Q4 Demand Gen – CFOs** hits its $50 daily cap by about 2 pm on 6 of the last 7 days. It is your cheapest source of leads and it is switched off every afternoon.

#### What's driving the gap

- **Retargeting – Pricing page visitors** has produced 2 leads in 14 days. It is more than three times over target.
- **ABM – Tier 2** is leaking to small companies: companies with 1–10 employees took 22% of its spend and produced no qualified leads in 30 days.
- Leads are counted from HubSpot, once per person. LinkedIn's own conversion count is higher.

The full dashboard is published as **${LCH_TITLE}** in the artifact panel. If you want this refreshed every morning with agents drafting the budget and audience changes for you, open the dashboard's menu and choose **Verify & Publish**.`;

const chip = (question, grounded_in) => ({ question, grounded_in, grounded_type: "dashboard" });
export const LCH_FOLLOWUPS = [
  chip("Which campaigns hit their daily cap, and what is that costing us?", "Daily budget pacing"),
  chip("Why is the Pricing page retargeting campaign so expensive?", "Cost per lead by campaign"),
  chip("Which company sizes take spend without producing qualified leads?", "Spend by company size"),
];

const REPLIES = [
  [/cap/, "Only one campaign is really capped: **Q4 Demand Gen – CFOs** reached its $50 daily budget on 6 of the last 7 days, on average at 1:52 pm. It is your cheapest source of leads at $41, so every afternoon it is switched off you are buying leads elsewhere at $64 to $73. ABM – Tier 1 hit its cap once, at 6:10 pm, which is not a constraint."],
  [/pricing|retarget|expensive/, "**Retargeting – Pricing page visitors** spent $424 for 2 leads in 14 days, so $212 per lead. The audience is small and has seen the same offer for weeks. Of the 2 leads, one was disqualified as a student and one is still open. It is a candidate to pause until there is a new offer."],
  [/company|size|qualified|segment|audience/, "In **ABM – Tier 2**, companies with 1–10 employees took 22% of spend and produced no qualified leads in 30 days. Companies with 51–200 and 201+ employees produced 9 qualified leads each from 31% and 29% of spend. Excluding the 1–10 band would move that spend to the sizes that convert."],
];
const FALLBACK = "I can break that down from the campaign data. The dashboard on the right has cost per lead by campaign, daily budget pacing and spend by company size. Ask about any of them, or choose **Verify & Publish** from the dashboard's menu to run this every morning with agents.";

export const lchReply = (text) => (REPLIES.find(([re]) => re.test((text || "").toLowerCase())) || [null, FALLBACK])[1];
