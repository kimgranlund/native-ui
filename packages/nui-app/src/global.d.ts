import type { NuiSidebarNav } from './nui-sidebar/nui-sidebar-nav-element.ts';
import type { NuiSidebarNavItem } from './nui-sidebar/nui-sidebar-nav-item-element.ts';
import type { NuiSidebarGroup } from './nui-sidebar/nui-sidebar-group-element.ts';
import type { NuiSidebarGroupHeader } from './nui-sidebar/nui-sidebar-group-header-element.ts';
import type { NuiSidebar } from './nui-sidebar/nui-sidebar-element.ts';
import type { NuiSidebarItem } from './nui-sidebar/nui-sidebar-item-element.ts';
import type { NuiAppPanel } from './nui-app-panel/nui-app-panel-element.ts';

declare global {
  const __DEV__: boolean;

  interface HTMLElementTagNameMap {
    'nui-sidebar-nav': NuiSidebarNav;
    'nui-sidebar-nav-item': NuiSidebarNavItem;
    'nui-sidebar-group': NuiSidebarGroup;
    'nui-sidebar-group-header': NuiSidebarGroupHeader;
    'nui-sidebar': NuiSidebar;
    'nui-sidebar-item': NuiSidebarItem;
    'nui-app-panel': NuiAppPanel;
  }
}
