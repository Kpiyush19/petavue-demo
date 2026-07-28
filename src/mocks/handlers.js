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
// Starter questions shown in the Sage (Beta) chat opened FROM the Paid Media ROI
// dashboard — the "what can I ask?" chips, customized to this dashboard.
const PMR_SAGE_STARTERS = [
  { question: "What's our true ROAS by channel vs what the platforms report?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
  { question: "Where should I move budget this week?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
  { question: "Which ICP accounts should sales call?", grounded_in: "Paid Media ROI", grounded_type: "dashboard" },
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

// Sage (Beta) — read-only analytics chat on a published dashboard. Answers are
// grounded in the demo dashboard's numbers; it never edits the dashboard.
function sageReply(userText) {
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
    ? sageReply(userText)
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
      setTimeout(() => emit(channel, "agent-event", { type: "suggested-questions", questions: NEXT_FOLLOWUP_QUESTIONS }), 3500);
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
  { method: "POST", pattern: /\/api\/goals\/sage$/, handler: ({ body }) => Goals.sageChat(body?.text || "") },
  { method: "POST", pattern: /\/api\/goals\/([^/]+)\/sage$/, handler: ({ params, body }) => Goals.sageChatGoal(params[0], body?.text || "") },
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
  { method: "GET", pattern: /\/api\/sessions\/([^/]+)\/recommendations$/, handler: async ({ params }) => { await new Promise((r) => setTimeout(r, 1200)); return { questions: String(params[0]).startsWith("sage-") ? PMR_SAGE_STARTERS : FOLLOWUP_QUESTIONS }; } },
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
    handler: () => ({
      widget_id: "revenue_trend",
      widget_file: "widgets/revenue_trend.jsx",
      main_chat_edits_count: 0,
      // LineagePanel reads `chain` (steps) + `also_feeds_into` (sibling widgets).
      chain: [
        {
          id: "step_1", tool: "query_athena", status: "success",
          summary: "Pull monthly revenue", llm_title: "Pull monthly revenue",
          llm_description: "- Aggregate order amounts by month\n- Limit to the current quarter with a dynamic date window",
          code_preview: "SELECT month, SUM(amount) AS revenue\nFROM ns_demo_orders\nGROUP BY month\nORDER BY month",
        },
        {
          id: "step_4", tool: "write_file", status: "success",
          summary: "Build the revenue chart", llm_title: "Build the revenue chart",
          llm_description: "- Render a bar per month from the query results\n- Reads from data/revenue_by_month.csv",
          code_preview: "export default function RevenueTrend({ data }) {\n  /* bar chart */\n}",
        },
      ],
      also_feeds_into: [
        { widget_name: "Scoreboard", file_path: "widgets/scoreboard.jsx" },
      ],
    }),
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
