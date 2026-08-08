# Petavue Recommendation Catalog

Live catalog of the 13 paid-media recommendation use cases surfaced on the Petavue homepage `#recommendations` section.

Grouped into 3 buckets. Each bucket presents one recommendation as an interactive panel; users click the sub-nav to swap.

---

## Bucket 1 — Measurement, Planning and Spend Allocation

> Everything the agents watch before a spend decision reaches the team: connector freshness, sourced and influenced pipeline, incremental lift, forecasts, weekly pacing, and delivery health.

**Recommendations in this bucket:**
- Attribution
- Cause-and-Effect Testing for Ad Spend
- Forecasting and Scenario Planning
- Budget Pacing and Allocation

---

### 1. Attribution

- **ID:** `attribution-impact`
- **Tier:** connect
- **Front:** move (money)
- **Question the agent answers:** How is each paid campaign contributing to qualified pipeline, revenue, margin, LTV, CAC, payback, or the customer's chosen business outcome?
- **Source:** Google Ads + LinkedIn Ads + Salesforce · Sourced-and-influenced

**Headline (recommendation):**
> Move budget toward the campaigns creating qualified pipeline.

**Finding:**
"CISO Cold Outreach Q3" and "Security Leaders LinkedIn Blast" spent $18.4K over the trailing 30 days and produced 46 platform conversions but zero qualified Salesforce opportunities. "CISO Webinar Retargeting" spent $6.7K in the same window and produced 12 qualified opps carrying $284K influenced pipeline.

**Reasoning:**
The comparison uses the approved sourced-and-influenced pipeline definition, the same 30-day attribution window, and the same account exclusions across both cohorts.

**Recommended next actions:**
1. Reduce "CISO Cold Outreach Q3" and "Security Leaders LinkedIn Blast" by 40% (~$7.4K/mo). Move the freed budget into "CISO Webinar Retargeting" inside the approved ceiling.
2. Add both campaigns to the weekly platform-vs-CRM conversion review, so future scaling requires opportunities, not just platform conversions.
3. Re-evaluate after 14 days once retargeting frequency has held under the 4.5 ceiling.

**Evidence:**
- Prospecting spend $18.4K / 30d with 46 platform conversions and 0 qualified opps.
- Retargeting spend $6.7K / 30d with 12 qualified opps and $284K influenced pipeline.
- Pipeline per dollar: 2.1× retargeting vs prospecting.
- Attribution window (30 days) and account exclusions are identical across both cohorts.

**Impact metrics:**
- PIPELINE / $ → 2.1× (retargeting vs prospecting)
- PLATFORM CONV. → 46 (from low-quality campaigns)
- QUALIFIED OPPS → 0 (from those conversions)

---

### 2. Cause-and-Effect Testing for Ad Spend

- **ID:** `incrementality`
- **Tier:** configure
- **Front:** move (money)
- **Question the agent answers:** Which paid campaigns are creating additional demand rather than receiving credit for outcomes that would have happened anyway?
- **Source:** Brand search + CRM + Geo holdout

**Headline (recommendation):**
> Validate incremental lift before scaling "CISO Brand Search - NAM."

**Finding:**
Branded organic demand and "CISO Brand Search - NAM" conversions rose together in 79% of the last 12 weeks. The campaign currently carries $164K sourced pipeline this quarter, but the model cannot separate incremental lift from customers who would have converted anyway.

**Reasoning:**
A controlled geo holdout will produce a clearer answer than reassigning credit through an attribution model. Test regions are chosen so paid-demand overlap is minimized.

**Recommended next actions:**
1. Hold "CISO Brand Search - NAM" spend flat at $8.4K/mo across all regions for the next 4 weeks.
2. Run a two-region geo holdout with a $12K pipeline-lift threshold as the go/no-go for further budget.
3. Escalate for a full account review only if the holdout shows less than 60% incremental lift.

**Evidence:**
- Brand paid + organic demand correlated 79% over trailing 12 weeks.
- Brand Search sourced pipeline this quarter: $164K.
- Recommended holdout window: 4 weeks across 2 regions.
- Go / no-go threshold: $12K pipeline lift or 60% incremental share.

**Impact metrics:**
- OVERLAP → 79% (paid + organic brand demand)
- TEST WINDOW → 4 wk (recommended holdout)
- DECISION → Hold (pending causal evidence)

---

### 3. Forecasting and Scenario Planning

- **ID:** `forecasting`
- **Tier:** configure
- **Front:** move (money)
- **Question the agent answers:** Will the current paid-media plan hit its business goal, and what happens if budget is increased, reduced, or moved?
- **Source:** Scenario model · $30K additional monthly budget

**Headline (recommendation):**
> Put the new budget into enterprise retargeting.

**Finding:**
Enterprise retargeting has $18K/mo of capacity before frequency hits its 4.5 ceiling. High-intent search has $8K/mo of headroom before CPC efficiency drops. Broad paid social is already down 12% in pipeline-per-dollar at current spend.

**Reasoning:**
The forecast weighs qualified pipeline, cost limits, and audience capacity — not just platform conversions.

**Recommended next actions:**
1. Put $18K into enterprise retargeting first — highest expected pipeline within capacity.
2. Reserve $8K for high-intent search, capped at a $9.20 CPC floor.
3. Hold $4K for a CFO-segment creative test, and reforecast after 14 days.

**Evidence:**
- Illustrative base-case pipeline lift: +$184K / quarter.
- Enterprise retargeting frequency capacity: 4.5 before saturation.
- Broad paid social pipeline-per-dollar: −12% vs 90-day baseline.
- CAC forecast stays inside the $8.4K downside limit across all scenarios.

**Impact metrics:**
- PIPELINE RANGE → +$184K (illustrative base case)
- FREQUENCY → <5.0 (inside approved ceiling)
- CAC → Inside (downside-case limit)

---

### 4. Budget Pacing and Allocation

- **ID:** `budget-pacing`
- **Tier:** start
- **Front:** move (money)
- **Question the agent answers:** Are we on pace, and where should paid budget increase, decrease, or move?
- **Source:** Weekly budget review · Google Ads + Salesforce

**Headline (recommendation):**
> Cap "CIO Brand Search - Enterprise" and move the surplus to "CIO Enterprise Retargeting."

**Finding:**
"CIO Brand Search - Enterprise" spend is at $6.1K/wk vs a $4.4K four-week baseline (+38%) while opportunity volume has stayed flat at 8 opps/week. "CIO Enterprise Retargeting" is producing 2.1× more qualified pipeline per dollar over the same window.

**Reasoning:**
The move preserves the approved monthly ceiling and reallocates only the amount above Brand Search's stable operating range.

**Recommended next actions:**
1. Restore "CIO Brand Search - Enterprise" to $4.4K/wk (its four-week baseline), freeing $1.7K/wk.
2. Move the freed $1.7K/wk to "CIO Enterprise Retargeting" within the approved ceiling.
3. Recheck both campaigns after 7-10 days. Flag if "CIO Brand Search - Enterprise" opps drop below 6/week.

**Evidence:**
- Brand Search spend $6.1K/wk vs a $4.4K four-week baseline (+38%).
- Opportunity volume is flat at 8/week despite the higher spend.
- Retargeting pipeline-per-dollar: 2.1× higher than Brand Search over the same window.
- Available to reallocate this week: $1.7K.

**Impact metrics:**
- SPEND → +38% (vs four-week baseline)
- OPPORTUNITIES → Flat (despite higher spend)
- AVAILABLE → $1.7K (to reallocate)

---

## Bucket 2 — Campaign, Search & Audience Targeting

> Once the numbers are trustworthy, the agents look for spend the platforms won't self-correct: off-intent search terms, saturated audiences, records that should be suppressed, and delivery segments producing no pipeline.

**Recommendations in this bucket:**
- Segment Performance
- Search Intent
- Audience, ICP and Targeting
- Suppression and Exclusions

---

### 5. Segment Performance

- **ID:** `campaign-efficiency`
- **Tier:** start
- **Front:** waste (cut)
- **Question the agent answers:** Where is paid spend failing across campaigns, placements, devices, geographies, dayparts, or other delivery segments?
- **Source:** LinkedIn Ads · Audience Network + geography

**Headline (recommendation):**
> Cut the placements and geographies burning spend without pipeline.

**Finding:**
The LinkedIn Audience Network extension on "CIO Enterprise Prospecting" spent $2.1K over the trailing 30 days across low-signal 3rd-party inventory with zero qualified opportunities. APAC delivery on the same campaign absorbed another $1.4K outside the approved US/EMEA coverage region, also with zero opps. Combined, that's 27% of the campaign's spend against zero pipeline.

**Reasoning:**
The pattern is stable across the trailing 4 weeks after normalizing for click volume and the approved 14-day qualification window.

**Recommended next actions:**
1. Disable Audience Network on all enterprise campaigns; keep delivery on native LinkedIn inventory only.
2. Exclude APAC and other out-of-coverage geographies at the account level.
3. Redirect the released $3.5K to the top native-inventory placements ranked by post-click engagement and re-audit after 21 days.

**Evidence:**
- LinkedIn Audience Network spend: $2.1K / 30d with 0 qualified opps.
- APAC (out-of-coverage) spend: $1.4K / 30d with 0 qualified opps.
- Combined share of enterprise-campaign spend: 27% of the trailing 30-day total.
- Monthly budget released for reallocation: $3.5K.

**Impact metrics:**
- SPEND SHARE → 27% (on affected segments)
- QUALIFIED OPPS → 0 (inside the review window)
- RELEASED → $3.5K (monthly budget)

---

### 6. Search Intent

- **ID:** `search-intent`
- **Tier:** start
- **Front:** waste (cut)
- **Question the agent answers:** Which search terms, keywords, or match types are irrelevant, expensive, or mismatched to the destination?
- **Source:** Google Ads · Non-brand search terms

**Headline (recommendation):**
> Stop paying for research traffic that cannot become pipeline.

**Finding:**
47 tutorial, template, and job-seeker search terms — like "employee handbook template," "how to run payroll," and "HR coordinator job description" — drove 892 clicks and 31 form fills over the last 30 days, and zero sales-accepted opportunities. These include high-volume, low-intent queries like "PTO policy template," "onboarding checklist example," and "how to become an HR manager." Wasted spend on those terms is $1.9K/mo.

**Reasoning:**
The terms share a consistent low-intent pattern across landing-page behavior (2.8s avg dwell, 71% bounce) and downstream CRM outcomes.

**Recommended next actions:**
1. Add the 47 identified terms to the account-wide negative keyword list.
2. Tighten two match types from broad to phrase on the affected ad groups.
3. Keep the high-intent variants — like "HR software for growing companies," "best HRIS platform for mid-market," and "employee benefits administration software" — running for a 30-day comparison window.

**Evidence:**
- Wasted spend on those 47 terms: $1.9K / 30d.
- Form fills from those terms: 31; sales-accepted opps: 0.
- Avg landing-page dwell: 2.8s; bounce rate: 71%.
- Number of terms flagged: 47, sharing a job-seeker / research intent pattern.

**Impact metrics:**
- WASTED SPEND → $1.9K (last 30 days)
- FORM FILLS → 31 (from affected terms)
- SALES-ACCEPTED → 0 (from those fills)

---

### 7. Audience, ICP and Targeting

- **ID:** `audience-targeting`
- **Tier:** configure
- **Front:** improve (performance)
- **Question the agent answers:** Are paid ads reaching the right accounts and segments without excessive audience overlap, weak coverage, or frequency?
- **Source:** LinkedIn Ads + Salesforce + Account-fit data

**Headline (recommendation):**
> Shift reach from low-fit companies to undercovered target accounts.

**Finding:**
34% of current LinkedIn reach falls outside the approved ICP (500–5,000 employees, HR/People Ops decision-makers). Those out-of-ICP impressions produced 4 opportunities in the trailing 90 days, none past Stage 2, and $0 in closed-won revenue.

Meanwhile, closed-won ICP accounts followed a consistent golden path: LinkedIn impression → website visit within 14 days → content download → Brand Search click → demo request. Accounts that hit at least 3 of these 5 touchpoints converted to opportunity at 4.1× the rate and closed at 2.6× the rate of accounts that didn't. Only 22% of the 86 undercovered target accounts have entered this path at all, and none have completed it.

**Reasoning:**
Account coverage is evaluated against the company's ICP definition, CRM stage-progression data, and the approved 4.5 frequency guardrail. Fit is judged not just by reach but by whether accounts are entering the sequence that historically leads to revenue.

**Recommended next actions:**
1. Narrow the audience to the approved ICP filters.
2. Add the 86 undercovered accounts to a dedicated matched-audience layer, sequenced to mirror the golden path (impression → retargeting → content offer → demo CTA).
3. Keep frequency at 4.5 per account across both segments.
4. Track golden-path entry and completion rates for the 86 accounts over the next 60 days, not just impressions delivered.

**Evidence:**
- Share of reach outside ICP definition: 34%.
- High-fit named accounts under-covered: 86 (fewer than 2 impressions each).
- Approved frequency ceiling: 4.5 per account.
- Reach on the broad prospecting audience: 128K / 30d.

**Impact metrics:**
- OUTSIDE ICP → 34% (of paid reach)
- UNDERCOVERED → 86 (high-fit accounts)
- FREQUENCY → <4.5 (approved limit)

---

### 8. Suppression and Exclusions

- **ID:** `suppression`
- **Tier:** configure
- **Front:** waste (cut)
- **Question the agent answers:** Are we paying to reach customers, employees, competitors, open opportunities, or other groups that should be excluded?
- **Source:** LinkedIn + Meta Ads · CRM audiences

**Headline (recommendation):**
> Stop prospecting to customers and active opportunities.

**Finding:**
Three prospecting audiences on LinkedIn and Meta are still targeting 214 customer domains and 37 active Salesforce opportunities because the suppression lists haven't refreshed in 62 days. 18% of last month's spend on these audiences reached people already in CRM.

**Reasoning:**
These people are already in CRM stages the team has excluded from acquisition campaigns.

**Recommended next actions:**
1. Refresh the suppression lists today and set them to auto-sync every 24 hours.
2. Check audience counts before the next campaign runs. Expect a ~9% drop in targetable pool.
3. Add a monthly check to catch refresh gaps before they recur.

**Evidence:**
- Customer domains still targetable across the 3 audiences: 214.
- Active Salesforce opportunities still targetable: 37.
- Suppression lists last refreshed: 62 days ago.
- Share of affected spend across the 3 audiences: 18%.

**Impact metrics:**
- AFFECTED SPEND → 18% (of three audiences)
- CUSTOMERS → 214 (still targetable)
- OPEN OPPS → 37 (still targetable)

---

## Bucket 3 — Conversion, Demand & Growth

> Where paid traffic meets the rest of the funnel: landing pages and form leaks, lead quality that only shows up in the CRM, warm accounts to hand to sales, creative that has fatigued, and controlled tests for signals worth measuring.

**Recommendations in this bucket:**
- Landing Page and Form Leakage
- Lead and Pipeline Quality
- Engaged Target Account Audience Coverage and Routing
- Paid Ad Creative Performance
- Paid Growth Experiments Measurement

---

### 9. Landing Page and Form Leakage

- **ID:** `landing-page`
- **Tier:** connect
- **Front:** improve (performance)
- **Question the agent answers:** Which paid campaigns generate clicks but fail to convert on the destination page or form?
- **Source:** Google Ads + Website + Salesforce

**Headline (recommendation):**
> Redirect qualified traffic while the form bottleneck is fixed.

**Finding:**
High-intent paid visitors are dropping off the /pricing form at a 63% rate, vs 21% on /pricing/v2. That puts an estimated $48K of open demand at risk this week.

**Reasoning:**
Traffic quality is strong going into the form. The loss is isolated to this page version, not the campaign itself.

**Recommended next actions:**
1. Route paid traffic to /pricing/v2 until the issue is fixed.
2. Hold spend on the affected campaigns so the leak doesn't scale.
3. Run a form test. Expected fix: 5 business days.
4. Build dedicated landing pages by persona (e.g. CHRO, CISO, IT admin) instead of routing all paid traffic to one generic pricing page, so form length and content match each buyer's intent.

**Evidence:**
- Form drop at step 4: 63% on the affected version vs 21% on the stable version.
- Share of affected visits that qualify as high-intent: 71%.
- Illustrative open-demand pipeline at risk this week: $48K.
- Stable form version: /pricing/v2. Same messaging, prior form structure.

**Impact metrics:**
- FORM DROP → 63% (at one step)
- HIGH-INTENT → 71% (of affected visits)
- PIPELINE RISK → $48K (illustrative open demand)

---

### 10. Lead and Pipeline Quality

- **ID:** `lead-quality`
- **Tier:** connect
- **Front:** improve (performance)
- **Question the agent answers:** Which paid campaigns produce leads that do not become qualified opportunities or revenue?
- **Source:** Meta Ads + Salesforce

**Headline (recommendation):**
> Reduce the campaign with the lowest CPL but the weakest pipeline quality.

**Finding:**
"Broad Reach A" has the lowest CPL in the account at $42, but only 3% of its leads reach sales acceptance, vs an 18% account median. Its pipeline per dollar is 0.4× the peer-campaign average.

**Reasoning:**
Petavue compares leads through the same 14-day lead-to-acceptance window, not just at form submission.

**Recommended next actions:**
1. Reduce "Broad Reach A" spend by 60%, from $9.4K to ~$3.8K/mo.
2. Move the freed budget to "Enterprise Retargeting B," which shows a 22% acceptance rate.
3. Share the lead-quality breakdown with sales to confirm the rejection reasons align with what's showing in this data.
4. Review the SLA on acceptance criteria with sales — a 3% rate this far below median could mean weak leads, but it's worth ruling out inconsistent or overly strict acceptance standards first.
5. Review targeting with the demand-gen team before scaling any similar broad-reach campaign.

**Evidence:**
- Campaign CPL: $42, the lowest in the account.
- Sales acceptance rate: 3% vs the 18% account median.
- Pipeline per dollar: 0.4× vs peer campaigns.
- Illustrative freed budget from the recommended cut: $5.6K/mo.

**Impact metrics:**
- CPL → $42 (lowest in account)
- ACCEPTANCE → 3% (vs 18% account median)
- PIPELINE / $ → 0.4× (vs peer campaigns)

---

### 11. Engaged Target Account Audience Coverage and Routing

- **ID:** `warm-account`
- **Tier:** connect
- **Front:** improve (performance)
- **Question the agent answers:** Which target accounts show paid or website engagement but lack retargeting, ad coverage, ownership, or follow-up?
- **Source:** LinkedIn Ads + Website + Salesforce · ABM

**Headline (recommendation):**
> Add paid coverage for warm target accounts with no active opportunity.

**Finding:**
Eight high-fit accounts have crossed the engagement threshold (score ≥ 85 across paid, website, and content) in the trailing 21 days but have no assigned AE and no paid retargeting coverage.

**Reasoning:**
Each account cleared the threshold and falls outside suppression and open-opportunity rules. The recommendation stays inside the approved retargeting ceiling.

**Recommended next actions:**
1. Add all 8 accounts to the enterprise retargeting audience (frequency ceiling 4.5).
2. Route each account to an AE with the engagement timeline attached.
3. Suppress the 8 accounts from prospecting audiences to avoid paid + outbound overlap.

**Evidence:**
- Warm accounts above hand-off threshold: 8.
- Paid retargeting coverage on those accounts: 0.
- Open Salesforce opportunities on those accounts: 0.
- Engagement score threshold: ≥ 85 across paid + website + content.

**Impact metrics:**
- WARM ACCOUNTS → 8 (above hand-off threshold)
- PAID COVERAGE → 0 (for those accounts)
- OPEN OPPS → 0 (confirmed in CRM)

---

### 12. Paid Ad Creative Performance

- **ID:** `creative`
- **Tier:** start
- **Front:** improve (performance)
- **Question the agent answers:** Which paid ads or messages are fatigued, overexposed, declining, or weak for an audience, and what should be created next?
- **Source:** Meta Ads · Creative fatigue

**Headline (recommendation):**
> Refresh the message before frequency turns into wasted spend.

**Finding:**
"CFO Testimonial v3" crossed 7.1 frequency (vs a 5.0 ceiling) on the enterprise audience. CTR is down 29% over the last 3 check-ins, while newer cohorts still respond close to the baseline.

**Reasoning:**
The decline is isolated to the repeatedly-exposed audience. The message still works — this specific creative does have fatigue.

**Recommended next actions:**
1. Rotate "CFO Testimonial v3" out of the enterprise audience today.
2. Brief two fresh variants on the same message for the enterprise audience.
3. Cap frequency at 4.5 on the new creative variant. When it hits that ceiling, automatically pause it and rotate in the next variant — no manual check-in required.

**Evidence:**
- Current frequency on "CFO Testimonial v3": 7.1 vs a 5.0 ceiling.
- CTR change from the stable baseline: −29%.
- Consecutive check-ins showing decline: 3.
- Newer-cohort response: stable. Message resonates, execution fatigued.

**Impact metrics:**
- FREQUENCY → 7.1 (vs 5.0 ceiling)
- CTR → −29% (from stable baseline)
- NEW COHORTS → Stable (message still resonates)

---

### 13. Paid Growth Experiments Measurement

- **ID:** `growth-experiments`
- **Tier:** configure
- **Front:** improve (performance)
- **Question the agent answers:** Which promising paid segment, account group, message, channel, or placement deserves a controlled test?
- **Source:** Test design · CFO-Finance segment

**Headline (recommendation):**
> Turn the CFO engagement signal into a controlled paid test.

**Finding:**
Finance leaders (Head of Finance, VP Finance, CFO at 500–5,000-employee firms) show 14% higher CTR and 2.3× MQL-to-opp conversion on the "evidence trail" message vs the general enterprise segment. This segment hasn't been run as its own isolated campaign yet.

**Reasoning:**
The signal is strong enough to justify a bounded test, not yet strong enough to shift broad budget.

**Recommended next actions:**
1. Launch a new campaign targeting the CFO-Finance segment only, using the "evidence trail" message, capped at $6K total spend, running 4 weeks.
2. Track qualified pipeline from this campaign against a matched control period (same segment definition, same message, no dedicated campaign).
3. Check CTR weekly. If it drops more than 25% below the current baseline for 2 straight weeks, pause the campaign early.

**Evidence:**
- CFO-finance segment CTR: +14% vs general enterprise.
- MQL-to-opp conversion on the segment: 2.3× general enterprise.
- Test budget ceiling: $6K over a 4-week window.
- Stop rule set before launch: −25% CTR for 2 consecutive weeks.

**Impact metrics:**
- TEST BUDGET → $6K (fixed ceiling)
- WINDOW → 4 wk (measurement period)
- STOP RULE → Set (before launch)

---

## Reference tables

### Tier / Front matrix

| Tier | move (money) | waste (cut) | improve (perf) |
|---|---|---|---|
| **start** | Budget Pacing and Allocation | Segment Performance, Search Intent | Paid Ad Creative Performance |
| **connect** | Attribution | — | Landing Page and Form Leakage, Lead and Pipeline Quality, Engaged Target Account Audience Coverage and Routing |
| **configure** | Cause-and-Effect Testing for Ad Spend, Forecasting and Scenario Planning | Suppression and Exclusions | Audience, ICP and Targeting, Paid Growth Experiments Measurement |

### Source lookup

| Recommendation | Source label |
|---|---|
| Attribution | Google Ads + LinkedIn Ads + Salesforce · Sourced-and-influenced |
| Cause-and-Effect Testing for Ad Spend | Brand search + CRM + Geo holdout |
| Forecasting and Scenario Planning | Scenario model · $30K additional monthly budget |
| Budget Pacing and Allocation | Weekly budget review · Google Ads + Salesforce |
| Segment Performance | LinkedIn Ads · Audience Network + geography |
| Search Intent | Google Ads · Non-brand search terms |
| Audience, ICP and Targeting | LinkedIn Ads + Salesforce + Account-fit data |
| Suppression and Exclusions | LinkedIn + Meta Ads · CRM audiences |
| Landing Page and Form Leakage | Google Ads + Website + Salesforce |
| Lead and Pipeline Quality | Meta Ads + Salesforce |
| Engaged Target Account Audience Coverage and Routing | LinkedIn Ads + Website + Salesforce · ABM |
| Paid Ad Creative Performance | Meta Ads · Creative fatigue |
| Paid Growth Experiments Measurement | Test design · CFO-Finance segment |
