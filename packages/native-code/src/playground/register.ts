/**
 * Register n-playground
 *
 * Side-effect module that registers the <n-playground> custom element.
 *
 * Usage:
 *   import '@nonoun/native-code/register';
 */

import { define } from '@nonoun/native-core';
import { NPlayground } from './playground-element.ts';

define('n-playground', NPlayground);

export { NPlayground };
