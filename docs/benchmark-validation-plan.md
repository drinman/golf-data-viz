# Benchmark Data Validation Plan

## Current State

Seed data lives at `src/data/benchmarks/handicap-brackets.json`:
- 7 brackets: 0-5, 5-10, 10-15, 15-20, 20-25, 25-30, 30+
- Fields per bracket: averageScore, fairwayPercentage, girPercentage, puttsPerRound, upAndDownPercentage, penaltiesPerRound, scoring distribution (6 sub-fields)
- Metadata flag: `"provisional": true`
- Values are plausible but unvalidated — created for development scaffolding

**Goal:** Replace every provisional value with a validated number backed by 2+ published sources. Set `provisional: false` before public launch.

---

## Target Sources

### Primary: Arccos Insights Reports

- **What:** Annual "State of Your Game" and "Insights" blog posts published on arccosgolf.com
- **Data available:** FIR%, GIR%, putts per round, scoring average, scoring distribution, up-and-down %, penalties — all segmented by handicap bracket
- **Sample size:** 1.1T+ data points across millions of rounds. Largest amateur golf dataset.
- **Access:** Publicly available blog posts and infographics
- **Brackets:** Arccos uses similar 5-stroke bands (0-5, 5-10, etc.)

**Action items:**
- [ ] Locate Arccos 2024 and 2025 Insights reports
- [ ] Extract stats per handicap bracket into a comparison spreadsheet
- [ ] Map Arccos bracket boundaries to our 7 brackets
- [ ] Document source URLs in the JSON `notes` array

### Primary: Shot Scope Performance Centre

- **What:** "100 Stats" pages at shotscope.com/performance-centre
- **Data available:** 100+ stats per handicap band — extremely granular. Includes FIR, GIR, putts, up-and-down %, scramble %, sand saves, penalties, scoring distribution, and much more.
- **Sample size:** Millions of rounds from Shot Scope device users
- **Access:** Freely available on their website, no login required
- **Brackets:** Similar 5-stroke bands. May use slightly different boundaries — document any mismatches.

**Action items:**
- [ ] Record Shot Scope stats for each bracket (focus on fields matching BracketBenchmark)
- [ ] Map Shot Scope bracket boundaries to our brackets
- [ ] Identify which Shot Scope stats map to each BracketBenchmark field
- [ ] Flag any bracket boundary mismatches (e.g., they use 0-5 vs our 0-5 — likely aligned)
- [ ] Document source URLs

### Secondary: USGA/GHIN Data

- **What:** USGA handicap statistics, scoring records, and handicap distribution reports
- **Data available:** Average scores by handicap range, handicap distribution across US golfers, scoring trends
- **Limitations:** Less granular per-stat breakdown (no FIR/GIR/putts by handicap). Mainly useful for averageScore validation.
- **Access:** Published in USGA annual reports and press releases

**Action items:**
- [ ] Pull USGA average score by handicap range
- [ ] Use as sanity check for the `averageScore` field across all brackets
- [ ] Cross-reference handicap distribution to validate our bracket boundaries represent meaningful population segments

### Secondary: Lou Stagner (@LouStagnerGolf)

- **What:** Published analyses of amateur golf data, often from Arccos dataset
- **Data available:** Novel breakdowns of amateur performance — scoring patterns, strokes gained splits, practice impact
- **Access:** Twitter/X posts, YouTube appearances, guest articles
- **Limitations:** Data is published sporadically in visual formats (charts, infographics), not raw tables. May require manual extraction.

**Action items:**
- [ ] Search for relevant published data on amateur stats by handicap bracket
- [ ] Use as supplementary validation (not primary — data provenance is less traceable)

### Tertiary: Academic / Industry Reports

- **What:** Golf Datatech, National Golf Foundation (NGF), MyGolfSpy research
- **Data available:** Varies — some have performance data, most focus on equipment/market data
- **Limitations:** Performance data by handicap is rare in these sources

**Action items:**
- [ ] Quick scan for any handicap-segmented performance data
- [ ] Deprioritize if nothing found quickly

---

## Validation Process

### Step 1: Collect raw data

Create a comparison spreadsheet with one row per bracket and one column group per source:

| Field | Our Seed | Arccos | Shot Scope | USGA | Lou Stagner | Final Value |
|-------|----------|--------|------------|------|-------------|-------------|
| 10-15: averageScore | 87.0 | ? | ? | ? | ? | ? |
| 10-15: fairwayPercentage | 47 | ? | ? | n/a | ? | ? |
| ... | ... | ... | ... | ... | ... | ... |

### Step 2: Reconcile discrepancies

Where sources disagree:
1. **Check sample size.** Prefer the source with larger sample (Arccos > Shot Scope > others).
2. **Average across sources**, weighted by sample size if known.
3. **Document the range** (min and max across sources) and our chosen value with rationale.
4. **Flag any stat where sources diverge by >15%.** Investigate why — could be methodology differences (e.g., different definitions of "fairway hit" for par-3s).

### Step 3: Update the JSON

For each validated field:
1. Replace the provisional value in `handicap-brackets.json`
2. Add source citations to the `notes` array:
   ```json
   "notes": [
     "Validated against Arccos 2024 Insights, Shot Scope Performance Centre (Feb 2026), USGA 2025 stats.",
     "FIR/GIR/putts sourced primarily from Arccos (largest sample). Scoring distribution cross-validated with Shot Scope.",
     "See docs/benchmark-validation-plan.md for full methodology."
   ]
   ```
3. Set `"provisional": false`
4. Update `"updatedAt"` to the validation date
5. Bump `"version"` to `"1.0.0"`

### Step 4: Ongoing maintenance

- Review semi-annually when Arccos and Shot Scope publish new annual reports
- Track publication dates:
  - Arccos typically publishes Insights in Q1
  - Shot Scope updates Performance Centre continuously
- Future: compute benchmarks from our own community data when we have sufficient volume (500+ rounds per bracket)

---

## Field-by-Field Validation Priority

Not all fields are equally important. Prioritize validation for fields that directly feed the SG calculation:

| Priority | Field | Why |
|----------|-------|-----|
| P0 | averageScore | Core SG total calculation baseline |
| P0 | fairwayPercentage | Drives SG: Off-the-Tee |
| P0 | girPercentage | Drives SG: Approach |
| P0 | puttsPerRound | Drives SG: Putting |
| P0 | upAndDownPercentage | Drives SG: Around-the-Green |
| P1 | penaltiesPerRound | Contributes to SG: Off-the-Tee |
| P1 | scoring distribution (all 6 fields) | Used for blow-up hole analysis (future) and score context |

---

## Acceptance Criteria

- [ ] Every P0 BracketBenchmark field has at least 2 source citations
- [ ] Every P1 field has at least 1 source citation
- [ ] No field relies solely on the original seed estimate
- [ ] Source URLs are documented in this file and referenced in the JSON
- [ ] Discrepancies >15% between sources are documented with resolution rationale
- [ ] `provisional` flag is set to `false`
- [ ] `version` is bumped to `1.0.0`
- [ ] Data review is completed and documented below

---

## Fallback: Fields That Can't Be Sourced

If a specific stat cannot be found in published sources (e.g., `eaglesPerRound` for the 30+ bracket):
1. Mark that specific field as `"estimated": true` in the JSON (add a per-field metadata approach if needed)
2. Document the estimation methodology (e.g., "extrapolated from 25-30 bracket trend")
3. Consider omitting that field from radar chart display for brackets where it's unreliable
4. Revisit when community data becomes available

---

## Validation Log

_Record validation work here as it's completed._

| Date | Action | Fields Updated | Sources Used |
|------|--------|----------------|--------------|
| — | _Not yet started_ | — | — |
