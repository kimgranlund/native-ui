import { define } from '../../core/define.ts';
import { NCommand } from './command-element.ts';
import { NCommandInput } from './command-input-element.ts';
import { NCommandList } from './command-list-element.ts';
import { NCommandItem } from './command-item-element.ts';
import { NCommandGroup } from './command-group-element.ts';
import { NCommandEmpty } from './command-empty-element.ts';

// WHY: Children registered FIRST so they upgrade before the parent's
// setup() queries them (e.g. querySelectorAll('n-command-item'))
define('n-command-input', NCommandInput);
define('n-command-list', NCommandList);
define('n-command-item', NCommandItem);
define('n-command-group', NCommandGroup);
define('n-command-empty', NCommandEmpty);
define('n-command', NCommand);

export { NCommand, NCommandInput, NCommandList, NCommandItem, NCommandGroup, NCommandEmpty };
