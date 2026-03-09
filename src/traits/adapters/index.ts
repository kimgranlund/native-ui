import type { TraitAdapter } from '../../registries/trait-registry.ts';

import { pressableAdapter } from '../press/pressable-adapter.ts';
import { hoverableAdapter } from '../hover/hoverable-adapter.ts';
import { copyableAdapter } from '../copy/copyable-adapter.ts';
import { intersectableAdapter } from '../intersect/intersectable-adapter.ts';
import { droppableAdapter } from '../drop-zone/droppable-adapter.ts';
import { sortableAdapter } from '../sort/sortable-adapter.ts';
import { validatableAdapter } from '../validate/validatable-adapter.ts';
import { focusTrappableAdapter } from '../focus-trap/focus-trappable-adapter.ts';
import { collapsibleAdapter } from '../collapsible/collapsible-adapter.ts';
import { rovingFocusableAdapter } from '../roving-focus/roving-focusable-adapter.ts';
import { dismissableAdapter } from '../dismiss/dismissable-adapter.ts';
import { toastableAdapter } from '../toast/toastable-adapter.ts';
import { popoverableAdapter } from '../popover/popoverable-adapter.ts';
import { listNavigableAdapter } from '../list-navigate/list-navigable-adapter.ts';
import { dialogableAdapter } from '../dialog/dialogable-adapter.ts';
import { draggableAdapter } from '../drag/draggable-adapter.ts';
import { rangeSelectableAdapter } from '../range-select/range-selectable-adapter.ts';
import { resizableAdapter } from '../resize/resizable-adapter.ts';
import { virtualizableAdapter } from '../virtual-scroll/virtualizable-adapter.ts';
import { selectableAdapter } from '../selection/selectable-adapter.ts';
import { searchableAdapter } from '../search/searchable-adapter.ts';
import { clippableAdapter } from '../clipboard/clippable-adapter.ts';
import { swipeableAdapter } from '../swipe/swipeable-adapter.ts';
import { editableAdapter } from '../edit/editable-adapter.ts';
import { presentableAdapter } from '../present/presentable-adapter.ts';
import { slashCommandableAdapter } from '../slash-command/slash-commandable-adapter.ts';
import { shortcutableAdapter } from '../shortcut/shortcutable-adapter.ts';
import { gatewayableAdapter } from '../gateway/gatewayable-adapter.ts';
import { noodleableAdapter } from '../noodle/noodleable-adapter.ts';
import { tossableAdapter } from '../toss/tossable-adapter.ts';
import { flippableAdapter } from '../flip/flippable-adapter.ts';
import { parallaxableAdapter } from '../parallax/parallaxable-adapter.ts';
import { confettibleAdapter } from '../confetti/confettible-adapter.ts';
import { magnetizableAdapter } from '../magnet/magnetizable-adapter.ts';
import { cssInspectableAdapter } from '../css-inspect/css-inspectable-adapter.ts';
import { modalableAdapter } from '../modal/modalable-adapter.ts';

// ── Individual adapter re-exports ──

export {
  pressableAdapter,
  hoverableAdapter,
  copyableAdapter,
  intersectableAdapter,
  droppableAdapter,
  sortableAdapter,
  validatableAdapter,
  focusTrappableAdapter,
  collapsibleAdapter,
  rovingFocusableAdapter,
  dismissableAdapter,
  toastableAdapter,
  popoverableAdapter,
  listNavigableAdapter,
  dialogableAdapter,
  draggableAdapter,
  rangeSelectableAdapter,
  resizableAdapter,
  virtualizableAdapter,
  selectableAdapter,
  searchableAdapter,
  clippableAdapter,
  swipeableAdapter,
  editableAdapter,
  presentableAdapter,
  slashCommandableAdapter,
  shortcutableAdapter,
  gatewayableAdapter,
  noodleableAdapter,
  tossableAdapter,
  flippableAdapter,
  parallaxableAdapter,
  confettibleAdapter,
  magnetizableAdapter,
  cssInspectableAdapter,
  modalableAdapter,
};

// ── Categorized adapter arrays for bulk registration ──

/** Core traits — standard UI behaviors. */
export const coreAdapters: readonly TraitAdapter[] = [
  pressableAdapter,
  hoverableAdapter,
  copyableAdapter,
  intersectableAdapter,
  droppableAdapter,
  sortableAdapter,
  validatableAdapter,
  focusTrappableAdapter,
  collapsibleAdapter,
  rovingFocusableAdapter,
  dismissableAdapter,
  toastableAdapter,
  popoverableAdapter,
  listNavigableAdapter,
  dialogableAdapter,
  draggableAdapter,
  rangeSelectableAdapter,
  resizableAdapter,
  virtualizableAdapter,
  selectableAdapter,
  searchableAdapter,
  clippableAdapter,
  swipeableAdapter,
  editableAdapter,
  presentableAdapter,
  slashCommandableAdapter,
  shortcutableAdapter,
  gatewayableAdapter,
  noodleableAdapter,
  modalableAdapter,
];

/** Interaction traits — visual/physics effects (toss, flip, parallax, confetti, magnet). */
export const interactionAdapters: readonly TraitAdapter[] = [
  tossableAdapter,
  flippableAdapter,
  parallaxableAdapter,
  confettibleAdapter,
  magnetizableAdapter,
];

/** Dev traits — development/inspection tools (css-inspect). */
export const devAdapters: readonly TraitAdapter[] = [
  cssInspectableAdapter,
];

/** All trait adapters combined (core + interaction + dev). */
export const allAdapters: readonly TraitAdapter[] = [
  ...coreAdapters,
  ...interactionAdapters,
  ...devAdapters,
];
