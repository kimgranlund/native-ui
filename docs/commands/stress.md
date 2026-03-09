# Stress Tournament

Run an adversarial stress-testing tournament. Two rival teams per phase — one attacks, one defends — across 8 phases to find the most devious edge cases, race conditions, and failure scenarios that unit tests miss.

## Input

$ARGUMENTS — What to stress-test (e.g. "form submission flow", "popover lifecycle", "drag-and-drop", "keyboard navigation", "state management", "async data loading", "component initialization").

## Phase 0: Target Analysis & Team Draft

Before any attacks:

1. **Read the target** — Open the relevant source files. Map all code paths, state transitions, event handlers, async operations, and external dependencies.
2. **Identify attack surfaces** — List every input vector: user events, attribute changes, API responses, timing, DOM mutations, focus changes, concurrent operations.
3. **Draft 16 teams into 8 rival pairs** — Each pair stress-tests a different attack surface.

### Rival Pair Design

Each phase pits an **Attacker** (finds ways to break it) against a **Defender** (finds guards that are missing or inadequate).

| Phase | Attacker | Defender | Attack Surface |
|-------|----------|----------|---------------|
| 1 | VIPER | COBRA | **Rapid-fire events** — Double-clicks, spam inputs, hold-and-release, overlapping gestures |
| 2 | HYDRA | BASILISK | **Race conditions** — Async without cancellation, stale closures, out-of-order responses |
| 3 | KRAKEN | LEVIATHAN | **Lifecycle chaos** — Setup during teardown, remove during animation, disconnect mid-operation |
| 4 | PHOENIX | DRAGON | **Boundary values** — Empty strings, null, undefined, NaN, MAX_SAFE_INTEGER, 0, -1, huge arrays |
| 5 | WRAITH | SPECTER | **State corruption** — Invalid state combinations, impossible transitions, signal cycles |
| 6 | CHIMERA | MANTICORE | **DOM mutation** — Reparenting, cloning, innerHTML replacement, slot reassignment mid-operation |
| 7 | WYVERN | GRIFFIN | **Focus & keyboard** — Tab during popover close, focus stolen mid-operation, IME composition |
| 8 | SPHINX | CERBERUS | **Concurrent operations** — Multiple instances, shared state, global listeners, memory pressure |

Adjust attack surfaces based on the actual target's code.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents. Each agent produces:

**Attacker output:**
- Specific attack scenarios: `file:line — "when X happens during Y, then Z breaks because..."`
- Reproduction steps
- Expected vs actual behavior
- Severity: crash / wrong state / visual glitch / performance

**Defender output:**
- Missing guards: `file:line — "no check for X before doing Y"`
- Inadequate guards: `file:line — "guard exists but doesn't cover case X"`
- Missing cleanup: `file:line — "listener/timer/subscription not cleaned up when X"`

### Scoring

| Finding Type | Points |
|-------------|--------|
| Crash scenario with reproduction steps | 10 pts |
| State corruption scenario | 10 pts |
| Missing guard that would cause runtime error | 5 pts |
| Race condition with specific trigger | 5 pts |
| Visual/UX glitch scenario | 2 pts |
| Performance degradation scenario | 2 pts |
| Theoretical-only issue (can't reproduce) | 1 pt |
| False alarm (code already handles it) | -3 pts |
| Duplicate of rival's finding | -2 pts |

**Bonuses**: 3x INGENIOUS for multi-step attack chain, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first crash scenario.

## Phase 9: Scoring & Vulnerability Report

After all 8 phases:

1. **Score all 16 teams** — Tally with dedup and bonuses
2. **Build vulnerability report** — Deduplicated, severity-ranked:

| # | Vulnerability | Attack Vector | Severity | Guard Needed | Found By |
|---|--------------|--------------|----------|-------------|----------|
| 1 | ... | ... | crash/corruption/glitch | ... | Team X |

3. **Attack chain analysis** — Do any findings combine into larger failure modes?
4. **Coverage map** — Which attack surfaces are well-guarded vs exposed?

## Phase 10: Harden

For each vulnerability (critical first):

1. **Add the guard, check, or cleanup**
2. **Write a test** that reproduces the attack scenario
3. **Verify** the test passes with the fix and would fail without it

### Rules
- Fix the specific vulnerability — don't redesign the system
- Every fix gets a test
- Preserve existing behavior for non-edge cases

## Phase 11: Verify & Awards

1. **Run full test suite** — All existing + new tests pass
2. **Re-attack** — Quick rescan of top vulnerabilities to confirm fixes hold
3. **Coverage delta** — How many new test cases were added?

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups)
- **Ingenious Discovery** — Most devious multi-step attack
- **Most Lethal Attacker** — Most crash/corruption findings
- **Best Defender** — Most missing guards identified
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
