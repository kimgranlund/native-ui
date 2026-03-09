# Drift Tournament

Run a competitive drift-detection tournament. Two rival teams per phase battle across 8 phases to find places where the codebase has drifted from its original design intent. Documentation says X, code does Y. Config promises X, runtime delivers Y. One team traces forward (intent → implementation), the other traces backward (implementation → intent). Gaps are drift.

## Input

$ARGUMENTS — Where to look for drift (e.g. "docs vs code", "config vs behavior", "types vs runtime", "API docs vs actual API", "comments vs logic", "tests vs implementation", "README vs reality"). Or "full" for comprehensive drift analysis.

## Phase 0: Intent Mining & Team Draft

Before any scanning:

1. **Mine documented intent** — Read CLAUDE.md, README, JSDoc, inline comments, type definitions, config files, test descriptions, commit messages. Build a registry of what the codebase CLAIMS to do.
2. **Sample actual behavior** — Read 5-10 files and compare what the code ACTUALLY does vs what surrounding documentation/types/comments say.
3. **Identify drift categories** — Where are the seams between intent and reality? Docs, types, comments, configs, tests, naming.
4. **Draft 16 teams into 8 rival pairs** — Each pair hunts drift in a different seam.

### Rival Pair Design

Each phase pits a **Cartographer** (traces from intent to implementation — "the map says X, does the territory match?") against a **Explorer** (traces from implementation to intent — "the territory does Y, does any map describe it?").

| Phase | Cartographer | Explorer | Drift Seam |
|-------|-------------|---------|-----------|
| 1 | VIPER | COBRA | **Docs → Code** — Do README/CLAUDE.md claims match what the code actually does? |
| 2 | HYDRA | BASILISK | **Types → Runtime** — Do type signatures match actual runtime behavior? Optional params that are required? Types that lie? |
| 3 | KRAKEN | LEVIATHAN | **Comments → Logic** — Do inline comments describe what the code actually does? Stale comments? |
| 4 | PHOENIX | DRAGON | **Tests → Implementation** — Do test descriptions match what they test? Do tests test current behavior or stale behavior? |
| 5 | WRAITH | SPECTER | **Config → Behavior** — Do tsconfig, build configs, and package.json match actual build behavior? |
| 6 | CHIMERA | MANTICORE | **Naming → Semantics** — Do function/variable/file names accurately describe what they do? |
| 7 | WYVERN | GRIFFIN | **API contract → Usage** — Do exported APIs work the way consumers are expected to use them? |
| 8 | SPHINX | CERBERUS | **Error messages → Actual errors** — Do error messages/validation messages match what actually went wrong? |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Cartographer output (intent → implementation):**
- Drift found: `intent-source → code-file:line — "docs say X but code does Y"`
- Drift severity: misleading (actively wrong) / stale (was true, no longer) / incomplete (partially true)
- Which is correct — the intent or the implementation?

**Explorer output (implementation → intent):**
- Undocumented behavior: `code-file:line — "code does X but no docs/types/comments describe this"`
- Shadow features: functionality that exists but has no public documentation
- Contradicted behavior: `code-file:line — "code does X which contradicts stated intent Y"`

### Scoring

| Finding Type | Points |
|-------------|--------|
| Actively misleading drift (docs say opposite of reality) | 10 pts |
| Type that lies (type says X, runtime does Y) | 10 pts |
| Stale comment/doc (was true, no longer) | 5 pts |
| Shadow feature (undocumented behavior) | 5 pts |
| Naming that misleads (name implies X, does Y) | 5 pts |
| Incomplete documentation (partially true) | 2 pts |
| Test drift (tests describe stale behavior) | 3 pts |
| False alarm (intent and implementation actually match) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding drift that has caused or would cause real bugs, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first actively misleading drift.

## Phase 9: Scoring & Drift Report

After all 8 phases:

1. **Score all 16 teams** — Cartographers vs Explorers
2. **For each drift finding, determine the fix direction**:
   - **Update intent** — The code is correct, docs/types/comments need updating
   - **Update implementation** — The docs are correct, code needs fixing
   - **Update both** — Neither is right, needs redesign
3. **Build the drift report**:

### Actively Misleading (fix immediately)

| # | Intent Source | Says | Code | Does | Fix Direction | Phase |
|---|-------------|------|------|------|--------------|-------|
| 1 | ... | ... | ... | ... | update intent/code/both | N |

### Stale (fix soon)

| # | Source | Drift | Fix Direction | Phase |
|---|--------|-------|--------------|-------|
| 1 | ... | ... | ... | N |

### Shadow Features (document or remove)

| # | Code | Undocumented Behavior | Action | Phase |
|---|------|---------------------|--------|-------|
| 1 | ... | ... | document/remove | N |

## Phase 10: Reconcile

For each drift finding (misleading first):

1. **Fix in the determined direction** — Update docs, fix code, or both
2. **Verify** — Re-read to confirm intent and implementation now match
3. **Type check + tests** after each batch

### Rules
- When in doubt, the code is truth — update the docs
- When the docs describe correct behavior and the code is wrong — fix the code
- Don't just delete stale comments — update them to reflect current reality
- Shadow features: ask user whether to document or remove

## Phase 11: Verify & Awards

1. **Rescan** — Quick check that top drift items are resolved
2. **Type check + tests**

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Cartographer vs Explorer)
- **Ingenious Discovery** — Drift that was actively causing bugs
- **Most Lethal** — Most drift findings
- **Best Cartographer** — Most intent→code drifts found
- **Best Explorer** — Most undocumented behaviors found
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
