/**
 * The decision queue.
 *
 * Content source: doc 17 section 6 (the six pending cards, verbatim) and its
 * Lifecycle examples (the five closed cards), with the decision/comments model
 * from doc 19. Nothing is generated and nothing is rounded: finding rows add
 * up to headline figures on purpose.
 *
 * Decision model (doc 19 section 1): Accept, Reject, Hold — nothing else.
 * A decision stores who, when, and the note; notes also land in the comments
 * thread with a label. General comments change no state. Seeded decisions
 * belong to Maya Iyer, the demo mock user; anything decided in-session is
 * authored by the signed-in user.
 */
import { currentUser } from "./db";

export const URGENCY = {
  "act-now": { key: "act-now", label: "Act now" },
  "this-week": { key: "this-week", label: "This week" },
  monitor: { key: "monitor", label: "Monitor" },
};

export const DECISION = {
  accepted: { key: "accepted", label: "Accepted" },
  rejected: { key: "rejected", label: "Rejected" },
  "on-hold": { key: "on-hold", label: "On hold" },
};

export const TYPE = {
  change: { key: "change", label: "Change" },
  test: { key: "test", label: "Test" },
  handoff: { key: "handoff", label: "Handoff" },
};

const NOTE_LABEL = {
  accepted: "Note added when accepted",
  rejected: "Reason given when rejected",
  "on-hold": "Note added when put on hold",
};

const stamp = (d = new Date()) => {
  const mo = d.toLocaleString("en-US", { month: "short" });
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${mo} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
};

const ITEMS = [
  /* ── The six pending cards (doc 17 §6) ─────────────────────────── */
  {
    id: "rec-sqwc-01",
    workflowId: "wasted-spend",
    agent: "demand",
    type: "change",
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
    timing: "Apply the change today because these queries currently spend about $77 per day.",
    expect: "Redirect 24% of search spend toward queries that have produced qualified outcomes.",
    controls:
      "Every negative was checked against the approved product and brand exception list and against 90 days of converting queries; removing any of the 14 negatives reverses the change in one edit.",
    followUp: "Sep 15. That run verifies the blocked queries stopped spending and reports the amount redirected.",
    noticed: "Search spend increased 12% during the last 30 days while HubSpot-qualified outcomes remained flat.",
    analyzed:
      "The workflow analyzed 1,240 queries and $9,800 of spend from the last 30 days, then used 90 days of HubSpot history containing 312 outcomes to judge query quality.",
    dataCols: ["Query", "Spend", "Clicks", "Qualified outcomes"],
    dataRows: [
      ['"free crm template"', "$312", "41", "0"],
      ['"marketing manager salary"', "$288", "37", "0"],
      ['"crm course online"', "$245", "29", "0"],
      ['"competitor login"', "$198", "52", "0"],
      ["+10 more queries", "$1,267", "176", "0"],
    ],
    whyFollows:
      "These 14 terms consumed $2,310, or 24% of search spend, without producing a qualified outcome. Add them as negatives to the two campaigns listed above.",
    trace: [
      { specialist: "Qualified Outcome Analyst", agent: "measurement", text: "joined every Google Ads conversion to its HubSpot lifecycle stage over 90 days, so query quality is judged on qualified outcomes, not clicks." },
      { specialist: "Search Intent Analyst", agent: "demand", text: "classified all 1,240 queries against the 90-day qualified-outcome history and separated buying intent from noise." },
      { specialist: "Negative Keyword Planner", agent: "delivery", text: "traced each irrelevant query to its campaign, prepared the campaign-level negative lists, and checked every term against the exception list." },
    ],
    appliedPrefix: "Applied to Google Ads",
    readback: "Petavue read the saved keyword lists back from Google Ads and confirmed all 14 negatives are in place.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-sqwc-02",
    workflowId: "wasted-spend",
    agent: "delivery",
    type: "test",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "1 campaign",
    run: { n: "08", at: "Sep 1, 7:02 AM" },
    shortTitle: "Narrow one old negative keyword",
    title: "Narrow one old negative keyword that blocks converting query families",
    basis:
      'Brand Search produced 8 qualified outcomes in 90 days on checklist queries that Brand + Generic Search cannot enter, because a broad negative added manually in March 2026 blocks every query containing "checklist".',
    changeTitle: "One bounded change in one campaign",
    changeCols: ["Campaign", "Change", "Detail"],
    changeRows: [
      ["Brand + Generic Search", "Remove one broad negative", '"checklist" (added manually, March 2026)'],
      ["Brand + Generic Search", "Add two narrower phrase negatives", '"checklist pdf", "checklist download"'],
    ],
    timing: "Apply the change this week so the reopened queries gather two full weeks of traffic before the first check.",
    expect:
      "Let Brand + Generic Search enter auctions for the two query families that produced 8 qualified outcomes in Brand Search, while download-seeker queries stay blocked.",
    controls:
      'The test is capped: if the reopened queries spend $150 in Brand + Generic Search without a platform conversion, the workflow prepares the rollback. Restoring the broad negative "checklist" reverses the change in one edit.',
    followUp: "Sep 15 for the traffic and spend check; the qualified-outcome verdict follows the 30-day maturity rule on Oct 1.",
    noticed: "Brand Search converts on checklist query families that Brand + Generic Search cannot enter because of a pre-Petavue negative.",
    analyzed:
      "The workflow compared the negative keyword lists of the three search campaigns against 90 days of converting queries, and checked the proposed edits against the 14 negatives in this run's first recommendation; no term is shared between the two changes.",
    dataCols: ["Query family (observed in Brand Search, 90 days)", "Spend", "Qualified outcomes", "Status in Brand + Generic Search"],
    dataRows: [
      ['"soc 2 checklist" and variants', "$410", "5", 'Blocked by the broad negative "checklist"'],
      ['"vendor risk checklist" and variants', "$250", "3", "Blocked by the same negative"],
      ['"checklist pdf" and "checklist download" queries', "$186", "0", "Stays blocked by the two new phrase negatives"],
    ],
    whyFollows:
      "The broad negative blocks two query families with 8 qualified outcomes along with the junk it was meant to stop. Replace it with the two narrower phrase negatives and run the reopening as a capped, reversible test.",
    trace: [
      { specialist: "Qualified Outcome Analyst", agent: "measurement", text: "established the 90-day qualified-outcome history every query family is judged against." },
      { specialist: "Search Intent Analyst", agent: "demand", text: "validated the checklist query families against the outcome history and found the 8 qualified outcomes in Brand Search." },
      { specialist: "Negative Keyword Planner", agent: "delivery", text: "ran the cross-campaign conflict check both ways and flagged the broad negative that blocks converting query families." },
    ],
    appliedPrefix: "Applied to Google Ads",
    readback: "Petavue read the saved negative keyword lists back from Google Ads and confirmed the test setup.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-cdlc-01",
    workflowId: "delivery-leaks",
    agent: "delivery",
    type: "change",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "06", at: "Sep 1, 7:04 AM" },
    shortTitle: "Pause low-performing hours and locations",
    title: "Pause low-performing hours and locations in two campaigns",
    basis: "The flagged hours and locations consumed 12% of the reviewed spend but produced only one SQL in 90 days.",
    changeTitle: "Two schedule changes, one geo change",
    changeCols: ["Campaign", "Change"],
    changeRows: [
      ["US Pipeline Prospecting", "Pause delivery from 12 a.m. to 6 a.m. on weekdays and throughout Sunday"],
      ["US Pipeline Prospecting", "Exclude Wyoming, Montana, and Alaska; concentrate spend on 12 converting metros"],
      ["Brand Search", "Pause Saturday 12am–8am"],
    ],
    timing: "Apply the changes this week.",
    expect: "Redirect about $1,120 per month into hours and locations that have produced SQLs.",
    controls:
      "Every pause and exclusion reverses in one edit; if the remaining windows do not absorb the redirected spend, or their directional platform conversions fall below the pre-change pace, the next run flags the pauses for review.",
    followUp:
      "Sep 15 for the early delivery check only: read-back confirmed, spend redirected as planned, and directional platform conversions. The mature cost-per-SQL verdict follows the 30-day maturity rule on Oct 1.",
    noticed: "The cost per SQL for US Pipeline Prospecting increased 19% in 60 days even though its bids and budget did not change.",
    analyzed: "The workflow analyzed $28,400 of spend and 214 SQLs over 90 days by hour, day of week, and state.",
    dataCols: ["Segment", "Spend (90d)", "SQLs", "Cost/SQL"],
    dataRows: [
      ["Weekdays, 12 a.m. to 6 a.m.", "$1,840", "1", "$1,840"],
      ["Sunday, all day", "$760", "0", "None"],
      ["WY + MT + AK", "$760", "0", "None"],
      ["12 converting metros, business hours", "$19.8K", "201", "$99"],
    ],
    whyFollows:
      "The flagged segments consumed $3,360, or 12% of the reviewed spend. The worst segment's cost per SQL ran 18.6 times the $99 converting-metro benchmark, and two segments produced no SQLs at all. Apply the schedule and location changes listed above.",
    trace: [
      { specialist: "Delivery Outcome Mapper", agent: "measurement", text: "selected conversions past the 30-day maturity window and mapped them to time and place, so no immature data enters the comparison." },
      { specialist: "Schedule and Geography Strategist", agent: "delivery", text: "flagged the segments with enough spend to judge that converted at about 19 times the account average cost per SQL." },
      { specialist: "Spend Reallocation Planner", agent: "budget", text: "identified the business hours and 12 converting metros that can absorb the released spend." },
    ],
    appliedPrefix: "Applied to Google Ads",
    readback: "Petavue read the saved schedule and location settings back from Google Ads and confirmed the changes.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-tarb-01",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "170-account list",
    run: { n: "23", at: "Sep 1, 7:00 AM" },
    shortTitle: "Cap 8 saturated accounts",
    title: "Cap 8 saturated accounts at 200 impressions per week",
    basis: "8 accounts took 41% of impressions; 63 tier-1 targets got fewer than 50 each.",
    changeTitle: "The caps (refreshed daily by the workflow)",
    changeCols: ["Action", "Accounts"],
    changeRows: [
      ["Cap at 200 imp/week", "Accenture, TCS, Infosys +5 (already engaged, no new pipeline in 60d)"],
      ["Release budget toward", "63 tier-1 accounts currently under 50 imp/week (list attached)"],
    ],
    scopeNote:
      "Deloitte is not among the eight. The Aug 31 rejection keeps full delivery to Deloitte until the Sep 10 QBR, and this run carried that constraint forward.",
    timing: "Apply the caps today. The workflow will recalculate them at 7 a.m. each day.",
    expect: "Increase tier-one account coverage from 37% to about 70% within two weeks.",
    controls:
      "A capped account that shows new contact engagement is surfaced for a cap review the next day, so a cap never freezes a re-engaging account; every cap reverses in one edit.",
    followUp: "Sep 15. That run measures tier-one coverage against the 37% baseline.",
    noticed: "Sixty-three of 170 tier-one target accounts received almost no ad exposure even though the campaigns spent their full budgets.",
    analyzed: "The workflow analyzed 840,000 impressions delivered to the 170-account target list over 30 days.",
    dataCols: ["Account group", "Accounts", "Impressions", "Share", "New pipeline (60d)"],
    dataRows: [
      ["Accenture, TCS, Infosys +5", "8", "344K", "41%", "$0"],
      ["Mid-exposure targets", "99", "462K", "55%", "$210K"],
      ["Under-served tier-1 (<50 imp/wk)", "63", "34K", "4%", "None"],
    ],
    whyFollows:
      "Eight already-engaged accounts absorbed 41% of reach and produced no new pipeline in 60 days. Cap them at 200 impressions per week and release delivery to the 63 under-served tier-one accounts.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched 30 days of company-level delivery to the 170-account target list and removed accounts sales already owns." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "measured delivery concentration and found eight accounts absorbing 41% of impressions with no new pipeline in 60 days." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "calculated the 200-impression weekly cap that frees delivery for the 63 under-served tier-one accounts." },
    ],
    appliedPrefix: "Applied to LinkedIn Ads",
    readback: "Petavue read the saved audience settings back from LinkedIn Ads and confirmed the caps.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-tarb-02",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 accounts",
    run: { n: "23", at: "Sep 1, 7:00 AM" },
    shortTitle: "Raise two re-engaged account caps",
    title: "Raise two re-engaged account caps to 400 weekly",
    basis:
      "Trellis Software and Beacon Insurance reach their 200-impression cap by Wednesday each week and are the only capped accounts showing new contact engagement.",
    changeTitle: "The change",
    changeCols: ["Account", "Cap now", "Cap after", "Evidence"],
    changeRows: [
      ["Trellis Software", "200/wk", "400/wk", "2 new engaged contacts in 14 days; cap reached by Wednesday in all 3 weeks since Aug 10"],
      ["Beacon Insurance", "200/wk", "400/wk", "Webinar signup plus 1 engaged contact in 14 days; cap reached by Wednesday in 2 of the 3 weeks since Aug 10"],
    ],
    scopeNote:
      "Both accounts belong to the five-account cohort capped on Aug 10 (Run 01). They are separate from the eight accounts in this run's new cap recommendation.",
    timing: "Apply the change this week; the daily 7:00 AM run recalculates within the new rule.",
    expect:
      "Restore mid-week delivery to the two re-engaging accounts; new engagement does not guarantee pipeline, so the Sep 15 check measures whether engaged contacts keep appearing.",
    controls:
      "Tier-one coverage must hold its 37% baseline while the raised caps are active; the daily run checks coverage and flags the raise the same day coverage slips below it. If either account shows no new engaged contact by Sep 15, its cap returns to 200 impressions per week.",
    followUp: "Sep 15.",
    noticed: "Two capped accounts stopped receiving delivery midweek while showing their first new contact engagement in 60 days.",
    analyzed:
      "The workflow reviewed daily delivery against the cap rule and 14 days of contact engagement for all five accounts in the Aug 10 capped cohort.",
    dataCols: ["Account", "Weeks at cap by Wednesday", "New engaged contacts (14d)", "Open opportunity"],
    dataRows: [
      ["Trellis Software", "3 of 3", "2", "No"],
      ["Beacon Insurance", "2 of 3", "1", "No"],
      ["Other capped accounts (3)", "0", "0", "No"],
    ],
    whyFollows:
      "The cap is now truncating delivery to the only two capped accounts showing fresh engagement. Raise their cap to 400 impressions per week, leave the other three caps unchanged, and re-check on Sep 15.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched daily delivery to the capped cohort and recorded when each account reached its weekly cap." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "re-checked the capped cohort daily and surfaced the only two capped accounts showing new contact engagement." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "verified tier-one coverage holds its 37% baseline while the raised caps are active." },
    ],
    appliedPrefix: "Applied to LinkedIn Ads",
    readback: "Petavue read the saved audience settings back from LinkedIn Ads and confirmed the raised caps.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-bssh-01",
    workflowId: "sales-handoff",
    agent: "conversion",
    type: "handoff",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "170 accounts scored",
    run: { n: "04", at: "Sep 1, 8:01 AM" },
    awaitingYou: true,
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
    timing: "Send the accounts this week while the activity is recent.",
    expect: "Give sales 14 qualified account handoffs instead of the roughly three weekly handoffs created by form fills alone.",
    controls:
      "Petavue re-checks every account against customers, open opportunities, and the last 21 days of sales activity at the moment of the push, so a conflict that appears after this run cannot create a duplicate handoff.",
    followUp: "Sep 15. That run reports first sales touches and meetings booked for the 14 accounts.",
    needsFromYou: "Select the HubSpot destination, either the SDR round-robin queue or the named account executive queue.",
    noticed: "Only about three accounts per week reach sales through form fills even though traffic to high-intent pages continues to grow.",
    analyzed:
      "The workflow analyzed 14 days of web sessions, LinkedIn Ads engagement, and contact activity for 170 target accounts. Two or more high-intent visits were required. Contact depth and recency contributed to the composite score.",
    dataCols: ["Signal threshold", "Accounts hitting it"],
    dataRows: [
      ["2+ high-intent page visits in 14 days", "31"],
      ["Passed the composite engagement and recency score", "23"],
      ["Already in an open opportunity (excluded)", "9"],
      ["Net-new accounts ready for sales", "14"],
    ],
    whyFollows:
      "Twenty-three accounts passed the composite score. Nine already had open opportunities, so Petavue excluded them. Send the remaining 14 accounts to sales in the ranked order shown above.",
    trace: [
      { specialist: "Account Journey Builder", agent: "measurement", text: "resolved 14 days of web, advertising, and contact activity to named accounts, counting identified activity only." },
      { specialist: "Buying Signal Scorer", agent: "conversion", text: "scored the 170 target accounts against the composite model and kept the evidence attached to each account's rank." },
      { specialist: "Sales Eligibility Validator", agent: "demand", text: "checked the shortlist against customers, open opportunities, and 21 days of sales activity, removing nine accounts." },
    ],
    appliedPrefix: "Pushed to HubSpot",
    readback: "Petavue created the tasks in HubSpot and verified the task IDs. Confirmed in HubSpot.",
    decision: null,
    comments: [],
  },

  /* ── The five closed lifecycle cards (doc 17, Lifecycle examples) ── */
  {
    id: "rec-sqwc-c1",
    workflowId: "wasted-spend",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "3 campaigns",
    run: { n: "06", at: "Aug 18, 7:01 AM" },
    shortTitle: "Add negative keywords",
    title: "Add negative keywords to block irrelevant search traffic",
    basis: "Approved Aug 18; the Sep 1 run measured irrelevant spend down $1,910 per month.",
    changeTitle: "Negative keywords added Aug 18",
    changeCols: ["Campaign", "Change"],
    changeRows: [["Brand + Generic Search, Competitor Conquest, Brand Search", "Negative keyword lists updated per the Run 06 review"]],
    timing: "Applied Aug 18, the day the run completed.",
    expect: "Redirect the flagged spend toward queries that have produced qualified outcomes.",
    controls:
      "Every negative was checked against the approved product and brand exception list and against 90 days of converting queries; removing a negative reverses the change in one edit.",
    followUp: "Sep 1, completed. That run measured irrelevant spend down $1,910 per month.",
    noticed: "Irrelevant queries were consuming search spend without producing qualified outcomes.",
    analyzed: "The Run 06 review classified the trailing 30 days of search queries against 90 days of HubSpot history.",
    whyFollows: "The flagged terms spent without producing a qualified outcome, so they were added as negatives to the affected campaigns.",
    trace: [
      { specialist: "Qualified Outcome Analyst", agent: "measurement", text: "joined every Google Ads conversion to its HubSpot lifecycle stage, so query quality was judged on qualified outcomes, not clicks." },
      { specialist: "Search Intent Analyst", agent: "demand", text: "classified the run's queries against the 90-day qualified-outcome history and separated buying intent from noise." },
      { specialist: "Negative Keyword Planner", agent: "delivery", text: "traced each irrelevant query to its campaign and checked every proposed negative against the exception list." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 18, 2:14 PM" },
    applied: "Applied to Google Ads on Aug 18. Petavue read the saved keyword lists back from Google Ads and confirmed the negatives are in place.",
    impact: "The Sep 1 run measured irrelevant spend down $1,910 per month.",
    comments: [
      {
        author: "Maya Iyer",
        at: "Aug 19, 9:40 AM",
        text: 'Sales asked whether "pricing calculator" also blocks the partner-pricing queries. Please confirm in the next run.',
      },
    ],
  },
  {
    id: "rec-cdlc-c1",
    workflowId: "delivery-leaks",
    agent: "delivery",
    type: "change",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "2 campaigns",
    run: { n: "04", at: "Aug 18, 7:03 AM" },
    shortTitle: "Pause leaking delivery windows",
    title: "Pause low-performing delivery windows",
    basis: "Approved Aug 18; the Sep 1 run verified the paused windows spent $0.",
    changeTitle: "Schedule and location changes applied Aug 18",
    changeCols: ["Campaign", "Change"],
    changeRows: [["US Pipeline Prospecting, Brand Search", "Schedule pauses and location exclusions per the Run 04 review"]],
    timing: "Applied Aug 18, the day the run completed.",
    expect: "Redirect the flagged spend into hours and locations that have produced SQLs.",
    controls:
      "Every pause and exclusion reverses in one edit; the next run flags the pauses for review if the remaining windows do not absorb the redirected spend.",
    followUp: "Sep 22. The mature cost-per-SQL verdict follows the 30-day maturity rule.",
    noticed: "Delivery windows and locations were spending without producing mature qualified outcomes.",
    analyzed: "The Run 04 review analyzed delivery by hour, day of week, and state against mature HubSpot-qualified outcomes.",
    whyFollows: "The flagged windows spent without mature qualified outcomes, so the schedule pauses and location exclusions were prepared and approved.",
    trace: [
      { specialist: "Delivery Outcome Mapper", agent: "measurement", text: "selected conversions past the 30-day maturity window and mapped them to time and place." },
      { specialist: "Schedule and Geography Strategist", agent: "delivery", text: "flagged the delivery segments with enough spend to judge that ran far above the converting-metro benchmark." },
      { specialist: "Spend Reallocation Planner", agent: "budget", text: "identified the converting business hours and metros that could absorb the released spend." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 18, 3:05 PM" },
    applied: "Applied to Google Ads on Aug 18. Petavue read the saved schedule and location settings back and confirmed the change.",
    impact: "The Sep 1 run verified the paused windows spent $0 and the converting windows absorbed the redirected spend.",
    comments: [],
  },
  {
    id: "rec-tarb-c1",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "rejected",
    scope: "1 account",
    run: { n: "22", at: "Aug 31, 7:00 AM" },
    shortTitle: "Cap delivery to Deloitte",
    title: "Cap Deloitte at 200 impressions per week",
    basis: "Deloitte reached heavy delivery with no new pipeline in 60 days.",
    changeTitle: "The proposed cap",
    changeCols: ["Account", "Change"],
    changeRows: [["Deloitte", "Cap at 200 impressions per week"]],
    timing: "Apply the cap the day of the run; the daily 7:00 AM run recalculates it.",
    expect: "Free delivery for under-served tier-one accounts.",
    controls:
      "A capped account that shows new contact engagement is surfaced for a cap review the next day; every cap reverses in one edit.",
    noticed: "Deloitte absorbed heavy delivery while producing no new pipeline in 60 days.",
    analyzed: "The Run 22 review checked delivery concentration and engagement recency for the heaviest accounts on the 170-account target list.",
    whyFollows: "Heavy delivery with no new pipeline in 60 days met the saturation test, so the cap was proposed for review.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched company-level delivery to the 170-account target list and removed accounts sales already owns." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "applied the saturation test: heavy delivery with no new pipeline in 60 days despite recent engagement checks." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "prepared the 200-impression weekly cap for review." },
    ],
    followUp: null,
    decision: {
      status: "rejected",
      by: "Maya Iyer",
      at: "Aug 31, 10:12 AM",
      note: "Sales asked to keep full delivery to Deloitte until the QBR on Sep 10.",
    },
    carried: "Run 23 respected the constraint and left Deloitte uncapped.",
    comments: [
      {
        author: "Maya Iyer",
        at: "Aug 31, 10:12 AM",
        label: "Reason given when rejected",
        text: "Sales asked to keep full delivery to Deloitte until the QBR on Sep 10.",
      },
    ],
  },
  {
    id: "rec-tarb-c0",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "5 accounts",
    run: { n: "01", at: "Aug 10, 7:00 AM" },
    shortTitle: "Cap 5 saturated accounts",
    title: "Cap 5 accounts at 200 impressions per week",
    basis: "Approved Aug 10; the Aug 24 run measured tier-one coverage up from 29% to 37%.",
    changeTitle: "Caps applied Aug 10",
    changeCols: ["Action", "Accounts"],
    changeRows: [["Cap at 200 imp/week", "5 saturated accounts from the Run 01 review"]],
    timing: "Applied Aug 10, the day the run completed.",
    expect: "Release impressions toward under-served tier-one accounts.",
    controls:
      "A capped account that shows new contact engagement is surfaced for a cap review the next day; every cap reverses in one edit.",
    followUp: "Aug 24, completed. That run measured tier-one coverage up from 29% to 37%.",
    noticed: "A small set of accounts absorbed most impressions while tier-one targets received little or no delivery.",
    analyzed: "The Run 01 review analyzed 30 days of company-level delivery against the 170-account target list.",
    whyFollows: "Five saturated accounts met the saturation test, so the 200-impression weekly cap was prepared and approved.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched 30 days of company-level delivery to the target list and its tiers." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "separated productive frequency from saturation and named the accounts being crowded out." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "calculated the cap that released impressions while preserving useful frequency." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 10, 1:20 PM" },
    applied: "Applied to LinkedIn Ads on Aug 10. Petavue read the saved audience settings back and confirmed the caps.",
    impact: "The Aug 24 run measured tier-one coverage up from 29% to 37%.",
    comments: [],
  },
  {
    id: "rec-bssh-c1",
    workflowId: "sales-handoff",
    agent: "conversion",
    type: "handoff",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "11 accounts",
    run: { n: "03", at: "Aug 25, 8:01 AM" },
    shortTitle: "Send 11 accounts to sales",
    title: "Send 11 high-intent accounts to the SDR round-robin queue",
    basis: "Pushed Aug 25; sales booked four meetings during the first week.",
    changeTitle: "The handoff",
    changeCols: ["Destination", "Accounts"],
    changeRows: [["SDR round-robin queue", "11 net-new accounts, ranked, with per-account signals"]],
    timing: "Pushed Aug 25, the day the run completed.",
    expect: "Give sales qualified account handoffs while the buying signals were recent.",
    controls:
      "Every account was re-checked against customers, open opportunities, and the last 21 days of sales activity at the moment of the push.",
    followUp: "Sep 1, completed. That run reported four meetings booked for the 11 accounts.",
    noticed: "High-intent accounts were not reaching sales because no form was submitted.",
    analyzed: "The Run 03 review scored 14 days of web, advertising, and contact activity for the 170 target accounts.",
    whyFollows: "Eleven net-new accounts passed the composite score and cleared suppression, so the ranked list was prepared for HubSpot.",
    trace: [
      { specialist: "Account Journey Builder", agent: "measurement", text: "resolved web, advertising, and contact activity to named accounts, counting identified activity only." },
      { specialist: "Buying Signal Scorer", agent: "conversion", text: "scored the target accounts and kept the evidence attached to each account's rank." },
      { specialist: "Sales Eligibility Validator", agent: "demand", text: "checked the shortlist against customers, open opportunities, and recent sales activity." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 25, 11:30 AM" },
    applied: "Pushed to HubSpot on Aug 25. Petavue created tasks for 11 accounts in the SDR round-robin queue and verified the task IDs. Confirmed in HubSpot.",
    impact: "Sales booked four meetings during the first week, measured Sep 1.",
    comments: [],
  },
];

/* ── The live apply progression (doc 19 section 6 line rules).
   After an in-session Accept the applied line appears once Petavue has
   applied the change, first with "is confirming", then with the read-back
   clause. Facts only, each with its date; the page polls, so the card
   updates in place. ── */
function withLiveApply(item) {
  const d = item.decision;
  if (!d || d.status !== "accepted" || !d.ts) return item;
  const elapsed = Date.now() - d.ts;
  if (elapsed < 1800) return { ...item, applied: null };
  const appliedAt = stamp(new Date(d.ts + 1800));
  if (elapsed < 5200) {
    return { ...item, applied: `${item.appliedPrefix} on ${appliedAt}. Petavue is confirming the saved settings.` };
  }
  return { ...item, applied: `${item.appliedPrefix} on ${appliedAt}. ${item.readback}` };
}

export function listRecommendations() {
  return ITEMS.map(withLiveApply);
}

/* One decision: accepted, rejected, or on-hold. The note is optional on
   accept and required on reject and hold (enforced in the UI); a note also
   lands in the comments thread with its decision label. */
export function decide(id, status, note) {
  const it = ITEMS.find((r) => r.id === id);
  if (!it || !DECISION[status]) return it || null;
  const at = stamp();
  it.decision = { status, by: currentUser.name, at, ts: Date.now(), note: note || null };
  it.lifecycle = status;
  if (note) {
    it.comments = [...(it.comments || []), { author: currentUser.name, at, label: NOTE_LABEL[status], text: note }];
  }
  return withLiveApply(it);
}

/* A general comment changes no state. */
export function addComment(id, text) {
  const it = ITEMS.find((r) => r.id === id);
  if (!it || !text?.trim()) return it || null;
  it.comments = [...(it.comments || []), { author: currentUser.name, at: stamp(), text: text.trim() }];
  return it;
}

export function pendingCountsByWorkflow(workflowIds) {
  const open = ITEMS.filter((r) => r.lifecycle === "needs-decision");
  return Object.fromEntries(
    (workflowIds || [...new Set(ITEMS.map((r) => r.workflowId))]).map((id) => [
      id,
      open.filter((r) => r.workflowId === id).length,
    ]),
  );
}
