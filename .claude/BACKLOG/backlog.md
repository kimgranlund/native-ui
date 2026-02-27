# Backlog

> **Last updated**: 2026-02-26
> **Sources**: 4 audit tournaments (232 findings), 2 targeted audits (24 findings)
> **Resolved**: 232/232 (tournament) + 24/24 (targeted) = 256 total
> **Open**: 0

---

## Open

_(none)_

---

## Resolved Summary

256 items resolved across 4 tournament audits + 2 targeted audits:

- **109 fixed** — bugs, missing disabled pipelines, CSS consistency, test coverage, demo pages, exports
- **101 closed as false positive** — over-reported by audit agents
- **12 demoted** — lower severity than reported
- **12 merged/deduped** — duplicate findings across teams
- **21 targeted audit fixes** — lifecycle leaks, hidden overrides, form validation, hard-coded values
- **1 closed as N/A** — ui-range `required` (native range always has a value)

Key areas cleaned up:
- Disabled pipeline: all 30 interactive components now use `createDisabledEffect()`
- Test coverage: 2349→2435 tests, 102→123 test files
- CSS: `[hidden]` overrides, shadow tokens, transition blocks, disabled selectors
- ARIA: `setAttribute()` for CSS-visible attributes, `aria-current` on nav
- Forms: `setValidity()`, `formStateRestoreCallback()`, `formAssociatedCallback()`, `required` on all applicable controls
- Exports: all public APIs exported from barrel files
- Z-index: documented in CLAUDE.md — local stacking contexts only, top layer handles overlays
