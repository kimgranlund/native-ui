// WHY: Children registered FIRST, parent LAST (spec §9.2)
import './command-empty.ts';
import './command-item.ts';
import './command-group.ts';
import './command-list.ts';
import './command-input.ts';
import './command.ts';

export { NCommandEmpty } from './command-empty-element.ts';
export { NCommandItem } from './command-item-element.ts';
export { NCommandGroup } from './command-group-element.ts';
export { NCommandList } from './command-list-element.ts';
export { NCommandInput } from './command-input-element.ts';
export { NCommand } from './command-element.ts';
