# Align Tournament

Run a competitive convention-alignment tournament. Two rival teams per phase battle across 8 phases to find every place the codebase deviates from its own stated rules. One team hunts deviations, the other argues they're intentional. What can't be defended gets flagged as convention debt.

## Input

$ARGUMENTS — The convention area to align (e.g. "naming conventions", "file structure", "import patterns", "CSS patterns", "ARIA patterns", "error handling patterns", "test patterns", "documentation standards"). Or "full" for a comprehensive alignment audit.

## Phase 0: Convention Mining & Team Draft

Before any scanning:

1. **Mine all conventions** — Read CLAUDE.md, tsconfig.json, eslint/prettier configs, package.json scripts, README, and any other convention-defining files. Extract every stated rule, pattern, and preference.
2. **Sample the codebase** — Read 5-10 representative files to identify unstated conventions (patterns that are consistent but not documented).
3. **Build the convention registry** — Complete list of rules, both stated and inferred.
4. **Draft 16 teams into 8 rival pairs** — Each pair audits a different convention category.

### Rival Pair Design

Each phase pits a **Prosecutor** (this file violates convention X) against a **Defense Attorney** (this deviation is intentional because Y).

| Phase | Prosecutor | Defense | Convention Category |
|-------|-----------|---------|-------------------|
| 1 | VIPER | COBRA | **File structure** — Naming, directory layout, barrel files, file-per-component |
| 2 | HYDRA | BASILISK | **Import patterns** — Relative paths, type imports, import order, circular deps |
| 3 | KRAKEN | LEVIATHAN | **Naming** — Variables, functions, classes, events, attributes, CSS custom properties |
| 4 | PHOENIX | DRAGON | **TypeScript** — Strict mode compliance, type annotations, generics, erasable syntax |
| 5 | WRAITH | SPECTER | **CSS patterns** — Layer usage, :where() wrapping, token usage, specificity |
| 6 | CHIMERA | MANTICORE | **API consistency** — Public API shape, event patterns, attribute patterns, slot patterns |
| 7 | WYVERN | GRIFFIN | **Lifecycle patterns** — Setup/teardown, signal usage, effect patterns, cleanup |
| 8 | SPHINX | CERBERUS | **Documentation** — JSDoc, comments, demo pages, README accuracy |

Adjust categories based on the actual focus area and codebase.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Prosecutor output:**
- Deviations found: `file:line — violates convention: "X" — actual: "Y"`
- Convention reference (where the rule is stated or which files demonstrate the pattern)
- Severity: systemic (many files) / isolated (one file) / ambiguous (rule unclear)

**Defense Attorney output:**
- For each deviation the prosecutor might find: `file:line — deviation is intentional because "Z"`
- Evidence: other files with similar intentional deviations, comments explaining why, architectural reasons
- Counter-argument: sometimes the "convention" is wrong and the deviation is better

### Scoring

| Finding Type | Points |
|-------------|--------|
| Valid deviation with convention reference | 5 pts |
| Systemic deviation (3+ files same violation) | 10 pts |
| Successful defense (deviation proven intentional) | 5 pts |
| Convention gap identified (no stated rule, inconsistent practice) | 3 pts |
| False prosecution (file actually follows convention) | -3 pts |
| Weak defense (no evidence, just opinion) | -3 pts |
| Duplicate of rival's finding | -2 pts |

**Bonuses**: 3x INGENIOUS for finding an unstated convention everyone follows except one file, +5 RIVAL KILL for 3+ uncontested findings, +3 FIRST BLOOD for first systemic deviation.

## Phase 9: Scoring & Convention Debt Report

After all 8 phases:

1. **Score all 16 teams** — Prosecutors vs Defense Attorneys, with dedup and bonuses
2. **Adjudicate contested deviations** — For each prosecution+defense pair, determine: guilty (deviation should be fixed), acquitted (intentional), or mistrial (convention needs clarification)
3. **Build the convention debt report**:

### Guilty — Fix These

| # | Convention Violated | Files Affected | Severity | Phase |
|---|-------------------|---------------|----------|-------|
| 1 | ... | N files | systemic/isolated | N |

### Acquitted — Intentional Deviations

| # | Deviation | Reason | Files | Phase |
|---|-----------|--------|-------|-------|
| 1 | ... | ... | N files | N |

### Mistrial — Convention Unclear

| # | Pattern | What Files Do | Recommendation | Phase |
|---|---------|--------------|---------------|-------|
| 1 | ... | ... | Standardize on X / Document as optional | N |

## Phase 10: Fix Guilty Verdicts

For each guilty deviation (systemic first):

1. **Fix all instances** to match the convention
2. **Verify** — Type check + tests after each batch

## Phase 11: Verify & Awards

1. **Rescan** — Same checks, guilty deviations should be zero
2. **Document mistrials** — Add clarifications to CLAUDE.md for unclear conventions
3. **Type check + tests**

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Prosecutor vs Defense)
- **Ingenious Discovery** — Most subtle unstated convention violation
- **Most Lethal Prosecutor** — Most guilty verdicts
- **Best Defense Attorney** — Most acquittals won
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false prosecutions or weakest defenses
