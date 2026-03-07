// HTMLElementTagNameMap augmentation — enables typed querySelector/querySelectorAll
// for all custom elements in the library.
//
// Usage:
//   const btn = document.querySelector('n-button'); // typed as NButton | null

import type { NButton } from './components/button/button-element.ts';
import type { NInput } from './components/input/input-element.ts';
import type { NTextarea } from './components/textarea/textarea-element.ts';
import type { NRange } from './components/range/range-element.ts';
import type { NInputOtp } from './components/input-otp/input-otp-element.ts';
import type { NCheckbox } from './components/checkbox/checkbox-element.ts';
import type { NSwitch } from './components/switch/switch-element.ts';
import type { NRadio } from './components/radio/radio-element.ts';
import type { NRadioGroup } from './components/radio/radio-group-element.ts';
import type { NField } from './components/field/field-element.ts';
import type { NListbox } from './components/listbox/listbox-element.ts';
import type { NOption } from './components/listbox/option-element.ts';
import type { NOptionGroup } from './components/listbox/option-group-element.ts';
import type { NOptionGroupHeader } from './components/listbox/option-group-header-element.ts';
import type { NSelect } from './components/select/select-element.ts';
import type { NCombobox } from './components/combobox/combobox-element.ts';
import type { NCommand } from './components/command/command-element.ts';
import type { NCommandInput } from './components/command/command-input-element.ts';
import type { NCommandList } from './components/command/command-list-element.ts';
import type { NCommandItem } from './components/command/command-item-element.ts';
import type { NCommandGroup } from './components/command/command-group-element.ts';
import type { NCommandEmpty } from './components/command/command-empty-element.ts';
import type { NSegmentedControl } from './components/segmented-control/segmented-control-element.ts';
import type { NSegment } from './components/segmented-control/segment-element.ts';
import type { NTabs } from './components/tabs/tabs-element.ts';
import type { NTab } from './components/tabs/tab-element.ts';
import type { NTabPanel } from './components/tabs/tab-panel-element.ts';
import type { NTabPanels } from './components/tabs/tab-panels-element.ts';
import type { NTable } from './components/table/table-element.ts';
import type { NTableHead } from './components/table/table-head-element.ts';
import type { NTableBody } from './components/table/table-body-element.ts';
import type { NTableRow } from './components/table/table-row-element.ts';
import type { NTableCell } from './components/table/table-cell-element.ts';
import type { NTableHeader } from './components/table/table-header-element.ts';
import type { NAccordion } from './components/accordion/accordion-element.ts';
import type { NAccordionItem } from './components/accordion/accordion-item-element.ts';
import type { NDialog } from './components/dialog/dialog-element.ts';
import type { NDrawer } from './components/drawer/drawer-element.ts';
import type { NTooltip } from './components/tooltip/tooltip-element.ts';
import type { NBreadcrumb } from './components/breadcrumb/breadcrumb-element.ts';
import type { NBreadcrumbItem } from './components/breadcrumb/breadcrumb-item-element.ts';
import type { NPagination } from './components/pagination/pagination-element.ts';
import type { NTree } from './components/tree/tree-element.ts';
import type { NTreeItem } from './components/tree/tree-item-element.ts';
import type { NSlideshow } from './components/slideshow/slideshow-element.ts';
import type { NSlide } from './components/slideshow/slide-element.ts';
import type { NCalendar } from './components/calendar/calendar-element.ts';
import type { NController } from './components/controller/controller-element.ts';
import type { NCard } from './components/card/card-element.ts';
import type { NSection } from './containers/section/section-element.ts';
import type { NToolbar } from './components/toolbar/toolbar-element.ts';
import type { NIcon } from './icons/icon-element.ts';

declare global {
  // WHY: __DEV__ is replaced by Vite's `define` config — true in dev/test, false in builds.
  // Bundlers dead-code-eliminate `if (__DEV__)` blocks in production.
  const __DEV__: boolean;

  interface HTMLElementTagNameMap {
    // Components — Form / Input
    'n-button': NButton;
    'n-input': NInput;
    'n-textarea': NTextarea;
    'n-range': NRange;
    'n-input-otp': NInputOtp;
    'n-checkbox': NCheckbox;
    'n-switch': NSwitch;
    'n-radio': NRadio;
    'n-radio-group': NRadioGroup;
    'n-field': NField;

    // Components — Listbox / Select / Combobox
    'n-listbox': NListbox;
    'n-option': NOption;
    'n-option-group': NOptionGroup;
    'n-option-group-header': NOptionGroupHeader;
    'n-select': NSelect;
    'n-combobox': NCombobox;

    // Components — Command
    'n-command': NCommand;
    'n-command-input': NCommandInput;
    'n-command-list': NCommandList;
    'n-command-item': NCommandItem;
    'n-command-group': NCommandGroup;
    'n-command-empty': NCommandEmpty;

    // Components — Segmented Control
    'n-segmented-control': NSegmentedControl;
    'n-segment': NSegment;

    // Components — Tabs
    'n-tabs': NTabs;
    'n-tab': NTab;
    'n-tab-panel': NTabPanel;
    'n-tab-panels': NTabPanels;

    // Components — Table
    'n-table': NTable;
    'n-table-head': NTableHead;
    'n-table-body': NTableBody;
    'n-table-row': NTableRow;
    'n-table-cell': NTableCell;
    'n-table-header': NTableHeader;

    // Components — Disclosure / Overlay
    'n-accordion': NAccordion;
    'n-accordion-item': NAccordionItem;
    'n-dialog': NDialog;
    'n-drawer': NDrawer;
    'n-tooltip': NTooltip;

    // Components — Navigation
    'n-breadcrumb': NBreadcrumb;
    'n-breadcrumb-item': NBreadcrumbItem;
    'n-pagination': NPagination;
    // Components — Tree / Slideshow
    'n-tree': NTree;
    'n-tree-item': NTreeItem;
    'n-slideshow': NSlideshow;
    'n-slide': NSlide;

    // Components — Calendar
    'n-calendar': NCalendar;

    // Components — Utility
    'n-controller': NController;

    // Containers
    'n-card': NCard;
    'n-section': NSection;
    'n-toolbar': NToolbar;
    // Icons
    'n-icon': NIcon;
  }
}
