# Codebase Audit Tournament

Run a competitive 8-phase codebase audit tournament. Each phase deploys specialist teams (agents) that aggressively search for issues. Findings are scored, deduplicated, and stored as a prioritized backlog.

## Instructions

Run the following 8 phases in pairs (2 at a time for parallelism). Each phase launches 1-2 background agents with specific audit scopes. After all 8 phases complete, score findings, build the backlog, and host the awards ceremony.

### Phase 1-2: CSS Consistency (4 teams)

Launch 4 parallel Explore agents:

1. **Team VIPER (Transitions)**: Audit ALL component CSS files for transition consistency. Standard is the 5-property block: `background, color, border-color, opacity, transform`. Find missing properties, non-standard transitions, components with no transition at all. Sub-elements (thumb, dot, checkmark) use targeted 2-property transitions.

2. **Team SCORPION (Padding/Spacing)**: Audit ALL component CSS for padding/spacing violations. Rules: `padding-block: var(--_space)`, `padding-inline: calc(var(--_space-k) * var(--_space))`, never uniform `padding` on interactive components. Row items use `padding-inline` only. Find hard-coded values, wrong formulas, missing tokens.

3. **Team COBRA (Disabled/ARIA Attributes)**: Audit ALL element TS files for `internals.ariaX` misuse (doesn't create DOM attributes — CSS `[aria-X]` won't match), missing initial ARIA states, `setAttribute` vs `internals` confusion.

4. **Team HYDRA (Layer/Specificity)**: Audit ALL CSS files for `@layer` violations, specificity issues (anything without `:where()`), missing popover hidden rules, top-layer inheritance breaks, `[hidden]` override gaps.

### Phase 3-4: Trait & Export Audit (2 teams)

5. **Team WRAITH (Trait Parity)**: Audit ALL trait mixins vs their standalone controllers. Check: missing `setup()`/`teardown()`, inverted teardown order, API gaps between mixin and controller, event listener leaks in controllers, missing `destroy()` cleanup.

6. **Team PHANTOM (Export Completeness)**: Audit `src/index.ts` vs all component/container barrel files. Find: missing class exports, missing type exports, missing controller exports, components defined but not exported.

### Phase 5-6: Deep CSS + Disabled Sweep (2 teams)

7. **Team DRAGON (Deep CSS)**: Audit ALL CSS files for: missing `[hidden]` display overrides, missing popover hidden rules, hard-coded colors (hex/rgb/oklch), hard-coded sizes (non-token px/rem), missing `min-height: var(--_min-height)`, raw `border-radius`, z-index conflicts, cursor issues.

8. **Team PHOENIX (Disabled/State Fallback)**: Audit ALL TS+CSS files for: `:disabled` without `[disabled]` fallback, `internals.ariaX` where `setAttribute` needed, missing `aria-disabled` propagation, missing `pointer-events: none` on disabled, missing `tabindex="-1"`, state machine gaps, `CustomStateSet` cleanup.

### Phase 7-8: Cross-Cutting + Edge Cases (2 teams)

9. **Team KRAKEN (Cross-Cutting)**: Audit ALL TS files for: event naming inconsistencies (should be `ui-*`), memory leaks (listeners in setup not removed in teardown), missing `super.setup()`/`super.teardown()`, `deferChildren` misuse, `observedAttributes` vs `attributeChangedCallback` mismatches, export gaps, circular imports, build registration gaps, signal disposal.

10. **Team SPHINX (Edge Cases)**: Audit ALL TS files for: race conditions (async without cancellation), null/undefined access, event handler `this` binding, IME composition handling, popover/dialog lifecycle bugs, attribute parsing edge cases, DOM mutation timing, focus management issues, `as any` casts hiding type issues.

### Scoring System

| Severity | Base Points | 3x Ingenious Bonus |
|----------|------------|---------------------|
| CRITICAL | 10 pts | 30 pts |
| HIGH | 5 pts | 15 pts |
| MEDIUM | 2 pts | 6 pts |
| LOW | 1 pt | 3 pts |

**Deductions**: -3 pts for false positives, -2 pts for duplicates already found by another team.
**3x INGENIOUS**: Awarded for findings that reveal a subtle, systemic issue others missed.

### After All Phases Complete

1. **Score**: Tally points per team, apply dedup penalties
2. **Deduplicate**: Merge identical findings across teams into single backlog items
3. **Prioritize**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
4. **Write backlog**: Save to `.claude/AUDIT-BACKLOG.md` as checkbox items
5. **Awards ceremony**: Announce rankings, special awards (Ingenious Discovery, Most Lethal, Cleanest Audit, Most Impactful Finding, Wall of Shame), highlight reel, statistics
6. **Report**: Total findings, dedup count, per-severity breakdown, memory leaks, missing overrides

### Special Awards Categories

- **Ingenious Discovery Award**: Most subtle/systemic finding (3x bonus)
- **Most Lethal Team**: Highest raw finding count
- **Cleanest Audit**: Fewest false positives
- **Most Impactful Single Finding**: Biggest blast radius
- **Wall of Shame**: Lowest score / most duplicates
