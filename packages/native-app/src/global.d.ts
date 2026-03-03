import type { NSidebarNav } from './sidebar/sidebar-nav-element.ts';
import type { NSidebarNavItem } from './sidebar/sidebar-nav-item-element.ts';
import type { NSidebarGroup } from './sidebar/sidebar-group-element.ts';
import type { NSidebarGroupHeader } from './sidebar/sidebar-group-header-element.ts';
import type { NSidebar } from './sidebar/sidebar-element.ts';
import type { NSidebarItem } from './sidebar/sidebar-item-element.ts';

declare global {
  const __DEV__: boolean;

  interface HTMLElementTagNameMap {
    'n-sidebar-nav': NSidebarNav;
    'n-sidebar-nav-item': NSidebarNavItem;
    'n-sidebar-group': NSidebarGroup;
    'n-sidebar-group-header': NSidebarGroupHeader;
    'n-sidebar': NSidebar;
    'n-sidebar-item': NSidebarItem;
  }
}
