# Refactor Tournament

Run a competitive refactoring tournament. Two rival architect teams battle across 8 phases to produce the safest, most thorough refactor plan — then the winning approach is executed.

## Input

$ARGUMENTS — What to refactor and the goal (e.g. "extract FooController from ui-foo-element.ts", "split utils.ts into domain-specific modules", "flatten class hierarchy in auth/", "convert callbacks to async/await in api layer").

## Phase 0: Reconnaissance

Before any planning begins:

1. **Read the target** — Open the file(s) or module(s) being refactored. Map the current structure, public API, and internal patterns.
2. **Map the blast radius** — Find ALL dependents and dependencies. Count every file that imports/uses the target. Check tests, barrel files, configs, docs.
3. **Detect conventions** — How is similar code structured elsewhere? What naming/file patterns does this codebase follow?
4. **Draft 16 teams into 8 rival pairs** — Each pair fights over a different dimension of the refactor.

### Rival Pair Design

| Phase | Team A (Offense) | Team B (Defense) | Battle |
|-------|-----------------|-----------------|--------|
| 1 | VIPER | COBRA | **Dependency mapping** — Who finds more affected files? |
| 2 | HYDRA | BASILISK | **API surface** — How should the public API change? |
| 3 | KRAKEN | LEVIATHAN | **File structure** — Where should code live? |
| 4 | PHOENIX | DRAGON | **Type safety** — What type changes cascade? |
| 5 | WRAITH | SPECTER | **Test impact** — What tests break, move, or need creation? |
| 6 | CHIMERA | MANTICORE | **Edge cases** — What breaks during migration? |
| 7 | WYVERN | GRIFFIN | **Import graph** — Circular deps, barrel updates, re-exports? |
| 8 | SPHINX | CERBERUS | **Rollback safety** — Can each step be individually reverted? |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents (rival pair). Each agent investigates their battle dimension and produces:

- Specific findings with file:line references
- Risks identified
- Proposed approach for their dimension
- Critique of what the rival team likely missed

### Scoring

| Finding Type | Points |
|-------------|--------|
| Affected file the rival missed | 5 pts |
| Breaking change identified | 10 pts |
| Edge case that would cause runtime failure | 10 pts |
| Type cascade correctly mapped | 3 pts |
| Test gap identified | 3 pts |
| False positive (file flagged but unaffected) | -3 pts |
| Duplicate of rival's finding (less precise) | -2 pts |

**Bonuses**: 3x INGENIOUS for systemic insights, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first breaking change.

## Phase 9: Merge & Plan

After all 8 phases:

1. **Score all 16 teams** — Tally with dedup penalties and bonuses
2. **Merge findings** — Combine the best insights from both rivals in each pair into a unified refactor plan
3. **Build the change manifest**:

| File | Action | What Changes | Risk | Phase Source |
|------|--------|-------------|------|-------------|
| ... | create/modify/delete | ... | low/med/high | Phase N winner |

4. **Before/After sketch** — Show the structural change in pseudocode
5. **Verification checkpoints** — Type check, tests, import resolution, export parity after each step

## Phase 10: Execute

Work through the manifest:

1. **Create** new files first (imports resolve)
2. **Modify** existing files (move code, adjust APIs)
3. **Update** all dependents (fix imports, adjust usage)
4. **Update** barrel files and re-exports
5. **Delete** old files last

### Rules
- Never break the build between steps
- Preserve all existing tests — move alongside their code
- Preserve all public type exports
- Match codebase conventions
- No drive-by cleanups beyond the stated refactor

## Phase 11: Verify & Awards

1. **Type check** — Zero errors
2. **Test suite** — All pass
3. **Diff summary** — Files created, modified, deleted
4. **Export audit** — No public exports lost
5. **Import audit** — No broken imports

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups)
- **Ingenious Discovery** — Subtlest refactor risk caught
- **Most Lethal** — Most affected files found
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false positives
