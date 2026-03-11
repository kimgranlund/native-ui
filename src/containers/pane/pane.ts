import { define } from '../../core/define.ts';
import { NPane } from './pane-element.ts';
import { NPaneGroup } from './pane-group-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('n-pane', NPane);
define('n-panes', NPaneGroup);

export { NPane, NPaneGroup };
