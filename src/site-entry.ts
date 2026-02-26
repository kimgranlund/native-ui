// Site build entry — registers ALL components, containers, icons, and traits.
// Used by vite.config.site.ts to ensure every element is defined in the static build.
// In dev mode, each HTML page imports only what it needs. In production,
// this single entry ensures nothing is missing.

// All component registrations
import './components/ui-accordion/ui-accordion.ts';
import './components/ui-avatar/ui-avatar.ts';
import './components/ui-badge/ui-badge.ts';
import './components/ui-breadcrumb/ui-breadcrumb.ts';
import './components/ui-button/ui-button.ts';
import './components/ui-calendar/ui-calendar.ts';
import './components/ui-chat/ui-chat-input.ts';
import './components/ui-checkbox/ui-checkbox.ts';
import './components/ui-combobox/ui-combobox.ts';
import './components/ui-command/index.ts';
import './components/ui-controller/ui-controller.ts';
import './components/ui-dialog/ui-dialog.ts';
import './components/ui-drawer/ui-drawer.ts';
import './components/ui-field/ui-field.ts';
import './components/ui-input/ui-input.ts';
import './components/ui-input-otp/ui-input-otp.ts';
import './components/ui-listbox/ui-listbox.ts';
import './components/ui-nav/ui-nav.ts';
import './components/ui-pagination/ui-pagination.ts';
import './components/ui-radio/ui-radio.ts';
import './components/ui-range/ui-range.ts';
import './components/ui-segmented-control/ui-segmented-control.ts';
import './components/ui-select/ui-select.ts';
import './components/ui-slideshow/ui-slideshow.ts';
import './components/ui-switch/ui-switch.ts';
import './components/ui-table/ui-table.ts';
import './components/ui-tabs/ui-tabs.ts';
import './components/ui-textarea/ui-textarea.ts';
import './components/ui-tooltip/ui-tooltip.ts';
import './components/ui-tree/ui-tree.ts';

// Container registrations
import './containers/ui-card/ui-card.ts';
import './containers/ui-section/ui-section.ts';
import './containers/ui-toolbar/ui-toolbar.ts';
import './containers/ui-layout-sidebar/ui-layout-sidebar.ts';
import './containers/ui-layout-chat/ui-layout-chat.ts';

// Icon system
import './icons/ui-icon.ts';

// Dev layout
import './nav/ui-layout.ts';

// Trait registration
import { registerAllTraits } from './traits/register-all.ts';
registerAllTraits();
