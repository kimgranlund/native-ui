# Sweep Tournament

Run a competitive sweep tournament. Two rival enforcement teams per phase battle across 8 phases to find every violation of a pattern or rule. The team that finds more real violations wins. Then all violations get fixed.

## Input

$ARGUMENTS — The pattern to enforce (e.g. "add JSDoc to all exported functions", "ensure every CSS component has [hidden] override", "replace all hardcoded px with token variables", "ensure all event handlers are properly cleaned up").

## Phase 0: Rule Definition & Team Draft

Before scanning:

1. **Read the codebase conventions** — Check CLAUDE.md, config files, existing examples to understand what "correct" looks like.
2. **Define the rule precisely**:
   - **Pass**: What a compliant file/line looks like
   - **Fail**: What a violation looks like
   - **Skip**: What to exclude (generated files, vendor code, etc.)
3. **Find gold-standard examples** — 1-2 files that follow the rule perfectly. Template for fixes.
4. **Draft 16 teams into 8 rival pairs** — Each pair sweeps a different region or sub-pattern.

### Rival Pair Design

| Phase | Team A (Bloodhound) | Team B (Hawk) | Hunting Ground |
|-------|-------------------|--------------|----------------|
| 1 | VIPER | COBRA | **Core modules** — Foundation files, entry points, shared utilities |
| 2 | HYDRA | BASILISK | **Components (A-I)** — First half of component directory alphabetically |
| 3 | KRAKEN | LEVIATHAN | **Components (J-Z)** — Second half of component directory |
| 4 | PHOENIX | DRAGON | **Containers & layouts** — Structural/layout components |
| 5 | WRAITH | SPECTER | **Traits & controllers** — Behavior modules |
| 6 | CHIMERA | MANTICORE | **Tests** — Test files that should also follow the rule |
| 7 | WYVERN | GRIFFIN | **CSS files** — Stylesheets (if rule applies to CSS) |
| 8 | SPHINX | CERBERUS | **Config, docs, & edge cases** — Build scripts, READMEs, demos, unusual files |

Adjust hunting grounds based on the actual rule and codebase structure. If the rule only applies to one file type, narrow each pair's territory and go deeper within it.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents. Each agent sweeps their territory and produces:

- Complete violation list: `file:line — violation — fix needed`
- Count of compliant files (to show coverage)
- Edge cases where the rule is ambiguous

### Scoring

| Finding Type | Points |
|-------------|--------|
| Valid violation rival missed | 5 pts |
| Valid violation (basic) | 1 pt |
| Ambiguous case correctly flagged | 3 pts |
| Compliant file confirmed (coverage) | 0.5 pts |
| False positive (not actually a violation) | -3 pts |
| Duplicate of rival (less precise) | -2 pts |

**Bonuses**: 3x INGENIOUS for finding violations in unexpected places, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first violation found.

## Phase 9: Scoring & Violation Manifest

After all 8 phases:

1. **Score all 16 teams** — Tally with dedup and bonuses
2. **Merge into master violation list** — Deduplicated, grouped by file:

| # | File | Line(s) | Violation | Fix | Found By |
|---|------|---------|-----------|-----|----------|
| 1 | ... | ... | ... | ... | Team X |

**Total**: N violations across M files.

3. **Ambiguous cases** — Items flagged for manual review
4. **Coverage report** — X of Y files compliant before fixes

## Phase 10: Fix

Work through violations in batch:

1. **Group by file** — Fix all violations in a file in one pass
2. **Use gold-standard example** as template
3. **Track progress** — Mark each file as done on the todo list
4. **Verify incrementally** — Type check or test after every 5-10 files

### Rules
- Be mechanical and consistent — every fix follows the same pattern
- Don't improve surrounding code — only fix the specific violation
- Skip ambiguous cases (flag for user)
- Preserve existing formatting

## Phase 11: Verify & Awards

1. **Rescan** — Same searches as phases 1-8. Violations should be zero.
2. **Type check** — If available
3. **Test suite** — If available

### Summary

| Stat | Count |
|------|-------|
| Files scanned | ... |
| Violations found | ... |
| Violations fixed | ... |
| Skipped (ambiguous) | ... |
| Residual after rescan | ... |

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups)
- **Ingenious Discovery** — Most unexpected violation location
- **Most Lethal** — Most violations found
- **Cleanest Sweep** — Fewest false positives
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false positives or missed violations found by rival
