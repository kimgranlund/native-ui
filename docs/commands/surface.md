# Surface Tournament

Run a competitive API surface audit tournament. Two rival teams per phase battle across 8 phases to find asymmetries between what a module exposes and what consumers actually need. One team maps the supply (what's exported), the other maps the demand (what's imported). The gap is bloat, the overlap is the real API, and anything demanded but not supplied is a missing feature.

## Input

$ARGUMENTS — What surface to audit (e.g. "public API", "component attributes", "event catalog", "CSS custom properties", "type exports", "slot API", "controller options"). Or "full" for comprehensive surface analysis.

## Phase 0: Surface Census & Team Draft

Before any scanning:

1. **Census the supply side** — List every export, public method, attribute, event, slot, CSS custom property, and configuration option the codebase exposes.
2. **Census the demand side** — Search for actual usage: imports, attribute usage in HTML, event listeners, slot content, CSS property overrides. Check internal usage, demo pages, tests, and docs for usage patterns.
3. **Identify the surface categories** — Group by: JS exports, HTML attributes, events, slots, CSS properties, types.
4. **Draft 16 teams into 8 rival pairs** — Each pair audits a different surface category.

### Rival Pair Design

Each phase pits a **Supply** team (maps what's offered) against a **Demand** team (maps what's actually used). The gap between them reveals: unused API (bloat), missing API (gaps), and mismatched API (friction).

| Phase | Supply | Demand | Surface Category |
|-------|--------|--------|-----------------|
| 1 | VIPER | COBRA | **JS exports** — Exported symbols vs actually imported symbols |
| 2 | HYDRA | BASILISK | **HTML attributes** — Observed attributes vs attributes used in demos/docs/tests |
| 3 | KRAKEN | LEVIATHAN | **Events** — Events dispatched vs events listened to in consumer code |
| 4 | PHOENIX | DRAGON | **Slots** — Slots defined in CSS/docs vs slots actually used in HTML |
| 5 | WRAITH | SPECTER | **CSS custom properties** — Properties set by components vs properties overridden by consumers |
| 6 | CHIMERA | MANTICORE | **Type exports** — Exported types/interfaces vs imported types in consumer code |
| 7 | WYVERN | GRIFFIN | **Controller options** — Options accepted vs options actually passed by components |
| 8 | SPHINX | CERBERUS | **Public methods** — Methods on element classes vs methods called by consumers |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Supply team output:**
- Complete inventory: `module — exports [list of symbols]`
- For each export: internal-only / consumed externally / consumed in tests only / consumed in demos only
- Suspected bloat: exports with zero external consumption

**Demand team output:**
- Complete usage map: `consumer-file:line — imports/uses [symbol] from [module]`
- Missing supply: `consumer-file:line — needs X but no module exports it (uses workaround Y)`
- Friction points: `consumer-file:line — imports X but has to transform/wrap it because the API doesn't quite fit`

### Scoring

| Finding Type | Points |
|-------------|--------|
| Exported symbol with zero consumers (confirmed bloat) | 5 pts |
| Missing API forcing workaround in consumer code | 10 pts |
| API friction (consumer wraps/transforms the export) | 5 pts |
| Undocumented export that IS consumed (shadow API) | 5 pts |
| Attribute accepted but never used in any demo/test | 3 pts |
| Event dispatched but never listened to | 3 pts |
| Slot defined but never populated | 3 pts |
| CSS property set but never overridden | 2 pts |
| False alarm (export IS consumed, just not found) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding a missing API that would simplify 5+ consumer call sites, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first confirmed bloat export.

## Phase 9: Scoring & Surface Report

After all 8 phases:

1. **Score all 16 teams** — Supply vs Demand
2. **Build the Venn diagram**:

### Supply-Only (Bloat — exported but never consumed)

| # | Module | Symbol | Category | Evidence | Phase |
|---|--------|--------|----------|----------|-------|
| 1 | ... | ... | export/attr/event/slot | zero references | N |

### Demand-Only (Gaps — needed but not supplied)

| # | Consumer | Needs | Current Workaround | Ideal API | Phase |
|---|---------|-------|-------------------|-----------|-------|
| 1 | ... | ... | ... | ... | N |

### Overlap with Friction (API mismatch)

| # | Export | Consumer | Friction | Suggested Fix | Phase |
|---|--------|---------|---------|--------------|-------|
| 1 | ... | ... | wraps in X / transforms via Y | ... | N |

### Shadow API (consumed but undocumented)

| # | Symbol | Consumers | Should Be | Phase |
|---|--------|----------|-----------|-------|
| 1 | ... | N files | documented / made private | N |

## Phase 10: Rationalize

1. **Remove bloat** — Delete exports with zero consumers (after user confirmation)
2. **Fill gaps** — Add missing API that would eliminate workarounds
3. **Reduce friction** — Adjust APIs so consumers don't need to wrap/transform
4. **Document shadow API** — Or make it private if it shouldn't be public
5. **Verify** — Type check + tests after each change

### Rules
- Don't remove exports that are part of the documented public API without user approval
- Don't add new API surface unless it eliminates real friction
- Update barrel files and type exports alongside any changes

## Phase 11: Verify & Awards

1. **Re-census** — Supply and demand counts after changes
2. **Type check + tests**
3. **Surface delta**:

| Stat | Before | After | Delta |
|------|--------|-------|-------|
| Total exports | ... | ... | ... |
| Consumed exports | ... | ... | ... |
| Bloat exports | ... | ... | ... |
| Consumer workarounds | ... | ... | ... |

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Supply vs Demand)
- **Ingenious Discovery** — Missing API that would simplify the most consumers
- **Most Lethal** — Most surface asymmetries found
- **Bloat Hunter** — Most unused exports identified
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
