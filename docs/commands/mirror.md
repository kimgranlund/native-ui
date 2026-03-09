# Mirror Tournament

Run a competitive symmetry-enforcement tournament. Two rival teams per phase battle across 8 phases to find asymmetries between things that should mirror each other: setup vs teardown, serialize vs deserialize, encode vs decode, request vs response, create vs destroy, add vs remove. If one side does something, the other side must do the inverse.

## Input

$ARGUMENTS — The mirror axis (e.g. "setup vs teardown", "serialize vs deserialize", "create vs destroy", "open vs close", "add vs remove listeners", "mount vs unmount", "encode vs decode", "push vs pop"). Or "full" to audit all symmetry axes.

## Phase 0: Axis Mapping & Team Draft

Before any scanning:

1. **Identify all mirror pairs in the codebase** — Scan for symmetric operations: constructor/destructor, setup/teardown, add/remove, open/close, show/hide, encode/decode, serialize/deserialize, connect/disconnect, subscribe/unsubscribe, lock/unlock.
2. **For each pair, define what symmetry means** — If setup adds 3 listeners, teardown must remove exactly 3. If serialize writes 5 fields, deserialize must read 5. No more, no less.
3. **Catalog known pairs** — List every file that has one side of a mirror operation.
4. **Draft 16 teams into 8 rival pairs** — Each pair audits a different symmetry axis.

### Rival Pair Design

Each phase pits a **Left Mirror** team (audits the "do" side — setup, add, open, create) against a **Right Mirror** team (audits the "undo" side — teardown, remove, close, destroy). Each team advocates that THEIR side is complete and the other side is missing operations.

| Phase | Left Mirror | Right Mirror | Symmetry Axis |
|-------|-----------|-------------|--------------|
| 1 | VIPER | COBRA | **Setup ↔ Teardown** — Every resource acquired in setup released in teardown? |
| 2 | HYDRA | BASILISK | **addEventListener ↔ removeEventListener** — Every listener added gets removed? |
| 3 | KRAKEN | LEVIATHAN | **Create ↔ Destroy** — Every object/element created gets cleaned up? |
| 4 | PHOENIX | DRAGON | **Open ↔ Close** — Every popover/dialog/connection opened gets closed? |
| 5 | WRAITH | SPECTER | **Subscribe ↔ Unsubscribe** — Every signal/observer subscription gets disposed? |
| 6 | CHIMERA | MANTICORE | **Set ↔ Reset** — Every attribute/state/style set gets reset to default? |
| 7 | WYVERN | GRIFFIN | **Serialize ↔ Deserialize** — Data round-trips losslessly? form value → save → restore? |
| 8 | SPHINX | CERBERUS | **Public API symmetry** — Every `enable()` has `disable()`, every `show()` has `hide()`? |

Adjust axes based on the codebase and user's focus area.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Left Mirror output (the "do" side):**
- Operations cataloged: `file:line — "setup adds listener for 'click'"`
- Missing inverse: `file:line — "setup adds listener for 'click' but teardown never removes it"`
- Orphaned setup: operations that happen but have no corresponding undo path

**Right Mirror output (the "undo" side):**
- Operations cataloged: `file:line — "teardown removes listener for 'click'"`
- Missing forward: `file:line — "teardown removes X but setup never added X"` (dead cleanup)
- Incomplete undo: `file:line — "teardown removes 2 of 3 listeners added in setup"`

### Scoring

| Finding Type | Points |
|-------------|--------|
| Missing inverse (do without undo) — confirmed resource leak | 10 pts |
| Incomplete inverse (partial cleanup) | 5 pts |
| Dead cleanup (undo without do) | 3 pts |
| Round-trip data loss (serialize ↔ deserialize asymmetry) | 10 pts |
| Missing public API inverse (show without hide) | 5 pts |
| Order asymmetry (setup: A,B,C but teardown: A,C — skips B) | 5 pts |
| False alarm (symmetry is actually maintained) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding a leak that compounds over time (each operation leaks more), +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first confirmed resource leak.

## Phase 9: Scoring & Asymmetry Report

After all 8 phases:

1. **Score all 16 teams** — Left Mirror vs Right Mirror
2. **Build the asymmetry report**:

### Resource Leaks (missing inverse)

| # | Do Operation | File:Line | Missing Undo | Leak Type | Phase |
|---|-------------|-----------|-------------|-----------|-------|
| 1 | addEventListener('click') | ... | no removeEventListener | listener leak | 2 |

### Incomplete Cleanup

| # | Do Side | Undo Side | What's Missing | Phase |
|---|---------|-----------|---------------|-------|
| 1 | adds 3 listeners | removes 2 | missing 'resize' removal | 2 |

### Dead Cleanup (undo without do)

| # | Undo Operation | File:Line | No Corresponding Do | Phase |
|---|---------------|-----------|-------------------|-------|
| 1 | ... | ... | ... | N |

### Data Round-Trip Losses

| # | Serialize | Deserialize | What's Lost | Phase |
|---|-----------|-------------|------------|-------|
| 1 | ... | ... | ... | 7 |

## Phase 10: Restore Symmetry

For each asymmetry (leaks first):

1. **Add the missing inverse** — Match every do with an undo
2. **Fix incomplete cleanups** — Ensure exact parity
3. **Remove dead cleanup** — Delete undo operations with no corresponding do
4. **Fix round-trip losses** — Ensure serialize → deserialize is lossless
5. **Verify** — Type check + tests after each batch

### Rules
- The inverse must match exactly — same arguments, same scope, same timing
- Cleanup order should be reverse of setup order (LIFO)
- Don't add cleanup for operations that are intentionally permanent
- Every fix gets a test that verifies the symmetry

## Phase 11: Verify & Awards

1. **Rescan** — Verify all asymmetries resolved
2. **Leak test** — Run setup + teardown N times, verify no resource accumulation
3. **Type check + tests**

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Left vs Right Mirror)
- **Ingenious Discovery** — Leak that compounds over time
- **Most Lethal** — Most asymmetries found
- **Sharpest Mirror** — Most precise do↔undo mapping
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
