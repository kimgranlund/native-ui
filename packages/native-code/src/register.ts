/**
 * Register native-code
 *
 * Side-effect module that registers all code editing custom elements:
 * <native-codemirror>, <native-editor>, <native-playground>
 * plus dogfooded n-* components they create via document.createElement.
 *
 * Usage:
 *   import '@nonoun/native-code/register';
 */

import './codemirror/register.ts';
import './editor/register.ts';
import './playground/register.ts';
