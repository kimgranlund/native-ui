# Bench Tournament

Run a competitive benchmarking tournament. Two rival analyst teams per phase battle across 8 phases to find the most impactful performance bottlenecks and optimizations.

## Input

$ARGUMENTS — The performance area (e.g. "bundle size", "build speed", "test suite speed", "startup time", "memory usage", "CSS output size", "type check speed", "dependency count").

## Phase 0: Baseline & Team Draft

Before any optimization:

1. **Identify metrics** — Based on the focus area, determine exactly what to measure and how.
2. **Measure baseline** — Run measurements 2-3 times for consistency. Record exact numbers.
3. **Break down the baseline** — Where is the cost going? Top contributors by size/time/count.
4. **Draft 16 teams into 8 rival pairs** — Each pair investigates a different optimization dimension.

### Baseline Report

| Metric | Value | Notes |
|--------|-------|-------|
| Total | ... | ... |
| Top contributor #1 | ... | ... |
| Top contributor #2 | ... | ... |
| Top contributor #3 | ... | ... |

### Rival Pair Design

| Phase | Team A (Surgeon) | Team B (Demolition) | Optimization Layer |
|-------|-----------------|--------------------|--------------------|
| 1 | VIPER | COBRA | **Dead weight** — Unused code, imports, dependencies |
| 2 | HYDRA | BASILISK | **Duplication** — Repeated patterns, redundant processing |
| 3 | KRAKEN | LEVIATHAN | **Oversized deps** — Heavy dependencies with lighter alternatives |
| 4 | PHOENIX | DRAGON | **Structure** — Code splitting, lazy loading, tree-shaking blockers |
| 5 | WRAITH | SPECTER | **Configuration** — Build config, compiler flags, bundler settings |
| 6 | CHIMERA | MANTICORE | **Runtime** — Hot paths, unnecessary computation, caching opportunities |
| 7 | WYVERN | GRIFFIN | **I/O** — File reads, network calls, disk writes, parallelization |
| 8 | SPHINX | CERBERUS | **Architecture** — Structural changes that unlock major gains |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents. Each agent investigates their optimization layer and produces:

- Specific bottlenecks found with evidence (file:line, measurements, byte counts)
- Estimated impact of fixing each bottleneck
- Proposed fix approach
- Risk assessment (will this break anything?)

### Scoring

| Finding Type | Points |
|-------------|--------|
| Bottleneck saving >10% of total | 10 pts |
| Bottleneck saving 5-10% | 5 pts |
| Bottleneck saving 1-5% | 2 pts |
| Bottleneck saving <1% | 1 pt |
| Rival missed this bottleneck | +3 pts |
| False positive (not actually a bottleneck) | -3 pts |
| Duplicate of rival (less precise estimate) | -2 pts |

**Bonuses**: 3x INGENIOUS for non-obvious systemic bottleneck, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for finding the single largest bottleneck.

## Phase 9: Scoring & Optimization Plan

After all 8 phases:

1. **Score all 16 teams** — Tally with dedup and bonuses
2. **Merge into ranked optimization list** — Sorted by impact-to-effort ratio:

| # | Optimization | Est. Impact | Effort | Risk | Found By |
|---|-------------|-------------|--------|------|----------|
| 1 | ... | -X% / -NKB / -Nms | low/med/high | low/med/high | Team X |

3. **Identify dependencies** — Some optimizations enable others or conflict

## Phase 10: Execute

For each optimization (highest impact first):

1. **Implement the change**
2. **Re-measure** — Same metrics, same method as baseline
3. **Record the delta** — Improvement or regression from this specific change
4. **Verify correctness** — Tests pass, build succeeds, no functional regressions
5. **Stop** when remaining candidates have diminishing returns or high risk

## Phase 11: Final Report & Awards

### Before/After Summary

| Metric | Before | After | Delta | % Change |
|--------|--------|-------|-------|----------|
| Total | ... | ... | ... | ... |

### Changes Applied
Numbered list of each optimization with its individual measured impact.

### Not Pursued
Candidates skipped with reasons.

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups)
- **Ingenious Discovery** — Most non-obvious bottleneck
- **Most Lethal** — Highest total impact found
- **Sharpest Estimate** — Closest predicted vs actual impact
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false positives or wildly wrong estimates
