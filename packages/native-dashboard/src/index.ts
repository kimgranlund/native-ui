import { define, NListbox, NOption } from '@nonoun/native-ui';

import { NSidebarNav } from './sidebar/sidebar-nav-element.ts';
import { NSidebarNavItem } from './sidebar/sidebar-nav-item-element.ts';
import { NSidebarGroup } from './sidebar/sidebar-group-element.ts';
import { NSidebarGroupHeader } from './sidebar/sidebar-group-header-element.ts';
import { NSidebar } from './sidebar/sidebar-element.ts';
import { NSidebarItem } from './sidebar/sidebar-item-element.ts';

// Register all — define() is idempotent
define('n-sidebar-nav-item', NSidebarNavItem);
define('n-sidebar-group-header', NSidebarGroupHeader);
define('n-sidebar-group', NSidebarGroup);
define('n-sidebar-nav', NSidebarNav);
define('n-sidebar-item', NSidebarItem);
define('native-dashboard', NSidebar);

// Dogfooded core components (nav-group flyout creates listbox/option)
define('n-listbox', NListbox);
define('n-option', NOption);

export { NSidebarNav, NSidebarNavItem, NSidebarGroup, NSidebarGroupHeader,
         NSidebar, NSidebarItem };
