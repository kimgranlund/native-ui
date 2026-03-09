# Compare Tournament

Run a competitive comparison tournament. Two rival analyst teams per phase battle across 8 phases to produce the most thorough, honest assessment of our implementation vs an external reference. Teams fight to find advantages AND disadvantages — whoever paints the most accurate picture wins.

## Input

$ARGUMENTS — What to compare (e.g. "our button vs Radix UI button", "our signal system vs Preact signals", "our popover vs Floating UI", "our form validation vs Zod", "our CSS tokens vs Open Props", "our accessibility vs WAI-ARIA APG patterns").

## Phase 0: Intel Gathering & Team Draft

Before any comparison:

1. **Read our implementation** — Open relevant source files. Map the public API, architecture, features, edge case handling, and bundle contribution.
2. **Research the reference** — Use web search and docs to understand the external implementation. Focus on: API surface, features, patterns, limitations, bundle size, philosophy.
3. **Draft 16 teams into 8 rival pairs** — Each pair compares a different dimension. One team champions our implementation, the other champions the reference. Both must be honest — false claims lose points.

### Rival Pair Design

| Phase | Team A (Home) | Team B (Away) | Comparison Dimension |
|-------|--------------|--------------|---------------------|
| 1 | VIPER | COBRA | **API ergonomics** — Ease of use, learning curve, developer experience |
| 2 | HYDRA | BASILISK | **Feature completeness** — What can each do that the other can't? |
| 3 | KRAKEN | LEVIATHAN | **Architecture & internals** — Design patterns, extensibility, maintainability |
| 4 | PHOENIX | DRAGON | **Performance & size** — Bundle weight, runtime speed, memory |
| 5 | WRAITH | SPECTER | **Type safety & DX** — TypeScript support, autocompletion, error messages |
| 6 | CHIMERA | MANTICORE | **Accessibility & standards** — ARIA, keyboard nav, screen reader support |
| 7 | WYVERN | GRIFFIN | **Edge cases & robustness** — Error handling, browser compat, degradation |
| 8 | SPHINX | CERBERUS | **Ecosystem & adoption** — Docs, community, integrations, migration path |

**Team A (Home)** argues for our strengths in their dimension — but must also concede weaknesses honestly.
**Team B (Away)** argues for the reference's strengths — but must also concede where we're better.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents. Each agent produces:

- 3-5 specific claims about their champion's advantages in this dimension
- 1-3 honest concessions about their champion's weaknesses
- Code/doc evidence for each claim
- Direct side-by-side examples where possible

### Scoring

| Finding Type | Points |
|-------------|--------|
| Advantage claim backed by evidence | 5 pts |
| Honest concession (verified) | 3 pts |
| Side-by-side example demonstrating difference | 3 pts |
| Insight the rival missed entirely | 5 pts |
| False or exaggerated claim | -5 pts |
| Missing an obvious advantage of the other side | -3 pts |
| Vague claim without evidence | -2 pts |

**Bonuses**: 3x INGENIOUS for non-obvious architectural insight, +5 RIVAL KILL for 3+ insights rival missed, +3 FIRST BLOOD for first evidenced claim.

Honesty is rewarded more than cheerleading. A team that concedes a real weakness scores more than a team that hides it.

## Phase 9: Scoring & Synthesis

After all 8 phases:

1. **Score all 16 teams** — Tally claims, concessions, evidence, penalties
2. **Merge into structured comparison**:

### Feature Matrix

| Capability | Ours | Reference | Winner | Evidence |
|-----------|------|-----------|--------|----------|
| ... | Yes/No/Partial | Yes/No/Partial | ... | Phase N finding |

### Architecture Comparison

| Dimension | Ours | Reference | Phase |
|-----------|------|-----------|-------|
| ... | ... | ... | N |

### Side-by-Side Code

3-5 key tasks showing how each implementation handles them.

## Phase 10: Analysis

### Where We're Stronger
Specific advantages backed by tournament evidence. Cite the team and finding.

### Where They're Stronger
Specific advantages of the reference. Be honest — this is for learning.

### Gaps to Consider Closing
Features or patterns from the reference that would meaningfully improve our implementation. Ranked by value.

### Intentional Differences
Things that look like gaps but are deliberate design choices. Explain the reasoning.

## Phase 11: Recommendations & Awards

### Prioritized Action Items

| # | Recommendation | Impact | Effort | Priority |
|---|---------------|--------|--------|----------|
| 1 | ... | ... | ... | P0-P3 |

For top items, sketch what the implementation would look like. Do not implement — just outline.

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups)
- **Ingenious Discovery** — Most non-obvious architectural insight
- **Most Honest Team** — Best concession-to-claim ratio
- **Best Evidence** — Most compelling side-by-side demonstration
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false/exaggerated claims
