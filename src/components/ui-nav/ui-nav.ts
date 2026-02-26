import { define } from '../../core/define.ts';
import { UINavItem } from './ui-nav-item-element.ts';
import { UINavGroupHeader } from './ui-nav-group-header-element.ts';
import { UINavGroup } from './ui-nav-group-element.ts';
import { UINav } from './ui-nav-element.ts';

// WHY: Children registered FIRST so they upgrade before the parent's
// setup() queries them (e.g. querySelectorAll('ui-nav-item'))
define('ui-nav-item', UINavItem);
define('ui-nav-group-header', UINavGroupHeader);
define('ui-nav-group', UINavGroup);
define('ui-nav', UINav);
