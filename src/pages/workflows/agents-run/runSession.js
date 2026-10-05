import { FILES, RUN_LABEL, RUN_SESSION_ID, WORKFLOW_NAME } from "./data";
import useRunReviewStore from "./useRunReviewStore";

/* The mock chat session a workflow run lives in.
   The review of a run is not a separate screen: it is the session the agents
   ran in, opened in the normal chat workspace. This module supplies what the
   workspace asks a backend for: the session, its history, its files, and the
   replies when the reviewer carries on the conversation. */

const RUN_T0 = new Date("2026-10-01T06:00:00").getTime();
const min = (n) => RUN_T0 + n * 60000;

export const RUN_SESSION = {
  session_id: RUN_SESSION_ID,
  name: `${WORKFLOW_NAME} · ${RUN_LABEL}`,
  session_type: "workflow_run",
  status: "active",
  provider: "anthropic",
  created_at: new Date(RUN_T0).toISOString(),
  updated_at: new Date(min(4)).toISOString(),
  last_active_at: new Date(min(4)).toISOString(),
  turn_count: 5,
  total_tokens: 61200,
  context_tokens: 61200,
  agent_running: false,
};

// ── History: one turn per agent ───────────────────────────────────────────
const tools = (list) => list.map(([tool, input_summary]) => ({ type: "tool_call", tool, input_summary }));
const wrote = (...paths) => ({ type: "outputs", outputs: paths.map((path) => ({ path, title: path.split("/").pop() })) });

export const RUN_HISTORY = [
  { type: "refresh_divider", text: "Measurement agent done · dashboard published, HubSpot updated · agents started", timestamp: RUN_T0 },

  { type: "agent_turn", n: 1, duration: "1m 12s", name: "Performance analysis", kind: "reasoning", model: "Standard",
    outcome: "Worked out spend, leads and cost per lead for 6 campaigns" },
  ...tools([
    ["query_athena", "Daily spend and leads per campaign, last 14 days"],
    ["query_athena", "Daily budget caps and the time each cap was reached"],
    ["execute_code", "Cost per lead per campaign over 7 and 14 days"],
    ["execute_code", "Campaigns capped on 5 or more of the last 7 days"],
    ["execute_code", "Totals against the $60 cost-per-lead target"],
    ["write_file", "agent_memo/analysis.md"],
    ["write_file", "agent_memo/campaign_metrics.csv"],
  ]),
  { type: "assistant", timestamp: min(1), text:
    "Spend was **$6,420** for **96 leads**, $67 per lead against a $60 target.\n\n- **Q4 Demand Gen – CFOs** is the most efficient campaign at $41 per lead, and it hits its daily cap most days.\n- **Retargeting – Pricing page visitors** is at $212 per lead with 2 leads in 14 days.\n- **ABM – Tier 1 accounts** has 33 leads at $60 per lead." },
  wrote("agent_memo/analysis.md", "agent_memo/campaign_metrics.csv"),

  { type: "agent_turn", n: 2, duration: "2m 05s", name: "Verify the numbers", kind: "reasoning", model: "Pro", startsWith: "agent 1",
    outcome: "Recomputed everything from the raw data",
    corrections: [
      { verb: "Corrected", whom: "Performance analysis", what: "ABM – Tier 1 accounts", from: "33 leads · $60 per lead", to: "31 leads · $64 per lead",
        why: "Step 4 counted two leads twice after a re-import on Sep 28. It fixed that one step and re-ran only the 3 steps that depend on it." },
    ] },
  ...tools([
    ["read_file", "agent_memo/analysis.md (tagged)"],
    ["read_file", "agent_memo/campaign_metrics.csv (tagged)"],
    ["list_files", "agent_steps"],
    ["query_athena", "Lead rows per campaign from the raw daily data"],
    ["list_files", "my_workflows/linkedin-campaign-health · last 4 runs"],
    ["edit_file", "agent_steps/04_leads_by_campaign/code.py"],
    ["replay_downstream", "04_leads_by_campaign · 3 steps re-run"],
    ["write_file", "agent_memo/corrections.md"],
  ]),
  { type: "assistant", timestamp: min(2), text:
    "I recomputed the analysis above from the raw data and compared it with the last 4 runs.\n\n**One correction.** Step 4 counted two ABM – Tier 1 leads twice after a re-import on Sep 28. I fixed that step and replayed the 3 steps that depend on it, so nothing else was redone. ABM – Tier 1 now has **31 leads at $64**, not 33 at $60. Totals are 94 leads and $68 per lead.\n\nThe other five campaigns match to the dollar." },
  wrote("agent_memo/corrections.md", "agent_steps/04_leads_by_campaign/code.py"),

  { type: "agent_turn", n: 3, duration: "1m 40s", name: "Budget and bids", kind: "recommendation", model: "Standard", startsWith: "agents 1–2",
    outcome: "Drafted 5 changes to budgets, bids and status" },
  ...tools([
    ["read_file", "agent_memo/campaign_metrics.csv (tagged)"],
    ["read_file", "uploads/paid_media_playbook.pdf (tagged)"],
    ["read_file", "context/skills/linkedin-ads/SKILL.md"],
    ["read_file", "recommendations/recommendations.json"],
    ["recommendation", "create · Raise daily budget on Q4 Demand Gen – CFOs"],
    ["recommendation", "create · Raise daily budget on Brand – Finance leaders"],
    ["recommendation", "create · Pause Retargeting – Pricing page visitors"],
    ["recommendation", "update · Lower bid on ABM – Tier 1 accounts"],
    ["recommendation", "create · Brief the agency on a new offer"],
  ]),
  { type: "assistant", timestamp: min(3), text:
    "Using the corrected numbers, I drafted 5 changes:\n\n1. Raise the CFO campaign's daily budget from $50 to $90.\n2. Raise the Brand campaign's daily budget to $70.\n3. Pause the Pricing page retargeting campaign.\n4. Lower the ABM Tier 1 bid to $15.50. This updates the bid recommendation already on the page.\n5. Following your playbook, an advice-only note to brief the agency on a new offer before the paused campaign restarts." },
  wrote("agent_memo/reasoning.md", "agent_memo/capped_campaigns.csv"),

  { type: "agent_turn", n: 4, duration: "58s", name: "Audience and targeting", kind: "recommendation", model: "Standard", startsWith: "agents 1–3",
    outcome: "Drafted 1 targeting change" },
  ...tools([
    ["query_athena", "Spend and qualified leads by company size, 30 days"],
    ["write_file", "agent_memo/spend_by_company_size.csv"],
    ["recommendation", "create · Exclude company size 1–10 from ABM – Tier 2"],
  ]),
  { type: "assistant", timestamp: min(3.5), text:
    "Budget and bids are covered above, so I looked only at audiences. Companies with 1–10 employees take **22% of ABM Tier 2 spend** and produced no qualified leads in 30 days. I drafted one targeting change to exclude them." },
  wrote("agent_memo/spend_by_company_size.csv"),

  { type: "agent_turn", n: 5, duration: "41s", name: "Final check", kind: "recommendation", model: "Pro", startsWith: "agents 1–4",
    outcome: "Checked 6 drafts against the guidance and past decisions",
    corrections: [
      { verb: "Lowered", whom: "Budget and bids", what: "Daily budget on Q4 Demand Gen – CFOs", from: "$90", to: "$80",
        why: "The LinkedIn Ads guidance allows a raise of at most 60% in one step." },
      { verb: "Removed", whom: "Budget and bids", what: "Budget raise on Brand – Finance leaders",
        why: "Priya rejected the same advice on Sep 23: “Do not touch brand campaign budgets this quarter.”" },
      { verb: "Proposed removing", what: "Extend end date of Webinar – October group",
        why: "The webinar has finished." },
    ] },
  ...tools([
    ["read_file", "context/skills/linkedin-ads/SKILL.md"],
    ["read_file", "recommendations/draft.json"],
    ["recommendation", "update · daily budget $90 → $80"],
    ["recommendation", "delete · Raise daily budget on Brand – Finance leaders"],
    ["recommendation", "propose removal · Webinar – October group"],
    ["write_file", "agent_memo/check.md"],
  ]),
  { type: "assistant", timestamp: min(4), text:
    "I checked the six drafts against the LinkedIn guidance, this month's budget, and what your team decided before.\n\n- **Lowered** the CFO campaign's daily budget from $90 to $80. The LinkedIn Ads guidance allows a raise of at most 60% in one step.\n- **Removed** the Brand budget raise. Priya rejected the same advice on Sep 23: “Do not touch brand campaign budgets this quarter.”\n- **Proposed removing** “Extend end date of Webinar – October group”. The webinar has finished.\n\nThe draft now has **6 changes**: four new, one update to an existing recommendation, and one removal." },
  wrote("agent_memo/check.md", "agent_memo/lineage.md"),

  { type: "refresh_divider", text: "You opened this run for review · the conversation above carries on", timestamp: 0 },
];

// ── Files ─────────────────────────────────────────────────────────────────
// `collapsed` keeps a folder closed when the tray first opens: a reviewer mostly
// needs what the agents wrote, not the plumbing around it.
const dir = (path, hint, collapsed = true) => ({ name: path.split("/").pop(), path, type: "directory", content_type: "folder", hint, collapsed });
const typeOf = (path) => (path.endsWith(".csv") ? "csv" : path.endsWith(".html") ? "html" : path.endsWith(".json") ? "json" : "markdown");
const file = (path) => ({ name: path.split("/").pop(), path, type: "file", content_type: typeOf(path) });

export const DASHBOARD_PATH = "output/dashboard/linkedin_campaign_health.html";

// A flat list, as the workspace tray expects. What the agents wrote comes first.
export const RUN_FILES = [
  dir("agent_memo", "What the agents wrote", false),
  ...["analysis.md", "campaign_metrics.csv", "corrections.md", "reasoning.md", "capped_campaigns.csv", "spend_by_company_size.csv", "check.md", "lineage.md"].map((n) => file(`agent_memo/${n}`)),
  dir("agent_steps", "What each agent ran"),
  dir("agent_steps/04_leads_by_campaign"),
  file("agent_steps/04_leads_by_campaign/code.py"),
  dir("output"),
  dir("output/dashboard"),
  file(DASHBOARD_PATH),
  dir("data"),
  file("data/campaign_daily.csv"),
  dir("uploads", "Saved with the workflow"),
  file("uploads/paid_media_playbook.pdf"),
  dir("my_workflows", "Earlier runs, other workflows"),
  file("my_workflows/workflows_index.md"),
];

// Which entry of FILES backs each path.
const PATH_KEY = {
  "agent_memo/analysis.md": "summary",
  "agent_memo/campaign_metrics.csv": "metrics",
  "agent_memo/corrections.md": "corrections",
  "agent_memo/reasoning.md": "analysis",
  "agent_memo/capped_campaigns.csv": "capped",
  "agent_memo/spend_by_company_size.csv": "sizes",
  "agent_memo/check.md": "check",
  "agent_memo/lineage.md": "lineage",
  "agent_memo/pricing_page_leads.csv": "leads",
  "agent_steps/04_leads_by_campaign/code.py": "stepcode",
  "data/campaign_daily.csv": "daily",
  "uploads/paid_media_playbook.pdf": "playbook",
  "my_workflows/workflows_index.md": "index",
};

// The file notes are stored as small HTML snippets; the workspace's viewer
// renders Markdown.
const toMarkdown = (html) =>
  html
    .replace(/<h4>(.*?)<\/h4>/g, "### $1\n\n")
    .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
    .replace(/<ul>/g, "").replace(/<\/ul>/g, "\n")
    .replace(/<li>(.*?)<\/li>/g, "- $1\n")
    .replace(/<br\s*\/?>/g, "  \n")
    .replace(/<\/?b>/g, "**")
    .replace(/<\/?i>/g, "*")
    .replace(/<\/?code>/g, "`")
    .trim();

// File body for the raw viewers (Markdown, HTML). Null when the path is unknown.
export function runFileContent(path) {
  const f = FILES[PATH_KEY[path]];
  if (!f) return null;
  if (f.md) return { content: toMarkdown(f.md), contentType: "text/markdown" };
  return { content: [f.table.h, ...f.table.r].map((r) => r.join(",")).join("\n"), contentType: "text/csv" };
}

// Rows for the table viewer. Built from the table itself, because values such
// as "$1,980" would not survive a comma split.
export function runFileTable(path) {
  const f = FILES[PATH_KEY[path]];
  if (!f?.table) return null;
  return { columns: f.table.h, rows: f.table.r, total_rows: f.table.r.length, total_pages: 1, page: 1, page_size: 50 };
}

// ── Carrying on the conversation ──────────────────────────────────────────
const ASKS = {
  why: "Why $80 on the CFO campaign?",
  set70: "Make it $70",
  leads: "Show me the leads behind the Pricing page campaign",
  drop: "Keep the webinar recommendation, events team still needs it",
};
const asked = {};

const chip = (question) => ({ question, grounded_in: WORKFLOW_NAME, grounded_type: "workflow run" });
// Offered when the run is opened. Once the reviewer has said anything, the
// conversation has moved on and none are offered again.
let spoken = false;
export const runFollowups = () =>
  useRunReviewStore.getState().outcome || spoken ? [] : Object.keys(ASKS).map((k) => chip(ASKS[k]));

function matchAsk(text) {
  const t = (text || "").toLowerCase();
  if (/\b70\b/.test(t)) return "set70";
  if (/lead|pricing/.test(t)) return "leads";
  if (/removal|rec-09|webinar|events/.test(t)) return "drop";
  if (/why|80|cfo/.test(t)) return "why";
  return null;
}

// What the agent does and says for each ask. `effect` runs when it has finished.
const REPLIES = {
  why: {
    tools: [["read_file", "agent_memo/capped_campaigns.csv"], ["read_file", "context/skills/linkedin-ads/SKILL.md"]],
    text: "The campaign reached its $50 cap by about 2 pm on 6 of the last 7 days while running at $41 per lead, well under the $60 target. So it can take more budget.\n\nBudget and bids first proposed **$90**. The final check lowered it to **$80**, because the LinkedIn Ads guidance allows a raise of at most 60% in one step, and 60% on top of $50 is $80.\n\nThe days and cap times are in `capped_campaigns.csv`.",
    outputs: ["agent_memo/capped_campaigns.csv"],
  },
  set70: {
    tools: [["recommendation", "update · daily budget $80 → $70"]],
    text: "Done. The draft now proposes a daily budget of **$70** for the CFO campaign, a 40% raise. LinkedIn's check says spend can rise by up to $20 a day.\n\nThe card in **Changes** is updated and marked as edited in review.",
    effect: () => {
      const s = useRunReviewStore.getState();
      s.editValue("REC-21", "$70", "LinkedIn check: spend can rise by up to $20 a day.");
      s.requestOpen({ path: "run://changes" });
    },
  },
  leads: {
    tools: [["query_athena", "Leads from Retargeting – Pricing page visitors, last 14 days"], ["write_file", "agent_memo/pricing_page_leads.csv"]],
    text: "I queried the lead table for that campaign over the last 14 days and saved the result as `pricing_page_leads.csv`.\n\nThere are **2 leads**. One was disqualified as a student, and one is still open. That supports pausing the campaign.",
    outputs: ["agent_memo/pricing_page_leads.csv"],
    before: () => {
      if (!RUN_FILES.some((f) => f.path === "agent_memo/pricing_page_leads.csv")) {
        const at = RUN_FILES.findIndex((f) => f.path === "agent_memo/lineage.md");
        RUN_FILES.splice(at + 1, 0, file("agent_memo/pricing_page_leads.csv"));
      }
    },
    effect: () =>
      useRunReviewStore.getState().requestOpen({ path: "agent_memo/pricing_page_leads.csv", title: "pricing_page_leads.csv", contentType: "csv" }),
  },
  drop: {
    tools: [["recommendation", "keep · Webinar – October group stays on the board"]],
    text: "Understood. I've dropped that removal. The webinar recommendation stays on hold on the board with Arun's note. The draft now has one change fewer.",
    effect: () => {
      const s = useRunReviewStore.getState();
      s.leaveOut("REC-09");
      s.requestOpen({ path: "run://changes" });
    },
  },
};

const FALLBACK = {
  tools: [],
  text: "I can explain any number in this run, change a drafted value, or pull more evidence. For example, ask why a budget is what it is, tell me to change it, or ask to see the leads behind a campaign. `lineage.md` lists what each agent read and wrote.",
};

// Streams the reply the way the live agent does: tool calls, then the text
// word by word, then `done`.
export function scriptRunReply(emit, userText) {
  const channel = `session-${RUN_SESSION_ID}`;
  const key = matchAsk(userText);
  const r = (key && REPLIES[key]) || FALLBACK;
  if (key) asked[key] = true;
  spoken = true;
  r.before?.();

  let at = 300;
  r.tools.forEach(([tool, input]) => {
    const t0 = at;
    setTimeout(() => emit(channel, "agent-event", { type: "tool_call", tool, input }), t0);
    setTimeout(() => emit(channel, "agent-event", { type: "tool_result", tool, result_length: 120 }), t0 + 380);
    at += 450;
  });
  at += 200;
  const words = r.text.split(" ");
  words.forEach((w, i) => {
    setTimeout(() => emit(channel, "agent-event", { type: "text", content: (i === 0 ? "" : " ") + w }), at + i * 18);
  });
  at += words.length * 18 + 150;
  setTimeout(() => {
    r.effect?.();
    emit(channel, "agent-event", {
      type: "done",
      context_tokens: 62000,
      turn_count: 6 + Object.keys(asked).length,
      ...(r.outputs ? { outputs: r.outputs.map((path) => ({ path, title: path.split("/").pop() })) } : {}),
    });
    emit(channel, "agent-event", { type: "suggested-questions", questions: [] });
  }, at);
}
