# Release Notes — 0.7.39

**Date:** March 2026
**Packages:**

| Package | Version | Changes |
|---------|---------|---------|
| `@nonoun/native-ui` | 0.7.39 | DragController grid support fix |

---

## Headline: DragController Grid Support

DragController's slot mode and drop mode now work correctly with CSS Grid layouts (`axis: 'both'`). Previously only preview mode had proper 2D grid coordinate detection — slot mode and drop mode used 1D linear scans that broke fundamentally with grid layouts.

### What Changed

**Slot mode grid detection** — The `isPast` check used `ghostX > centerX && ghostY > centerY`. In a grid, same-row items have nearly equal Y coordinates, so the AND condition failed. Combined with `break`, scanning stopped at the first same-row item, producing wrong insertion indices. Now uses proper 2D grid coordinate detection via `#ghostToGridIndex()` for `axis: 'both'`.

**Slot mode placeholder in CSS Grid** — The `.drag-placeholder` div occupied a full grid cell, breaking layout. Placeholder insertion is now skipped for `axis: 'both'` — only `[drag-slot-before]` / `[drag-slot-after]` attributes are used for visual feedback.

**Drop mode `isBefore` for grids** — Used only `e.clientY < midY` for `axis: 'both'`, ignoring horizontal position. Now uses row-major 2D check: if clearly above → before; if on same row → check X.

### Shared Infrastructure

Extracted `#detectGridGeometry()` and `#ghostToGridIndex()` as shared private methods from preview mode's inline grid detection. Both slot mode (`axis='both'`) and preview mode now use the same 2D coordinate resolution.

### New Demo

Added "Slot Mode — Grid" section to the draggable trait demo page with a 4-column × 3-row grid. Cells show a left-edge accent highlight (`[drag-slot-before]`) at the insertion point.

### Tests

6 new grid-specific tests covering:
- Slot mode correct insertion index for grid positions
- No placeholder inserted in slot mode with `axis: 'both'`
- `[drag-slot-before]` attribute set on correct cell
- Drop mode `isBefore` for same-row items
- Drop mode `isBefore` for above-row items

---

## Migration

```bash
npm install @nonoun/native-ui@0.7.39
```

No breaking changes. Drop-in upgrade. If you have custom CSS for `.drag-placeholder` in grid contexts, it's no longer inserted — style `[drag-slot-before]` instead:

```css
.my-grid > .my-cell[drag-slot-before] {
  box-shadow: inset 3px 0 0 var(--n-surface-accent);
}
```

## Files Changed

- `src/traits/drag-controller.ts` — 3 bug fixes + shared grid methods
- `src/traits/draggable.html` — new "Slot Mode — Grid" demo section
- `src/traits/__tests__/draggable.test.ts` — 6 new grid-specific tests
