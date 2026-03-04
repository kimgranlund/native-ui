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
import { NButton } from './components/button/button-element.ts';
import { NInput } from './components/input/input-element.ts';
import { NListbox } from './components/listbox/listbox-element.ts';
import { NOption } from './components/listbox/option-element.ts';
import { NOptionGroup } from './components/listbox/option-group-element.ts';
import { NOptionGroupHeader } from './components/listbox/option-group-header-element.ts';
import { NSelect } from './components/select/select-element.ts';
import { NCombobox } from './components/combobox/combobox-element.ts';
import { NCommand } from './components/command/command-element.ts';
import { NCommandInput } from './components/command/command-input-element.ts';
import { NCommandList } from './components/command/command-list-element.ts';
import { NCommandGroup } from './components/command/command-group-element.ts';
import { NCommandItem } from './components/command/command-item-element.ts';
import { NCommandEmpty } from './components/command/command-empty-element.ts';
import { NCheckbox } from './components/checkbox/checkbox-element.ts';
import { NSwitch } from './components/switch/switch-element.ts';
import { NRadio } from './components/radio/radio-element.ts';
import { NRadioGroup } from './components/radio/radio-group-element.ts';
import { NSegmentedControl } from './components/segmented-control/segmented-control-element.ts';
import { NSegment } from './components/segmented-control/segment-element.ts';
import { NTooltip } from './components/tooltip/tooltip-element.ts';
import { NAccordion } from './components/accordion/accordion-element.ts';
import { NAccordionItem } from './components/accordion/accordion-item-element.ts';
import { NDialog } from './components/dialog/dialog-element.ts';
import { NTabs } from './components/tabs/tabs-element.ts';
import { NTab } from './components/tabs/tab-element.ts';
import { NTabPanel } from './components/tabs/tab-panel-element.ts';
import { NTabPanels } from './components/tabs/tab-panels-element.ts';
import { NTable } from './components/table/table-element.ts';
import { NTableHead } from './components/table/table-head-element.ts';
import { NTableBody } from './components/table/table-body-element.ts';
import { NTableRow } from './components/table/table-row-element.ts';
import { NTableHeader } from './components/table/table-header-element.ts';
import { NTableCell } from './components/table/table-cell-element.ts';
import { NCalendar } from './components/calendar/calendar-element.ts';
import { NField } from './components/field/field-element.ts';
import { NTextarea } from './components/textarea/textarea-element.ts';
import { NRange } from './components/range/range-element.ts';
import { NInputOtp } from './components/input-otp/input-otp-element.ts';
import { NAvatar } from './components/avatar/avatar-element.ts';
import { NBadge } from './components/badge/badge-element.ts';
import { NKbd } from './components/kbd/kbd-element.ts';
import { NBreadcrumb } from './components/breadcrumb/breadcrumb-element.ts';
import { NBreadcrumbItem } from './components/breadcrumb/breadcrumb-item-element.ts';
import { NPagination } from './components/pagination/pagination-element.ts';
import { NPaginationDots } from './components/pagination-dots/pagination-dots-element.ts';
import { NDrawer } from './components/drawer/drawer-element.ts';
import { NTree } from './components/tree/tree-element.ts';
import { NTreeItem } from './components/tree/tree-item-element.ts';
import { NSlideshow } from './components/slideshow/slideshow-element.ts';
import { NSlide } from './components/slideshow/slide-element.ts';
import { NController } from './components/controller/controller-element.ts';

// Containers (with JS behavior)
import { NCard } from './containers/card/card-element.ts';
import { NSection } from './containers/section/section-element.ts';
import { NToolbar } from './containers/toolbar/toolbar-element.ts';
// Icons
import { NIcon } from './icons/icon-element.ts';

// Register all elements
define('n-button', NButton);
define('n-input', NInput);
define('n-listbox', NListbox);
define('n-option', NOption);
define('n-option-group', NOptionGroup);
define('n-option-group-header', NOptionGroupHeader);
define('n-select', NSelect);
define('n-combobox', NCombobox);
define('n-command', NCommand);
define('n-command-input', NCommandInput);
define('n-command-list', NCommandList);
define('n-command-group', NCommandGroup);
define('n-command-item', NCommandItem);
define('n-command-empty', NCommandEmpty);
define('n-checkbox', NCheckbox);
define('n-switch', NSwitch);
define('n-radio', NRadio);
define('n-radio-group', NRadioGroup);
define('n-segmented-control', NSegmentedControl);
define('n-segment', NSegment);
define('n-tooltip', NTooltip);
define('n-accordion', NAccordion);
define('n-accordion-item', NAccordionItem);
define('n-dialog', NDialog);
define('n-tabs', NTabs);
define('n-tab', NTab);
define('n-tab-panel', NTabPanel);
define('n-tab-panels', NTabPanels);
define('n-table', NTable);
define('n-table-head', NTableHead);
define('n-table-body', NTableBody);
define('n-table-row', NTableRow);
define('n-table-header', NTableHeader);
define('n-table-cell', NTableCell);
define('n-calendar', NCalendar);
define('n-field', NField);
define('n-textarea', NTextarea);
define('n-range', NRange);
define('n-input-otp', NInputOtp);
define('n-avatar', NAvatar);
define('n-badge', NBadge);
define('n-kbd', NKbd);
define('n-breadcrumb', NBreadcrumb);
define('n-breadcrumb-item', NBreadcrumbItem);
define('n-pagination', NPagination);
define('n-pagination-dots', NPaginationDots);
define('n-drawer', NDrawer);
define('n-tree', NTree);
define('n-tree-item', NTreeItem);
define('n-slideshow', NSlideshow);
define('n-slide', NSlide);
define('n-controller', NController);
define('n-card', NCard);
define('n-section', NSection);
define('n-toolbar', NToolbar);
define('n-icon', NIcon);
