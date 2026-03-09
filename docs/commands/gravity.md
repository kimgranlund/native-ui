# Gravity Tournament

Run a competitive dependency gravity tournament. Two rival teams per phase battle across 8 phases to find where the dependency graph is lopsided — modules that pull in too much, imports that drag heavy subgraphs, coupling that should be loose but isn't. One team traces downward (what does this module pull in?), the other traces upward (what depends on this module?). Weight imbalances are gravity violations.

## Input

$ARGUMENTS — What to analyze (e.g. "import graph", "bundle weight", "coupling", "circular dependencies", "god modules", "dependency depth", "fan-in vs fan-out"). Or "full" for comprehensive dependency gravity analysis.

## Phase 0: Graph Construction & Team Draft

Before any analysis:

1. **Build the import graph** — Trace every import statement. Map module → dependencies and module → dependents.
2. **Weigh nodes** — For each module: line count, export count, import count, fan-in (how many modules depend on it), fan-out (how many modules it depends on).
3. **Identify gravity centers** — Modules with disproportionate weight: high fan-in (everything depends on it), high fan-out (it depends on everything), or high transitive weight (importing it pulls in a huge subgraph).
4. **Draft 16 teams into 8 rival pairs** — Each pair analyzes a different gravity dimension.

### Rival Pair Design

Each phase pits a **Geologist** (measures the weight — "this module is too heavy because...") against an **Architect** (defends the structure — "this coupling is necessary because...").

| Phase | Geologist | Architect | Gravity Dimension |
|-------|-----------|-----------|------------------|
| 1 | VIPER | COBRA | **God modules** — Files with >10 exports or >10 imports. Too much responsibility? |
| 2 | HYDRA | BASILISK | **Transitive weight** — Importing module X also pulls in Y, Z, W... Is the subgraph justified? |
| 3 | KRAKEN | LEVIATHAN | **Circular dependencies** — A→B→C→A cycles. Can they be broken? |
| 4 | PHOENIX | DRAGON | **Coupling asymmetry** — A depends on B but B doesn't know A exists. Is this the right direction? |
| 5 | WRAITH | SPECTER | **Barrel bloat** — Index.ts re-exports everything. Does importing one symbol pull in all siblings? |
| 6 | CHIMERA | MANTICORE | **Layer violations** — Lower layers importing from higher layers. Inverted dependency direction. |
| 7 | WYVERN | GRIFFIN | **Shared mutables** — Global state, singletons, module-level variables that create hidden coupling |
| 8 | SPHINX | CERBERUS | **Interface boundaries** — Are module boundaries at the right abstraction level? Too granular? Too coarse? |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Geologist output:**
- Gravity violations: `file — metric: value — "too heavy because..."`
- Dependency chains: `A → B → C → D` (with line counts at each node)
- Suggested splits, extractions, or inversions
- Impact estimate: "splitting X would reduce average import subgraph by N files"

**Architect output:**
- Defenses: `file — "coupling is justified because both modules share domain concept X"`
- Counter-proposals: "don't split X, instead invert the dependency direction"
- Architecture insights: "this god module is actually a facade — the weight is intentional"

### Scoring

| Finding Type | Points |
|-------------|--------|
| Circular dependency with fix proposal | 10 pts |
| God module that should be split (>10 exports doing different things) | 10 pts |
| Layer violation (lower importing higher) | 5 pts |
| Barrel bloat (importing 1 symbol pulls 20+ modules) | 5 pts |
| Transitive weight disproportionate to need | 5 pts |
| Coupling direction should be inverted | 5 pts |
| Shared mutable creating hidden coupling | 5 pts |
| Successful defense (coupling is architecturally correct) | 5 pts |
| False alarm (module is appropriately sized/coupled) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding that one import creates a 50%+ transitive weight increase, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first circular dependency.

## Phase 9: Scoring & Gravity Map

After all 8 phases:

1. **Score all 16 teams** — Geologists vs Architects
2. **Build the gravity map**:

### Heaviest Modules (by transitive import weight)

| # | Module | Direct Deps | Transitive Deps | Fan-In | Fan-Out | Lines | Phase |
|---|--------|------------|-----------------|--------|---------|-------|-------|
| 1 | ... | N | N | N | N | N | N |

### Circular Dependencies

| # | Cycle | Files Involved | Break Point | Phase |
|---|-------|---------------|-------------|-------|
| 1 | A→B→C→A | 3 | Remove B→C | N |

### Layer Violations

| # | Source (lower) | Imports (higher) | Fix | Phase |
|---|---------------|-----------------|-----|-------|
| 1 | ... | ... | invert / extract interface | N |

### Coupling Asymmetries

| # | Module A | Module B | Current Direction | Better Direction | Phase |
|---|---------|---------|------------------|-----------------|-------|
| 1 | ... | ... | A→B | B→A / bidirectional / extract shared | N |

## Phase 10: Rebalance

For each gravity violation (circular deps and layer violations first):

1. **Break cycles** — Extract shared interfaces, invert dependencies, or introduce event-based decoupling
2. **Split god modules** — Extract cohesive submodules
3. **Fix layer violations** — Move imports to correct direction
4. **Reduce barrel bloat** — Add granular export paths
5. **Verify** — Type check + tests + re-measure import graph after each change

### Rules
- Preserve all public API surface
- Don't create more modules than necessary — splitting should reduce complexity, not increase file count
- Dependency direction follows the dependency rule: depend toward stability
- Every structural change gets verified with type check

## Phase 11: Verify & Awards

1. **Rebuild gravity map** — Compare before/after
2. **Type check + tests**
3. **Graph delta**:

| Stat | Before | After | Delta |
|------|--------|-------|-------|
| Circular dependencies | ... | ... | ... |
| Max transitive depth | ... | ... | ... |
| God modules (>10 exports) | ... | ... | ... |
| Layer violations | ... | ... | ... |

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Geologist vs Architect)
- **Ingenious Discovery** — Import that pulls in 50%+ of the codebase
- **Most Lethal** — Most gravity violations found
- **Best Architect** — Most successful structural defenses
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
