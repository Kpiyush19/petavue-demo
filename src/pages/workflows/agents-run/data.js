/* Workflow agents: the one run the demo follows, end to end.
   "Paid Media ROI" has five agents: two Reasoning agents, then three
   Recommendation agents. Everything here is mock data, and the numbers match
   the Paid Media ROI dashboard in mocks/dashboardAssets.js. File bodies are
   static HTML written in this file, so rendering them as HTML is safe. */

export const WORKFLOW_NAME = "Paid Media ROI";
export const WORKFLOW_ID = "paid-media-roi";
export const WORKFLOW_PATH = `/workflows/${WORKFLOW_ID}`;
export const RUN_DATE = "Oct 5";
export const RUN_LABEL = `Run of ${RUN_DATE}, 6:00 am`;
export const SCHEDULE = "Every Monday, 6:00 AM";
export const NEXT_RUN = "Oct 12, 6:00 AM";
// The review is a normal chat session: the one the agents ran in.
export const RUN_SESSION_ID = "run-paid-media-roi";
export const REVIEW_PATH = `/chat/${RUN_SESSION_ID}`;

// `sys` is the system a change would be applied in.
export const RECS = [
  { id: "REC-22", title: "Pause \"G_Search_NonBrand_Automation\"", sys: "Google Ads", urg: "Act now", status: "Draft", pending: "new",
    d: { label: "Status", from: "Active", to: "Paused" },
    why: "Platform ROAS fell 50% week over week to 0.31× on $2,285 of spend in the last 7 days.", by: "Budget moves", hist: [] },
  { id: "REC-21", title: "Raise daily budget on \"G_Display_Prospecting\"", sys: "Google Ads", urg: "This week", status: "Draft", pending: "new",
    d: { label: "Daily budget", from: "$60", to: "$120" },
    why: "Google is your best channel at 4.81× true ROAS, and this campaign's platform ROAS rose 36% week over week.",
    warn: "Google Ads check: spend can rise by up to $60 a day.", by: "Budget moves", hist: [],
    adjusted: { by: "Final check", from: "$350", to: "$120", why: "The Google Ads guidance allows at most doubling a daily budget in one step." } },
  { id: "REC-23", title: "Send 11 ICP accounts to the SDR queue", sys: "Salesforce", urg: "This week", status: "Draft", pending: "new",
    d: { label: "SDR queue", from: "Not assigned", to: "11 accounts" },
    why: "12 ICP accounts are engaging with your ads and have no open opportunity. 11 already have an active SQL, worth about $610K in potential pipeline.", by: "ICP hand-off", hist: [] },
  { id: "REC-24", title: "Take the Meta Ads portfolio to the CMO before cutting it", sys: null, urg: "This month", status: "Draft", pending: "new", d: null,
    why: "Your playbook says a whole channel is not cut without the CMO. Meta returned 0.98× on $24.7K of spend. Advice only, nothing to apply.", by: "Budget moves", hist: [] },
  { id: "REC-14", title: "Lower bid on \"LI_ABM_Tier1\"", sys: "LinkedIn Ads", urg: "This week", status: "Open", pending: "changed",
    d: { label: "Bid", from: "$18.00", to: "$15.50", was: "$16.50" },
    why: "Average cost per click fell to $14.90, so the suggested bid is now $15.50 (was $16.50).", by: "Budget moves",
    hist: ["Open since Sep 24", "Comment, Priya (Sep 26): \"Waiting for the new creative before changing the bid.\""] },
  { id: "REC-09", title: "Extend end date of \"LI_Webinar_October\"", sys: "LinkedIn Ads", urg: "This month", status: "On hold", pending: "removed", d: null,
    why: "The webinar has finished, so the agent proposes to remove this recommendation.", by: "Final check",
    hist: ["On hold since Sep 20", "Hold note, Arun: \"Check with events team first.\""] },
  { id: "REC-17", title: "Raise weekly budget on \"G_Search_Brand_Core\"", sys: "Google Ads", urg: "This month", status: "Open", pending: null,
    d: { label: "Weekly budget", from: "$4,000", to: "$5,500" }, why: "On track to use up the weekly budget two days early.", hist: ["Open since Sep 27"] },
  { id: "REC-12", title: "Add negative keywords to \"G_Search_NonBrand_Automation\"", sys: "Google Ads", urg: "This week", status: "Accepted", pending: null,
    d: { label: "Negative keywords", from: "None", to: "14 terms" }, why: "Free-tool searches took 18% of clicks and produced no pipeline.",
    hist: ["Accepted by Priya, Sep 25: \"Agreed.\"", "Applied to Google Ads, Sep 25"] },
  { id: "REC-11", title: "Pause \"Meta_Retarget_WebVisitors\"", sys: "Meta Ads", urg: "This week", status: "Rejected", pending: null,
    d: { label: "Status", from: "Active", to: "Paused" }, why: "The Meta portfolio returned 0.98× true ROAS.",
    hist: ["Rejected by Priya, Sep 23: \"Keep retargeting live through the Q4 launch.\""] },
  { id: "REC-08", title: "Switch \"LI_ABM_Tier2\" to manual bidding", sys: "LinkedIn Ads", urg: "This month", status: "On hold", pending: null,
    d: { label: "Bidding", from: "Automatic", to: "Manual, $14.00" }, why: "Automatic bids are averaging $22.",
    hist: ["On hold since Sep 18", "Hold note, Priya: \"Revisit after the pricing change.\""] },
  { id: "REC-05", title: "Review creative fatigue on \"Meta_Summer_Promo_V3\"", sys: null, urg: "This month", status: "Open", pending: null, d: null,
    why: "Platform ROAS fell 85% week over week. Advice only, nothing to apply.", hist: ["Open since Sep 15"] },
];

// What a Recommendation agent may propose, grouped by tool.
export const ACTIONS = [
  { g: "Google Ads", items: ["Campaign budget update", "Campaign status (pause or resume)", "Bid strategy change", "Negative keyword add"] },
  { g: "LinkedIn Ads", items: ["Campaign budget update", "Campaign bid update", "Targeting criteria change", "Campaign status (pause or resume)"] },
  { g: "Meta Ads", items: ["Ad set budget update", "Ad set status (pause or resume)", "Audience change"] },
  { g: "Salesforce", items: ["Assign accounts to a sales queue"] },
  { g: "General", items: ["Advice only, nothing to apply"] },
];

// Things a prompt can point at with @.
export const TAGS = {
  "kd-roas": { type: "kd", name: "True ROAS", meta: "Key Definition · true-roas" },
  "kd-won": { type: "kd", name: "Closed-won", meta: "Key Definition · closed-won" },
  "f-ctx": { type: "folder", name: "Paid media", meta: "Folder · context · 3 files" },
  "f-memo": { type: "folder", name: "agent_memo", meta: "Folder · shared by all agents" },
  "f-data": { type: "folder", name: "data", meta: "Folder · this run · 1 file" },
  "f-output": { type: "folder", name: "output", meta: "Folder · this run · the dashboard" },
  "f-recs": { type: "folder", name: "recommendations", meta: "Folder · approved recommendations" },
  "f-wf-self": { type: "folder", name: "Paid Media ROI", meta: "Workflow folder · this workflow, earlier runs" },
  "f-wf-pipe": { type: "folder", name: "Pipeline Velocity Weekly", meta: "Workflow folder · my_workflows" },
  "f-wf-hub": { type: "folder", name: "HubSpot Lead Score Sync", meta: "Workflow folder · shared_artifacts" },
  daily: { type: "file", name: "ad_spend_daily.csv", meta: "File · data" },
};

export const FILES = {
  summary0: { t: "analysis.md", icon: "file", md: `<h4>Channel ROI analysis</h4><p>Spend was $163.1K for $606.8K closed-won, a true ROAS of 3.72×.</p><ul><li><b>Google</b>: $77.4K spend, $372.6K closed-won, 4.81×.</li><li><b>LinkedIn</b>: $61.0K spend, $210.0K closed-won, 3.44×.</li><li><b>Meta</b>: $24.7K spend, $24.3K closed-won, 0.98×.</li><li><b>G_Search_NonBrand_Automation</b> fell 50% week over week.</li></ul>` },
  summary: { t: "analysis.md", icon: "file", md: `<h4>Channel ROI analysis</h4><p><i>Written by Channel ROI analysis. Updated by Verify the numbers after a step was fixed.</i></p><p>Spend was $163.1K for $588.5K closed-won, a true ROAS of 3.61×.</p><ul><li><b>Google</b>: $77.4K spend, $372.6K closed-won, 4.81×.</li><li><b>LinkedIn</b>: $61.0K spend, $191.7K closed-won, 3.14× (was $210.0K and 3.44×).</li><li><b>Meta</b>: $24.7K spend, $24.3K closed-won, 0.98×.</li><li><b>G_Search_NonBrand_Automation</b> fell 50% week over week.</li></ul>` },
  stepcode: { t: "04_closed_won_by_channel/code.py", icon: "file", md: `<h4>Step 4 · closed-won by channel</h4><p>Written by Channel ROI analysis. Edited by Verify the numbers.</p><ul><li><b>Before:</b> summed every opportunity row.</li><li><b>After:</b> counts each opportunity once.</li><li><b>Replayed:</b> steps 5, 6 and 7, which depend on it. <code>analysis.md</code> and <code>channel_roas.csv</code> were rebuilt.</li></ul>` },
  metrics: { t: "channel_roas.csv", icon: "table", table: { h: ["Channel", "Spend", "Closed-won", "True ROAS", "Checked"], r: [["Google", "$77.4K", "$372.6K", "4.81×", "matches"], ["LinkedIn", "$61.0K", "$191.7K", "3.14×", "corrected by agent 2"], ["Meta", "$24.7K", "$24.3K", "0.98×", "matches"]] } },
  corrections: { t: "corrections.md", icon: "file", md: `<h4>Check of the channel ROI analysis</h4><p>Recomputed every channel from the raw spend and opportunity data and compared with the last 4 runs.</p><ul><li><b>Cause found:</b> step 4 counted one LinkedIn deal twice after two Salesforce opportunities were merged on Sep 28.</li><li><b>Fix:</b> edited step 4 to count each opportunity once, then replayed the 3 steps that depend on it. Nothing else was re-run.</li><li><b>Result:</b> LinkedIn has $191.7K closed-won and 3.14×, not $210.0K and 3.44×. The blended figure is now $588.5K and 3.61×.</li><li><b>Confirmed:</b> Google and Meta match to the dollar.</li></ul>` },
  sizes: { t: "icp_handoff.csv", icon: "table", table: { h: ["Account", "Buyers engaged", "Active SQL", "Next step"], r: [["Walter, Edwards and Rios", "9", "5", "Assign to SDR"], ["Rodriguez LLC", "7", "3", "Assign to SDR"], ["Jones Inc", "6", "3", "Assign to SDR"], ["Novak PLC", "5", "4", "Assign to SDR"], ["Mcclure, Ward and Lee", "5", "0", "Review first"]] } },
  check: { t: "check.md", icon: "file", md: `<h4>Final check of the draft</h4><ul><li><b>Lowered:</b> the G_Display_Prospecting budget was drafted at $350 a day. The Google Ads guidance allows at most doubling a daily budget in one step, so it is now $120.</li><li><b>Removed from the draft:</b> pausing "Meta_Retarget_WebVisitors". The same advice was rejected on Sep 23.</li><li><b>Proposed for removal:</b> “Extend end date of LI_Webinar_October”, because the webinar has finished.</li><li>The remaining changes are within this month's budget.</li></ul>` },
  analysis: { t: "reasoning.md", icon: "file", md: `<h4>How the recommendations were worked out</h4><p>Read the Google Ads, LinkedIn Ads and Meta Ads guidance, then compared each channel's true ROAS with its week-over-week trend.</p><ul><li>Raise: a campaign in a channel above 3× whose platform ROAS is rising.</li><li>Pause: a campaign whose platform ROAS fell 50% or more week over week.</li><li>Whole channel under 1×: advice only, because the playbook asks for the CMO first.</li></ul>` },
  capped: { t: "campaign_moves.csv", icon: "table", table: { h: ["Campaign", "Spend, 7 days", "Platform ROAS", "Week over week"], r: [["G_Search_NonBrand_Automation", "$2,285", "0.31×", "−50%"], ["Meta_Summer_Promo_V3", "$700", "0.72×", "−85%"], ["Meta_Retarget_WebVisitors", "$667", "1.01×", "+39%"], ["G_Display_Prospecting", "$437", "1.00×", "+36%"]] } },
  lineage: { t: "lineage.md", icon: "file", md: `<h4>How this run was built</h4><p><b>Measurement agent (the dashboard):</b> 31 queries on Google, LinkedIn and Meta spend and on Salesforce opportunities, 6 Python steps, published to the dashboard.</p><p><b>1 · Reasoning agent, "Channel ROI analysis"</b><br>Ran 7 steps. Read: <code>data/ad_spend_daily.csv</code>. Wrote: <code>analysis.md</code>, <code>channel_roas.csv</code>.</p><p><b>2 · Reasoning agent, "Verify the numbers"</b><br>Read: agent 1's steps and files, the raw data, the last 4 runs under <code>my_workflows/</code>. Edited step 4 and replayed steps 5 to 7. Updated: <code>analysis.md</code>, <code>channel_roas.csv</code>. Wrote: <code>corrections.md</code>.</p><p><b>3 · Recommendation agent, "Budget moves"</b><br>Tagged: <code>channel_roas.csv</code>. Uploaded file read: <code>paid_media_playbook.pdf</code>. Read: approved recommendations. Drafted 5 changes.</p><p><b>4 · Recommendation agent, "ICP hand-off"</b><br>Drafted 1 change.</p><p><b>5 · Recommendation agent, "Final check"</b><br>Lowered 1 change, removed 1 from the draft, proposed 1 removal.</p>` },
  daily: { t: "ad_spend_daily.csv", icon: "table", table: { h: ["Date", "Channel", "Campaign", "Spend"], r: [["Oct 4", "Google", "G_Search_NonBrand_Automation", "$326"], ["Oct 4", "Google", "G_Display_Prospecting", "$62"], ["Oct 4", "Meta", "Meta_Summer_Promo_V3", "$100"]] } },
  index: { t: "workflows_index.md", icon: "file", md: `<h4>Your workflows</h4><ul><li><b>Paid Media ROI</b> (this one): 12 earlier runs</li><li>Pipeline Velocity Weekly: 12 runs</li><li>HubSpot Lead Score Sync: 30 runs</li></ul>` },
  playbook: { t: "paid_media_playbook.pdf", icon: "file", md: `<h4>Paid media playbook</h4><p>Uploaded with the "Budget moves" agent. Saved with the workflow and given to that agent on every run.</p><ul><li>Never cut a whole channel without the CMO.</li><li>Keep retargeting live through a product launch.</li><li>Word every recommendation so a campaign manager can act on it without opening the dashboard.</li></ul>` },
  leads: { t: "nonbrand_search_terms.csv", icon: "table", table: { h: ["Search term", "Spend, 7 days", "Clicks", "Pipeline"], r: [["free marketing analytics tool", "$612", "418", "$0"], ["marketing roi calculator", "$540", "377", "$0"], ["attribution software pricing", "$398", "96", "$11.0K"]] } },
};

// The five agents as the creator set them up. [[key]] in a prompt is an @ tag.
const AGENTS = [
  { kind: "reasoning", name: "Channel ROI analysis", file: "summary0", out: ["summary", "metrics"], files: [], model: "Standard", preview: null,
    prompt: "Work out spend, [[kd-won]] revenue and [[kd-roas]] for each paid channel in [[daily]] over 90 days, and list campaigns that moved 15% or more week over week." },
  { kind: "reasoning", name: "Verify the numbers", file: "corrections", out: ["corrections"], files: [], model: "Pro", preview: null,
    prompt: "Recompute everything in [[summary]] and [[metrics]] from [[daily]] and compare with earlier runs in [[f-wf-self]]. Where something does not match, fix the step that caused it and say what you changed." },
  { kind: "recommendation", name: "Budget moves", recs: ["REC-22", "REC-21", "REC-24"], out: ["analysis", "capped"], files: ["paid_media_playbook.pdf"], model: "Standard", preview: "ready",
    prompt: "Use [[metrics]]. Move budget toward channels with [[kd-roas]] above 3× and away from campaigns that are falling. One change per campaign. Follow [[up-paid_media_playbook.pdf]] for anything our team has to do by hand.",
    actions: ["Google Ads|Campaign budget update", "Google Ads|Campaign status (pause or resume)", "LinkedIn Ads|Campaign bid update", "Meta Ads|Ad set status (pause or resume)", "General|Advice only, nothing to apply"] },
  { kind: "recommendation", name: "ICP hand-off", recs: ["REC-23"], out: ["sizes"], files: [], model: "Standard", preview: null,
    prompt: "Find ICP accounts that are engaging with our ads and have no open opportunity, and hand the ones with an active SQL to sales.",
    actions: ["Salesforce|Assign accounts to a sales queue"] },
  { kind: "recommendation", name: "Final check", recs: [], out: ["check"], files: [], model: "Pro", preview: null,
    prompt: "Check every draft against past decisions, the guidance limits and this month's budget. Fix or remove what does not pass.",
    actions: ["Google Ads|Campaign budget update", "Google Ads|Campaign status (pause or resume)", "LinkedIn Ads|Campaign bid update", "Meta Ads|Ad set status (pause or resume)"] },
];
export const makeAgents = () => AGENTS.map((a, i) => ({ uid: i + 1, ...a, files: [...a.files], out: [...a.out], actions: a.actions ? [...a.actions] : undefined }));

export const SAMPLE_UPLOADS = ["paid_media_playbook.pdf", "team_guidelines.md", "naming_rules.md"];
export const MODELS = ["Mini", "Standard", "Pro"];
