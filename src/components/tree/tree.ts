import { define } from '@nonoun/native-core';
import { NTree } from './tree-element.ts';
import { NTreeItem } from './tree-item-element.ts';
// WHY: tree-item injects <n-icon> for caret toggles, so ensure it's defined
import '../../icons/icon.ts';

define('n-tree-item', NTreeItem);
define('n-tree', NTree);

export { NTree, NTreeItem };
