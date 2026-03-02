import { define } from '../../core/define.ts';
import { NCalendar } from './calendar-element.ts';

// WHY: Calendar stamps n-button + n-icon internally — ensure they're registered.
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/caret-left.ts';
import '../../icons/phosphor/caret-right.ts';

define('n-calendar', NCalendar);

export { NCalendar };
