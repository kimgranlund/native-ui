/**
 * Register native-playground
 *
 * Side-effect module that registers the <native-playground> custom element.
 *
 * Usage:
 *   import '@nonoun/native-code/register';
 */

import { define } from '@nonoun/native-ui';
import { NPlayground } from './playground-element.ts';

define('native-playground', NPlayground);
