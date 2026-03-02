import { define } from '../../core/define.ts';
import { NTab } from './tab-element.ts';
import { NTabPanel } from './tab-panel-element.ts';
import { NTabPanels } from './tab-panels-element.ts';
import { NTabs } from './tabs-element.ts';

// WHY: Children first — tabs, panels, and panels container must be defined before the coordinator
define('n-tab', NTab);
define('n-tab-panel', NTabPanel);
define('n-tab-panels', NTabPanels);
define('n-tabs', NTabs);

export { NTab, NTabPanel, NTabPanels, NTabs };
