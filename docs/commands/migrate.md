# Migration Tournament

Run a competitive migration tournament. Two rival scout teams per phase battle across 8 phases to find every instance of the old pattern, identify edge cases, and ensure nothing survives the migration.

## Input

$ARGUMENTS — The migration to perform (e.g. "rename getUserData to fetchUser everywhere", "replace all mixin usage with controller pattern", "move from moment.js to date-fns", "replace hardcoded colors with tokens").

## Phase 0: Intel Briefing

Before any changes:

1. **Parse the migration** — Identify the "from" pattern and "to" pattern precisely. What does old look like? What should new look like?
2. **Quick scan** — Get a rough count of instances to understand the scale.
3. **Draft 16 teams into 8 rival pairs** — Each pair hunts through a different layer of the codebase.

### Rival Pair Design

| Phase | Team A (Hunter) | Team B (Tracker) | Hunting Ground |
|-------|----------------|-----------------|----------------|
| 1 | VIPER | COBRA | **Source definitions** — Where is the pattern defined/implemented? |
| 2 | HYDRA | BASILISK | **Direct consumers** — Files that import/call the old pattern |
| 3 | KRAKEN | LEVIATHAN | **Indirect references** — Re-exports, aliases, destructured renames, dynamic access |
| 4 | PHOENIX | DRAGON | **Tests** — Test files, mocks, fixtures, assertions using the old pattern |
| 5 | WRAITH | SPECTER | **Types** — Type definitions, interfaces, generics referencing the old pattern |
| 6 | CHIMERA | MANTICORE | **Documentation** — Comments, READMEs, JSDocs, config files, build scripts |
| 7 | WYVERN | GRIFFIN | **Edge cases** — Partial matches, string literals, template expressions, generated code |
| 8 | SPHINX | CERBERUS | **Side effects** — Behavioral changes, API contract shifts, semantic differences |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents. Each agent hunts for every instance of the old pattern in their hunting ground and produces:

- Complete list of findings: `file:line — old pattern — suggested replacement`
- Edge cases that need special handling
- Instances that should NOT be migrated (false matches)

### Scoring

| Finding Type | Points |
|-------------|--------|
| Valid instance rival missed | 5 pts |
| Edge case correctly identified | 5 pts |
| False match correctly excluded | 3 pts |
| Instance found (basic) | 1 pt |
| False positive (flagged but not a real instance) | -3 pts |
| Duplicate of rival (less precise) | -2 pts |

**Bonuses**: 3x INGENIOUS for finding hidden instances (dynamic refs, generated code), +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first edge case.

## Phase 9: Scoring & Manifest

After all 8 phases:

1. **Score all 16 teams** — Tally with dedup and bonuses
2. **Merge into master manifest** — Deduplicated, ordered by dependency:

| # | File | Line(s) | Change | Category | Risk | Found By |
|---|------|---------|--------|----------|------|----------|
| 1 | ... | ... | ... | source/test/docs/config | low/med/high | Team X |

**Total**: N files, M changes.

3. **Edge case registry** — Special-handling items that need manual review
4. **Do-not-touch list** — False matches confirmed by both teams

## Phase 10: Execute

Work through the manifest systematically:

1. **Source definitions first** — Change where the pattern is defined
2. **Direct consumers** — Update all imports and call sites
3. **Types** — Update type definitions and interfaces
4. **Tests** — Update assertions, mocks, fixtures
5. **Indirect references** — Re-exports, barrel files, aliases
6. **Documentation** — Comments, docs, configs
7. **Generated code** — Regenerate rather than hand-edit

### Rules
- Use `replace_all` when unambiguous within a file
- Targeted edits with full context for ambiguous cases
- Skip false matches identified in the do-not-touch list
- Process in dependency order
- Track progress on the todo list

## Phase 11: Verify & Awards

1. **Residual scan** — Search for ANY remaining old pattern. Should be zero.
2. **Type check** — If available
3. **Test suite** — If available
4. **Summary**: Files modified, total replacements, residuals, test results

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups)
- **Ingenious Discovery** — Most hidden instance found
- **Most Lethal** — Most valid instances found
- **Edge Case Hunter** — Most edge cases identified
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false positives

If residuals or failures exist, fix them before declaring done.
