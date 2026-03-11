import { define } from '@nonoun/native-core';
import { NSegment } from './segment-element.ts';
import { NSegmentedControl } from './segmented-control-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('n-segment', NSegment);
define('n-segmented-control', NSegmentedControl);

export { NSegment, NSegmentedControl };
