// Route table for the mock backend. Each entry matches an HTTP method + URL
// path (regex with capture groups) and returns the response body. Anything not
// matched here falls through to a safe default in adapter.js, so the app never
// crashes on an un-mocked endpoint.

import {
  db, currentUser, newId, TENANT_ID, USER_ID,
  DASH_SESSION_ID, DASH_RECIPE, HARDENED_STEPS,
  PMR_CLARIFY, PMR_REPORT, PMR_DISCOVERY_TOOLS, PMR_RUN_TOOLS,
} from "./db";
import { DASHBOARD_MANIFEST, PMR_SUMMARY_MD } from "./dashboardAssets";
import { makeFakeJwt } from "./jwt";
import { emit } from "./pusherBus";
import { startRun, executeRun, discardRun, getProgress, getPlanSummary, listActiveRuns, submitClarification } from "./skillRun";
import * as Goals from "./goals";

// ── Verify & Publish: widgets ─────────────────────────────────────────
function getWidgets(sessionId) {
  if (!db.dashboardWidgets[sessionId]) {
    db.dashboardWidgets[sessionId] = Object.values(DASHBOARD_MANIFEST.widgets).map((w) => ({
      id: w.id, file: w.file, name: w.name, verified: false, verified_at: null,
    }));
  }
  return db.dashboardWidgets[sessionId];
}

// ── Verify & Publish: simulated execution + hardening stream ───────────
function makeDiff(step) {
  if (step.id === "step_1") {
    return [
      "@@ recipe step query @@",
      "-WHERE order_date >= DATE '2026-04-01'",
      "+WHERE order_date >= DATE_ADD('quarter', -1, CURRENT_DATE)",
    ].join("\n");
  }
  if (step.id === "step_3") {
    return [
      "@@ recipe step code @@",
      " rev = pd.read_csv('data/revenue_by_month.csv')",
      "+if rev.empty:",
      "+    rev = pd.DataFrame({'revenue': [0]})",
      " kpis = { 'total_revenue': int(rev.revenue.sum()), ... }",
    ].join("\n");
  }
  return "@@ step @@\n- old\n+ new";
}

function streamExec(execSid, skipHardening) {
  const es = db.execSessions[execSid];
  if (!es) return;
  const channel = es.channel;
  const steps = es.recipe.steps || [];
  let t = 650;
  const gap = 360;

  steps.forEach((s, i) => {
    setTimeout(() => {
      es.statuses[s.id] = { status: "success", output_files: s.outputs || [] };
      emit(channel, "step-success", {
        step_id: s.id,
        duration_s: Math.round((0.6 + i * 0.12) * 10) / 10,
        output_files: s.outputs || [],
      });
    }, t);
    t += gap;
  });

  setTimeout(() => {
    es.phase = "executed";
    emit(channel, "all-complete", { success: true, steps_total: steps.length, steps_completed: steps.length });
  }, t);
  t += 600;

  if (skipHardening) {
    es.phase = "done";
    return;
  }

  setTimeout(() => {
    es.phase = "hardening";
    emit(channel, "hardening-started", { total_steps: steps.length, step_ids: steps.map((s) => s.id) });
  }, t);
  t += 450;

  steps.forEach((s) => {
    setTimeout(() => emit(channel, "step-reviewing", { step_id: s.id }), t);
    t += 280;
    setTimeout(() => {
      const hard = HARDENED_STEPS[s.id];
      const status = hard ? "hardened" : "reviewed";
      es.hardening[s.id] = { status, reason: hard ? hard.reason : "" };
      if (hard) {
        emit(channel, "step-diff", { step_id: s.id, field: "code", diff: makeDiff(s), diff_truncated: false });
      }
      emit(channel, "step-hardened", { step_id: s.id, status, reason: hard ? hard.reason : "" });
    }, t);
    t += 280;
  });

  setTimeout(() => {
    es.phase = "done";
    emit(channel, "hardening-complete", { success: true });
  }, t);
}

function syncSteps(es) {
  return (es.recipe.steps || []).map((s) => ({
    id: s.id,
    status: es.statuses[s.id]?.status || "pending",
    output_files: es.statuses[s.id]?.output_files || [],
    skip_reason: null,
    hardening_status: es.hardening[s.id]?.status || "pending",
    hardening_reason: es.hardening[s.id]?.reason || null,
  }));
}

// Grounded follow-up chips answering the latest turn. The first set hydrates on
// load via /recommendations; the second is emitted after a chat reply so the
// chips always follow the most recent message.
const FOLLOWUP_QUESTIONS = [
  { question: "Break down the Google and LinkedIn wins by customer segment so I know if it's SMB or Enterprise driving the return.", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
  { question: "Which ICP accounts in the hand-off queue have the strongest buying signals worth calling this week?", grounded_in: "ICP hand-off queue", grounded_type: "widget" },
  { question: "Show me where the 78% of untracked closed-won revenue is actually coming from so I know what's really working.", grounded_in: "Leadsource coverage", grounded_type: "widget" },
];
const NEXT_FOLLOWUP_QUESTIONS = [
  { question: "Draft the 3 spend-reallocation moves as a plan I can approve.", grounded_in: "Paid Media ROI", grounded_type: "skill" },
  { question: "Why is Google under-reporting its own ROAS by 7×?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
  { question: "Add a demo-conversion leading-indicator block on top.", grounded_in: "Paid Media ROI", grounded_type: "skill" },
];
// Follow-up chips shown after a Creative & Ad Performance reply (kept simple).
const CAP_NEXT_FOLLOWUPS = [
  { question: "Which campaign is performing best?", grounded_in: "Creative & Ad Performance", grounded_type: "dashboard" },
  { question: "Why is Google showing 0 conversions?", grounded_in: "Creative & Ad Performance", grounded_type: "dashboard" },
  { question: "Which creative format should I put more budget behind?", grounded_in: "Creative & Ad Performance", grounded_type: "dashboard" },
];
// Follow-up chips shown after a Target Account Journey reply.
const TAJ_NEXT_FOLLOWUPS = [
  { question: "Draft rescue plays for the top 4 stalled accounts.", grounded_in: "Target Account Journey", grounded_type: "skill" },
  { question: "Why do we lose so many accounts between opportunity and closed won?", grounded_in: "Target Account Journey", grounded_type: "dashboard" },
  { question: "Which 3 accounts have never been reached by paid?", grounded_in: "Target Account Journey", grounded_type: "dashboard" },
];
// Starter questions shown in the Sage (Beta) chat opened FROM the Paid Media ROI
// dashboard — the "what can I ask?" chips, customized to this dashboard.
const PMR_SAGE_STARTERS = [
  { question: "What's our true ROAS by channel vs what the platforms report?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
  { question: "Where should I move budget this week?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
  { question: "Which ICP accounts should sales call?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
];

// Starter chips for the Sage chat opened FROM the Target Account Journey
// dashboard — grounded in that dashboard's ABM funnel + stalled-account numbers.
const TAJ_SAGE_STARTERS = [
  { question: "Which stalled accounts should I rescue first, and how much pipeline is at risk?", grounded_in: "Target Account Journey", grounded_type: "dashboard" },
  { question: "Where are target accounts leaking out of the funnel?", grounded_in: "Target Account Journey", grounded_type: "dashboard" },
  { question: "Is our $1.34M ad spend actually reaching the named accounts?", grounded_in: "Target Account Journey", grounded_type: "dashboard" },
];

// Simple starter chips for the Creative & Ad Performance dashboard — kept light
// for the demo ("explain this dashboard" style), grounded in its own numbers.
const CAP_SAGE_STARTERS = [
  { question: "Explain this dashboard", grounded_in: "Creative & Ad Performance", grounded_type: "dashboard" },
  { question: "Which campaign is performing best?", grounded_in: "Creative & Ad Performance", grounded_type: "dashboard" },
  { question: "Anything I should worry about?", grounded_in: "Creative & Ad Performance", grounded_type: "dashboard" },
];

// Tailored answers so clicking a follow-up reads like a real analyst reply,
// not a canned stub. Keyed by the question text (lowercased).
const FOLLOWUP_REPLIES = {
  "break down the google and linkedin wins by customer segment so i know if it's smb or enterprise driving the return.":
    "It's Enterprise carrying both channels. Google's $373K closed-won is 68% Enterprise ($254K) / 24% Mid-Market / 8% SMB — the true 4.81× ROAS holds because Enterprise deals close at 3.2× the SMB rate. LinkedIn skews even harder: 81% of its $192K is Enterprise, which fits its ABM role. SMB paid spend converts poorly on both — worth a separate look if SMB is a target. Want an ROAS-by-segment cut added as section 7?",
  "which icp accounts in the hand-off queue have the strongest buying signals worth calling this week?":
    "Top 4 of the 12: Northwind Traders (14 LinkedIn ad engagements + pricing-page visit, no open opp), Contoso Ltd (3 stakeholders engaged, matched to a Google closed-won journey pattern), Globex Corp (re-engaged after 40 days quiet), and Initech (demo-page visit + 2 exec follow-ends). Northwind and Contoso are the two I'd call first — both LinkedIn-touched and fit your top winning-journey pattern. Want the full 12 as a prioritized call sheet?",
  "show me where the 78% of untracked closed-won revenue is actually coming from so i know what's really working.":
    "Of the 78% with no paid leadsource: 34% organic search, 22% outbound (SDR-sourced), 14% referral/partner, 8% direct/email. The big signal — most of the organic-search wins have an earlier paid touch that leadsource (last-touch-via-opp) drops, so paid is likely under-credited beyond the 22%. To close that gap you'd need a unified touch table; today's Key Definition can't see it. Want me to flag the deals where a paid touch exists but isn't credited?",
  "draft the 3 spend-reallocation moves as a plan i can approve.":
    "Here's the plan for this week: (1) Cut Meta — reallocate the $25K (0.98× true ROAS) to Google Enterprise campaigns pulling 4.81×; (2) Pause G_Search_NonBrand_Automation, this week's #1 pause candidate, and hold its budget pending WoW recovery; (3) Scale LinkedIn ABM against the 12 hand-off accounts. Net: same $163K spend, projected +$180K–$240K closed-won. Approve and I'll stage it for sign-off.",
  "why is google under-reporting its own roas by 7×?":
    "Google reports 0.65× because it only counts revenue it can tie to a click inside its own window — last-click, cookie-limited, and blind to deals that close 60–90 days later in your CRM. Your true 4.81× measures the same spend against closed-won in Salesforce via opportunity.leadsource. The gap is the sales cycle: Google sources the first touch on nearly every top-3 winning journey, but the deal closes long after its attribution window shuts. This is exactly why platform-reported ROAS isn't board-defensible.",
  "add a demo-conversion leading-indicator block on top.":
    "Added as a supplementary block (section 7): cost-per-demo and demo-to-opp conversion by channel, using Demo Scheduled as the demo definition. Early read — LinkedIn books the priciest demos but they convert to opp at 2.1× Meta's rate, so cheap Meta demos are the leading-indicator version of the same closed-won story. It's a leading signal only; the Scale/Hold/Cut verdicts still come from closed-won.",
};

// Per-session "code version" — bumped whenever the user sends a chat message so
// dashboard-info's code_hash changes, letting the agentic review detect edits.
const codeVersions = {};
export function bumpCodeVersion(sessionId) {
  codeVersions[sessionId] = (codeVersions[sessionId] || 1) + 1;
}
export function codeHashFor(sessionId) {
  return `code-${sessionId}-v${codeVersions[sessionId] || 1}`;
}

// Applying the agentic review's own accepted fixes back to the session is NOT a
// new code change (those fixes came from the review), so it must not bump the
// version — otherwise reopening a just-published dashboard would wrongly think
// the code changed and re-prompt for review instead of "No code change detected".
const REVIEW_SYNC_MARKER = /reviewed fixes from the agentic review/i;

// Sage (Beta) — read-only analytics chat on the Target Account Journey
// dashboard. Grounded in that dashboard's ABM funnel, stalled accounts, and
// paid-spend numbers so the demo reads like a real analyst reply.
function sageReplyTAJ(userText) {
  const t = (userText || "").toLowerCase();
  if (/stall|at.?risk|rescue|stuck|slipping|save|unstick|nudge/.test(t))
    return `**8 accounts are stalled — $788K of pipeline sitting still 60+ days.** Rescue in this order:

- **Tran, Jordan and Williams** — $196K · 118d in Discovery · Google + LinkedIn + Meta engaged. Biggest single risk, all 3 channels touched — get an exec in.
- **Garcia-James** — $144K · 149d stuck in Proposal. Furthest along, most days idle — this is a pricing/legal unblock, not a demand problem.
- **Ferrell, Jones and Lewis** — $116K · 142d in Proposal (Google/LinkedIn/Meta).
- **Perez Inc** — $112K · 139d in Negotiation (LinkedIn/Meta). Closest stage of the four — one push likely closes it.

Those four are $568K of the $788K. Want me to draft outreach plays for each?`;
  if (/leak|funnel|drop|fall|stage|convert|conversion|where.*lose|losing/.test(t))
    return `**The funnel is tight until the opportunity stage — that's where the leak is.**

| Stage | Accounts | Step conversion |
| --- | --- | --- |
| Paid Contact | 121 | — |
| MQL | 119 | 98.3% |
| SQL | 112 | 94.1% |
| Active Opportunity | 78 | **69.6%** |
| Closed Won | 29 | **37.2%** |

Marketing hands off cleanly — 92.6% of reached accounts get to SQL. The two leaks are **SQL → Opportunity** (34 accounts never open an opp) and **Opportunity → Closed Won** (49 opps don't close, and 8 of those are the stalled deals). The bottleneck is sales acceptance and late-stage close, not lead quality.`;
  if (/spend|coverage|reach|reaching|channel|google|linkedin|meta|budget|cover/.test(t))
    return `**Coverage is excellent — the $1.34M is landing on the named accounts.**

- **97.6% paid coverage** — 121 of 124 target accounts got a paid touch. Only **3 accounts** have never been reached; worth a targeted push.
- Spend split: **Google $624K · LinkedIn $508K · Meta $208K.**
- Every stalled account except the two smallest was reached on 2–3 channels, so the risk is *stage progression*, not lack of air cover. I'd hold spend flat and put the energy into the 8 stalled opps and the 3 unreached accounts.`;
  if (/on.?path|winning|healthy|score|best|strongest|good shape|track/.test(t))
    return `**These accounts are furthest along the golden path** (journey score out of 100):

- **Doyle Ltd** — 100 · Education · 9 contacts · already Closed Won
- **Novak PLC** — 97 · Education · 13 contacts
- **Hoffman, Baker and Richards** — 80 · Media · 8 contacts
- **Patterson, Smith and Jones** — 80 · Finance · 9 contacts

High score = multi-channel touch + multi-threaded (many contacts) + late funnel stage. These are your reference journeys — the pattern to replicate on the accounts still at MQL/SQL.`;
  if (/won|revenue|pipeline|win rate|closed|result|how.*doing|performance/.test(t))
    return `**$1.24M won across 29 accounts, $1.12M still open** — the target list is producing.

- **42.0% opportunity win rate** on the accounts that reached an opp.
- **$1.12M active pipeline** across 10 open opps — but $788K of that is in the 8 **stalled** accounts, so the healthy-and-moving pipeline is closer to $330K.
- Biggest lever isn't new demand; it's converting the 78 accounts already in an opportunity (only 29 have closed).

Ask me about the stalled accounts, the funnel leak, or the spend coverage.`;
  if (/summary|overview|tl;?dr|highlight|headline/.test(t))
    return `**TL;DR — the named-account program is working, but late-stage is where deals go to sit.**

- **124 target accounts · 97.6% paid coverage** → **112 reached SQL+**.
- **$1.24M won** (42% opp win rate) with **$1.12M** still open.
- The catch: **8 stalled accounts = $788K** frozen 60+ days, and the funnel only converts **37.2%** of opportunities to won.

Ask me which stalled deals to rescue first, where the funnel leaks, or whether spend is reaching the accounts.`;
  return `**124 target accounts, 97.6% paid coverage, $1.24M won at a 42% opp win rate.** The program reaches its accounts and moves them to SQL well — the drag is late-stage: **8 stalled accounts hold $788K** that's been idle 60+ days.

Ask me which stalled accounts to rescue first, where the funnel is leaking, or whether the $1.34M in spend is actually reaching the named accounts.`;
}

// Sage (Beta) — read-only analytics chat on the Creative & Ad Performance
// dashboard. Kept simple for the demo, grounded in its spend/engagement numbers.
function sageReplyCAP(userText) {
  const t = (userText || "").toLowerCase();
  if (/explain|walk|overview|what.*this|about this|summary|tl;?dr|how.*read/.test(t))
    return `**This dashboard grades your paid creative across Facebook, Google, and LinkedIn over the last 30 days.**

- **$84,210 total spend**, up 16.1% vs the prior 30 days.
- **Facebook** drives the volume — 71,940 link clicks and 1,602 leads at a **$16.40 CPL**.
- **LinkedIn** is the premium channel — only 163 conversions at a **$98.20 CPL** (6× Facebook).
- **Engagement is video-led:** 76.8% of all interactions are video views (301K), so your video creative is doing the heavy lifting.

The three sections below break it down: weekly trend by channel, the engagement mix, and every campaign ranked by spend. Ask me about the best campaign or anything that looks off.`;
  if (/best|top|winner|performing|working|strongest|which campaign|which ad|which creative/.test(t))
    return `**FB_Prospecting_Video_Q3 is your top campaign by spend and reach** — $5,410 spend, 381K impressions, 259K reach, 0.59% CTR.

A couple of standouts underneath it:
- **FB_Carousel_Product** — best CTR at **1.31%** and the cheapest clicks (**$0.09 CPC**), so it converts attention efficiently.
- **FB_Event_Webinar** — **1.65% CTR**, the highest on the board.

The pattern is clear: your **video and carousel creative** out-engage static ads at a fraction of the cost. I'd shift more budget behind those formats.`;
  if (/worry|concern|wrong|issue|problem|off|risk|watch|broken|fix/.test(t))
    return `**One thing to fix: Google is reporting 0 conversions.** It has spent normally and driven 142,880 clicks (up 64%), but recorded **0 conversions in the last 30 days** despite 8,704 historically — that's almost certainly a **tracking/tag break**, not real performance. Worth verifying before you judge Google.

Two softer flags:
- **Facebook CPL is up 34.5%** to $16.40 while leads fell 23% — creative fatigue is setting in on the older ad sets.
- **LinkedIn CPL is $98.20** and climbing; fine for ABM, expensive for volume.

Everything else looks healthy.`;
  return `**Paid creative is running $84,210/mo across Facebook, Google, and LinkedIn**, and engagement is heavily video-led (76.8% of interactions). Facebook drives leads at a $16.40 CPL; LinkedIn is the premium ABM channel at $98.20.

Ask me to explain the dashboard, which campaign is performing best, or anything that looks off.`;
}

// Sage (Beta) — read-only analytics chat on a published dashboard. Answers are
// grounded in the demo dashboard's numbers; it never edits the dashboard.
function sageReply(userText, sessionId) {
  // Goal Sage (opened from the Goals page) — session id carries the goal id
  // ("sage-goal-<id>"); defer to the goal-scoped answers in the goals mock.
  const goalMatch = String(sessionId).match(/^sage-goal-(.+)$/);
  if (goalMatch) return Goals.sageChatGoal(goalMatch[1], userText).reply;
  // Route to the dashboard the chat was opened from (session id carries the
  // dashboard/workflow id, e.g. "sage-pub-dash-target-account-journey").
  if (/target-account/.test(String(sessionId))) return sageReplyTAJ(userText);
  if (/creative/.test(String(sessionId))) return sageReplyCAP(userText);
  const t = (userText || "").toLowerCase();
  if (/pause|move|shift|scale|budget|reallocat|this week|action|do next/.test(t))
    return `**Move budget into Google Display, out of Meta.** Same $163K spend, materially better return. Three moves this week:

- **Pause — G_Search_NonBrand_Automation** (Google Non-Brand). 0.31× ROAS, −50% WoW. Saves ~$1.1K/wk.
- **Shift ~$2K/wk from Meta → G_Display_Prospecting.** 4.81× true ROAS, +36% WoW. Projected **+$41.4K pipeline / 30d**.
- **Flag the Meta portfolio for review** (0.98× ROAS) — but don't cut blindly; it holds **$805K** open pipeline. Run a 2-week hold test on Meta_Summer_Promo_V3 (−85% WoW) first.`;
  if (/waste|wasting|cut|meta|underperform|over.?credit|over.?state/.test(t))
    return `**Meta is the money pit — and the one campaign to pause is on Google.**

- **Meta Ads → 0.98× true ROAS.** $24.7K spend vs $24.3K closed-won — barely breaks even, and it's the *only* channel the platform overstates (claims 1.18×).
- **Don't cut Meta blindly:** it carries **$805K** in open pipeline. Hold-test **Meta_Summer_Promo_V3** (−85% WoW) for 2 weeks first.
- **Stop now:** pause **G_Search_NonBrand_Automation** (0.31× and sliding) — this week's clearest waste.`;
  if (/roas|channel|platform|true|report|google|linkedin|breakdown/.test(t))
    return `**True (CRM-grounded) ROAS vs what the platforms report:**

| Channel | Platform | True |
| --- | --- | --- |
| Google | 0.65× | **4.81×** |
| LinkedIn | 1.28× | **3.14×** |
| Meta | 1.18× | **0.98×** |
| **Blended** | **0.96×** | **3.61×** |

Google is your best channel and its own dashboard is hiding it (under-crediting ~7×). Allocate off platform numbers and you'd defund your winner.`;
  if (/icp|account|hand.?off|sales|call|outreach|sdr|who to/.test(t))
    return `**12 ICP accounts are paid-engaged with no open opp — $666K of potential.** Call these first:

- **Walter, Edwards and Rios** — 9 buyers · 5 SQLs · EMEA
- **Rodriguez LLC** — 7 buyers · 3 SQLs · EMEA
- **Jones Inc** — 6 buyers · 3 SQLs · NA-East
- **Novak PLC** — 5 buyers · 4 SQLs · APAC

All are LinkedIn-touched and fit your top winning journey. Want the full 12 as a call sheet?`;
  if (/journey|path|close|winning|pattern/.test(t))
    return `**All three top closed-won paths start with Google Ads** (its 4.81× ROAS shows up here too):

- **Google → Meta → Google → Closed Won** — $217.7K (2 deals, highest value)
- **Google → LinkedIn → Organic Search → Closed Won** — $195K (4 deals, highest frequency)
- **Google → Email → Closed Won** — $184K (runner-up)

Cutting Google Non-Brand broadly would break the top of every winning funnel.`;
  if (/summary|overview|how.*doing|tl;?dr|highlight|headline/.test(t))
    return `**TL;DR — paid media is working, but the platforms are lying about it.**

- **3.61× CRM-grounded ROAS** on **$163K** spend → **$588.5K** closed-won.
- Platforms report just **0.96×** — Google under-credited, Meta over-credited.
- **One campaign to pause** this week, and **12 warm ICP accounts** with no open opp.

Ask me about any channel, the spend moves, or the accounts to call.`;
  return `**Paid media is returning 3.61× true ROAS on $163K spend** (vs 0.96× platform-reported) — $588.5K closed-won attributed to paid. Google leads at 4.81×, Meta lags at 0.98×.

Ask me where to move spend, which campaign to pause, or which ICP accounts to hand to sales.`;
}

// Open (or resume) a Sage chat session for a dashboard. Start EMPTY so the chat
// shows the rich welcome state (dashboard name + intro + CTAs + follow-ups)
// instead of a plain welcome bubble.
function startSageChat(sid) {
  if (!db.history[sid]) db.history[sid] = [];
  return { session_id: sid };
}

// Natural follow-ups shown after the clarify turn (not the Option A/B chips —
// those duplicated the answer). The demo still advances by typing "option A".
const PMR_CLARIFY_FOLLOWUPS = [
  { question: "Which channels are wasting the most spend right now?", grounded_in: "Paid Media ROI", grounded_type: "skill" },
  { question: "What's our true ROAS vs what the platforms report?", grounded_in: "Paid Media ROI", grounded_type: "skill" },
  { question: "Which ICP accounts are engaging our ads but not in pipeline?", grounded_in: "Paid Media ROI", grounded_type: "skill" },
];

// Detect the scripted Paid Media ROI demo turns from the user's message:
//   "clarify" — the FIRST message in a fresh chat → Sage asks the Option A/B question
//   "report"  — the follow-up (Option A) → Sage builds the dashboard
// The first turn triggers the clarify no matter what's typed, so the demo works
// with any opening prompt; the pre-loaded transcript and Sage dashboard chats
// (non "sess-*" ids) are left alone.
function pmrPhase(userText, sid) {
  const t = (userText || "").trim().toLowerCase();
  // Option A (clicked chip or typed) → build the dashboard.
  if (/\boption a\b/.test(t) || /full paid media roi|paid media roi dashboard|run the full paid media|real roas against closed/.test(t)) return "report";
  // Any first message in a freshly-created chat → the Paid Media ROI clarify.
  const userTurns = (db.history[sid] || []).filter((m) => m.type === "user").length;
  if (String(sid).startsWith("sess-") && userTurns <= 1) return "clarify";
  // Explicit keyword trigger still works in any session.
  if (/paid channel/.test(t) && /(wasting spend|driving demos|wasting money)/.test(t)) return "clarify";
  return null;
}

// Stream the scripted Paid Media ROI turn: tool calls (→ "Completed · N tools"),
// then the reply text word-by-word, then `done` (with the dashboard artifact on
// the report turn, or Option A/B follow-up chips on the clarify turn).
function scriptPaidMediaReply(channel, phase) {
  const tools = phase === "clarify" ? PMR_DISCOVERY_TOOLS : PMR_RUN_TOOLS;
  const text = phase === "clarify" ? PMR_CLARIFY : PMR_REPORT;
  let at = 250;
  tools.forEach(([tool, input_summary]) => {
    const t0 = at;
    setTimeout(() => emit(channel, "agent-event", { type: "tool_call", tool, input: input_summary }), t0);
    setTimeout(() => emit(channel, "agent-event", { type: "tool_result", tool, result_length: 120 }), t0 + 15);
    at += 30;
  });
  at += 250;
  const words = text.split(" ");
  words.forEach((w, i) => {
    setTimeout(() => emit(channel, "agent-event", { type: "text", content: (i === 0 ? "" : " ") + w }), at + i * 14);
  });
  at += words.length * 14 + 150;
  setTimeout(() => {
    if (phase === "report") {
      emit(channel, "agent-event", {
        type: "done",
        outputs: [{ path: "output/dashboard/paid_media_roi.html", title: "Paid Media ROI" }],
        context_tokens: 48200,
        turn_count: 4,
      });
      // Real dashboard follow-ups only after the report is built.
      setTimeout(() => emit(channel, "agent-event", { type: "suggested-questions", questions: FOLLOWUP_QUESTIONS }), 700);
    } else {
      // Show natural follow-ups after the clarify too (not the Option A/B chips).
      emit(channel, "agent-event", { type: "done", context_tokens: 30000, turn_count: 2 });
      setTimeout(() => emit(channel, "agent-event", { type: "suggested-questions", questions: PMR_CLARIFY_FOLLOWUPS }), 700);
    }
  }, at);
}

function simulateAgentReply(sessionId, userText) {
  const isSage = String(sessionId).startsWith("sage-");
  const isReviewSync = REVIEW_SYNC_MARKER.test(userText || "");
  const channel = `session-${sessionId}`;

  // Scripted Paid Media ROI demo — a new chat that plays: prompt → clarify →
  // (Option A) → dashboard. Takes precedence over the generic reply.
  const phase = isSage ? null : pmrPhase(userText, sessionId);
  if (phase) {
    scriptPaidMediaReply(channel, phase);
    return;
  }

  if (!isSage && !isReviewSync) {
    bumpCodeVersion(sessionId);
  }
  const followupReply = FOLLOWUP_REPLIES[(userText || "").trim().toLowerCase()];
  const reply = isSage
    ? sageReply(userText, sessionId)
    : isReviewSync
    ? "Done. I've applied the reviewed adjustments to your dashboard so it stays accurate on every scheduled refresh."
    : followupReply ||
      "Done. I've updated your dashboard and re-ran the queries against the latest data. Let me know if you'd like any other changes.";
  const words = reply.split(" ");
  let i = 0;
  const tick = () => {
    if (i < words.length) {
      emit(channel, "agent-event", { type: "text", content: (i === 0 ? "" : " ") + words[i] });
      i += 1;
      setTimeout(tick, 30);
    } else {
      emit(channel, "agent-event", { type: "done", context_tokens: 26400, turn_count: 3 });
      // Fresh follow-ups for the turn we just answered — delayed so the
      // "Related" loading skeleton has a clear moment to shimmer first.
      const nextQs = /target-account/.test(String(sessionId)) ? TAJ_NEXT_FOLLOWUPS : /creative/.test(String(sessionId)) ? CAP_NEXT_FOLLOWUPS : NEXT_FOLLOWUP_QUESTIONS;
      setTimeout(() => emit(channel, "agent-event", { type: "suggested-questions", questions: nextQs }), 3500);
    }
  };
  setTimeout(tick, 250);
}

const handlers = [
  // ── Petavue auth / user ────────────────────────────────────────────
  {
    method: "POST",
    pattern: /\/api\/v1\/auth\/(login|google-login)$/,
    handler: () => ({
      access_token: makeFakeJwt({ userId: USER_ID, tenantId: TENANT_ID, userRole: "admin", email: currentUser.email }),
      email: currentUser.email,
      isSelfServeUser: false,
      isSelfServeTCAccepted: true,
    }),
  },
  { method: "POST", pattern: /\/api\/v1\/auth\/logout$/, handler: () => ({ success: true }) },
  { method: "GET", pattern: /\/api\/v1\/tenant\/users\/me$/, handler: () => currentUser },
  { method: "POST", pattern: /\/api\/v1\/tenant\/users$/, handler: () => ({ users: [currentUser], total: 1 }) },

  // ── Sessions ───────────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/sessions$/, handler: () => ({ sessions: db.sessions }) },
  {
    method: "POST",
    pattern: /\/api\/sessions$/,
    handler: ({ body }) => {
      const sid = newId("sess");
      const isSkillRun = !!body?.skill_id;
      const session = {
        session_id: sid, name: isSkillRun ? "Skill run" : "New Session",
        session_type: isSkillRun ? "skill_run" : "regular", status: "active",
        skill_id: body?.skill_id || null,
        provider: "anthropic", dashboard_id: body?.dashboard_id || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        turn_count: 0, total_tokens: 0, context_tokens: 0, agent_running: false,
      };
      db.sessions.unshift(session);
      db.history[sid] = [];
      if (isSkillRun) startRun(session, body.skill_id);
      return { session };
    },
  },

  // ── Goals ──────────────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/goals\/workflows$/, handler: () => ({ workflows: Goals.GOAL_WORKFLOWS }) },
  { method: "GET", pattern: /\/api\/goals\/config$/, handler: () => Goals.getConfig() },
  { method: "PUT", pattern: /\/api\/goals\/config$/, handler: ({ body }) => Goals.saveConfig(body) },
  { method: "GET", pattern: /\/api\/goals\/attention$/, handler: () => Goals.attentionFeed() },
  { method: "GET", pattern: /\/api\/goals\/recommendations$/, handler: () => Goals.allRecommendations() },
  { method: "GET", pattern: /\/api\/goals$/, handler: () => ({ goals: Goals.listGoals() }) },
  { method: "POST", pattern: /\/api\/goals$/, handler: ({ body }) => ({ goal: Goals.createGoal(body || {}) }) },
  { method: "GET", pattern: /\/api\/goals\/([^/]+)$/, handler: ({ params }) => Goals.getGoal(params[0]) || { detail: "not found" } },
  { method: "PATCH", pattern: /\/api\/goals\/([^/]+)$/, handler: ({ params, body }) => Goals.updateGoal(params[0], body || {}) },
  { method: "DELETE", pattern: /\/api\/goals\/([^/]+)$/, handler: ({ params }) => Goals.deleteGoal(params[0]) },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/answer$/, handler: ({ params, body }) => Goals.answerGoal(params[0], body?.answers || {}) },
  { method: "POST", pattern: /\/api\/goals\/sage$/, handler: async ({ body }) => { await new Promise((r) => setTimeout(r, 700)); return Goals.sageChat(body?.text || ""); } },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/sage$/, handler: async ({ params, body }) => { await new Promise((r) => setTimeout(r, 700)); return Goals.sageChatGoal(params[0], body?.text || ""); } },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/adjust$/, handler: ({ params, body }) => Goals.adjustGoal(params[0], body?.text || "") },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/save$/, handler: ({ params, body }) => ({ goal: Goals.saveGoal(params[0], body?.name) }) },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/check-in$/, handler: ({ params }) => Goals.runCheckIn(params[0]) },
  { method: "GET", pattern: /\/api\/goals\/([^/]+)\/runs$/, handler: ({ params }) => Goals.runHistory(params[0]) || { detail: "not found" } },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/recommendations\/([^/]+)\/act$/, handler: ({ params, body }) => Goals.actOnRecommendation(params[0], params[1], body?.action, body) },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/notes$/, handler: ({ params, body }) => Goals.addNote(params[0], body?.text || "") },

  // ── Skills v2 run lifecycle ────────────────────────────────────────
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/skill\/progress$/, handler: ({ params }) => getProgress(params[0]) || { step_statuses: {}, clarifications_pending: [], verification_round: 0, finding_count: 0, disclosure_summary: null, blocked_summary: null, key_choices: [] } },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/skill\/plan-summary$/, handler: ({ params }) => getPlanSummary(params[0]) || {} },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/skill\/execute$/, handler: ({ params, body }) => { executeRun(params[0], body?.kept_widgets); return { ok: true }; } },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/skill\/discard$/, handler: ({ params }) => { discardRun(params[0]); return { ok: true }; } },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/skill\/handoff$/, handler: () => ({ ok: true }) },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/skill\/clarify$/, handler: ({ params, body }) => { submitClarification(params[0], body?.answers); return { ok: true }; } },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/history$/, handler: ({ params }) => ({ messages: db.history[params[0]] || [] }) },
  // Grounded follow-up chips for the latest turn (shown under the last message).
  // Slight delay so the "Related" loading skeleton renders before they resolve.
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/recommendations$/, handler: async ({ params }) => { await new Promise((r) => setTimeout(r, 1200)); const sid = String(params[0]); const questions = /target-account/.test(sid) ? TAJ_SAGE_STARTERS : /creative/.test(sid) ? CAP_SAGE_STARTERS : sid.startsWith("sage-") ? PMR_SAGE_STARTERS : FOLLOWUP_QUESTIONS; return { questions }; } },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/files$/, handler: ({ params }) => ({ files: db.fileTree[params[0]] || [], tree: db.fileTree[params[0]] || [] }) },

  // ── Verify & Publish: dashboard detection + widgets ────────────────
  {
    method: "GET",
    pattern: /\/api\/sessions\/([^/]+)\/dashboard-info$/,
    handler: ({ params }) => {
      const widgets = getWidgets(params[0]);
      return { is_react_dashboard: true, title: DASHBOARD_MANIFEST.title, widget_count: widgets.length, widgets, code_hash: codeHashFor(params[0]) };
    },
  },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/published-check$/, handler: () => ({ published: false }) },
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/widgets\/([^/]+)\/verify$/,
    handler: ({ params, body }) => {
      const widgets = getWidgets(params[0]);
      const w = widgets.find((x) => x.id === params[1]);
      const verified = body?.verified !== false;
      if (w) { w.verified = verified; w.verified_at = verified ? new Date().toISOString() : null; }
      return w || { id: params[1], verified, verified_at: verified ? new Date().toISOString() : null };
    },
  },
  {
    method: "GET",
    pattern: /\/api\/sessions\/([^/]+)\/widget-lineage$/,
    handler: ({ query }) => {
      // Per-widget pipelines, keyed by the real dashboard widget ids. Each
      // widget has a DIFFERENT number of steps. Almost every step is unique to
      // its widget — the ONLY crossover is a single shared fetch step used by
      // both Performance scorecard and Channel performance, so verifying it in
      // one place verifies it in the other. Everything else stands alone.
      const step = (id, tool, title, desc, card, code) => ({
        id, tool, status: "success", summary: title, llm_title: title,
        llm_description: desc.map((l) => `- ${l}`).join("\n"),
        llm_card: { instructions: card.i || [], conditions: card.c || [], outputs: card.o || [] },
        code_preview: code,
      });

      // ── The one shared step (scorecard ↔ channel_table) ──
      const S_FETCH_PAID = step("s_fetch_paid", "query_athena", "Pull paid spend & conversions",
        ["Aggregate spend, clicks and conversions by channel and campaign", "Trailing 90-day window"],
        { i: ["Read {{spend}}, {{clicks}} and {{conversions}} from {{ns_paid_events}}.", "Group by {{channel}} and {{campaign}}."], c: ["Trailing 90 days.", "Test campaigns are excluded."], o: ["One row per campaign per day, as {{paid_daily}}."] },
        "SELECT channel, campaign, SUM(spend) spend, SUM(conversions) conv\nFROM ns_paid_events\nWHERE event_date >= current_date - 90\nGROUP BY channel, campaign");

      const W = {
        // Performance scorecard — 6 steps (shares S_FETCH_PAID)
        scorecard: { chain: [
          S_FETCH_PAID,
          step("q_scorecard_crm", "query_athena", "Pull closed-won revenue",
            ["Read closed-won opportunity revenue from the CRM", "Current fiscal quarter"],
            { i: ["Read {{amount}} and {{account_id}} from {{salesforce_opportunity}}."], c: ["Only {{stage}} = Closed Won."], o: ["Closed-won revenue, as {{crm_won}}."] },
            "SELECT account_id, amount\nFROM salesforce_opportunity\nWHERE stage = 'Closed Won'"),
          step("x_scorecard_attr", "execute_code", "Attribute revenue to spend",
            ["Tie closed-won revenue back to the paid touches that drove it"],
            { i: ["Join {{crm_won}} to {{paid_daily}} within a 90-day lookback."], o: ["Attributed revenue per channel, as {{attributed}}."] },
            "attributed = attribute(paid_daily, crm_won, lookback_days=90)"),
          step("x_scorecard_roas", "execute_code", "Compute true ROAS & CPL",
            ["Derive true ROAS and cost-per-lead from attributed revenue"],
            { i: ["True ROAS = attributed revenue / total {{spend}}.", "CPL = total {{spend}} / {{conversions}}."], o: ["Headline ROAS and CPL figures."] },
            "true_roas = attributed['rev'].sum() / spend_total\ncpl = spend_total / conversions"),
          step("x_scorecard_rollup", "execute_code", "Roll up the six KPIs",
            ["Assemble spend, ROAS, CPL, conversions, closed-won and CTR"], { o: ["A {{scorecard}} object with all six KPIs."] },
            "scorecard = {'spend': spend_total, 'roas': true_roas, 'cpl': cpl, ...}"),
          step("r_scorecard", "write_file", "Render the scorecard row",
            ["Lay out the six KPIs as the headline scorecard"], { o: ["The Performance scorecard row."] },
            "export default function Scorecard({ data }) { /* KPI row */ }"),
        ], feeds: [["Channel performance", "widgets/channel_table.html"]] },

        // Spend by channel — 3 steps (independent)
        spend_by_channel: { chain: [
          step("q_spend", "query_athena", "Pull spend by channel",
            ["Sum 90-day spend for each paid channel"],
            { i: ["Sum {{spend}} from {{ns_paid_events}} grouped by {{channel}}."], c: ["Trailing 90 days."], o: ["Spend per channel, as {{spend_by_channel}}."] },
            "SELECT channel, SUM(spend) spend\nFROM ns_paid_events\nWHERE event_date >= current_date - 90\nGROUP BY channel"),
          step("x_spend_share", "execute_code", "Compute each channel's share",
            ["Turn absolute spend into a percentage of total"], { o: ["A {{pct}} column per channel."] },
            "df['pct'] = df['spend'] / df['spend'].sum()"),
          step("r_spend", "write_file", "Render the spend bars",
            ["Draw one bar per channel sized by share of spend"], { o: ["The Spend by channel bars."] },
            "export default function SpendByChannel({ data }) { /* bars */ }"),
        ], feeds: [] },

        // ROAS trend — 5 steps (independent)
        roas_trend: { chain: [
          step("q_weekly_spend", "query_athena", "Pull weekly spend & conversions",
            ["Bucket spend and conversions into ISO weeks", "Last 12 weeks"],
            { i: ["Group {{spend}} and {{conversions}} by ISO week."], c: ["Last 12 weeks."], o: ["Weekly spend and conversions, as {{weekly}}."] },
            "SELECT date_trunc('week', event_date) wk, SUM(spend), SUM(conversions)\nFROM ns_paid_events\nGROUP BY 1"),
          step("q_weekly_rev", "query_athena", "Pull weekly closed-won revenue",
            ["Bucket closed-won revenue into the same ISO weeks"],
            { i: ["Group {{amount}} from {{salesforce_opportunity}} by ISO week."], o: ["Weekly revenue, as {{weekly_rev}}."] },
            "SELECT date_trunc('week', close_date) wk, SUM(amount)\nFROM salesforce_opportunity\nWHERE stage='Closed Won'\nGROUP BY 1"),
          step("x_weekly_roas", "execute_code", "Compute weekly true ROAS",
            ["Divide weekly revenue by weekly spend"], { o: ["A true-ROAS value per week, as {{weekly_roas}}."] },
            "weekly_roas = weekly_rev['amount'] / weekly['spend']"),
          step("x_smooth", "execute_code", "Smooth the 12-week series",
            ["Apply a light rolling average so the line reads cleanly"], { c: ["3-week centred window."], o: ["The smoothed series for the sparkline."] },
            "series = weekly_roas.rolling(3, center=True).mean()"),
          step("r_trend", "write_file", "Render the trend sparkline",
            ["Draw the 12-week ROAS sparkline with the latest value"], { o: ["The ROAS trend chart."] },
            "export default function RoasTrend({ data }) { /* sparkline */ }"),
        ], feeds: [] },

        // Channel performance — 7 steps (shares S_FETCH_PAID)
        channel_table: { chain: [
          S_FETCH_PAID,
          step("q_platform_roas", "query_athena", "Pull platform-reported ROAS",
            ["Read the ROAS each ad platform reports for itself"],
            { i: ["Read {{reported_roas}} per {{channel}} from {{platform_stats}}."], o: ["Platform-reported ROAS per channel."] },
            "SELECT channel, reported_roas FROM platform_stats"),
          step("q_channel_rev", "query_athena", "Pull CRM revenue by channel",
            ["Read closed-won revenue attributable to each channel"],
            { i: ["Sum {{amount}} from {{salesforce_opportunity}} by first-touch {{channel}}."], o: ["Closed-won revenue per channel."] },
            "SELECT first_touch_channel channel, SUM(amount) rev\nFROM salesforce_opportunity\nWHERE stage='Closed Won'\nGROUP BY 1"),
          step("x_channel_attr", "execute_code", "Attribute revenue to channels",
            ["Distribute closed-won revenue across the channels that touched it"],
            { i: ["Weight {{rev}} across {{paid_daily}} touches per account."], o: ["Attributed revenue per channel."] },
            "attr = attribute_by_channel(paid_daily, channel_rev)"),
          step("x_channel_cpa", "execute_code", "Compute CPA per channel",
            ["Divide channel spend by channel conversions"], { o: ["A {{cpa}} column per channel."] },
            "df['cpa'] = df['spend'] / df['conv']"),
          step("x_true_vs_platform", "execute_code", "Compare true vs platform ROAS",
            ["Put platform-reported and CRM-true ROAS side by side"], { c: ["Channels under $500 spend pooled into Other."], o: ["The full channel comparison, as {{channel_table}}."] },
            "df['true_roas'] = attr['rev'] / df['spend']"),
          step("r_channel_table", "write_file", "Render the channel table",
            ["Render the per-channel table with true ROAS bolded"], { o: ["The Channel performance table."] },
            "export default function ChannelTable({ data }) { /* table */ }"),
        ], feeds: [["Performance scorecard", "widgets/scorecard.html"]] },

        // Top campaigns — 4 steps (independent)
        top_campaigns: { chain: [
          step("q_campaigns", "query_athena", "Pull campaign performance",
            ["Read spend, conversions and revenue per campaign", "Last 90 days"],
            { i: ["Read {{spend}}, {{conversions}} and {{revenue}} from {{campaign_stats}}."], c: ["Last 90 days."], o: ["One row per campaign, as {{campaigns}}."] },
            "SELECT campaign, SUM(spend), SUM(conversions), SUM(revenue)\nFROM campaign_stats\nGROUP BY campaign"),
          step("x_campaign_roas", "execute_code", "Compute true ROAS per campaign",
            ["Divide attributed revenue by spend for each campaign"], { o: ["A true-ROAS value per campaign."] },
            "df['roas'] = df['revenue'] / df['spend']"),
          step("x_campaign_rank", "execute_code", "Rank & measure movement",
            ["Sort by true ROAS and compute week-over-week change"], { c: ["Top 4 surfaced."], o: ["Ranked campaigns with WoW deltas, as {{top_campaigns}}."] },
            "top = df.sort_values('roas', ascending=False).head(4)"),
          step("r_campaigns", "write_file", "Render the campaigns list",
            ["Render each campaign with its ROAS and movement chip"], { o: ["The Top campaigns list."] },
            "export default function TopCampaigns({ data }) { /* list */ }"),
        ], feeds: [] },

        // Audience performance — 5 steps (independent)
        audience_perf: { chain: [
          step("q_audience", "query_athena", "Pull conversions by segment",
            ["Read conversions grouped by audience segment"],
            { i: ["Group {{conversions}} by {{segment}} from {{ns_paid_events}}."], o: ["Conversions per segment."] },
            "SELECT segment, SUM(conversions) conv\nFROM ns_paid_events\nGROUP BY segment"),
          step("q_segment_rev", "query_athena", "Pull revenue by segment",
            ["Read closed-won revenue for each audience segment"],
            { i: ["Sum {{amount}} by {{segment}} from the CRM join."], o: ["Revenue per segment."] },
            "SELECT segment, SUM(amount) rev\nFROM crm_segment_rev\nGROUP BY segment"),
          step("x_segment_roas", "execute_code", "Compute ROAS per segment",
            ["Divide segment revenue by segment spend"], { o: ["A true-ROAS value per segment."] },
            "df['roas'] = df['rev'] / df['spend']"),
          step("x_segment_sort", "execute_code", "Sort segments by ROAS",
            ["Order segments best-to-worst so the scale-into targets lead"], { o: ["Sorted segments, as {{audience}}."] },
            "df = df.sort_values('roas', ascending=False)"),
          step("r_audience", "write_file", "Render the audience bars",
            ["Draw one bar per segment sized by true ROAS"], { o: ["The Audience performance bars."] },
            "export default function AudiencePerf({ data }) { /* bars */ }"),
        ], feeds: [] },

        // Budget pacing — 3 steps (independent)
        budget_pacing: { chain: [
          step("q_pacing", "query_athena", "Pull month-to-date spend vs plan",
            ["Read MTD spend and the planned budget per channel"],
            { i: ["Read MTD {{spend}} and {{budget}} per {{channel}}."], o: ["Spend vs plan per channel, as {{pacing}}."] },
            "SELECT channel, mtd_spend, budget\nFROM channel_budget"),
          step("x_project", "execute_code", "Project end-of-period pacing",
            ["Extrapolate MTD spend to a full-period projection", "Flag channels pacing over plan"],
            { c: ["Flag any channel projected > 100% of budget."], o: ["A pacing percentage and over/under flag per channel."] },
            "df['pace'] = df['mtd_spend'] / df['budget'] * (days_in_month / day_of_month)"),
          step("r_pacing", "write_file", "Render the pacing bars",
            ["Draw spend-vs-plan bars with the over-pacing channel called out"], { o: ["The Budget pacing bars."] },
            "export default function BudgetPacing({ data }) { /* bars */ }"),
        ], feeds: [] },
      };

      const key = (query?.path || "").split("/").pop().replace(/\.(html|jsx|json)$/i, "");
      const w = W[key] || W.scorecard;
      return {
        widget_id: key,
        widget_file: `widgets/${key}.html`,
        main_chat_edits_count: 0,
        chain: w.chain,
        also_feeds_into: w.feeds.map(([widget_name, file_path]) => ({ widget_name, file_path })),
      };
    },
  },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/widget-window-preview$/, handler: () => ({ messages: [] }) },

  // ── Verify & Publish: recipe extraction ────────────────────────────
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/recipe$/,
    handler: ({ params }) => {
      const recipe = db.recipesBySession[params[0]] || DASH_RECIPE;
      db.recipesBySession[params[0]] = recipe;
      return { recipe, session_id: params[0], code_to_nl: true, step_graph: false };
    },
  },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/recipe\/verify\/draft$/, handler: () => ({ has_draft: false }) },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/recipe\/verify\/(run-all|draft-update)$/, handler: () => ({ ok: true }) },
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/recipe\/exec\/draft$/, handler: () => ({ has_draft: false }) },

  // ── Verify & Publish: exec init / start / sync / cancel ────────────
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/recipe\/exec\/init$/,
    handler: ({ params, body }) => {
      const execSid = newId("exec");
      const recipe = body?.recipe || db.recipesBySession[params[0]] || DASH_RECIPE;
      db.execSessions[execSid] = {
        sessionId: params[0], recipe, channel: `recipe-exec-${execSid}`,
        statuses: {}, hardening: {}, phase: "ready",
      };
      return { exec_session_id: execSid, channel: `recipe-exec-${execSid}`, status: "ready", total_steps: recipe.steps?.length || 0 };
    },
  },
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/recipe\/exec\/start$/,
    handler: ({ body }) => {
      const execSid = body?.exec_session_id;
      const es = db.execSessions[execSid];
      const skipHardening = body?.skip_hardening === true;
      if (es) {
        es.statuses = {}; es.hardening = {}; es.phase = "executing";
        streamExec(execSid, skipHardening);
      }
      return { status: "running", channel: es ? es.channel : `recipe-exec-${execSid}`, phase: "executing" };
    },
  },
  {
    method: "GET",
    pattern: /\/api\/sessions\/([^/]+)\/recipe\/exec\/sync$/,
    handler: ({ query }) => {
      const es = db.execSessions[query.exec_session_id];
      if (!es) return { status: "unknown", steps: [], diffs: {} };
      const diffs = {};
      for (const [sid, h] of Object.entries(es.hardening)) {
        if (h.status === "hardened") {
          const step = es.recipe.steps.find((s) => s.id === sid);
          if (step) diffs[sid] = makeDiff(step);
        }
      }
      const status = es.phase === "hardening" ? "hardening" : es.phase === "done" ? "success" : "executing";
      return { status, steps: syncSteps(es), diffs };
    },
  },
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/recipe\/exec\/cancel$/,
    handler: ({ body }) => {
      const es = db.execSessions[body?.exec_session_id];
      if (es) emit(es.channel, "agent-cancelled", {});
      return { ok: true };
    },
  },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/recipe\/exec\/feedback$/, handler: () => ({ ok: true }) },

  // ── Verify & Publish: AI preview (agent_memo) ──────────────────────
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/ai-preview\/start$/,
    handler: ({ params, body }) => {
      const channel = `session-${params[0]}-aipreview`;
      setTimeout(() => emit(channel, "agent-event", { type: "done" }), 1200);
      return { preview_session_id: newId("aiprev"), channel, memo_path: `agent_memo/${body?.filename || "memo"}.md` };
    },
  },
  {
    method: "GET",
    pattern: /\/api\/sessions\/([^/]+)\/ai-preview\/result$/,
    handler: () => ({
      has_result: true,
      content: PMR_SUMMARY_MD,
    }),
  },
  { method: "DELETE", pattern: /\/api\/sessions\/([^/]+)\/ai-preview$/, handler: () => ({ ok: true }) },

  // ── Sessions: chat / misc ──────────────────────────────────────────
  {
    method: "POST",
    pattern: /\/api\/sessions\/([^/]+)\/chat$/,
    handler: ({ params, body }) => {
      const sid = params[0];
      (db.history[sid] ||= []).push({ type: "user", text: body?.message || "", timestamp: Date.now() });
      simulateAgentReply(sid, body?.message || "");
      return { ok: true };
    },
  },
  { method: "POST", pattern: /\/api\/sessions\/([^/]+)\/(cancel|upload|slack-test|skills\/sync)$/, handler: ({ match }) => (match[2] === "upload" ? { uploads: [] } : { ok: true, pushed: 0, pulled: 0 }) },
  {
    method: "PATCH",
    pattern: /\/api\/sessions\/([^/]+)$/,
    handler: ({ params, body }) => {
      const s = db.sessions.find((x) => x.session_id === params[0]);
      if (s && body?.name) s.name = body.name;
      return s || { ok: true };
    },
  },
  { method: "DELETE", pattern: /\/api\/sessions\/([^/]+)\/messages\/last$/, handler: () => ({ ok: true }) },
  {
    method: "DELETE",
    pattern: /\/api\/sessions\/([^/]+)$/,
    handler: ({ params }) => {
      db.sessions = db.sessions.filter((x) => x.session_id !== params[0]);
      return { archive: { archived: 0 } };
    },
  },
  {
    method: "GET",
    pattern: /\/api\/sessions\/([^/]+)$/,
    handler: ({ params }) => {
      const s = db.sessions.find((x) => x.session_id === params[0]);
      return s || { session_id: params[0], name: "Session", session_type: "regular", status: "active" };
    },
  },

  // ── Workflows ──────────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/workflows\/check$/, handler: () => ({ exists: db.linkedWorkflows.length > 0, workflows: db.linkedWorkflows }) },
  // Sage (Beta) chat — open a read-only analytics chat for a dashboard.
  { method: "POST", pattern: /\/api\/workflows\/([^/]+)\/chat$/, handler: ({ params }) => startSageChat(`sage-wf-${params[0]}`) },
  { method: "POST", pattern: /\/api\/published\/([^/]+)\/chat$/, handler: ({ params }) => startSageChat(`sage-pub-${params[0]}`) },
  // Goal Sage — open a streaming chat session scoped to one goal.
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/chat$/, handler: ({ params }) => startSageChat(`sage-goal-${params[0]}`) },
  { method: "GET", pattern: /\/api\/workflows\/dashboards\/all$/, handler: () => ({ dashboards: db.dashboards }) },
  { method: "GET", pattern: /\/api\/workflows\/dashboards\/([^/]+)\/explanation$/, handler: ({ params }) => {
    const toolType = (t) => (t === "query_athena" ? "athena_query" : t === "execute_code" ? "python_code" : "write_file");
    return {
      workflow_name: (db.dashboards.find((d) => d.dashboard_id === params[0]) || {}).name || "Dashboard",
      explanation: {
        groups: DASH_RECIPE.groups.map((g) => ({ group_title: g.name, summary: g.summary, step_ids: g.steps })),
        steps: Object.fromEntries(DASH_RECIPE.steps.map((s) => [s.id, { title: s.summary.title, explanation: s.summary.explanation, card: s.summary.card }])),
      },
      block_meta: Object.fromEntries(DASH_RECIPE.steps.map((s) => {
        const type = toolType(s.tool);
        return [s.id, { type, label: s.summary.title, code: s.code, code_language: type === "athena_query" ? "sql" : "python" }];
      })),
    };
  } },
  { method: "PUT", pattern: /\/api\/workflows\/dashboards\/([^/]+)$/, handler: ({ params, body }) => { const d = db.dashboards.find((x) => x.dashboard_id === params[0]); if (d) { if (body?.name) { d.name = body.name; d.title = body.name; } if (typeof body?.shared === "boolean") d.shared = body.shared; } return d || { ok: true }; } },
  { method: "DELETE", pattern: /\/api\/workflows\/dashboards\/([^/]+)$/, handler: ({ params }) => { db.dashboards = db.dashboards.filter((x) => x.dashboard_id !== params[0]); return { ok: true }; } },
  { method: "GET", pattern: /\/api\/workflows\/dashboards\/([^/]+)$/, handler: ({ params }) => db.dashboards.find((d) => d.dashboard_id === params[0]) || db.dashboards[0] },
  {
    method: "GET",
    pattern: /\/api\/workflows\/([^/]+)\/publish-status$/,
    handler: ({ params }) => {
      const pub = db.publishedWorkflows[params[0]];
      return pub ? { publish_complete: true, dashboard_id: pub.dashboard_id, dashboard_url: `/dashboards/${pub.dashboard_id}` } : { publish_complete: false };
    },
  },
  { method: "GET", pattern: /\/api\/workflows\/([^/]+)\/runs$/, handler: ({ params }) => {
    const wf = db.workflows.find((w) => w.workflow_id === params[0]);
    const blocks = wf?.blocks || [];
    if (!blocks.length) return { runs: [] };
    const iso = (mins) => new Date(Date.now() - mins * 60000).toISOString();
    const mkRun = (runId, mins, failTail) => {
      const block_results = blocks.map((b, i) => ({
        block_id: b.id,
        label: b.label,
        status: failTail && i === blocks.length - 1 ? "failed" : "success",
        duration_ms: 220 + i * 180,
      }));
      const total = block_results.reduce((s, r) => s + r.duration_ms, 0);
      return {
        run_id: runId,
        status: failTail ? "failed" : "success",
        trigger_type: wf?.trigger?.type === "cron" ? "Scheduled" : "Manual",
        started_at: iso(mins),
        total_duration_ms: total,
        total_llm_tokens: { input: 1840, output: 320 },
        error: failTail ? "Slack post failed: channel not found (#revenue)" : null,
        block_results,
      };
    };
    return { runs: [mkRun("run-3", 200, false), mkRun("run-2", 1640, false), mkRun("run-1", 3080, true)] };
  } },
  { method: "GET", pattern: /\/api\/workflows$/, handler: () => ({ workflows: db.workflows }) },
  { method: "GET", pattern: /\/api\/workflows\/([^/]+)$/, handler: ({ params }) => db.workflows.find((w) => w.workflow_id === params[0]) || db.workflows[0] },
  {
    method: "POST",
    pattern: /\/api\/workflows$/,
    handler: ({ body }) => {
      const isUpdate = !!body?.workflow_id;
      const wfId = isUpdate ? body.workflow_id : newId("wf");
      const dashId = newId("dash");
      const name = body?.name || "Untitled Dashboard";
      // Point the published dashboard at the matching artifact so "View
      // dashboard" opens the right one (Paid Media ROI vs the default).
      const targetFile = /paid.?media|roas|paid.?media.?roi/i.test(name)
        ? "output/dashboard/paid_media_roi.html"
        : "output/dashboard/revenue_dashboard.html";
      if (!isUpdate) {
        db.workflows.unshift({
          _id: wfId, workflow_id: wfId, name, status: "active", shared: false,
          auto_refresh: body?.auto_refresh !== false, created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), blocks: body?.extra_blocks || [], owner_id: USER_ID,
        });
        db.dashboards.unshift({
          _id: dashId, dashboard_id: dashId, id: dashId, name, title: name, shared: false,
          status: "published", source: "workflow", workflow_id: wfId, owner_id: USER_ID,
          target_file: targetFile, tenant_timezone: "UTC",
          latest_run: { status: "success", refreshed_at: new Date().toISOString() },
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(), widgets: [],
        });
      }
      db.publishedWorkflows[wfId] = { dashboard_id: dashId };
      // Background "publish complete" notification.
      setTimeout(() => emit(`workflow-${wfId}`, "workflow-published", { dashboard_id: dashId }), 1400);
      return { workflow_id: wfId, name, status: "active", updated: isUpdate, dashboard_id: dashId };
    },
  },

  // ── Skills ─────────────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/skills$/, handler: () => ({ skills: db.skills }) },
  { method: "GET", pattern: /\/api\/skills\/([^/]+)$/, handler: ({ params }) => db.skills.find((s) => s.id === params[0]) || db.skills[0] },
  { method: "GET", pattern: /\/api\/skill-runs\/active$/, handler: () => ({ active_runs: listActiveRuns() }) },

  // ── Schedules ──────────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/schedules$/, handler: () => ({ schedules: db.schedules }) },
  { method: "GET", pattern: /\/api\/schedules\/([^/]+)$/, handler: ({ params }) => db.schedules.find((s) => s.schedule_id === params[0]) || db.schedules[0] },

  // ── Feature flags ──────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/(users\/me|tenant)\/feature-flags$/, handler: () => ({ flags: {}, feature_flags: {} }) },

  // ── Folders (summary destination) ──────────────────────────────────
  { method: "GET", pattern: /\/api\/folders$/, handler: () => ({ folders: ["agent_memo", "reports", "weekly-summaries"] }) },

  // ── Slack ──────────────────────────────────────────────────────────
  { method: "GET", pattern: /\/api\/slack\/connection$/, handler: () => ({ connected: true }) },
  {
    method: "GET",
    pattern: /\/api\/slack\/channels$/,
    handler: () => ({ channels: [{ id: "C1", name: "dashboards" }, { id: "C2", name: "revenue" }, { id: "C3", name: "gtm-leadership" }], next_cursor: null }),
  },
  { method: "GET", pattern: /\/api\/slack\/users$/, handler: () => ({ users: [{ id: "U1", name: "Demo User" }], next_cursor: null }) },
  { method: "GET", pattern: /\/api\/slack\/configured-alerts$/, handler: () => ({ alerts: [] }) },
];

export default handlers;
