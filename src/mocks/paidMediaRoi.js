// The Paid Media ROI report as the demo's one running example: what the Home
// chat builds, what Verify & Publish turns into a workflow, and what that
// workflow's agents then reason about. The dashboard itself and its numbers
// live in dashboardAssets.js; the agents' run is in pages/workflows/agents-run.

export const ROI_TITLE = "Paid Media ROI";
export const ROI_DASHBOARD_PATH = "output/dashboard/paid_media_roi.html";
export const ROI_REPORT_SESSION_ID = "paid-media-roi";
export const ROI_WORKFLOW_PATH = "/workflows/paid-media-roi";
// The one question this chat answers. Whatever is typed on Home, this is what
// is sent, so the reply always matches the question on screen.
export const ROI_PROMPT = "Which paid channels are actually driving revenue, and where am I wasting spend?";

// Added to the report so the next step is on screen.
export const ROI_NEXT_STEP =
  "To refresh this every week, open the dashboard's menu and choose **Verify & Publish**.";

// The workspace tray for a chat that built this report (a flat list).
const dir = (path) => ({ name: path.split("/").pop(), path, type: "directory", content_type: "folder" });
const file = (path, content_type) => ({ name: path.split("/").pop(), path, type: "file", content_type });
export const ROI_TREE = [
  dir("output"),
  dir("output/dashboard"),
  file(ROI_DASHBOARD_PATH, "html"),
  dir("data"),
  file("data/channel_roas.csv", "csv"),
];

const chip = (question, grounded_in) => ({ question, grounded_in, grounded_type: "dashboard" });
export const ROI_FOLLOWUPS = [
  chip("Why is Google under-reporting its own ROAS?", "Channel Truth"),
  chip("Where should I move budget this week?", "Actions"),
  chip("Which ICP accounts should sales call?", "ICP Hand-off"),
];

const REPLIES = [
  [/google|under|report/, "Google Ads counts only the conversions its own pixel sees, so it reports **0.65×**. Your CRM shows **$372.6K closed-won** on $77.4K of Google spend, which is **4.81×**. Every one of your top three closed-won journeys starts with a Google touch, and most of those deals close weeks later, outside Google's attribution window."],
  [/budget|move|shift|spend/, "Three moves this week. **Pause `G_Search_NonBrand_Automation`**: its platform ROAS fell 50% week over week on $2,285 of spend. **Shift about $2K a week into `G_Display_Prospecting`**, which sits in your best channel at 4.81×. **Review the Meta Ads portfolio**: $24.7K spent for $24.3K closed-won, a true ROAS of 0.98×."],
  [/icp|account|sales|call/, "Twelve ICP accounts are engaging with your ads and have no open opportunity. Eleven already have an active SQL and can go straight to an SDR, starting with **Walter, Edwards and Rios** (9 buyers engaged) and **Rodriguez LLC** (7). Together they are worth about **$666K** in potential pipeline."],
];
const FALLBACK = "I can break that down from the same data. The dashboard on the right has the true ROAS by channel, this week's three moves, the campaigns that moved, and the ICP accounts to hand to sales. Ask about any of them, or choose **Verify & Publish** from the dashboard's menu to run this every week.";

export const roiReply = (text) => (REPLIES.find(([re]) => re.test((text || "").toLowerCase())) || [null, FALLBACK])[1];
