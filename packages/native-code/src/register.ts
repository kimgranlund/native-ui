/**
 * Register native-code
 *
 * Side-effect module that registers all code editing custom elements:
 * <n-editor>, <n-markdown-editor>, <n-playground>
 * plus dogfooded n-* components they create via document.createElement.
 *
 * Usage:
 *   import '@nonoun/native-code/register';
 */

export { NCodeEditor } from './codemirror/register.ts';
export { NMarkdownEditor } from './markdown-editor/register.ts';
export { NPlayground } from './playground/register.ts';
