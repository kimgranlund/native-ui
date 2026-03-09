# Audit Tournament

Run a brutal competitive audit tournament. Two rival teams per phase, 8 phases minimum, fighting to find the most damning issues in the codebase. Teams score points for valid findings and lose points for false positives. The tournament ends with a scored backlog and awards ceremony.

## Input

$ARGUMENTS — The area of focus (e.g. "accessibility", "performance", "security", "CSS consistency", "API design", "error handling", "type safety", "memory management").

## Phase 0: Scope Elaboration & Team Draft

Before launching any agents:

1. **Read the codebase** — Scan key files (package.json, tsconfig, CLAUDE.md, entry points, directory layout) to understand the tech stack, architecture, and conventions.
2. **Expand the focus into 8 audit angles** — Break the user's focus into 8 specific, non-overlapping scopes tailored to THIS codebase. Each angle targets a different layer or concern. Go deep — the best findings come from checking whether the codebase follows its OWN stated rules.
3. **Draft 16 teams into 8 rival pairs** — Each team gets a mythical creature codename and a parenthetical specialty. Rival pairs should have overlapping territory so they're fighting over the same ground from different angles.
4. **Define kill criteria** — For each team, list 4-8 specific things to hunt for, what "correct" looks like, and what patterns to flag as violations. Teams should be looking for things their rival might miss.
5. **Present the battle plan** — Show all 8 phases with rival pairs. Do NOT wait for approval — show it and launch.

### Rival Pair Design

Each phase pits two teams against each other from **complementary attack vectors**:
- One team attacks from the **implementation** side (code, logic, runtime)
- The other attacks from the **contract** side (API, types, docs, conventions)

They compete for the same findings. If both teams find the same issue, the team with the more precise description wins — the other gets a -2 dedup penalty. This incentivizes specificity over spray-and-pray.

## Phases 1-8: Tournament Execution

Launch 8 phases sequentially, each with 2 parallel Explore agents (the rival pair). That's 16 agents total across 8 phases.

Each agent gets:
- Team name, specialty, and rival's name
- Exhaustive checklist of what to search for
- File patterns to scan
- What "correct" looks like (examples from the codebase)
- Instruction to report findings as: `[SEVERITY] file:line — description`
- Reminder: **your rival is searching the same territory — be thorough or they'll find what you missed**

### Phase Schedule

| Phase | Team A (Implementation) | Team B (Contract) | Territory |
|-------|------------------------|-------------------|-----------|
| 1 | VIPER | COBRA | [angle 1] |
| 2 | HYDRA | BASILISK | [angle 2] |
| 3 | KRAKEN | LEVIATHAN | [angle 3] |
| 4 | PHOENIX | DRAGON | [angle 4] |
| 5 | WRAITH | SPECTER | [angle 5] |
| 6 | CHIMERA | MANTICORE | [angle 6] |
| 7 | WYVERN | GRIFFIN | [angle 7] |
| 8 | SPHINX | CERBERUS | [angle 8] |

Fill in territory and checklists based on Phase 0 analysis.

## Scoring System

| Severity | Base Points | 3x Ingenious Bonus |
|----------|------------|---------------------|
| CRITICAL | 10 pts | 30 pts |
| HIGH | 5 pts | 15 pts |
| MEDIUM | 2 pts | 6 pts |
| LOW | 1 pt | 3 pts |

**Deductions**:
- **-3 pts** for false positives (team got sloppy)
- **-2 pts** for duplicates found by rival (rival was sharper)
- **-1 pt** for duplicates found by non-rival team in a different phase

**Bonuses**:
- **3x INGENIOUS** — Finding reveals a subtle, systemic issue no other team caught
- **+5 RIVAL KILL** — Team finds 3+ valid issues in territory their rival missed entirely
- **+3 FIRST BLOOD** — First team to report a CRITICAL finding

## Phase 9: Scoring & Backlog

After all 8 phases complete:

1. **Collect** — Gather all findings from all 16 teams
2. **Validate** — Flag false positives (team loses 3 pts each)
3. **Deduplicate** — When rivals find the same issue: more precise description wins, other gets -2. Cross-phase dupes: later team gets -1.
4. **Award bonuses** — Ingenious (3x), Rival Kill (+5), First Blood (+3)
5. **Score** — Tally points per team with all bonuses and deductions
6. **Prioritize** — P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
7. **Write backlog** — Save to `.claude/AUDIT-BACKLOG.md` as checkbox items grouped by priority

## Phase 10: Awards Ceremony

### Final Scoreboard
Ranked table of all 16 teams: raw findings, valid findings, duplicates, false positives, bonuses, final score.

### Rivalry Results
For each of the 8 rival pairs: who won, by how much, key differentiator.

### Special Awards
- **Ingenious Discovery Award** — Most subtle/systemic finding (3x bonus winner)
- **Most Lethal Team** — Highest valid finding count
- **Cleanest Audit** — Fewest false positives relative to findings
- **Most Impactful Finding** — Single finding with biggest blast radius
- **Rivalry MVP** — Biggest margin of victory over rival
- **Wall of Shame** — Lowest score, most duplicates, or most false positives

### Highlight Reel
Top 5 most devastating findings with explanations of why they matter and blast radius.

### Statistics
Total findings, unique after dedup, per-severity breakdown, most affected files, systemic patterns, rivalry win/loss records.
