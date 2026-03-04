// Reactivity
export { signal, computed, effect, batch, untrack } from './reactivity/index.ts';
export { isSignal, isComputed, debugReactive } from './reactivity/index.ts';
export type { Signal, ReadonlySignal, Dispose, ReactiveDebugInfo } from './reactivity/index.ts';

// Core
export { NativeElement } from './core/index.ts';
export { define, uid } from './core/index.ts';
export { createDisabledEffect } from './core/index.ts';
export { prop, syncProp } from './core/index.ts';
export type { ReactiveProp } from './core/index.ts';
export { ContextProvider, ContextConsumer, ContextRequestEvent } from './core/index.ts';
export { registerTrait, getTrait, getRegisteredTraitNames } from './registries/trait-registry.ts';
export type { TraitAdapter } from './registries/trait-registry.ts';
export { PluginRegistry } from './registries/plugin-registry.ts';
export type { PluginFactory } from './registries/plugin-registry.ts';
export type { Lifecycle, Constructor } from './core/index.ts';
export { DataListController, createDataList } from './core/index.ts';
export type { DataItem, DataListOptions } from './core/index.ts';
export { parseDataOptions, fetchDataOptions } from './core/index.ts';
export type { BaseOption } from './core/index.ts';
export { FormAssociable } from './core/index.ts';
export { getTraitRuntime, DismissStack } from './traits/runtime.ts';
export type { TraitRuntime, ToastOptions as RuntimeToastOptions } from './traits/runtime.ts';
export { parseTraitAttribute, collectTraitOptions } from './core/index.ts';
export { GestureRouter } from './traits/gesture-router.ts';
export type { GestureParticipant } from './traits/gesture-router.ts';
export { isTypingContext } from './traits/typing-context.ts';

// Traits (controllers)
export { DragController, RangeSelectController, ResizeController, VirtualScrollController, SelectionController, SearchController, SwipeController, EditController, ClipboardController, SlashCommandController, ShortcutController } from './traits/index.ts';
export type { ToastOptions, ValidationRule, DragOptions, RangeSelectOptions, ResizeOptions, HandlePosition, VirtualScrollOptions, SelectionOptions, SearchOptions, SwipeOptions, SwipeDirection, EditOptions, ClipboardOptions, SlashCommand, SlashCommandOptions, ShortcutBinding, ShortcutOptions } from './traits/index.ts';
export { PressController, HoverController, CopyController, IntersectController, DropZoneController, SortController, ValidateController, FocusTrapController, CollapsibleController, RovingFocusController, DismissController, ToastController, PopoverController, ListNavigateController, DialogController, GatewayController, PresentController, registerAllTraits } from './traits/index.ts';
export type { PressOptions, HoverOptions, CopyOptions, IntersectOptions, DropZoneOptions, SortOptions, ValidateOptions, CollapsibleOptions, RovingFocusOptions, ListNavigateOptions, DialogOptions, GatewayOptions, PresentOptions } from './traits/index.ts';

// Trait adapters (for selective registration via registerTrait())
export { pressableAdapter, hoverableAdapter, copyableAdapter, intersectableAdapter, droppableAdapter, sortableAdapter, validatableAdapter, focusTrappableAdapter, collapsibleAdapter, rovingFocusableAdapter, dismissableAdapter, toastableAdapter, popoverableAdapter, listNavigableAdapter, dialogableAdapter, draggableAdapter, rangeSelectableAdapter, resizableAdapter, virtualizableAdapter, selectableAdapter, searchableAdapter, clippableAdapter, swipeableAdapter, editableAdapter, presentableAdapter, slashCommandableAdapter, shortcutableAdapter } from './traits/index.ts';

// Components
export { NButton } from './components/button/button-element.ts';
export { NInput } from './components/input/input-element.ts';
export { NListbox } from './components/listbox/listbox-element.ts';
export { NOption } from './components/listbox/option-element.ts';
export { NOptionGroupHeader } from './components/listbox/option-group-header-element.ts';
export { NOptionGroup } from './components/listbox/option-group-element.ts';
export { NCommand } from './components/command/command-element.ts';
export { NCommandInput } from './components/command/command-input-element.ts';
export { NCommandList } from './components/command/command-list-element.ts';
export { NCommandItem } from './components/command/command-item-element.ts';
export { NCommandGroup } from './components/command/command-group-element.ts';
export { NCommandEmpty } from './components/command/command-empty-element.ts';
export { NCheckbox } from './components/checkbox/checkbox-element.ts';
export { NSwitch } from './components/switch/switch-element.ts';
export { NRadio } from './components/radio/radio-element.ts';
export { NRadioGroup } from './components/radio/radio-group-element.ts';
export { NSegmentedControl } from './components/segmented-control/segmented-control-element.ts';
export { NSegment } from './components/segmented-control/segment-element.ts';
export { NTooltip } from './components/tooltip/tooltip-element.ts';
export { NAccordion } from './components/accordion/accordion-element.ts';
export { NAccordionItem } from './components/accordion/accordion-item-element.ts';
export { NDialog } from './components/dialog/dialog-element.ts';
export { NTabs } from './components/tabs/tabs-element.ts';
export { NTab } from './components/tabs/tab-element.ts';
export { NTabPanel } from './components/tabs/tab-panel-element.ts';
export { NTabPanels } from './components/tabs/tab-panels-element.ts';
export { NTable } from './components/table/table-element.ts';
export { NTableHead } from './components/table/table-head-element.ts';
export { NTableBody } from './components/table/table-body-element.ts';
export { NTableRow } from './components/table/table-row-element.ts';
export { NTableCell } from './components/table/table-cell-element.ts';
export { NTableHeader } from './components/table/table-header-element.ts';
export { TableStore, createTableStore } from './components/table/table-store.ts';
export type { TableStoreOptions } from './components/table/table-store.ts';
export { ColumnResizeController } from './components/table/column-resize-controller.ts';
export type { ColumnResizeOptions } from './components/table/column-resize-controller.ts';
export { NCalendar } from './components/calendar/calendar-element.ts';
export { CalendarStore, createCalendarStore } from './components/calendar/calendar-store.ts';
export type { CalendarView, CalendarStoreOptions, DayCell, MonthCell, YearCell } from './components/calendar/calendar-store.ts';
export { NSelect } from './components/select/select-element.ts';
export type { SelectOption } from './components/select/select-element.ts';
export { SelectController } from './components/select/select-controller.ts';
export { NCombobox } from './components/combobox/combobox-element.ts';
export type { ComboboxOption } from './components/combobox/combobox-element.ts';
export { NField } from './components/field/field-element.ts';
export { NTextarea } from './components/textarea/textarea-element.ts';
export { NRange } from './components/range/range-element.ts';
export { NInputOtp } from './components/input-otp/input-otp-element.ts';
export { NAvatar } from './components/avatar/avatar-element.ts';
export { NBadge } from './components/badge/badge-element.ts';
export { NKbd } from './components/kbd/kbd-element.ts';
export { NBreadcrumb } from './components/breadcrumb/breadcrumb-element.ts';
export { NBreadcrumbItem } from './components/breadcrumb/breadcrumb-item-element.ts';
export { NPagination } from './components/pagination/pagination-element.ts';
export { NDrawer } from './components/drawer/drawer-element.ts';
export { NTree } from './components/tree/tree-element.ts';
export { NTreeItem } from './components/tree/tree-item-element.ts';
export { NPaginationDots } from './components/pagination-dots/pagination-dots-element.ts';
export { NSlideshow } from './components/slideshow/slideshow-element.ts';
export { NSlide } from './components/slideshow/slide-element.ts';
export { NController } from './components/controller/controller-element.ts';
export { NToast } from './components/toast/toast-element.ts';

// Containers
export { NCard } from './containers/card/card-element.ts';
export { NSection } from './containers/section/section-element.ts';
export { NToolbar } from './containers/toolbar/toolbar-element.ts';
// Event detail types
export type { NPressDetail, NSelectDetail, NTextChangeDetail, NRangeValueDetail, NPickerChangeDetail, NToggleChangeDetail, NInputDetail, NDisabledDetail, NDragStartDetail, NDragMoveDetail, NDragOverDetail, NDropDetail, NDragCancelDetail, NInvalidDetail, NValidDetail, NRangeChangeDetail, NRangeSelectDetail, NFileDropDetail, NTextDropDetail, NSearchDetail, NClipDetail, NIntersectDetail, NCopyDetail, NVirtualChangeDetail, NSelectionChangeDetail, NHoverDetail, NSortDetail, NSwipeDetail, NResizeDetail, NEditStartDetail, NEditCommitDetail, NEditCancelDetail, NPaginationDotsChangeDetail, NSlideChangeDetail, NSendDetail, NToastDetail, NTableSortDetail, NTableSelectDetail, NTableReorderDetail, NTableResizeDetail, NTableResizeEndDetail, NCalendarRangeDetail, NShortcutDetail } from './events.ts';

// Icons
export { NIcon } from './icons/icon-element.ts';
export { registerIcon, getIcon, onIconRegistered } from './registries/icon-registry.ts';

