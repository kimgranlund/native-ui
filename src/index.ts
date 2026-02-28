// Reactivity
export { signal, computed, effect, batch, untrack } from './reactivity/index.ts';
export { isSignal, isComputed, debugReactive } from './reactivity/index.ts';
export type { Signal, ReadonlySignal, Dispose, ReactiveDebugInfo } from './reactivity/index.ts';

// Core
export { UIElement } from './core/index.ts';
export { define, uid } from './core/index.ts';
export { createDisabledEffect } from './core/index.ts';
export { prop, syncProp } from './core/index.ts';
export type { ReactiveProp } from './core/index.ts';
export { ContextProvider, ContextConsumer, ContextRequestEvent } from './core/index.ts';
export { registerTrait, getTrait, getRegisteredTraitNames } from './core/index.ts';
export type { TraitAdapter } from './core/index.ts';
export type { Lifecycle, Constructor } from './core/index.ts';
export { DataListController, createDataList } from './core/index.ts';
export type { DataItem, DataListOptions } from './core/index.ts';
export { parseDataOptions, fetchDataOptions } from './core/index.ts';
export type { BaseOption } from './core/index.ts';
export { FormAssociable } from './core/index.ts';
export { getTraitRuntime, DismissStack, ToastManager } from './core/index.ts';
export type { TraitRuntime, RuntimeToastOptions } from './core/index.ts';
export { parseTraitAttribute, collectTraitOptions } from './core/index.ts';
export { GestureRouter } from './core/index.ts';
export type { GestureParticipant } from './core/index.ts';

// Traits (controllers)
export { DragController, RangeSelectController, ResizeController, VirtualScrollController, SelectionController, SearchController, SwipeController, EditController, ClipboardController } from './traits/index.ts';
export type { ToastOptions, ValidationRule, DragOptions, RangeSelectOptions, ResizeOptions, VirtualScrollOptions, SelectionOptions, SearchOptions, SwipeOptions, SwipeDirection, EditOptions, ClipboardOptions } from './traits/index.ts';
export { PressController, HoverController, CopyController, IntersectController, DropZoneController, SortController, ValidateController, FocusTrapController, CollapsibleController, RovingFocusController, DismissController, ToastController, PopoverController, ListNavigateController, DialogController, registerAllTraits } from './traits/index.ts';
export type { PressOptions, HoverOptions, CopyOptions, IntersectOptions, DropZoneOptions, SortOptions, ValidateOptions, CollapsibleOptions, RovingFocusOptions, ListNavigateOptions, DialogOptions } from './traits/index.ts';

// Trait adapters (for selective registration via registerTrait())
export { pressableAdapter, hoverableAdapter, copyableAdapter, intersectableAdapter, droppableAdapter, sortableAdapter, validatableAdapter, focusTrappableAdapter, collapsibleAdapter, rovingFocusableAdapter, dismissableAdapter, toastableAdapter, popoverableAdapter, listNavigableAdapter, dialogableAdapter, draggableAdapter, rangeSelectableAdapter, resizableAdapter, virtualizableAdapter, selectableAdapter, searchableAdapter, clippableAdapter, swipeableAdapter, editableAdapter } from './traits/index.ts';

// Components
export { UIButton } from './components/ui-button/ui-button-element.ts';
export { UIInput } from './components/ui-input/ui-input-element.ts';
export { UIListbox } from './components/ui-listbox/ui-listbox-element.ts';
export { UIOption } from './components/ui-listbox/ui-option-element.ts';
export { UIOptionGroupHeader } from './components/ui-listbox/ui-option-group-header-element.ts';
export { UIOptionGroup } from './components/ui-listbox/ui-option-group-element.ts';
export { UICommand } from './components/ui-command/ui-command-element.ts';
export { UICommandInput } from './components/ui-command/ui-command-input-element.ts';
export { UICommandList } from './components/ui-command/ui-command-list-element.ts';
export { UICommandItem } from './components/ui-command/ui-command-item-element.ts';
export { UICommandGroup } from './components/ui-command/ui-command-group-element.ts';
export { UICommandEmpty } from './components/ui-command/ui-command-empty-element.ts';
export { UICheckbox } from './components/ui-checkbox/ui-checkbox-element.ts';
export { UISwitch } from './components/ui-switch/ui-switch-element.ts';
export { UIRadio } from './components/ui-radio/ui-radio-element.ts';
export { UIRadioGroup } from './components/ui-radio/ui-radio-group-element.ts';
export { UISegmentedControl } from './components/ui-segmented-control/ui-segmented-control-element.ts';
export { UISegment } from './components/ui-segmented-control/ui-segment-element.ts';
export { UITooltip } from './components/ui-tooltip/ui-tooltip-element.ts';
export { UIAccordion } from './components/ui-accordion/ui-accordion-element.ts';
export { UIAccordionItem } from './components/ui-accordion/ui-accordion-item-element.ts';
export { UIDialog } from './components/ui-dialog/ui-dialog-element.ts';
export { UITabs } from './components/ui-tabs/ui-tabs-element.ts';
export { UITab } from './components/ui-tabs/ui-tab-element.ts';
export { UITabPanel } from './components/ui-tabs/ui-tab-panel-element.ts';
export { UITabPanels } from './components/ui-tabs/ui-tab-panels-element.ts';
export { UITable } from './components/ui-table/ui-table-element.ts';
export { UITableHead } from './components/ui-table/ui-table-head-element.ts';
export { UITableBody } from './components/ui-table/ui-table-body-element.ts';
export { UITableRow } from './components/ui-table/ui-table-row-element.ts';
export { UITableCell } from './components/ui-table/ui-table-cell-element.ts';
export { UITableHeader } from './components/ui-table/ui-table-header-element.ts';
export { TableStore, createTableStore } from './components/ui-table/table-store.ts';
export type { SortDirection, TableStoreOptions } from './components/ui-table/table-store.ts';
export { ColumnResizeController } from './components/ui-table/column-resize-controller.ts';
export type { ColumnResizeOptions } from './components/ui-table/column-resize-controller.ts';
export { UICalendar } from './components/ui-calendar/ui-calendar-element.ts';
export { CalendarStore, createCalendarStore } from './components/ui-calendar/calendar-store.ts';
export type { CalendarView, CalendarStoreOptions, DayCell, MonthCell, YearCell } from './components/ui-calendar/calendar-store.ts';
export { UISelect } from './components/ui-select/ui-select-element.ts';
export type { SelectOption } from './components/ui-select/ui-select-element.ts';
export { SelectController } from './components/ui-select/select-controller.ts';
export { UICombobox } from './components/ui-combobox/ui-combobox-element.ts';
export type { ComboboxOption } from './components/ui-combobox/ui-combobox-element.ts';
export { UIField } from './components/ui-field/ui-field-element.ts';
export { UITextarea } from './components/ui-textarea/ui-textarea-element.ts';
export { UIRange } from './components/ui-range/ui-range-element.ts';
export { UIInputOtp } from './components/ui-input-otp/ui-input-otp-element.ts';
export { UIAvatar } from './components/ui-avatar/ui-avatar-element.ts';
export { UIBadge } from './components/ui-badge/ui-badge-element.ts';
export { UIKbd } from './components/ui-kbd/ui-kbd-element.ts';
export { UIBreadcrumb } from './components/ui-breadcrumb/ui-breadcrumb-element.ts';
export { UIBreadcrumbItem } from './components/ui-breadcrumb/ui-breadcrumb-item-element.ts';
export { UIPagination } from './components/ui-pagination/ui-pagination-element.ts';
export { UIDrawer } from './components/ui-drawer/ui-drawer-element.ts';
export { UITree } from './components/ui-tree/ui-tree-element.ts';
export { UITreeItem } from './components/ui-tree/ui-tree-item-element.ts';
export { UISlideshow } from './components/ui-slideshow/ui-slideshow-element.ts';
export { UISlide } from './components/ui-slideshow/ui-slide-element.ts';
export { UINav } from './components/ui-nav/ui-nav-element.ts';
export { UINavItem } from './components/ui-nav/ui-nav-item-element.ts';
export { UINavGroup } from './components/ui-nav/ui-nav-group-element.ts';
export { UINavGroupHeader } from './components/ui-nav/ui-nav-group-header-element.ts';
export { UIController } from './components/ui-controller/ui-controller-element.ts';
export { UIChatInput } from './components/ui-chat/ui-chat-input-element.ts';

// Containers
export { UICard } from './containers/ui-card/ui-card-element.ts';
export { UISection } from './containers/ui-section/ui-section-element.ts';
export { UIToolbar } from './containers/ui-toolbar/ui-toolbar-element.ts';
export { UILayoutSidebar } from './containers/ui-layout-sidebar/ui-layout-sidebar-element.ts';
export { UILayoutSidebarItem } from './containers/ui-layout-sidebar/ui-layout-sidebar-item-element.ts';
export { UILayoutChat } from './containers/ui-layout-chat/ui-layout-chat-element.ts';
export { UILayoutInspector } from './containers/ui-layout-inspector/ui-layout-inspector-element.ts';

// Event detail types
export type { UIPressDetail, UISelectDetail, UITextChangeDetail, UIRangeValueDetail, UIPickerChangeDetail, UIToggleChangeDetail, UIInputDetail, UIDisabledDetail, UIDragStartDetail, UIDragMoveDetail, UIDragOverDetail, UIDropDetail, UIDragCancelDetail, UIInvalidDetail, UIValidDetail, UIRangeChangeDetail, UIRangeSelectDetail, UIFileDropDetail, UITextDropDetail, UISearchDetail, UIClipDetail, UIIntersectDetail, UICopyDetail, UIVirtualChangeDetail, UISelectionChangeDetail, UIHoverDetail, UISortDetail, UISwipeDetail, UIResizeDetail, UIEditStartDetail, UIEditCommitDetail, UIEditCancelDetail, UISlideChangeDetail, UISendDetail, UIToastDetail, UITableSortDetail, UITableSelectDetail, UITableReorderDetail, UITableResizeDetail, UITableResizeEndDetail, UICalendarRangeDetail } from './events.ts';

// Icons
export { UIIcon } from './icons/ui-icon-element.ts';
export { registerIcon, getIcon, onIconRegistered } from './icons/registry.ts';

