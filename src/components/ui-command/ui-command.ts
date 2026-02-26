import { define } from '../../core/define.ts';
import { UICommand } from './ui-command-element.ts';
import { UICommandInput } from './ui-command-input-element.ts';
import { UICommandList } from './ui-command-list-element.ts';
import { UICommandItem } from './ui-command-item-element.ts';
import { UICommandGroup } from './ui-command-group-element.ts';
import { UICommandEmpty } from './ui-command-empty-element.ts';

// WHY: Children registered FIRST so they upgrade before the parent's
// setup() queries them (e.g. querySelectorAll('ui-command-item'))
define('ui-command-input', UICommandInput);
define('ui-command-list', UICommandList);
define('ui-command-item', UICommandItem);
define('ui-command-group', UICommandGroup);
define('ui-command-empty', UICommandEmpty);
define('ui-command', UICommand);

export { UICommand, UICommandInput, UICommandList, UICommandItem, UICommandGroup, UICommandEmpty };
