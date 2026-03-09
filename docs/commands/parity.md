# Parity Tournament

Run a competitive cross-cutting consistency tournament. Given a set of things that should be symmetrical, two rival teams per phase battle across 8 phases to find where one instance breaks the pattern the others follow.

## Input

$ARGUMENTS — The set of things that should be consistent (e.g. "all form components", "all controllers", "all CSS component files", "all barrel exports", "all demo pages", "all event patterns", "all ARIA implementations").

## Phase 0: Pattern Extraction & Team Draft

Before any auditing:

1. **Enumerate the set** — List every member of the group being compared (e.g. all 30 components, all 23 controllers, all CSS files).
2. **Extract the ideal pattern** — Read 3-5 representative members. Identify every attribute they share: file structure, API shape, naming, lifecycle methods, CSS patterns, event patterns, attribute patterns.
3. **Build the parity matrix** — List every dimension that should be consistent across all members.
4. **Draft 16 teams into 8 rival pairs** — Each pair checks a different dimension of parity.

### Rival Pair Design

Each phase pits a **Top-Down** team (defines the ideal, finds deviations) against a **Bottom-Up** team (catalogs what actually exists, finds the outliers).

| Phase | Top-Down | Bottom-Up | Parity Dimension |
|-------|----------|-----------|-----------------|
| 1 | VIPER | COBRA | **File structure** — Do all members have the same file pattern? |
| 2 | HYDRA | BASILISK | **Public API shape** — Same attribute/property/method patterns? |
| 3 | KRAKEN | LEVIATHAN | **Event patterns** — Same naming, detail shape, dispatch timing? |
| 4 | PHOENIX | DRAGON | **Lifecycle** — Same setup/teardown, signal, effect patterns? |
| 5 | WRAITH | SPECTER | **CSS patterns** — Same layer, specificity, transition, token usage? |
| 6 | CHIMERA | MANTICORE | **ARIA & accessibility** — Same role, states, keyboard patterns? |
| 7 | WYVERN | GRIFFIN | **Error & edge cases** — Same disabled, hidden, empty handling? |
| 8 | SPHINX | CERBERUS | **Exports & documentation** — Same barrel pattern, JSDoc, types? |

Adjust dimensions based on the actual group being compared.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Top-Down output:**
- The ideal pattern for this dimension (based on the 3-5 exemplars)
- Every member that deviates: `member — file:line — "should have X but has Y"`
- Whether the deviation is a bug or an intentional special case

**Bottom-Up output:**
- Complete catalog of what each member actually does for this dimension
- Outliers: members that differ from the majority
- Whether the majority pattern is correct or the outlier is actually better

### Scoring

| Finding Type | Points |
|-------------|--------|
| Parity violation confirmed by both teams | 5 pts each |
| Outlier is actually the better pattern (majority is wrong) | 10 pts |
| Intentional special case correctly identified | 3 pts |
| Violation found that rival missed | 5 pts |
| False positive (member is actually consistent) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding a systemic pattern break affecting 5+ members, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first parity violation.

## Phase 9: Scoring & Parity Report

After all 8 phases:

1. **Score all 16 teams** — Top-Down vs Bottom-Up
2. **Build the parity matrix** — Visual grid showing compliance:

### Parity Matrix

| Member | Files | API | Events | Lifecycle | CSS | ARIA | Errors | Exports |
|--------|-------|-----|--------|-----------|-----|------|--------|---------|
| ui-button | pass | pass | FAIL | pass | pass | FAIL | pass | pass |
| ui-input | pass | FAIL | pass | pass | pass | pass | FAIL | pass |
| ... | | | | | | | | |

3. **Violation registry**:

| # | Member | Dimension | Expected | Actual | Fix | Phase |
|---|--------|-----------|----------|--------|-----|-------|
| 1 | ... | ... | ... | ... | ... | N |

4. **Pattern recommendations** — Where the outlier is better, recommend updating the majority

## Phase 10: Fix

For each parity violation (systemic first):

1. **Align the outlier** to match the majority pattern
2. **Or update the majority** if the outlier's pattern is better (flag for user first)
3. **Verify** — Type check + tests after each batch

### Rules
- Fix to match the majority unless the outlier is clearly better
- Flag "outlier is better" cases for user decision
- Don't force parity where intentional special cases exist

## Phase 11: Verify & Awards

1. **Rebuild parity matrix** — Should show all green
2. **Type check + tests**
3. **Report remaining intentional special cases**

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Top-Down vs Bottom-Up)
- **Ingenious Discovery** — Most subtle parity break
- **Most Lethal** — Most violations found
- **Pattern Breaker** — Found that the majority was wrong, not the outlier
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false positives
