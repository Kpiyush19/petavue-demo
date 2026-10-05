import { FILES, RUN_LABEL, RUN_SESSION_ID, WORKFLOW_NAME } from "./data";
import useRunReviewStore from "./useRunReviewStore";

/* The mock chat session a workflow run lives in.
   The review of a run is not a separate screen: it is the session the agents
   ran in, opened in the normal chat workspace. This module supplies what the
   workspace asks a backend for: the session, its history, its files, and the
   replies when the reviewer carries on the conversation. */

const RUN_T0 = new Date("2026-10-05T06:00:00").getTime();
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
  { type: "refresh_divider", text: "Measurement agent done · dashboard published · agents started", timestamp: RUN_T0 },

  { type: "agent_turn", n: 1, duration: "1m 12s", name: "Channel ROI analysis", kind: "reasoning", model: "Standard",
    outcome: "Worked out spend, closed-won revenue and true ROAS for 3 channels" },
  ...tools([
    ["query_athena", "Spend per channel and campaign, last 90 days"],
    ["query_athena", "Closed-won opportunities with a paid lead source"],
    ["execute_code", "True ROAS per channel, from CRM revenue"],
    ["execute_code", "Campaigns that moved 15% or more week over week"],
    ["execute_code", "Blended ROAS across Google, LinkedIn and Meta"],
    ["write_file", "agent_memo/analysis.md"],
    ["write_file", "agent_memo/channel_roas.csv"],
  ]),
  { type: "assistant", timestamp: min(1), text:
    "Spend was **$163.1K** for **$606.8K** closed-won, a true ROAS of 3.72×.\n\n- **Google** is the strongest channel at 4.81×, on $77.4K of spend.\n- **LinkedIn** is at 3.44×, with $210.0K closed-won on $61.0K.\n- **Meta** barely covers its spend at 0.98×.\n- **G_Search_NonBrand_Automation** fell 50% week over week." },
  wrote("agent_memo/analysis.md", "agent_memo/channel_roas.csv"),

  { type: "agent_turn", n: 2, duration: "2m 05s", name: "Verify the numbers", kind: "reasoning", model: "Pro", startsWith: "agent 1",
    outcome: "Recomputed everything from the raw data" },
  ...tools([
    ["read_file", "agent_memo/analysis.md (tagged)"],
    ["read_file", "agent_memo/channel_roas.csv (tagged)"],
    ["list_files", "agent_steps"],
    ["query_athena", "Opportunity rows per channel from the raw CRM data"],
    ["list_files", "my_workflows/paid-media-roi · last 4 runs"],
    ["edit_file", "agent_steps/04_closed_won_by_channel/code.py"],
    ["replay_downstream", "04_closed_won_by_channel · 3 steps re-run"],
    ["write_file", "agent_memo/corrections.md"],
  ]),
  { type: "assistant", timestamp: min(2), text:
    "I recomputed the analysis above from the raw data and compared it with the last 4 runs.\n\n**One correction.** Step 4 counted one LinkedIn deal twice after two Salesforce opportunities were merged on Sep 28. I fixed that step and replayed the 3 steps that depend on it, so nothing else was redone. LinkedIn now has **$191.7K closed-won at 3.14×**, not $210.0K at 3.44×. The blended figure is $588.5K and 3.61×.\n\nGoogle and Meta match to the dollar." },
  wrote("agent_memo/corrections.md", "agent_steps/04_closed_won_by_channel/code.py"),

  { type: "agent_turn", n: 3, duration: "1m 40s", name: "Budget moves", kind: "recommendation", model: "Standard", startsWith: "agents 1–2",
    outcome: "Drafted 5 changes to budgets, bids and status" },
  ...tools([
    ["read_file", "agent_memo/channel_roas.csv (tagged)"],
    ["read_file", "uploads/paid_media_playbook.pdf (tagged)"],
    ["read_file", "context/skills/google-ads/SKILL.md"],
    ["read_file", "recommendations/recommendations.json"],
    ["recommendation", "create · Pause G_Search_NonBrand_Automation"],
    ["recommendation", "create · Raise daily budget on G_Display_Prospecting"],
    ["recommendation", "create · Pause Meta_Retarget_WebVisitors"],
    ["recommendation", "update · Lower bid on LI_ABM_Tier1"],
    ["recommendation", "create · Take the Meta Ads portfolio to the CMO"],
  ]),
  { type: "assistant", timestamp: min(3), text:
    "Using the corrected numbers, I drafted 5 changes:\n\n1. Pause G_Search_NonBrand_Automation. Its platform ROAS fell 50% week over week.\n2. Raise the G_Display_Prospecting daily budget from $60 to $350, to take the spend coming off the weaker campaigns.\n3. Pause Meta_Retarget_WebVisitors.\n4. Lower the LI_ABM_Tier1 bid to $15.50. This updates the bid recommendation already on the page.\n5. Following your playbook, an advice-only note to take the Meta Ads portfolio to the CMO before cutting it." },
  wrote("agent_memo/reasoning.md", "agent_memo/campaign_moves.csv"),

  { type: "agent_turn", n: 4, duration: "58s", name: "ICP hand-off", kind: "recommendation", model: "Standard", startsWith: "agents 1–3",
    outcome: "Drafted 1 hand-off to sales" },
  ...tools([
    ["query_athena", "ICP accounts with paid-engaged contacts and no open opportunity"],
    ["write_file", "agent_memo/icp_handoff.csv"],
    ["recommendation", "create · Send 11 ICP accounts to the SDR queue"],
  ]),
  { type: "assistant", timestamp: min(3.5), text:
    "Budgets and bids are covered above, so I looked only at accounts. **12 ICP accounts** are engaging with your ads and have no open opportunity. 11 of them already have an active SQL, so I drafted one change to send those 11 to the SDR queue. The twelfth needs a review first." },
  wrote("agent_memo/icp_handoff.csv"),

  { type: "agent_turn", n: 5, duration: "41s", name: "Final check", kind: "recommendation", model: "Pro", startsWith: "agents 1–4",
    outcome: "Checked 6 drafts against the guidance and past decisions" },
  ...tools([
    ["read_file", "context/skills/google-ads/SKILL.md"],
    ["read_file", "recommendations/draft.json"],
    ["recommendation", "update · daily budget $350 → $120"],
    ["recommendation", "delete · Pause Meta_Retarget_WebVisitors"],
    ["recommendation", "propose removal · LI_Webinar_October"],
    ["write_file", "agent_memo/check.md"],
  ]),
  { type: "assistant", timestamp: min(4), text:
    "I checked the six drafts against the ad platform guidance, this month's budget, and what your team decided before.\n\n- **Lowered** the G_Display_Prospecting daily budget from $350 to $120. The Google Ads guidance allows at most doubling a daily budget in one step.\n- **Removed** the pause of Meta_Retarget_WebVisitors. Priya rejected the same advice on Sep 23: “Keep retargeting live through the Q4 launch.”\n- **Proposed removing** “Extend end date of LI_Webinar_October”. The webinar has finished.\n\nThe draft now has **6 changes**: four new, one update to an existing recommendation, and one removal." },
  wrote("agent_memo/check.md", "agent_memo/lineage.md"),

  { type: "refresh_divider", text: "You opened this run for review · the conversation above carries on", timestamp: 0 },
];

// ── Files ─────────────────────────────────────────────────────────────────
// `collapsed` keeps a folder closed when the tray first opens: a reviewer mostly
// needs what the agents wrote, not the plumbing around it.
const dir = (path, hint, collapsed = true) => ({ name: path.split("/").pop(), path, type: "directory", content_type: "folder", hint, collapsed });
const typeOf = (path) => (path.endsWith(".csv") ? "csv" : path.endsWith(".html") ? "html" : path.endsWith(".json") ? "json" : "markdown");
const file = (path) => ({ name: path.split("/").pop(), path, type: "file", content_type: typeOf(path) });

export const DASHBOARD_PATH = "output/dashboard/paid_media_roi.html";

// A flat list, as the workspace tray expects. What the agents wrote comes first.
export const RUN_FILES = [
  dir("agent_memo", "What the agents wrote", false),
  ...["analysis.md", "channel_roas.csv", "corrections.md", "reasoning.md", "campaign_moves.csv", "icp_handoff.csv", "check.md", "lineage.md"].map((n) => file(`agent_memo/${n}`)),
  dir("agent_steps", "What each agent ran"),
  dir("agent_steps/04_closed_won_by_channel"),
  file("agent_steps/04_closed_won_by_channel/code.py"),
  dir("output"),
  dir("output/dashboard"),
  file(DASHBOARD_PATH),
  dir("data"),
  file("data/ad_spend_daily.csv"),
  dir("uploads", "Saved with the workflow"),
  file("uploads/paid_media_playbook.pdf"),
  dir("my_workflows", "Earlier runs, other workflows"),
  file("my_workflows/workflows_index.md"),
];

// Which entry of FILES backs each path.
const PATH_KEY = {
  "agent_memo/analysis.md": "summary",
  "agent_memo/channel_roas.csv": "metrics",
  "agent_memo/corrections.md": "corrections",
  "agent_memo/reasoning.md": "analysis",
  "agent_memo/campaign_moves.csv": "capped",
  "agent_memo/icp_handoff.csv": "sizes",
  "agent_memo/check.md": "check",
  "agent_memo/lineage.md": "lineage",
  "agent_memo/nonbrand_search_terms.csv": "leads",
  "agent_steps/04_closed_won_by_channel/code.py": "stepcode",
  "data/ad_spend_daily.csv": "daily",
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
// as "$2,285" would not survive a comma split.
export function runFileTable(path) {
  const f = FILES[PATH_KEY[path]];
  if (!f?.table) return null;
  return { columns: f.table.h, rows: f.table.r, total_rows: f.table.r.length, total_pages: 1, page: 1, page_size: 50 };
}

// ── Carrying on the conversation ──────────────────────────────────────────
const ASKS = {
  why: "Why $120 on Display Prospecting?",
  set100: "Make it $100",
  terms: "Show me the searches behind the Non-Brand campaign",
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
  if (/\$?\b100\b/.test(t)) return "set100";
  if (/search|non-?brand|terms|keyword/.test(t)) return "terms";
  if (/removal|webinar|events/.test(t)) return "drop";
  if (/why|120|display/.test(t)) return "why";
  return null;
}

// What the agent does and says for each ask. `effect` runs when it has finished.
const REPLIES = {
  why: {
    tools: [["read_file", "agent_memo/campaign_moves.csv"], ["read_file", "context/skills/google-ads/SKILL.md"]],
    text: "Google is your best channel at 4.81× true ROAS, and this campaign's platform ROAS rose 36% week over week on only $437 of spend. So it can take more budget.\n\nBudget moves first proposed **$350** a day, enough to absorb the spend coming off the weaker campaigns. The final check lowered it to **$120**, because the Google Ads guidance allows at most doubling a daily budget in one step, and double $60 is $120.\n\nThe campaigns that moved are in `campaign_moves.csv`.",
    outputs: ["agent_memo/campaign_moves.csv"],
  },
  set100: {
    tools: [["recommendation", "update · daily budget $120 → $100"]],
    text: "Done. The draft now proposes a daily budget of **$100** for G_Display_Prospecting, a 67% raise. Google's check says spend can rise by up to $40 a day.\n\nThe card in **Changes** is updated and marked as edited in review.",
    effect: () => {
      const s = useRunReviewStore.getState();
      s.editValue("REC-21", "$100", "Google Ads check: spend can rise by up to $40 a day.");
      s.requestOpen({ path: "run://changes" });
    },
  },
  terms: {
    tools: [["query_athena", "Search terms on G_Search_NonBrand_Automation, last 7 days"], ["write_file", "agent_memo/nonbrand_search_terms.csv"]],
    text: "I queried the search terms for that campaign over the last 7 days and saved the result as `nonbrand_search_terms.csv`.\n\nTwo free-tool searches took **$1,152 of the $2,285** spent and produced no pipeline. The one term that did, “attribution software pricing”, accounts for all $11.0K. That supports pausing the campaign.",
    outputs: ["agent_memo/nonbrand_search_terms.csv"],
    before: () => {
      if (!RUN_FILES.some((f) => f.path === "agent_memo/nonbrand_search_terms.csv")) {
        const at = RUN_FILES.findIndex((f) => f.path === "agent_memo/lineage.md");
        RUN_FILES.splice(at + 1, 0, file("agent_memo/nonbrand_search_terms.csv"));
      }
    },
    effect: () =>
      useRunReviewStore.getState().requestOpen({ path: "agent_memo/nonbrand_search_terms.csv", title: "nonbrand_search_terms.csv", contentType: "csv" }),
  },
  drop: {
    tools: [["recommendation", "keep · LI_Webinar_October stays on the board"]],
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
  text: "I can explain any number in this run, change a drafted value, or pull more evidence. For example, ask why a budget is what it is, tell me to change it, or ask to see the searches behind a campaign. `lineage.md` lists what each agent read and wrote.",
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
