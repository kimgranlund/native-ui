import { define } from '../../core/define.ts';
import { UITab } from './ui-tab-element.ts';
import { UITabPanel } from './ui-tab-panel-element.ts';
import { UITabPanels } from './ui-tab-panels-element.ts';
import { UITabs } from './ui-tabs-element.ts';

// WHY: Children first — tabs, panels, and panels container must be defined before the coordinator
define('ui-tab', UITab);
define('ui-tab-panel', UITabPanel);
define('ui-tab-panels', UITabPanels);
define('ui-tabs', UITabs);

export { UITab, UITabPanel, UITabPanels, UITabs };
