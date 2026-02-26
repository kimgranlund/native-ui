import { define } from '../../core/define.ts';
import { UITree } from './ui-tree-element.ts';
import { UITreeItem } from './ui-tree-item-element.ts';
// WHY: tree-item injects <ui-icon> for caret toggles, so ensure it's defined
import '../../icons/ui-icon.ts';

define('ui-tree-item', UITreeItem);
define('ui-tree', UITree);

export { UITree, UITreeItem };
