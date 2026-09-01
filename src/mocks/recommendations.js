/**
 * The decision queue.
 *
 * Every string and number here is transcribed from handoff v4 Part III. Nothing
 * is generated, and nothing is rounded: the finding rows add up to the headline
 * figure on purpose, because a table whose totals do not reconcile is the exact
 * thing that makes a recommendation read as an unsupported AI claim.
 *
 * The shape is deliberately flat and content-shaped rather than goal-shaped.
 * These used to live inside `goals.js`, hanging off check-ins and conditions
 * from the retired goals model, which had no room for a symptom, a scope line,
 * or actual offending rows.
 *
 * Urgency and lifecycle are separate axes and must stay that way. Urgency is
 * how soon this should be decided; lifecycle is where the decision has got to.
 * Collapsing them is what produced a queue where a deferred item read as
 * "acted".
 */

export const URGENCY = {
  "act-now": { key: "act-now", label: "Act now" },
  "this-week": { key: "this-week", label: "This week" },
  monitor: { key: "monitor", label: "Monitor" },
};

export const LIFECYCLE = {
  "needs-decision": { key: "needs-decision", label: "Needs your decision" },
  approved: { key: "approved", label: "Approved" },
  applying: { key: "applying", label: "Applying" },
  applied: { key: "applied", label: "Applied" },
  confirmed: { key: "confirmed", label: "Confirmed in platform" },
  "impact-ready": { key: "impact-ready", label: "Impact assessed" },
  held: { key: "held", label: "On hold" },
  rejected: { key: "rejected", label: "Rejected" },
  superseded: { key: "superseded", label: "Superseded" },
  expired: { key: "expired", label: "Expired" },
  failed: { key: "failed", label: "Failed" },
};

const ITEMS = [
  {
    id: "rec-wasted-spend-01",
    workflowId: "wasted-spend",
    agent: "demand",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "08", at: "Sep 1, 7:02 AM" },
    shortTitle: "Add 14 negative keywords",
    title: "Add 14 negative keywords to block irrelevant search traffic",
    basis: "$2,310 of last month's $9,800 search spend went to queries with zero fit.",
    changeTitle: "Add 14 negative keywords to two campaigns",
    changeCols: ["Campaign", "Negatives to add", "Wasted spend cut"],
    changeRows: [
      ["Brand + Generic Search", '"free", "salary", "jobs", "course", "template" +4 more', "$1,480/mo"],
      ["Competitor Conquest", '"login", "pricing calculator", "support" +2 more', "$830/mo"],
    ],
    entities: "14 negative keywords",
    projection: "Spend on the blocked queries after the change: $0 per month.",
    guardrail: "Negatives are checked against the approved product and brand exception list before anything is added.",
    checkResult: "Sep 15",
    when: "Apply the change today because these queries currently spend about $77 per day.",
    expected: "Redirect 24% of search spend toward queries that have produced qualified outcomes.",
    needsFromYou: null,
    symptom: "Search spend increased 12% during the last 30 days while CRM-qualified outcomes remained flat.",
    examined:
      "The workflow analyzed 1,240 queries and $9,800 of spend from the last 30 days, then used 90 days of CRM history containing 312 outcomes to judge query quality.",
    findingCols: ["Query", "Spend", "Clicks", "Qualified outcomes"],
    findingRows: [
      ['"free crm template"', "$312", "41", "0"],
      ['"marketing manager salary"', "$288", "37", "0"],
      ['"crm course online"', "$245", "29", "0"],
      ['"competitor login"', "$198", "52", "0"],
      ["+10 more queries", "$1,267", "176", "0"],
    ],
    therefore:
      "These 14 terms consumed $2,310, or 24% of search spend, without producing a qualified outcome. Add them as negatives to the two campaigns listed above.",
  },
  {
    id: "rec-delivery-leaks-01",
    workflowId: "delivery-leaks",
    agent: "delivery",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "06", at: "Sep 1" },
    shortTitle: "Pause leaking hours and locations",
    title: "Pause low-performing hours and locations in two campaigns",
    basis:
      "The flagged hours and locations consumed 12% of the reviewed spend but produced only one conversion in 90 days.",
    changeTitle: "Two schedule changes, one geo change",
    changeCols: ["Campaign", "Change"],
    changeRows: [
      ["US Pipeline Prospecting", "Pause delivery from 12 a.m. to 6 a.m. on weekdays and throughout Sunday"],
      ["US Pipeline Prospecting", "Exclude Wyoming, Montana, and Alaska; concentrate spend on 12 converting metros"],
      ["Brand Search", "Pause Saturday 12 a.m. to 8 a.m."],
    ],
    entities: "3 delivery changes",
    projection: "Delivery continues in the 12 converting metros during business hours.",
    guardrail: "The 12 converting metros and business-hours delivery are left untouched.",
    checkResult: "Sep 15",
    when: "Apply the changes this week.",
    expected: "Redirect about $1,120 per month into hours and locations that have produced conversions.",
    needsFromYou: null,
    symptom:
      "The cost per conversion for US Pipeline Prospecting increased 19% in 60 days even though its bids and budget did not change.",
    examined:
      "The workflow analyzed $28,400 of spend and 214 conversions over 90 days by hour, day of week, and state.",
    findingCols: ["Segment", "Spend (90d)", "Conversions", "Cost/conv"],
    findingRows: [
      ["Weekdays, 12 a.m. to 6 a.m.", "$1,840", "1", "$1,840"],
      ["Sunday, all day", "$760", "0", "None"],
      // v4 prints ":" in this cell, which is a typo in the source table. Two
      // segments produced no conversions per the Therefore line, so it reads
      // "None" like the Sunday row above it.
      ["WY + MT + AK", "$760", "0", "None"],
      ["12 converting metros, business hours", "$19.8K", "201", "$99"],
    ],
    therefore:
      "The flagged segments consumed $3,360, or 12% of the reviewed spend. Their cost per conversion was up to 19 times the account average, and two segments produced no conversions. Apply the schedule and location changes listed above.",
  },
  {
    id: "rec-audience-sharpening-01",
    workflowId: "audience-sharpening",
    agent: "delivery",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "8 accounts",
    run: { n: "09", at: "Sep 1" },
    shortTitle: "Cap 8 saturated accounts",
    title: "Cap 8 saturated accounts at 200 impressions per week",
    basis: "8 accounts took 41% of impressions; 63 tier-1 targets got fewer than 50 each.",
    changeTitle: "The caps, refreshed daily by the workflow",
    changeCols: ["Action", "Accounts"],
    changeRows: [
      ["Cap at 200 imp/week", "Accenture, TCS, Infosys +5 (already engaged, no new pipeline in 60d)"],
      ["Release budget toward", "63 tier-1 accounts currently under 50 imp/week (list attached)"],
    ],
    entities: "8 account caps",
    projection: "Tier-one coverage after change: about 70%, up from 37%.",
    guardrail: "Accounts with an open opportunity or an active sales sequence are never capped.",
    checkResult: "Sep 8",
    when: "Apply the caps today. The workflow will recalculate them at 7 a.m. each day.",
    expected: "Increase tier-one account coverage from 37% to about 70% within two weeks.",
    needsFromYou: null,
    symptom:
      "Sixty-three of 170 tier-one target accounts received almost no ad exposure even though the campaigns spent their full budgets.",
    examined: "The workflow analyzed 840,000 impressions delivered to the 170-account target list over 30 days.",
    findingCols: ["Account group", "Accounts", "Impressions", "Share", "New pipeline (60d)"],
    findingRows: [
      ["Accenture, TCS, Infosys +5", "8", "344K", "41%", "$0"],
      ["Mid-exposure targets", "99", "462K", "55%", "$210K"],
      ["Under-served tier-1 (<50 imp/wk)", "63", "34K", "4%", "None"],
    ],
    therefore:
      "Eight already-engaged accounts absorbed 41% of reach and produced no new pipeline in 60 days. Cap them at 200 impressions per week and release delivery to the 63 under-served tier-one accounts.",
  },
  {
    id: "rec-sales-handoff-01",
    workflowId: "sales-handoff",
    agent: "conversion",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "14 accounts",
    run: { n: "04", at: "Sep 1" },
    shortTitle: "Send 14 accounts to sales",
    title: "Send 14 high-intent accounts to the selected sales queue",
    basis:
      "All 14 accounts visited high-intent pages at least twice in 14 days and passed the approved composite score for contact engagement and recency.",
    changeTitle: "The list, ranked",
    changeCols: ["Rank", "Account", "Signal"],
    changeRows: [
      ["1", "Meridian Health", "Pricing page ×3, 4 engaged contacts, demo video 80%"],
      ["2", "Corville Logistics", "Comparison page ×2, CISO engaged twice"],
      ["3–14", "+12 more", "Full ranked list in the export"],
    ],
    entities: "14 accounts",
    projection: "14 tasks created in the HubSpot queue you select.",
    guardrail: "Customers, open opportunities and accounts contacted in the last 21 days stay excluded.",
    checkResult: "Sep 8",
    when: "Send the accounts this week while the activity is recent.",
    expected:
      "Give sales 14 qualified account handoffs instead of the roughly three weekly handoffs created by form fills alone.",
    needsFromYou:
      "Select the HubSpot destination, either the SDR round-robin queue or the named account executive queue.",
    awaitingYou: true,
    symptom:
      "Only about three accounts per week reach sales through form fills even though traffic to high-intent pages continues to grow.",
    examined:
      "The workflow analyzed 14 days of web sessions, LinkedIn Ads engagement, and contact activity for 170 target accounts. Two or more high-intent visits were required. Contact depth and recency contributed to the composite score.",
    findingCols: ["Signal threshold", "Accounts hitting it"],
    findingRows: [
      ["2+ high-intent page visits in 14 days", "31"],
      ["Passed the composite engagement and recency score", "23"],
      ["Already in an open opportunity (excluded)", "9"],
      ["Net-new accounts ready for sales", "14"],
    ],
    therefore:
      "Twenty-three accounts passed the composite score. Nine already had open opportunities, so Petavue excluded them. Send the remaining 14 accounts to sales in the ranked order shown above.",
  },
  {
    id: "rec-sales-handoff-closed",
    workflowId: "sales-handoff",
    agent: "conversion",
    urgency: "this-week",
    lifecycle: "impact-ready",
    scope: "11 accounts",
    run: { n: "03", at: "Aug 25" },
    decidedAt: "Aug 25",
    readback: "HubSpot returned task IDs for all 11 accounts in the SDR round-robin queue.",
    impact: {
      verdict: "improved",
      measuredAt: "Sep 1",
      detail: "Sales booked four meetings during the first week.",
    },
    shortTitle: "Send 11 accounts to SDR queue",
    title: "Send 11 high-intent accounts to the SDR round-robin queue",
    basis: "Eleven accounts passed the approved composite score and had no open opportunity.",
    changeTitle: "Accounts pushed to HubSpot",
    changeCols: ["Destination", "Accounts"],
    changeRows: [["SDR round-robin queue", "11 accounts, one task each"]],
    when: "Applied Aug 25 after your approval.",
    expected: "Give sales qualified handoffs while the activity is recent.",
    needsFromYou: null,
    symptom: "High-intent page traffic was growing while form fills produced about three handoffs a week.",
    examined: "The workflow scored 14 days of activity for 170 target accounts.",
    findingCols: ["Signal threshold", "Accounts hitting it"],
    findingRows: [["Passed the composite score", "20"], ["Already in an open opportunity (excluded)", "9"], ["Net-new accounts sent", "11"]],
    therefore: "Eleven accounts passed the score with no open opportunity. Send them to the selected queue.",
  },
  {
    // Demo content, not from the handoff: Part II's three closed-loop examples
    // all improved, so nothing there exercises an inconclusive verdict. This
    // card exists to show that Petavue will say "we cannot tell yet" rather
    // than claim a win it cannot separate from another change.
    id: "rec-delivery-leaks-closed",
    workflowId: "delivery-leaks",
    agent: "delivery",
    urgency: "this-week",
    lifecycle: "impact-ready",
    scope: "1 campaign",
    run: { n: "03", at: "Aug 13" },
    decidedAt: "Aug 13",
    readback: "Google Ads returned the saved ad schedule for US Pipeline Prospecting and it matched the approved hours.",
    impact: {
      verdict: "confounded",
      measuredAt: "Sep 1",
      detail:
        "Cost per conversion fell 18% in the affected hours, but the campaign moved to a new bid strategy on Aug 15, inside the same measurement window. Petavue cannot separate the two changes, so this result is not counted.",
    },
    shortTitle: "Pause overnight delivery",
    title: "Pause overnight delivery on US Pipeline Prospecting",
    basis: "Overnight hours took 7% of the campaign's spend and produced no conversions in 60 days.",
    changeTitle: "Schedule applied",
    changeCols: ["Campaign", "Change"],
    changeRows: [["US Pipeline Prospecting", "Pause delivery 1 a.m. to 5 a.m. on weekdays"]],
    when: "Applied Aug 13 after your approval.",
    expected: "Move overnight spend into hours that have produced conversions.",
    needsFromYou: null,
    symptom: "Overnight delivery continued at full bids while producing no conversions for two months.",
    examined: "The workflow analyzed 60 days of delivery for US Pipeline Prospecting by hour of day.",
    findingCols: ["Segment", "Spend (60d)", "Conversions", "Cost/conv"],
    findingRows: [
      ["Weekdays, 1 a.m. to 5 a.m.", "$1,190", "0", "None"],
      ["All other hours", "$15.8K", "148", "$107"],
    ],
    therefore:
      "Overnight hours took 7% of spend and produced nothing. Pause them and let the budget run in converting hours.",
  },
  {
    // Demo content beyond Part III, added when workflows 2 and 4 moved back to
    // Available: their cards left the queue and these keep it at seven. Each is
    // one of the "other cards this workflow may produce" from the v3 handoff,
    // written out with a reconciling table in the same voice.
    id: "rec-wasted-spend-02",
    workflowId: "wasted-spend",
    agent: "delivery",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "08", at: "Sep 1, 7:02 AM" },
    shortTitle: "Remove 4 outdated negatives",
    title: "Remove 4 outdated negatives that block product language",
    basis: "Four negatives added in 2025 now block queries that match approved product language.",
    changeTitle: "Remove the negatives from two campaigns",
    changeCols: ["Campaign", "Negatives to remove"],
    changeRows: [
      ["Brand + Generic Search", '"compliance automation", "audit software"'],
      ["Competitor Conquest", '"risk platform", "policy management"'],
    ],
    entities: "4 negative keywords",
    projection: "About 9,100 blocked impressions per month are released.",
    guardrail: "The 14 new negatives proposed in this run are unaffected.",
    checkResult: "Sep 15",
    when: "Apply with this week's negative-list update.",
    expected: "Recover about 9,100 blocked impressions per month on queries that match what you sell.",
    needsFromYou: null,
    symptom: "Impressions on approved product-language queries fell after the 2025 negative lists were imported.",
    examined: "The workflow checked all 61 active negatives against the approved product and brand exception list.",
    findingCols: ["Negative", "Blocks the query", "Est. impressions/mo"],
    findingRows: [
      ['"audit software"', '"security audit software"', "3,400"],
      ['"compliance automation"', '"compliance automation platform"', "2,900"],
      ['"risk platform"', '"grc risk platform"', "1,600"],
      ['"policy management"', '"policy management tool"', "1,200"],
    ],
    therefore:
      "Four negatives block about 9,100 monthly impressions on approved product language. Remove them from the two campaigns above.",
  },
  {
    id: "rec-audience-sharpening-02",
    workflowId: "audience-sharpening",
    agent: "measurement",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "8 accounts",
    run: { n: "09", at: "Sep 1" },
    shortTitle: "Restore 8 tier-1 accounts",
    title: "Restore 8 tier-1 accounts to the eligible audience",
    basis: "Eight tier-1 accounts stayed suppressed after the sales sequences behind the suppression ended.",
    changeTitle: "Restore the accounts to paid coverage",
    changeCols: ["Action", "Accounts"],
    changeRows: [
      ["Restore to eligible audience", "8 tier-1 accounts whose sales sequences ended before Aug 1 (list attached)"],
    ],
    entities: "8 accounts",
    projection: "The eligible tier-1 audience grows from 99 to 107 accounts.",
    guardrail: "Accounts with an open opportunity stay excluded.",
    checkResult: "Sep 8",
    when: "Apply before tomorrow's 7:00 AM cap refresh.",
    expected: "Return paid coverage to eight tier-1 accounts that sales is no longer working.",
    needsFromYou: null,
    symptom:
      "Eight tier-1 accounts have had no ad exposure since June even though no sales activity has touched them for 30 days.",
    examined: "The workflow re-checked all 63 suppressed accounts against HubSpot sequence and opportunity status.",
    findingCols: ["Suppression reason", "Accounts", "Still valid?"],
    findingRows: [
      ["Active sales sequence", "41", "Yes"],
      ["Open opportunity", "14", "Yes"],
      ["Sequence ended before Aug 1", "8", "No"],
    ],
    therefore:
      "Eight of the 63 suppressions no longer have a reason behind them. Restore those accounts to the eligible audience.",
  },
  {
    id: "rec-sales-handoff-02",
    workflowId: "sales-handoff",
    agent: "conversion",
    urgency: "monitor",
    lifecycle: "needs-decision",
    scope: "14 accounts",
    run: { n: "04", at: "Sep 1" },
    shortTitle: "Keep 14 accounts under watch",
    title: "Keep 14 accounts under watch until a second buying role engages",
    basis: "Fourteen accounts show single-contact engagement that has not yet spread to a second buying role.",
    changeTitle: "No handoff yet",
    changeCols: ["Action", "Accounts"],
    changeRows: [
      ["Keep under watch, no CRM tasks", "14 accounts with one engaged contact (list attached)"],
    ],
    entities: "14 accounts",
    projection: "No CRM tasks are created; the accounts stay in the weekly scoring run.",
    guardrail: "Any account that gains a second engaged contact moves to the next handoff list automatically.",
    checkResult: "Every Friday run",
    when: "No action needed now. The Friday run re-scores them.",
    expected: "Sales sees these accounts only once a second buying role engages, which keeps handoffs qualified.",
    needsFromYou: null,
    symptom: "Single-contact accounts converted to meetings at less than half the rate of multi-contact accounts.",
    examined: "The workflow compared meeting rates for the last 60 days of handoffs by engaged-contact depth.",
    findingCols: ["Engaged contacts", "Handoffs (60d)", "Meetings booked"],
    findingRows: [
      ["3 or more", "9", "5"],
      ["2", "8", "3"],
      ["1", "5", "1"],
    ],
    therefore:
      "One-contact accounts rarely convert to meetings. Hold the fourteen until a second buying role engages.",
  },
];

// In-memory, like the rest of the mock layer: decisions survive navigation but
// not a reload. Kept as a separate map so the transcribed content above is
// never mutated by a demo click.
const decisions = new Map();

const APPLY_STAGES = [
  { at: 0, lifecycle: "approved" },
  { at: 1200, lifecycle: "applying" },
  { at: 3000, lifecycle: "applied" },
  { at: 4800, lifecycle: "confirmed" },
];

function withApplyStage(rec) {
  if (!rec.approvedAt) return rec;
  const elapsed = Date.now() - rec.approvedAt;
  const stage = [...APPLY_STAGES].reverse().find((s) => elapsed >= s.at) || APPLY_STAGES[0];
  return { ...rec, lifecycle: stage.lifecycle };
}

export function listRecommendations() {
  return ITEMS.map((r) => withApplyStage({ ...r, ...(decisions.get(r.id) || {}) }));
}

/**
 * Add context and rerun. The original is marked Superseded and a revised copy
 * takes its place in the queue: the customer's constraint is visible in the
 * audit trail rather than silently editing the recommendation they rejected.
 */
export function addContext(id, note) {
  const item = ITEMS.find((r) => r.id === id);
  if (!item) return null;
  decisions.set(id, { lifecycle: "superseded", note: note || null, decidedAt: "Just now" });
  const revised = {
    ...item,
    // A rerun that produces an identical card has not reran anything. Where a
    // card defines what the rerun finds, the revised version carries it.
    ...(item.revision || {}),
    revision: undefined,
    id: `${item.id}-revised`,
    supersedes: item.id,
    context: note || null,
    changed: item.revision?.changed || null,
    lifecycle: "needs-decision",
  };
  if (!ITEMS.find((r) => r.id === revised.id)) ITEMS.splice(ITEMS.indexOf(item) + 1, 0, revised);
  return revised;
}

/**
 * Proposing a test is not a decision on the change: the card stays in the queue
 * and the test state runs on its own axis beside the lifecycle.
 */
export function proposeTest(id) {
  const item = ITEMS.find((r) => r.id === id);
  if (!item) return null;
  const prev = decisions.get(id) || {};
  decisions.set(id, { ...prev, test: "proposed" });
  return { ...item, ...decisions.get(id) };
}

export function decide(id, lifecycle, note) {
  const item = ITEMS.find((r) => r.id === id);
  if (!item) return null;
  const entry = { lifecycle, note: note || null, decidedAt: "Just now" };
  if (lifecycle === "approved") entry.approvedAt = Date.now();
  decisions.set(id, entry);
  return withApplyStage({ ...item, ...entry });
}

/**
 * Counts for the queue chips, one per workflow in workflow order, including the
 * workflows with nothing pending. A zero is information: it says the workflow
 * ran and found nothing worth changing.
 */
export function pendingCountsByWorkflow(workflowIds) {
  const open = listRecommendations().filter((r) => r.lifecycle === "needs-decision");
  const counts = {};
  for (const id of workflowIds) counts[id] = open.filter((r) => r.workflowId === id).length;
  return counts;
}
