// Reactivity
export { signal, computed, effect, batch, untrack } from '@nonoun/native-core';
export { isSignal, isComputed, debugReactive } from '@nonoun/native-core';
export type { Signal, ReadonlySignal, Dispose, ReactiveDebugInfo } from '@nonoun/native-core';

// Core
export { NativeElement } from '@nonoun/native-core';
export { define, uid } from '@nonoun/native-core';
export { createDisabledEffect } from '@nonoun/native-core';
export { prop, syncProp } from '@nonoun/native-core';
export type { ReactiveProp } from '@nonoun/native-core';
export { ContextProvider, ContextConsumer, ContextRequestEvent } from '@nonoun/native-core';
export { registerTrait, getTrait, getRegisteredTraitNames } from '@nonoun/native-core';
export type { TraitAdapter } from '@nonoun/native-core';
export { PluginRegistry } from '@nonoun/native-core';
export type { PluginFactory } from '@nonoun/native-core';
export type { Lifecycle, Constructor } from '@nonoun/native-core';
export { DataListController, createDataList } from '@nonoun/native-core';
export type { DataItem, DataListOptions } from '@nonoun/native-core';
export { parseDataOptions, fetchDataOptions } from '@nonoun/native-core';
export type { BaseOption } from '@nonoun/native-core';
export { FormAssociable } from '@nonoun/native-core';
export { getTraitRuntime, DismissStack } from '@nonoun/native-traits';
export type { TraitRuntime, ToastOptions as RuntimeToastOptions } from '@nonoun/native-traits';
export { parseTraitAttribute, collectTraitOptions } from '@nonoun/native-core';
export { GestureRouter } from '@nonoun/native-traits';
export type { GestureParticipant } from '@nonoun/native-traits';
export { isTypingContext } from '@nonoun/native-traits';

// Traits (controllers)
export { DragController, RangeSelectController, ResizeController, VirtualScrollController, SelectionController, SearchController, SwipeController, EditController, ClipboardController, SlashCommandController, ShortcutController, TossController, FlipController, ParallaxController, CSSInspectController, ConfettiController, MagnetController, NoodleController } from '@nonoun/native-traits';
export type { ToastOptions, ValidationRule, DragOptions, RangeSelectOptions, ResizeOptions, HandlePosition, VirtualScrollOptions, SelectionOptions, SearchOptions, SwipeOptions, SwipeDirection, EditOptions, ClipboardOptions, SlashCommand, SlashCommandOptions, ShortcutBinding, ShortcutOptions, TossOptions, FlipOptions, ParallaxOptions, CSSInspectOptions, ConfettiOptions, MagnetOptions, NoodleOptions, NoodleConnection, PortSide } from '@nonoun/native-traits';
export { PressController, HoverController, CopyController, IntersectController, DropZoneController, SortController, ValidateController, FocusTrapController, CollapsibleController, RovingFocusController, DismissController, ToastController, PopoverController, ListNavigateController, DialogController, GatewayController, PresentController, ModalController, registerAllTraits, registerCoreTraits, registerInteractionTraits, registerDevTraits } from '@nonoun/native-traits';
export type { PressOptions, HoverOptions, CopyOptions, IntersectOptions, DropZoneOptions, SortOptions, ValidateOptions, CollapsibleOptions, RovingFocusOptions, ListNavigateOptions, DialogOptions, GatewayOptions, PresentOptions, ModalOptions } from '@nonoun/native-traits';

// Store
export { StoreController } from './controllers/store/store-controller.ts';
export type { StoreControllerOptions } from './controllers/store/store-controller.ts';

// Trait adapters (for selective registration via registerTrait())
export { pressableAdapter, hoverableAdapter, copyableAdapter, intersectableAdapter, droppableAdapter, sortableAdapter, validatableAdapter, focusTrappableAdapter, collapsibleAdapter, rovingFocusableAdapter, dismissableAdapter, toastableAdapter, popoverableAdapter, listNavigableAdapter, dialogableAdapter, draggableAdapter, rangeSelectableAdapter, resizableAdapter, virtualizableAdapter, selectableAdapter, searchableAdapter, clippableAdapter, swipeableAdapter, editableAdapter, presentableAdapter, slashCommandableAdapter, shortcutableAdapter, tossableAdapter, flippableAdapter, parallaxableAdapter, cssInspectableAdapter, confettibleAdapter, magnetizableAdapter, noodleableAdapter } from '@nonoun/native-traits';

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
export { TableStore, createTableStore } from './components/table/store/table-store.ts';
export type { TableStoreOptions } from './components/table/store/table-store.ts';
export { ColumnResizeController } from './components/table/column-resize/column-resize-controller.ts';
export type { ColumnResizeOptions } from './components/table/column-resize/column-resize-controller.ts';
export { NCalendar } from './components/calendar/calendar-element.ts';
export { CalendarStore, createCalendarStore } from './components/calendar/store/calendar-store.ts';
export type { CalendarView, CalendarStoreOptions, DayCell, MonthCell, YearCell } from './components/calendar/store/calendar-store.ts';
export { NSelect } from './components/select/select-element.ts';
export type { SelectOption } from './components/select/select-element.ts';
export { SelectController } from './components/select/controller/select-controller.ts';
export { NCombobox } from './components/combobox/combobox-element.ts';
export type { ComboboxOption } from './components/combobox/combobox-element.ts';
export { NField } from './components/field/field-element.ts';
export { NTextarea } from './components/textarea/textarea-element.ts';
export { NRange } from './components/range/range-element.ts';
export { NInputOtp } from './components/input-otp/input-otp-element.ts';
export { NBreadcrumb } from './components/breadcrumb/breadcrumb-element.ts';
export { NBreadcrumbItem } from './components/breadcrumb/breadcrumb-item-element.ts';
export { NPagination } from './components/pagination/pagination-element.ts';
export { NDrawer } from './components/drawer/drawer-element.ts';
export { NFeed } from './components/feed/feed-element.ts';
export { NNoodles } from './components/noodles/noodles-element.ts';
export { NTree } from './components/tree/tree-element.ts';
export { NTreeItem } from './components/tree/tree-item-element.ts';
export { NPaginationDots } from './components/pagination-dots/pagination-dots-element.ts';
export { NSlideshow } from './components/slideshow/slideshow-element.ts';
export { NSlide } from './components/slideshow/slide-element.ts';
export { NController } from './components/controller/controller-element.ts';
export { NToast } from './components/toast/toast-element.ts';
export { NGripper } from './components/gripper/gripper-element.ts';
export type { GripperMode, GripperPlacement } from './components/gripper/gripper-element.ts';

// Containers
export { NContainer } from './containers/container/container-element.ts';
export { NPane } from './containers/pane/pane-element.ts';
export { NPaneGroup } from './containers/pane/pane-group-element.ts';
export { NToolbar } from './components/toolbar/toolbar-element.ts';
export { NRoot } from './components/root/root-element.ts';
// Event detail types
export type { NPressDetail, NSelectDetail, NTextChangeDetail, NRangeValueDetail, NPickerChangeDetail, NToggleChangeDetail, NInputDetail, NDisabledDetail, NDragStartDetail, NDragMoveDetail, NDragOverDetail, NDropDetail, NDragCancelDetail, NInvalidDetail, NValidDetail, NRangeChangeDetail, NRangeSelectDetail, NFileDropDetail, NTextDropDetail, NSearchDetail, NClipDetail, NIntersectDetail, NCopyDetail, NVirtualChangeDetail, NSelectionChangeDetail, NHoverDetail, NSortDetail, NSwipeDetail, NResizeDetail, NResizeCancelDetail, NEditStartDetail, NEditCommitDetail, NEditCancelDetail, NPaginationDotsChangeDetail, NSlideChangeDetail, NSendDetail, NToastDetail, NTableSortDetail, NTableSelectDetail, NTableReorderDetail, NTableResizeDetail, NTableResizeEndDetail, NCalendarRangeDetail, NShortcutDetail, NGripStartDetail, NGripDetail, NGripEndDetail, NGripCancelDetail, NTossDetail, NBounceDetail, NFlipDetail, NParallaxMoveDetail, NConfettiDetail, NMagnetSnapDetail, NMagnetDropDetail, NCSSInspectDetail, NPaneCloseDetail, NPaneMinimizeDetail, NPaneRestoreDetail, NPaneResizeDetail } from './events.ts';

// Utilities
export { whenNativeReady } from '@nonoun/native-core';
export type { ReadyOptions } from '@nonoun/native-core';
export { getNativeDiagnostics } from '@nonoun/native-core';
export type { DiagnosticsReport, DiagnosticsOptions } from '@nonoun/native-core';

// Icons
export { NIcon } from './icons/icon-element.ts';
export { registerIcon, getIcon, onIconRegistered } from '@nonoun/native-core';

