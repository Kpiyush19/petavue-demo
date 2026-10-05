/* Workflow agents: the one run the demo follows, end to end.
   "LinkedIn Campaign Health" has five agents: two Reasoning agents, then three
   Recommendation agents. Everything here is mock data. File bodies are static
   HTML written in this file, so rendering them as HTML is safe. */

export const WORKFLOW_NAME = "LinkedIn Campaign Health";
export const RUN_LABEL = "Run of Oct 1, 6:00 am";
// The review is a normal chat session: the one the agents ran in.
export const RUN_SESSION_ID = "run-linkedin-campaign-health";
export const REVIEW_PATH = `/chat/${RUN_SESSION_ID}`;

export const RECS = [
  { id: "REC-21", title: "Raise daily budget on \"Q4 Demand Gen – CFOs\"", urg: "Act now", status: "Draft", pending: "new",
    d: { label: "Daily budget", from: "$50", to: "$80" },
    why: "Cost per lead is $41 against a $60 target, and the campaign hit its daily cap by 2 pm on 6 of the last 7 days.",
    warn: "LinkedIn check: spend can rise by up to $30 a day.", by: "Budget and bids", hist: [],
    adjusted: { by: "Final check", from: "$90", to: "$80", why: "The LinkedIn Ads guidance allows a raise of at most 60% in one step." } },
  { id: "REC-22", title: "Pause \"Retargeting – Pricing page visitors\"", urg: "This week", status: "Draft", pending: "new",
    d: { label: "Status", from: "Active", to: "Paused" },
    why: "Cost per lead is $212, more than three times target, with 2 leads in 14 days.", by: "Budget and bids", hist: [] },
  { id: "REC-23", title: "Exclude \"Company size: 1–10\" from \"ABM – Tier 2\"", urg: "This week", status: "Draft", pending: "new",
    d: { label: "Targeting criteria", from: "All company sizes", to: "Excludes 1–10 employees" },
    why: "Companies with 1–10 employees took 22% of spend and produced no qualified leads in 30 days.", by: "Audience and targeting", hist: [] },
  { id: "REC-24", title: "Brief the agency on a new offer for \"Retargeting – Pricing page visitors\"", urg: "This month", status: "Draft", pending: "new", d: null,
    why: "Your playbook says a paused retargeting campaign needs a new offer before it restarts. Advice only, nothing to apply.", by: "Budget and bids", hist: [] },
  { id: "REC-14", title: "Lower bid on \"ABM – Tier 1 accounts\"", urg: "This week", status: "Open", pending: "changed",
    d: { label: "Bid", from: "$18.00", to: "$15.50", was: "$16.50" },
    why: "Average cost per click fell to $14.90, so the suggested bid is now $15.50 (was $16.50).", by: "Budget and bids",
    hist: ["Open since Sep 24", "Comment, Priya (Sep 26): \"Waiting for the new creative before changing the bid.\""] },
  { id: "REC-09", title: "Extend end date of \"Webinar – October\" group", urg: "This month", status: "On hold", pending: "removed", d: null,
    why: "The webinar has finished, so the agent proposes to remove this recommendation.", by: "Final check",
    hist: ["On hold since Sep 20", "Hold note, Arun: \"Check with events team first.\""] },
  { id: "REC-17", title: "Raise total budget on \"Brand – Finance leaders\" group", urg: "This month", status: "Open", pending: null,
    d: { label: "Total budget", from: "$4,000", to: "$5,500" }, why: "On track to use up the group budget nine days before the end date.", hist: ["Open since Sep 27"] },
  { id: "REC-12", title: "Remove \"Job seniority: Entry\" from \"Q4 Demand Gen – CFOs\"", urg: "This week", status: "Accepted", pending: null,
    d: { label: "Targeting", from: "Includes Entry", to: "Excludes Entry" }, why: "Entry-level clicks converted at 0.2%.",
    hist: ["Accepted by Priya, Sep 25: \"Agreed.\"", "Applied to LinkedIn, Sep 25"] },
  { id: "REC-11", title: "Raise daily budget on \"Brand – Finance leaders\"", urg: "This week", status: "Rejected", pending: null,
    d: { label: "Daily budget", from: "$40", to: "$70" }, why: "Low impression share.",
    hist: ["Rejected by Priya, Sep 23: \"Do not touch brand campaign budgets this quarter.\""] },
  { id: "REC-08", title: "Switch \"ABM – Tier 2\" to manual bidding", urg: "This month", status: "On hold", pending: null,
    d: { label: "Bidding", from: "Automatic", to: "Manual, $14.00" }, why: "Automatic bids are averaging $22.",
    hist: ["On hold since Sep 18", "Hold note, Priya: \"Revisit after the pricing change.\""] },
  { id: "REC-05", title: "Review creative fatigue on \"Retargeting – Demo no-shows\"", urg: "This month", status: "Open", pending: null, d: null,
    why: "Click-through fell from 0.9% to 0.5% over four weeks. Advice only, nothing to apply.", hist: ["Open since Sep 15"] },
];

// What a Recommendation agent may propose, grouped by tool.
export const ACTIONS = [
  { g: "LinkedIn Ads", skill: "LinkedIn Ads guidance", items: ["Campaign budget update", "Campaign bid update", "Targeting criteria change", "Campaign status (pause or resume)", "Campaign schedule change", "Campaign group budget update"] },
  { g: "Google Ads", planned: true, items: ["Campaign budget update", "Bid strategy change", "Keyword pause", "Negative keyword add"] },
  { g: "Meta Ads", planned: true, items: ["Ad set budget update", "Audience change", "Ad set status (pause or resume)"] },
  { g: "General", items: ["Advice only, nothing to apply"] },
];

// Things a prompt can point at with @.
export const TAGS = {
  "kd-cpl": { type: "kd", name: "Cost per lead", meta: "Key Definition · cost-per-lead" },
  "kd-ql": { type: "kd", name: "Qualified lead", meta: "Key Definition · qualified-lead" },
  "f-ctx": { type: "folder", name: "Paid media", meta: "Folder · context · 3 files" },
  "f-memo": { type: "folder", name: "agent_memo", meta: "Folder · shared by all agents" },
  "f-data": { type: "folder", name: "data", meta: "Folder · this run · 1 file" },
  "f-output": { type: "folder", name: "output", meta: "Folder · this run · the dashboard" },
  "f-recs": { type: "folder", name: "recommendations", meta: "Folder · approved recommendations" },
  "f-wf-self": { type: "folder", name: "LinkedIn Campaign Health", meta: "Workflow folder · this workflow, earlier runs" },
  "f-wf-pipe": { type: "folder", name: "Pipeline Velocity Weekly", meta: "Workflow folder · my_workflows" },
  "f-wf-hub": { type: "folder", name: "HubSpot Lead Score Sync", meta: "Workflow folder · shared_artifacts" },
  daily: { type: "file", name: "campaign_daily.csv", meta: "File · data" },
};

export const makeTree = () => [
  { f: "agent_memo", open: true, tag: "shared by all agents", kids: [
    { n: "analysis.md", k: "summary" }, { n: "campaign_metrics.csv", k: "metrics" }, { n: "corrections.md", k: "corrections" },
    { n: "reasoning.md", k: "analysis" }, { n: "capped_campaigns.csv", k: "capped" }, { n: "spend_by_company_size.csv", k: "sizes" },
    { n: "check.md", k: "check" }, { n: "lineage.md", k: "lineage" } ] },
  { f: "agent_steps", open: false, tag: "what each agent ran", kids: [{ n: "04_leads_by_campaign/code.py", k: "stepcode" }] },
  { f: "output", open: false, kids: [{ n: "dashboard/index.html", k: "dash" }] },
  { f: "data", open: false, kids: [{ n: "campaign_daily.csv", k: "daily" }] },
  { f: "uploads", open: false, tag: "saved with the workflow", kids: [{ n: "paid_media_playbook.pdf", k: "playbook" }] },
  { f: "recommendations", open: false, tag: "approved only", kids: [{ n: "recommendations.json", k: "all" }] },
  { f: "my_workflows", open: false, tag: "earlier runs, other workflows", kids: [{ n: "workflows_index.md", k: "index" }] },
  { f: "shared_artifacts", open: false, kids: [] },
];

export const FILES = {
  summary0: { t: "analysis.md", icon: "file", md: `<h4>Performance analysis</h4><p>Spend was $6,420 for 96 leads, a cost per lead of $67 against a $60 target.</p><ul><li><b>Q4 Demand Gen – CFOs</b> is the most efficient campaign at $41 per lead and is capped by its daily budget.</li><li><b>Retargeting – Pricing page visitors</b> is at $212 per lead with 2 leads in 14 days.</li><li><b>ABM – Tier 1 accounts</b>: 33 leads, $60 per lead.</li></ul>` },
  summary: { t: "analysis.md", icon: "file", md: `<h4>Performance analysis</h4><p><i>Written by Performance analysis. Updated by Verify the numbers after a step was fixed.</i></p><p>Spend was $6,420 for 94 leads, a cost per lead of $68 against a $60 target.</p><ul><li><b>Q4 Demand Gen – CFOs</b> is the most efficient campaign at $41 per lead and is capped by its daily budget.</li><li><b>Retargeting – Pricing page visitors</b> is at $212 per lead with 2 leads in 14 days.</li><li><b>ABM – Tier 1 accounts</b>: 31 leads, $64 per lead (was 33 and $60).</li></ul>` },
  stepcode: { t: "04_leads_by_campaign/code.py", icon: "file", md: `<h4>Step 4 · leads by campaign</h4><p>Written by Performance analysis. Edited by Verify the numbers.</p><ul><li><b>Before:</b> counted every lead row.</li><li><b>After:</b> counts each lead once.</li><li><b>Replayed:</b> steps 5, 6 and 7, which depend on it. <code>analysis.md</code> and <code>campaign_metrics.csv</code> were rebuilt.</li></ul>` },
  metrics: { t: "campaign_metrics.csv", icon: "table", table: { h: ["Campaign", "Spend", "Leads", "Cost per lead", "Checked"], r: [["Q4 Demand Gen – CFOs", "$350", "9", "$41", "matches"], ["ABM – Tier 1 accounts", "$1,980", "31", "$64", "corrected by agent 2"], ["Retargeting – Pricing page visitors", "$424", "2", "$212", "matches"]] } },
  corrections: { t: "corrections.md", icon: "file", md: `<h4>Check of the performance analysis</h4><p>Recomputed every campaign from the raw daily data and compared with the last 4 runs.</p><ul><li><b>Cause found:</b> step 4 counted two ABM – Tier 1 leads twice after a re-import on Sep 28.</li><li><b>Fix:</b> edited step 4 to count each lead once, then replayed the 3 steps that depend on it. Nothing else was re-run.</li><li><b>Result:</b> ABM – Tier 1 has 31 leads and $64 per lead, not 33 and $60. Totals are now 94 leads and $68 per lead.</li><li><b>Confirmed:</b> the other five campaigns match to the dollar.</li></ul>` },
  sizes: { t: "spend_by_company_size.csv", icon: "table", table: { h: ["Company size", "Share of spend", "Qualified leads, 30 days"], r: [["1–10", "22%", "0"], ["11–50", "18%", "4"], ["51–200", "31%", "9"], ["201+", "29%", "9"]] } },
  check: { t: "check.md", icon: "file", md: `<h4>Final check of the draft</h4><ul><li><b>Lowered:</b> the CFO campaign budget was drafted at $90 a day. The LinkedIn guidance allows a raise of at most 60% in one step, so it is now $80.</li><li><b>Removed from the draft:</b> a budget raise for "Brand – Finance leaders". The same advice was rejected on Sep 23.</li><li><b>Proposed for removal:</b> “Extend end date of Webinar – October group”, because the webinar has finished.</li><li>The remaining changes are within this month's budget.</li></ul>` },
  analysis: { t: "reasoning.md", icon: "file", md: `<h4>How the recommendations were worked out</h4><p>Read the LinkedIn Ads guidance, then compared each campaign's cost per lead with the $60 target over 7 and 14 days.</p><ul><li>Budget: a campaign that reaches its cap before 3 pm on 5 of 7 days and is under target is a candidate for a raise of at most 60%.</li><li>Pause: over three times target with fewer than 3 leads in 14 days.</li><li>Skipped "Brand – Finance leaders": a budget raise was rejected on Sep 23.</li></ul>` },
  capped: { t: "capped_campaigns.csv", icon: "table", table: { h: ["Campaign", "Days capped", "Avg cap time", "Cost per lead"], r: [["Q4 Demand Gen – CFOs", "6 of 7", "1:52 pm", "$41"], ["ABM – Tier 1 accounts", "1 of 7", "6:10 pm", "$64"]] } },
  lineage: { t: "lineage.md", icon: "file", md: `<h4>How this run was built</h4><p><b>Measurement agent (the dashboard):</b> 3 queries on LinkedIn campaign data, 2 Python steps, published to the dashboard.</p><p><b>1 · Reasoning agent, "Performance analysis"</b><br>Ran 7 steps. Read: <code>data/campaign_daily.csv</code>. Wrote: <code>analysis.md</code>, <code>campaign_metrics.csv</code>.</p><p><b>2 · Reasoning agent, "Verify the numbers"</b><br>Read: agent 1's steps and files, the raw data, the last 4 runs under <code>my_workflows/</code>. Edited step 4 and replayed steps 5 to 7. Updated: <code>analysis.md</code>, <code>campaign_metrics.csv</code>. Wrote: <code>corrections.md</code>.</p><p><b>3 · Recommendation agent, "Budget and bids"</b><br>Skill read: LinkedIn Ads guidance. Tagged: <code>campaign_metrics.csv</code>. Uploaded file read: <code>paid_media_playbook.pdf</code>. Read: approved recommendations. Drafted 5 changes.</p><p><b>4 · Recommendation agent, "Audience and targeting"</b><br>Skill read: LinkedIn Ads guidance. Drafted 1 change.</p><p><b>5 · Recommendation agent, "Final check"</b><br>Lowered 1 change, removed 1 from the draft, proposed 1 removal.</p>` },
  daily: { t: "campaign_daily.csv", icon: "table", table: { h: ["Date", "Campaign", "Spend", "Leads"], r: [["Sep 30", "Q4 Demand Gen – CFOs", "$50", "2"], ["Sep 30", "ABM – Tier 1 accounts", "$281", "4"], ["Sep 30", "Retargeting – Pricing page visitors", "$61", "0"]] } },
  index: { t: "workflows_index.md", icon: "file", md: `<h4>Your workflows</h4><ul><li><b>LinkedIn Campaign Health</b> (this one): 30 earlier runs</li><li>Pipeline Velocity Weekly: 12 runs</li><li>HubSpot Lead Score Sync: 30 runs</li></ul>` },
  playbook: { t: "paid_media_playbook.pdf", icon: "file", md: `<h4>Paid media playbook</h4><p>Uploaded with the "Budget and bids" agent. Saved with the workflow and given to that agent on every run.</p><ul><li>Never raise a brand campaign budget without the CMO.</li><li>A paused retargeting campaign needs a new offer before it restarts. Brief the agency.</li><li>Word every recommendation so a campaign manager can act on it without opening the dashboard.</li></ul>` },
  leads: { t: "pricing_page_leads.csv", icon: "table", table: { h: ["Lead", "Company", "Date", "Stage"], r: [["M. Okafor", "Northwind Freight", "Sep 19", "Disqualified: student"], ["J. Lindqvist", "Halden Systems", "Sep 27", "Open"]] } },
};

// The five agents as the creator set them up. [[key]] in a prompt is an @ tag.
const AGENTS = [
  { kind: "reasoning", name: "Performance analysis", file: "summary0", out: ["summary", "metrics"], files: [], model: "Standard", preview: null,
    prompt: "Work out spend, leads and [[kd-cpl]] for every campaign in [[daily]] over 7 and 14 days, and list campaigns that hit their daily cap." },
  { kind: "reasoning", name: "Verify the numbers", file: "corrections", out: ["corrections"], files: [], model: "Pro", preview: null,
    prompt: "Recompute everything in [[summary]] and [[metrics]] from [[daily]] and compare with earlier runs in [[f-wf-self]]. Where something does not match, fix the step that caused it and say what you changed." },
  { kind: "recommendation", name: "Budget and bids", recs: ["REC-21", "REC-22", "REC-24"], out: ["analysis", "capped"], files: ["paid_media_playbook.pdf"], model: "Standard", preview: "ready",
    prompt: "Use [[metrics]]. Focus on campaigns with [[kd-cpl]] above target. One change per campaign. Follow [[up-paid_media_playbook.pdf]] for anything our team has to do by hand.",
    actions: ["LinkedIn Ads|Campaign budget update", "LinkedIn Ads|Campaign bid update", "LinkedIn Ads|Campaign status (pause or resume)", "General|Advice only, nothing to apply"] },
  { kind: "recommendation", name: "Audience and targeting", recs: ["REC-23"], out: ["sizes"], files: [], model: "Standard", preview: null,
    prompt: "Find audience segments that take spend without producing qualified leads.",
    actions: ["LinkedIn Ads|Targeting criteria change"] },
  { kind: "recommendation", name: "Final check", recs: [], out: ["check"], files: [], model: "Pro", preview: null,
    prompt: "Check every draft against past decisions, the guidance limits and this month's budget. Fix or remove what does not pass.",
    actions: ["LinkedIn Ads|Campaign budget update", "LinkedIn Ads|Campaign bid update", "LinkedIn Ads|Targeting criteria change", "LinkedIn Ads|Campaign status (pause or resume)"] },
];
export const makeAgents = () => AGENTS.map((a, i) => ({ uid: i + 1, ...a, files: [...a.files], out: [...a.out], actions: a.actions ? [...a.actions] : undefined }));

export const SAMPLE_UPLOADS = ["paid_media_playbook.pdf", "team_guidelines.md", "naming_rules.md"];
export const MODELS = ["Mini", "Standard", "Pro"];

// The run's conversation: one turn per agent. data-file / data-tab on a button
// opens that file or tab in the right-hand panel.
export const makeMessages = () => [
  { t: "divider", text: "Run of Oct 1, 6:00 am · one conversation, five agents" },
  { t: "agent", n: 1, kind: "Reasoning agent", name: "Performance analysis" },
  { t: "asst", tools: ["query_athena ×2", "execute_code ×3", "write_file analysis.md", "write_file campaign_metrics.csv"],
    html: `<p>Spend was $6,420 for 96 leads, $67 per lead against a $60 target. "Q4 Demand Gen – CFOs" is capped most days. "ABM – Tier 1 accounts" has 33 leads at $60.</p>` },
  { t: "agent", n: 2, kind: "Reasoning agent", name: "Verify the numbers", note: "starts with agent 1's conversation" },
  { t: "asst", tools: ["read_file analysis.md (tagged)", "read_file campaign_metrics.csv (tagged)", "list_files agent_steps", "query_athena", "list_files my_workflows/linkedin-campaign-health", "edit_file agent_steps/04_leads_by_campaign/code.py", "replay_downstream 04_leads_by_campaign · 3 steps re-run", "write_file corrections.md"],
    html: `<p>I recomputed the analysis above from the raw data. <b>One correction:</b> step 4 counted two ABM – Tier 1 leads twice after a re-import. I fixed <button class="wfa-link" data-file="stepcode">that step</button> and replayed the 3 steps that depend on it, so nothing else was redone. ABM – Tier 1 now has 31 leads at $64, not 33 at $60. <button class="wfa-link" data-file="metrics">campaign_metrics.csv</button> and the analysis are updated.</p>` },
  { t: "agent", n: 3, kind: "Recommendation agent", name: "Budget and bids", note: "starts with agents 1–2" },
  { t: "asst", tools: ["read_file campaign_metrics.csv (tagged)", "read_file uploads/paid_media_playbook.pdf (tagged)", "read_file context/skills/linkedin-ads/SKILL.md", "read_file recommendations/recommendations.json", "recommendation ×5"],
    html: `<p>Using the corrected numbers, I drafted 5 changes: raise the CFO campaign budget to $90, raise the Brand budget to $70, pause the Pricing page retargeting, and lower the ABM Tier 1 bid to $15.50. Following <button class="wfa-link" data-file="playbook">your playbook</button>, the fifth is an advice-only note to brief the agency on a new offer.</p>` },
  { t: "agent", n: 4, kind: "Recommendation agent", name: "Audience and targeting", note: "starts with agents 1–3" },
  { t: "asst", tools: ["query_athena", "write_file spend_by_company_size.csv", "recommendation ×1"],
    html: `<p>Budget and bids are covered above, so I looked only at audiences. Companies with 1–10 employees take 22% of ABM Tier 2 spend with no qualified leads. I drafted one targeting change.</p>` },
  { t: "agent", n: 5, kind: "Recommendation agent", name: "Final check", note: "starts with agents 1–4" },
  { t: "asst", tools: ["read_file context/skills/linkedin-ads/SKILL.md", "read_file recommendations/draft.json", "recommendation update · daily budget $90 → $80", "recommendation delete ×1", "write_file check.md"],
    html: `<p>I checked the six drafts. <b>Lowered</b> the CFO budget from $90 to $80: the guidance allows at most a 60% raise. <b>Removed</b> the Brand budget raise that agent 3 drafted, because the same advice was rejected on Sep 23. I also propose removing the finished webinar’s recommendation. The draft now has <b>6 changes</b>.</p>` },
  { t: "divider", text: "You opened this run for review · the conversation above carries on" },
];

// Suggested questions in review. They stand in for typing.
export const TRIES = [
  ["why", "Why $80 on the CFO campaign?"],
  ["set70", "Make it $70"],
  ["leads", "Show me the leads behind the Pricing page campaign"],
  ["drop", "Drop the removal, events team still needs it"],
];

export const DASH_ROWS = [
  ["Q4 Demand Gen – CFOs", "$350", "9", "$41"],
  ["ABM – Tier 1 accounts", "$1,980", "31", "$64"],
  ["Retargeting – Pricing page visitors", "$424", "2", "$212", true],
  ["Brand – Finance leaders", "$1,310", "18", "$73"],
  ["ABM – Tier 2", "$1,540", "22", "$70"],
  ["Retargeting – Demo no-shows", "$816", "12", "$68"],
];
