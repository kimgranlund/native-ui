# Harden Tournament

Run an adversarial security & robustness hardening tournament. Two rival teams per phase — offense finds exploitable patterns, defense finds missing guards — across 8 phases. Everything unguarded gets hardened.

## Input

$ARGUMENTS — What to harden (e.g. "user input handling", "API endpoints", "authentication flow", "data serialization", "DOM manipulation", "event handling", "third-party integrations", "configuration"). Or "full" for comprehensive hardening.

## Phase 0: Threat Modeling & Team Draft

Before any attacks:

1. **Map the attack surface** — Read entry points, input vectors, external boundaries, trust boundaries. Where does untrusted data enter the system?
2. **Identify trust assumptions** — What does the code assume is safe? Which assumptions are documented vs implicit?
3. **Check existing guards** — What validation, sanitization, and error handling already exists?
4. **Draft 16 teams into 8 rival pairs** — Each pair probes a different attack vector.

### Rival Pair Design

Each phase pits a **Red Team** (exploit it) against a **Blue Team** (find what's missing to prevent it).

| Phase | Red Team | Blue Team | Attack Vector |
|-------|----------|-----------|--------------|
| 1 | VIPER | COBRA | **Injection** — HTML injection, template injection, CSS injection, attribute injection |
| 2 | HYDRA | BASILISK | **Input validation** — Missing type checks, boundary violations, malformed data |
| 3 | KRAKEN | LEVIATHAN | **State manipulation** — Invalid state via attribute tampering, direct property access, DevTools |
| 4 | PHOENIX | DRAGON | **Error paths** — Unhandled exceptions, silent failures, partial operations without rollback |
| 5 | WRAITH | SPECTER | **Timing & ordering** — Race conditions, TOCTOU, out-of-order operations, reentrancy |
| 6 | CHIMERA | MANTICORE | **Resource exhaustion** — Memory leaks, unbounded growth, missing limits, cleanup failures |
| 7 | WYVERN | GRIFFIN | **Trust boundaries** — External data treated as safe, missing sanitization at system edges |
| 8 | SPHINX | CERBERUS | **Configuration & defaults** — Insecure defaults, missing CSP, overly permissive settings |

Adjust vectors based on the target and tech stack.

## Phases 1-8: Tournament Execution

Launch 8 phases, each with 2 parallel Explore agents.

**Red Team output:**
- Exploit scenarios: `file:line — "an attacker can X by providing Y, causing Z"`
- Reproduction approach (what input triggers it)
- Impact: data loss / code execution / state corruption / information leak / DoS
- Exploitability: trivial / requires specific conditions / theoretical

**Blue Team output:**
- Missing guards: `file:line — "no validation of X before using it in Y"`
- Inadequate guards: `file:line — "validates type but not range/length/format"`
- Missing error handling: `file:line — "no try/catch around X, failure would cause Y"`
- Suggested fix for each finding

### Scoring

| Finding Type | Points |
|-------------|--------|
| Exploitable vulnerability with reproduction | 10 pts |
| Missing guard at trust boundary | 5 pts |
| Inadequate guard (partial protection) | 3 pts |
| Missing error handling on external operation | 3 pts |
| Insecure default configuration | 5 pts |
| Theoretical-only (requires impossible conditions) | 1 pt |
| False alarm (code already handles it) | -3 pts |
| Duplicate of rival | -2 pts |

**Bonuses**: 3x INGENIOUS for multi-step exploit chain, +5 RIVAL KILL for 3+ exclusive finds, +3 FIRST BLOOD for first exploitable vulnerability.

## Phase 9: Scoring & Threat Report

After all 8 phases:

1. **Score all 16 teams** — Red vs Blue
2. **Merge into threat report**:

### Vulnerabilities

| # | Threat | Vector | Impact | Exploitability | Guard Needed | Found By |
|---|--------|--------|--------|---------------|-------------|----------|
| 1 | ... | ... | ... | trivial/conditional/theoretical | ... | Team X |

3. **Attack chain analysis** — Do any findings combine into larger exploits?
4. **Trust boundary map** — Visual of where untrusted data enters and what guards exist

## Phase 10: Harden

For each vulnerability (highest impact + easiest exploitation first):

1. **Add the guard** — Validation, sanitization, error handling, or limit
2. **Write a test** that exercises the attack scenario and proves the guard works
3. **Verify** the test passes with fix, would fail without

### Rules
- Fix at the trust boundary — don't scatter validation deep inside internals
- Fail safely — prefer rejecting bad input over trying to fix it
- Don't break existing functionality for valid inputs
- Every fix gets a test

## Phase 11: Verify & Awards

1. **Run full test suite** — Existing + new tests pass
2. **Re-scan** — Quick check that top vulnerabilities are addressed
3. **Guard coverage** — How many trust boundaries now have validation?

### Awards Ceremony
- Scoreboard of all 16 teams
- Rivalry results (8 matchups, Red vs Blue)
- **Ingenious Discovery** — Most creative exploit chain
- **Most Lethal Red Team** — Most exploitable vulnerabilities
- **Best Blue Team** — Most guards identified
- **Rivalry MVP** — Biggest win margin
- **Wall of Shame** — Most false alarms
