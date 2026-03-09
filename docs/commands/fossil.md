# Fossil Tournament

Run a competitive code archaeology tournament. Two rival teams per phase battle across 8 phases to find temporal asymmetries — code that was written for a past version of the codebase and never updated. Patterns that evolved everywhere else but fossilized in one place. Conventions from generation 1 still living in a generation 3 codebase. One team digs for fossils, the other argues they're still alive.

## Input

$ARGUMENTS — Where to dig (e.g. "legacy patterns", "outdated conventions", "stale abstractions", "abandoned migrations", "version-1 patterns", "pre-refactor remnants", "deprecated usage"). Or "full" for comprehensive fossil dig.

## Phase 0: Stratigraphy & Team Draft

Before any digging:

1. **Date the strata** — Read CLAUDE.md, git history (if available), package.json, and comments for evidence of evolutionary phases. When did patterns change? What was the old way vs the new way?
2. **Identify pattern generations** — List known pattern migrations: old pattern → new pattern. Examples: mixins → controllers, class components → hooks, callbacks → promises, var → const.
3. **Sample the modern layer** — Read 3-5 recently-written/updated files to establish what "current generation" code looks like.
4. **Draft 16 teams into 8 rival pairs** — Each pair digs through a different stratum.

### Rival Pair Design

Each phase pits a **Paleontologist** (this code is a fossil from a previous era) against a **Conservationist** (this code is still valid / intentionally preserved).

| Phase | Paleontologist | Conservationist | Stratum |
|-------|---------------|----------------|---------|
| 1 | VIPER | COBRA | **Pattern fossils** — Code using old patterns that the rest of the codebase has moved past |
| 2 | HYDRA | BASILISK | **API fossils** — Usage of deprecated or replaced internal APIs |
| 3 | KRAKEN | LEVIATHAN | **Style fossils** — Naming, formatting, or structural conventions from a previous era |
| 4 | PHOENIX | DRAGON | **Architecture fossils** — Abstractions built for old requirements that no longer apply |
| 5 | WRAITH | SPECTER | **Dependency fossils** — Libraries, polyfills, or workarounds for problems that are now solved natively |
| 6 | CHIMERA | MANTICORE | **Comment fossils** — TODOs, HACKs, workaround notes referencing issues that have been resolved |
| 7 | WYVERN | GRIFFIN | **Config fossils** — Build config, tsconfig, package.json entries from a previous setup |
| 8 | SPHINX | CERBERUS | **Test fossils** — Tests testing old behavior, mocking things that no longer need mocking, skipped tests |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Paleontologist output:**
- Fossils found: `file:line — "uses old pattern X, rest of codebase uses new pattern Y"`
- Evidence: list of files using the modern pattern to prove this is an outlier
- Generation estimate: how old is this fossil? (based on surrounding patterns)
- Modernization effort: trivial / moderate / major refactor needed

**Conservationist output:**
- Defenses: `file:line — "old pattern is preserved because X" (intentional, documented, or technically necessary)`
- Technical debt acknowledgment: "this IS a fossil but can't be modernized because Y"
- Counter-evidence: other files using the same "old" pattern (it's not a fossil, the migration is incomplete)

### Scoring

| Finding Type | Points |
|-------------|--------|
| Confirmed fossil (old pattern, rest of codebase has moved on) | 5 pts |
| Systemic fossil (3+ files stuck on old pattern) — incomplete migration | 10 pts |
| Architecture fossil (entire abstraction layer no longer needed) | 10 pts |
| Dependency fossil (polyfill/workaround for solved problem) | 5 pts |
| Comment fossil (TODO/HACK for resolved issue) | 2 pts |
| Successful conservation (old pattern intentionally preserved) | 5 pts |
| Migration incomplete (not a fossil, just unfinished work) | 3 pts |
| False alarm (code is actually current-gen) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding an abstraction layer that exists solely to support a pattern already replaced, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first architectural fossil.

## Phase 9: Scoring & Fossil Record

After all 8 phases:

1. **Score all 16 teams** — Paleontologists vs Conservationists
2. **Adjudicate each fossil**: modernize (update to current-gen), conserve (keep intentionally), defer (needs larger migration)
3. **Build the fossil record**:

### Modernize (update these)

| # | Fossil | File(s) | Old Pattern | Modern Pattern | Effort | Phase |
|---|--------|---------|-------------|---------------|--------|-------|
| 1 | ... | ... | ... | ... | trivial/moderate/major | N |

### Conserve (keep these)

| # | Code | Reason Preserved | Files | Phase |
|---|------|-----------------|-------|-------|
| 1 | ... | ... | N | N |

### Incomplete Migrations (finish these)

| # | Migration | Old Pattern | New Pattern | Files Remaining | Phase |
|---|-----------|-------------|-------------|----------------|-------|
| 1 | ... | ... | ... | N of M | N |

### Defer (needs larger effort)

| # | Fossil | Why Deferred | Prerequisite | Phase |
|---|--------|-------------|-------------|-------|
| 1 | ... | ... | ... | N |

## Phase 10: Modernize

For fossils marked "modernize" (trivial effort first):

1. **Update to current-gen pattern** — Match the modern files
2. **Remove dead abstractions** — If a layer only existed to support the old pattern
3. **Clean up comment fossils** — Remove or update stale TODOs/HACKs
4. **Remove dependency fossils** — Drop polyfills/workarounds for solved problems
5. **Verify** — Type check + tests after each batch

### Rules
- Modernize to match existing current-gen code — don't invent a new pattern
- For incomplete migrations: complete them, don't add more debt
- Don't modernize "conserve" items — they're intentionally preserved
- Flag "defer" items in AUDIT-BACKLOG.md for future work

## Phase 11: Verify & Awards

1. **Rescan** — Verify modernized fossils now match current-gen
2. **Type check + tests**
3. **Extinction report**:

| Stat | Count |
|------|-------|
| Fossils found | ... |
| Modernized | ... |
| Conserved (intentional) | ... |
| Migrations completed | ... |
| Deferred | ... |

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Paleontologist vs Conservationist)
- **Ingenious Discovery** — Dead abstraction layer nobody realized was obsolete
- **Most Lethal Paleontologist** — Most fossils unearthed
- **Best Conservationist** — Most successful preservation arguments
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms (called modern code a fossil)
