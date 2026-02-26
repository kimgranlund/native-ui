// HTMLElementTagNameMap augmentation — enables typed querySelector/querySelectorAll
// for all custom elements in the library.
//
// Usage:
//   const btn = document.querySelector('ui-button'); // typed as UIButton | null

import type { UIButton } from './components/ui-button/ui-button-element.ts';
import type { UIInput } from './components/ui-input/ui-input-element.ts';
import type { UITextarea } from './components/ui-textarea/ui-textarea-element.ts';
import type { UIRange } from './components/ui-range/ui-range-element.ts';
import type { UIInputOtp } from './components/ui-input-otp/ui-input-otp-element.ts';
import type { UICheckbox } from './components/ui-checkbox/ui-checkbox-element.ts';
import type { UISwitch } from './components/ui-switch/ui-switch-element.ts';
import type { UIRadio } from './components/ui-radio/ui-radio-element.ts';
import type { UIRadioGroup } from './components/ui-radio/ui-radio-group-element.ts';
import type { UIField } from './components/ui-field/ui-field-element.ts';
import type { UIListbox } from './components/ui-listbox/ui-listbox-element.ts';
import type { UIOption } from './components/ui-listbox/ui-option-element.ts';
import type { UIOptionGroup } from './components/ui-listbox/ui-option-group-element.ts';
import type { UIOptionGroupHeader } from './components/ui-listbox/ui-option-group-header-element.ts';
import type { UISelect } from './components/ui-select/ui-select-element.ts';
import type { UICombobox } from './components/ui-combobox/ui-combobox-element.ts';
import type { UICommand } from './components/ui-command/ui-command-element.ts';
import type { UICommandInput } from './components/ui-command/ui-command-input-element.ts';
import type { UICommandList } from './components/ui-command/ui-command-list-element.ts';
import type { UICommandItem } from './components/ui-command/ui-command-item-element.ts';
import type { UICommandGroup } from './components/ui-command/ui-command-group-element.ts';
import type { UICommandEmpty } from './components/ui-command/ui-command-empty-element.ts';
import type { UISegmentedControl } from './components/ui-segmented-control/ui-segmented-control-element.ts';
import type { UISegment } from './components/ui-segmented-control/ui-segment-element.ts';
import type { UITabs } from './components/ui-tabs/ui-tabs-element.ts';
import type { UITab } from './components/ui-tabs/ui-tab-element.ts';
import type { UITabPanel } from './components/ui-tabs/ui-tab-panel-element.ts';
import type { UITabPanels } from './components/ui-tabs/ui-tab-panels-element.ts';
import type { UITable } from './components/ui-table/ui-table-element.ts';
import type { UITableHead } from './components/ui-table/ui-table-head-element.ts';
import type { UITableBody } from './components/ui-table/ui-table-body-element.ts';
import type { UITableRow } from './components/ui-table/ui-table-row-element.ts';
import type { UITableCell } from './components/ui-table/ui-table-cell-element.ts';
import type { UITableHeader } from './components/ui-table/ui-table-header-element.ts';
import type { UIAccordion } from './components/ui-accordion/ui-accordion-element.ts';
import type { UIAccordionItem } from './components/ui-accordion/ui-accordion-item-element.ts';
import type { UIDialog } from './components/ui-dialog/ui-dialog-element.ts';
import type { UIDrawer } from './components/ui-drawer/ui-drawer-element.ts';
import type { UITooltip } from './components/ui-tooltip/ui-tooltip-element.ts';
import type { UIBreadcrumb } from './components/ui-breadcrumb/ui-breadcrumb-element.ts';
import type { UIBreadcrumbItem } from './components/ui-breadcrumb/ui-breadcrumb-item-element.ts';
import type { UIPagination } from './components/ui-pagination/ui-pagination-element.ts';
import type { UINav } from './components/ui-nav/ui-nav-element.ts';
import type { UINavItem } from './components/ui-nav/ui-nav-item-element.ts';
import type { UINavGroup } from './components/ui-nav/ui-nav-group-element.ts';
import type { UINavGroupHeader } from './components/ui-nav/ui-nav-group-header-element.ts';
import type { UITree } from './components/ui-tree/ui-tree-element.ts';
import type { UITreeItem } from './components/ui-tree/ui-tree-item-element.ts';
import type { UISlideshow } from './components/ui-slideshow/ui-slideshow-element.ts';
import type { UISlide } from './components/ui-slideshow/ui-slide-element.ts';
import type { UICalendar } from './components/ui-calendar/ui-calendar-element.ts';
import type { UIAvatar } from './components/ui-avatar/ui-avatar-element.ts';
import type { UIBadge } from './components/ui-badge/ui-badge-element.ts';
import type { UIController } from './components/ui-controller/ui-controller-element.ts';
import type { UIChatInput } from './components/ui-chat/ui-chat-input-element.ts';
import type { UICard } from './containers/ui-card/ui-card-element.ts';
import type { UISection } from './containers/ui-section/ui-section-element.ts';
import type { UIToolbar } from './containers/ui-toolbar/ui-toolbar-element.ts';
import type { UILayoutSidebar } from './containers/ui-layout-sidebar/ui-layout-sidebar-element.ts';
import type { UILayoutSidebarTrigger } from './containers/ui-layout-sidebar/ui-layout-sidebar-trigger-element.ts';
import type { UILayoutChat } from './containers/ui-layout-chat/ui-layout-chat-element.ts';
import type { UILayoutInspector } from './containers/ui-layout-inspector/ui-layout-inspector-element.ts';
import type { UIIcon } from './icons/ui-icon-element.ts';

declare global {
  // WHY: __DEV__ is replaced by Vite's `define` config — true in dev/test, false in builds.
  // Bundlers dead-code-eliminate `if (__DEV__)` blocks in production.
  const __DEV__: boolean;

  interface HTMLElementTagNameMap {
    // Components — Form / Input
    'ui-button': UIButton;
    'ui-input': UIInput;
    'ui-textarea': UITextarea;
    'ui-range': UIRange;
    'ui-input-otp': UIInputOtp;
    'ui-checkbox': UICheckbox;
    'ui-switch': UISwitch;
    'ui-radio': UIRadio;
    'ui-radio-group': UIRadioGroup;
    'ui-field': UIField;

    // Components — Listbox / Select / Combobox
    'ui-listbox': UIListbox;
    'ui-option': UIOption;
    'ui-option-group': UIOptionGroup;
    'ui-option-group-header': UIOptionGroupHeader;
    'ui-select': UISelect;
    'ui-combobox': UICombobox;

    // Components — Command
    'ui-command': UICommand;
    'ui-command-input': UICommandInput;
    'ui-command-list': UICommandList;
    'ui-command-item': UICommandItem;
    'ui-command-group': UICommandGroup;
    'ui-command-empty': UICommandEmpty;

    // Components — Segmented Control
    'ui-segmented-control': UISegmentedControl;
    'ui-segment': UISegment;

    // Components — Tabs
    'ui-tabs': UITabs;
    'ui-tab': UITab;
    'ui-tab-panel': UITabPanel;
    'ui-tab-panels': UITabPanels;

    // Components — Table
    'ui-table': UITable;
    'ui-table-head': UITableHead;
    'ui-table-body': UITableBody;
    'ui-table-row': UITableRow;
    'ui-table-cell': UITableCell;
    'ui-table-header': UITableHeader;

    // Components — Disclosure / Overlay
    'ui-accordion': UIAccordion;
    'ui-accordion-item': UIAccordionItem;
    'ui-dialog': UIDialog;
    'ui-drawer': UIDrawer;
    'ui-tooltip': UITooltip;

    // Components — Navigation
    'ui-breadcrumb': UIBreadcrumb;
    'ui-breadcrumb-item': UIBreadcrumbItem;
    'ui-pagination': UIPagination;
    'ui-nav': UINav;
    'ui-nav-item': UINavItem;
    'ui-nav-group': UINavGroup;
    'ui-nav-group-header': UINavGroupHeader;

    // Components — Tree / Slideshow
    'ui-tree': UITree;
    'ui-tree-item': UITreeItem;
    'ui-slideshow': UISlideshow;
    'ui-slide': UISlide;

    // Components — Calendar / Display
    'ui-calendar': UICalendar;
    'ui-avatar': UIAvatar;
    'ui-badge': UIBadge;

    // Components — Utility
    'ui-controller': UIController;
    'ui-chat-input': UIChatInput;

    // Containers
    'ui-card': UICard;
    'ui-section': UISection;
    'ui-toolbar': UIToolbar;
    'ui-layout-sidebar': UILayoutSidebar;
    'ui-layout-sidebar-trigger': UILayoutSidebarTrigger;
    'ui-layout-chat': UILayoutChat;
    'ui-layout-inspector': UILayoutInspector;

    // Icons
    'ui-icon': UIIcon;
  }
}
