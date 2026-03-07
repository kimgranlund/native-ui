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

export { NCodemirror } from './codemirror/register.ts';
export { NEditor } from './editor/register.ts';
export { NPlayground } from './playground/register.ts';
