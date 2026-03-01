import { define, UIListbox, UIOption } from '@nonoun/native-ui';

import { NuiSidebarNav } from './nui-sidebar/nui-sidebar-nav-element.ts';
import { NuiSidebarNavItem } from './nui-sidebar/nui-sidebar-nav-item-element.ts';
import { NuiSidebarGroup } from './nui-sidebar/nui-sidebar-group-element.ts';
import { NuiSidebarGroupHeader } from './nui-sidebar/nui-sidebar-group-header-element.ts';
import { NuiSidebar } from './nui-sidebar/nui-sidebar-element.ts';
import { NuiSidebarItem } from './nui-sidebar/nui-sidebar-item-element.ts';
import { NuiAppPanel } from './nui-app-panel/nui-app-panel-element.ts';

// Register all — define() is idempotent
define('nui-sidebar-nav-item', NuiSidebarNavItem);
define('nui-sidebar-group-header', NuiSidebarGroupHeader);
define('nui-sidebar-group', NuiSidebarGroup);
define('nui-sidebar-nav', NuiSidebarNav);
define('nui-sidebar-item', NuiSidebarItem);
define('nui-sidebar', NuiSidebar);
define('nui-app-panel', NuiAppPanel);

// Dogfooded core components (nav-group flyout creates listbox/option)
define('ui-listbox', UIListbox);
define('ui-option', UIOption);

export { NuiSidebarNav, NuiSidebarNavItem, NuiSidebarGroup, NuiSidebarGroupHeader,
         NuiSidebar, NuiSidebarItem, NuiAppPanel };
