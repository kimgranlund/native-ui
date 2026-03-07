// Site build entry — registers ALL components, containers, icons, and traits.
// Used by vite.config.site.ts to ensure every element is defined in the static build.
// In dev mode, each HTML page imports only what it needs. In production,
// this single entry ensures nothing is missing.

// WHY: Traits MUST register before component define() calls.
// ES module imports execute in declaration order (depth-first),
// so this import runs before the component imports below.
import './site-register-traits.ts';

// All component registrations
import './components/accordion/accordion.ts';
import './components/breadcrumb/breadcrumb.ts';
import './components/button/button.ts';
import './components/calendar/calendar.ts';
import './components/chat/chat-input.ts';
import './components/checkbox/checkbox.ts';
import './components/combobox/combobox.ts';
import './components/command/index.ts';
import './components/controller/controller.ts';
import './components/dialog/dialog.ts';
import './components/drawer/drawer.ts';
import './components/field/field.ts';
import './components/input/input.ts';
import './components/input-otp/input-otp.ts';
import './components/listbox/listbox.ts';
import './components/pagination/pagination.ts';
import './components/radio/radio.ts';
import './components/range/range.ts';
import './components/segmented-control/segmented-control.ts';
import './components/select/select.ts';
import './components/slideshow/slideshow.ts';
import './components/switch/switch.ts';
import './components/table/table.ts';
import './components/tabs/tabs.ts';
import './components/textarea/textarea.ts';
import './components/tooltip/tooltip.ts';
import './components/tree/tree.ts';

// Container registrations
import './components/card/card.ts';
import './containers/section/section.ts';
import './components/toolbar/toolbar.ts';
// native-dashboard components (layout + nav)
import '../packages/native-dashboard/src/index.ts';

// Icon system
import './icons/icon.ts';

// Dev layout
import './nav/native-dashboard.ts';
