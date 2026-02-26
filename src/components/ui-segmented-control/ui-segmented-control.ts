import { define } from '../../core/define.ts';
import { UISegment } from './ui-segment-element.ts';
import { UISegmentedControl } from './ui-segmented-control-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('ui-segment', UISegment);
define('ui-segmented-control', UISegmentedControl);

export { UISegment, UISegmentedControl };
