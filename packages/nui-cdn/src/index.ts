/**
 * IIFE Entry Point
 *
 * Single-file bundle that exports the full API on `window.NativeUI`
 * and auto-registers all custom elements. Intended for CDN / artifact use:
 *
 *   <script src="native-ui.iife.js"></script>
 *   <link rel="stylesheet" href="native-ui.css">
 */

// Re-export everything from the library
export * from '@nonoun/native-ui';

// Auto-register all elements (side effect)
import '@nonoun/native-ui/register';
