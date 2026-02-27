/**
 * Register All Components
 *
 * Side-effect module that registers every native-ui custom element.
 * Import this file once to define all ~47 tags via customElements.define().
 *
 * Usage:
 *   import '@nonoun/native-ui/register';
 */

import { define } from './core/define.ts';

// Components
import { UIButton } from './components/ui-button/ui-button-element.ts';
import { UIInput } from './components/ui-input/ui-input-element.ts';
import { UIListbox } from './components/ui-listbox/ui-listbox-element.ts';
import { UIOption } from './components/ui-listbox/ui-option-element.ts';
import { UIOptionGroup } from './components/ui-listbox/ui-option-group-element.ts';
import { UIOptionGroupHeader } from './components/ui-listbox/ui-option-group-header-element.ts';
import { UISelect } from './components/ui-select/ui-select-element.ts';
import { UICombobox } from './components/ui-combobox/ui-combobox-element.ts';
import { UICommand } from './components/ui-command/ui-command-element.ts';
import { UICommandInput } from './components/ui-command/ui-command-input-element.ts';
import { UICommandList } from './components/ui-command/ui-command-list-element.ts';
import { UICommandGroup } from './components/ui-command/ui-command-group-element.ts';
import { UICommandItem } from './components/ui-command/ui-command-item-element.ts';
import { UICommandEmpty } from './components/ui-command/ui-command-empty-element.ts';
import { UICheckbox } from './components/ui-checkbox/ui-checkbox-element.ts';
import { UISwitch } from './components/ui-switch/ui-switch-element.ts';
import { UIRadio } from './components/ui-radio/ui-radio-element.ts';
import { UIRadioGroup } from './components/ui-radio/ui-radio-group-element.ts';
import { UISegmentedControl } from './components/ui-segmented-control/ui-segmented-control-element.ts';
import { UISegment } from './components/ui-segmented-control/ui-segment-element.ts';
import { UITooltip } from './components/ui-tooltip/ui-tooltip-element.ts';
import { UIAccordion } from './components/ui-accordion/ui-accordion-element.ts';
import { UIAccordionItem } from './components/ui-accordion/ui-accordion-item-element.ts';
import { UIDialog } from './components/ui-dialog/ui-dialog-element.ts';
import { UITabs } from './components/ui-tabs/ui-tabs-element.ts';
import { UITab } from './components/ui-tabs/ui-tab-element.ts';
import { UITabPanel } from './components/ui-tabs/ui-tab-panel-element.ts';
import { UITabPanels } from './components/ui-tabs/ui-tab-panels-element.ts';
import { UITable } from './components/ui-table/ui-table-element.ts';
import { UITableHead } from './components/ui-table/ui-table-head-element.ts';
import { UITableBody } from './components/ui-table/ui-table-body-element.ts';
import { UITableRow } from './components/ui-table/ui-table-row-element.ts';
import { UITableHeader } from './components/ui-table/ui-table-header-element.ts';
import { UITableCell } from './components/ui-table/ui-table-cell-element.ts';
import { UICalendar } from './components/ui-calendar/ui-calendar-element.ts';
import { UIField } from './components/ui-field/ui-field-element.ts';
import { UITextarea } from './components/ui-textarea/ui-textarea-element.ts';
import { UIRange } from './components/ui-range/ui-range-element.ts';
import { UIInputOtp } from './components/ui-input-otp/ui-input-otp-element.ts';
import { UIAvatar } from './components/ui-avatar/ui-avatar-element.ts';
import { UIBadge } from './components/ui-badge/ui-badge-element.ts';
import { UIBreadcrumb } from './components/ui-breadcrumb/ui-breadcrumb-element.ts';
import { UIBreadcrumbItem } from './components/ui-breadcrumb/ui-breadcrumb-item-element.ts';
import { UIPagination } from './components/ui-pagination/ui-pagination-element.ts';
import { UIDrawer } from './components/ui-drawer/ui-drawer-element.ts';
import { UITree } from './components/ui-tree/ui-tree-element.ts';
import { UITreeItem } from './components/ui-tree/ui-tree-item-element.ts';
import { UISlideshow } from './components/ui-slideshow/ui-slideshow-element.ts';
import { UISlide } from './components/ui-slideshow/ui-slide-element.ts';
import { UINav } from './components/ui-nav/ui-nav-element.ts';
import { UINavGroup } from './components/ui-nav/ui-nav-group-element.ts';
import { UINavGroupHeader } from './components/ui-nav/ui-nav-group-header-element.ts';
import { UINavItem } from './components/ui-nav/ui-nav-item-element.ts';
import { UIChatInput } from './components/ui-chat/ui-chat-input-element.ts';
import { UIController } from './components/ui-controller/ui-controller-element.ts';

// Containers (with JS behavior)
import { UICard } from './containers/ui-card/ui-card-element.ts';
import { UISection } from './containers/ui-section/ui-section-element.ts';
import { UIToolbar } from './containers/ui-toolbar/ui-toolbar-element.ts';
import { UILayoutSidebar } from './containers/ui-layout-sidebar/ui-layout-sidebar-element.ts';
import { UILayoutSidebarTrigger } from './containers/ui-layout-sidebar/ui-layout-sidebar-trigger-element.ts';
import { UILayoutChat } from './containers/ui-layout-chat/ui-layout-chat-element.ts';

// Icons
import { UIIcon } from './icons/ui-icon-element.ts';

// Register all elements
define('ui-button', UIButton);
define('ui-input', UIInput);
define('ui-listbox', UIListbox);
define('ui-option', UIOption);
define('ui-option-group', UIOptionGroup);
define('ui-option-group-header', UIOptionGroupHeader);
define('ui-select', UISelect);
define('ui-combobox', UICombobox);
define('ui-command', UICommand);
define('ui-command-input', UICommandInput);
define('ui-command-list', UICommandList);
define('ui-command-group', UICommandGroup);
define('ui-command-item', UICommandItem);
define('ui-command-empty', UICommandEmpty);
define('ui-checkbox', UICheckbox);
define('ui-switch', UISwitch);
define('ui-radio', UIRadio);
define('ui-radio-group', UIRadioGroup);
define('ui-segmented-control', UISegmentedControl);
define('ui-segment', UISegment);
define('ui-tooltip', UITooltip);
define('ui-accordion', UIAccordion);
define('ui-accordion-item', UIAccordionItem);
define('ui-dialog', UIDialog);
define('ui-tabs', UITabs);
define('ui-tab', UITab);
define('ui-tab-panel', UITabPanel);
define('ui-tab-panels', UITabPanels);
define('ui-table', UITable);
define('ui-table-head', UITableHead);
define('ui-table-body', UITableBody);
define('ui-table-row', UITableRow);
define('ui-table-header', UITableHeader);
define('ui-table-cell', UITableCell);
define('ui-calendar', UICalendar);
define('ui-field', UIField);
define('ui-textarea', UITextarea);
define('ui-range', UIRange);
define('ui-input-otp', UIInputOtp);
define('ui-avatar', UIAvatar);
define('ui-badge', UIBadge);
define('ui-breadcrumb', UIBreadcrumb);
define('ui-breadcrumb-item', UIBreadcrumbItem);
define('ui-pagination', UIPagination);
define('ui-drawer', UIDrawer);
define('ui-tree', UITree);
define('ui-tree-item', UITreeItem);
define('ui-slideshow', UISlideshow);
define('ui-slide', UISlide);
define('ui-nav', UINav);
define('ui-nav-group', UINavGroup);
define('ui-nav-group-header', UINavGroupHeader);
define('ui-nav-item', UINavItem);
define('ui-chat-input', UIChatInput);
define('ui-controller', UIController);
define('ui-card', UICard);
define('ui-section', UISection);
define('ui-toolbar', UIToolbar);
define('ui-layout-sidebar', UILayoutSidebar);
define('ui-layout-sidebar-trigger', UILayoutSidebarTrigger);
define('ui-layout-chat', UILayoutChat);
define('ui-icon', UIIcon);
