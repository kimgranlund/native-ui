import { define } from '@nonoun/native-core';
import { NPagination } from './pagination-element.ts';
// WHY: pagination stamps <n-button> + <n-icon> children, so ensure they're defined
import '../button/button.ts';
import '../../icons/icon.ts';

define('n-pagination', NPagination);

export { NPagination };
