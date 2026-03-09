# Test Tournament

Run a competitive test coverage warfare tournament. Two rival teams per phase battle across 8 phases. One team hunts for untested code paths, the other hunts for tests that exist but don't actually assert anything meaningful. Then the winning findings get turned into real tests.

## Input

$ARGUMENTS — What to test (e.g. "form components", "controllers", "state management", "event handling", "CSS integration", "edge cases", "error paths", "accessibility"). Or "full" for comprehensive test coverage analysis.

## Phase 0: Coverage Recon & Team Draft

Before any hunting:

1. **Run existing tests** — Get current pass/fail count and identify any test infrastructure.
2. **Map testable surface** — List all source modules, public APIs, event handlers, state transitions, and edge cases that SHOULD have tests.
3. **Sample existing tests** — Read 3-5 test files to understand: test style, assertion patterns, setup/teardown conventions, mocking approach.
4. **Draft 16 teams into 8 rival pairs** — Each pair targets a different test dimension.

### Rival Pair Design

Each phase pits a **Ghost Hunter** (finds code with no tests at all) against a **Myth Buster** (finds tests that exist but prove nothing).

| Phase | Ghost Hunter | Myth Buster | Testing Dimension |
|-------|-------------|-------------|------------------|
| 1 | VIPER | COBRA | **Happy paths** — Core functionality: does the basic thing work? |
| 2 | HYDRA | BASILISK | **State transitions** — Signal changes, attribute updates, lifecycle hooks |
| 3 | KRAKEN | LEVIATHAN | **Event handling** — Events dispatched, listeners fired, detail correct |
| 4 | PHOENIX | DRAGON | **Edge cases** — Boundary values, empty state, null, rapid operations |
| 5 | WRAITH | SPECTER | **Error paths** — Invalid input, failed operations, error recovery |
| 6 | CHIMERA | MANTICORE | **Integration** — Components working together, coordinator wiring, slot content |
| 7 | WYVERN | GRIFFIN | **Accessibility** — ARIA attributes, keyboard navigation, focus management |
| 8 | SPHINX | CERBERUS | **Cleanup & lifecycle** — Setup/teardown symmetry, memory leaks, listener cleanup |

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Ghost Hunter output:**
- Untested code: `source-file:line — "function X has zero test coverage"`
- Missing test scenarios: `source-file:line — "attribute Y change has no test"`
- Priority: critical path (users hit this constantly) / important (common scenario) / edge (rare but dangerous)

**Myth Buster output:**
- Weak tests: `test-file:line — "test calls X but never asserts the result"`
- Tautological tests: `test-file:line — "asserts true === true, proves nothing"`
- Missing assertions: `test-file:line — "sets up scenario but doesn't check the outcome"`
- Incomplete tests: `test-file:line — "tests success case but not failure case"`
- Over-mocked tests: `test-file:line — "mocks so much that the test doesn't exercise real code"`

### Scoring

| Finding Type | Points |
|-------------|--------|
| Critical-path code with zero tests | 10 pts |
| Test that asserts nothing meaningful | 10 pts |
| Important untested scenario | 5 pts |
| Incomplete test (missing assertions) | 5 pts |
| Edge case without coverage | 2 pts |
| Over-mocked test (proves nothing about real code) | 3 pts |
| False alarm (code IS tested / test IS meaningful) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for finding a test that actively hides a bug (passes but masks wrong behavior), +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first critical-path gap.

## Phase 9: Scoring & Coverage Gap Report

After all 8 phases:

1. **Score all 16 teams** — Ghost Hunters vs Myth Busters
2. **Build the coverage gap report**:

### Untested Code (Ghost Hunter wins)

| # | Source File | Line(s) | What's Untested | Priority | Found By |
|---|-----------|---------|----------------|----------|----------|
| 1 | ... | ... | ... | critical/important/edge | Team X |

### Weak Tests (Myth Buster wins)

| # | Test File | Line(s) | Problem | Fix Needed | Found By |
|---|----------|---------|---------|-----------|----------|
| 1 | ... | ... | no assertion / tautological / incomplete | ... | Team X |

3. **Coverage priorities** — Rank all findings by: impact if the untested code breaks × likelihood of breakage

## Phase 10: Write Tests

For each finding (highest priority first):

1. **For untested code** — Write a new test following the codebase's existing test patterns
2. **For weak tests** — Strengthen with meaningful assertions, add missing cases
3. **Verify** — Each new/fixed test passes AND would fail if the code it tests were broken

### Rules
- Follow existing test conventions (style, naming, setup patterns)
- Each test should fail if the feature it covers is removed or broken
- Don't write tests that just exercise code without checking outcomes
- Group tests logically in existing test files (don't create a new file per finding)
- Use the todo list to track which tests have been written

## Phase 11: Verify & Awards

1. **Run full test suite** — All pass (existing + new)
2. **Mutation check** — For top-priority new tests, temporarily break the source code and verify the test catches it
3. **Stats**: Tests before, tests after, new assertions added, weak tests fixed

### Summary

| Stat | Before | After | Delta |
|------|--------|-------|-------|
| Total tests | ... | ... | +N |
| Assertions | ... | ... | +N |
| Weak tests fixed | — | — | N |
| Files with zero coverage | ... | ... | -N |

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Ghost Hunter vs Myth Buster)
- **Ingenious Discovery** — Test that was hiding a real bug
- **Most Lethal Ghost Hunter** — Most critical untested paths found
- **Best Myth Buster** — Most meaningless tests exposed
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
