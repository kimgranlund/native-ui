# Prune Tournament

Run a competitive dead-code elimination tournament. Two rival teams per phase battle across 8 phases to find unused code. One team hunts dead code, the other defends it ("it's used dynamically" / "it's planned"). Anything undefended gets removed.

## Input

$ARGUMENTS — What to prune (e.g. "unused exports", "dead files", "stale dependencies", "orphaned tests", "abandoned features", "unused CSS", "unreachable code paths"). Or "full" for a comprehensive prune.

## Phase 0: Codebase Census & Team Draft

Before any pruning:

1. **Census the codebase** — Count files, exports, imports, dependencies, test files, CSS rules. Get the full picture of what exists.
2. **Map the dependency graph** — Entry points → what they pull in. Everything not reachable from an entry point is a candidate.
3. **Identify dynamic usage patterns** — Look for: dynamic imports, string-based lookups, convention-based auto-loading, runtime registration, reflection. These make static analysis unreliable.
4. **Draft 16 teams into 8 rival pairs** — Each pair hunts through a different category of potential dead code.

### Rival Pair Design

Each phase pits a **Reaper** (this code is dead, remove it) against a **Necromancer** (this code is alive, here's proof).

| Phase | Reaper | Necromancer | Hunting Ground |
|-------|--------|-------------|---------------|
| 1 | VIPER | COBRA | **Unused exports** — Exported symbols with zero import references |
| 2 | HYDRA | BASILISK | **Orphaned files** — Files not imported by any other file |
| 3 | KRAKEN | LEVIATHAN | **Dead dependencies** — package.json deps not imported anywhere |
| 4 | PHOENIX | DRAGON | **Unreachable code** — Branches that can never execute, early returns that shadow code |
| 5 | WRAITH | SPECTER | **Stale features** — Commented-out code, TODO/FIXME with old dates, disabled tests |
| 6 | CHIMERA | MANTICORE | **Unused CSS** — Selectors that match no existing HTML/component patterns |
| 7 | WYVERN | GRIFFIN | **Redundant code** — Duplicate functions, reimplemented utilities, copy-paste patterns |
| 8 | SPHINX | CERBERUS | **Zombie config** — Unused build targets, stale scripts, obsolete config keys |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Reaper output:**
- Dead code found: `file:line — "symbol X is exported but imported nowhere"`
- Evidence: grep results showing zero references
- Confidence: high (static proof) / medium (no references found but could be dynamic) / low (might be used externally)

**Necromancer output:**
- Defense: `file:line — "symbol X is alive because Y"`
- Evidence: dynamic import, external consumer, runtime registration, future roadmap item
- If no defense possible: concede ("this is genuinely dead")

### Scoring

| Finding Type | Points |
|-------------|--------|
| Dead code confirmed (Reaper finds, Necromancer concedes) | 5 pts each |
| Dead code defended (Necromancer proves it's alive) | 5 pts Necromancer, -3 Reaper |
| Dynamic usage pattern identified | 3 pts |
| Redundant code with dedup opportunity | 3 pts |
| False kill (code is actually used, Reaper missed reference) | -5 pts Reaper |
| Weak defense (no evidence) | -3 pts Necromancer |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding a large interconnected dead subgraph, +5 RIVAL KILL for 3+ uncontested finds, +3 FIRST BLOOD for first confirmed dead file.

## Phase 9: Scoring & Kill List

After all 8 phases:

1. **Score all 16 teams** — Reapers vs Necromancers
2. **Adjudicate**: confirmed dead (remove), defended alive (keep), disputed (flag for user)
3. **Build the kill list**:

### Confirmed Dead — Remove

| # | File / Symbol | Category | Lines | Confidence | Phase |
|---|-------------|----------|-------|-----------|-------|
| 1 | ... | export/file/dep/CSS | ... | high/medium | N |

### Defended Alive — Keep

| # | File / Symbol | Reason Alive | Evidence | Phase |
|---|-------------|-------------|----------|-------|
| 1 | ... | ... | ... | N |

### Disputed — User Decision

| # | File / Symbol | Reaper's Case | Necromancer's Case | Phase |
|---|-------------|-------------|-------------------|-------|
| 1 | ... | ... | ... | N |

**Estimated savings**: N files, M lines, K bytes removable.

## Phase 10: Execute Removals

For confirmed dead code only:

1. **Remove in dependency order** — Delete consumers before definitions
2. **Update barrel files** — Remove deleted exports
3. **Clean up imports** — Remove import statements for deleted modules
4. **Verify after each batch** — Type check + tests

### Rules
- Never remove disputed items without user confirmation
- Never remove anything the Necromancer successfully defended
- Remove cleanly — no leftover import statements or empty files

## Phase 11: Verify & Awards

1. **Type check** — Zero errors
2. **Test suite** — All pass
3. **Re-census** — Count files, exports, deps again. Report delta.

### Summary

| Stat | Before | After | Delta |
|------|--------|-------|-------|
| Files | ... | ... | -N |
| Exports | ... | ... | -N |
| Dependencies | ... | ... | -N |
| Lines of code | ... | ... | -N |

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Reaper vs Necromancer)
- **Ingenious Discovery** — Largest dead subgraph found
- **Most Lethal Reaper** — Most confirmed kills
- **Best Necromancer** — Most successful defenses
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false kills or weakest defenses
