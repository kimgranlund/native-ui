/**
 * Builds an HTML string for use as iframe `srcdoc` in the playground.
 * Renders user code (HTML, CSS, JS) in an isolated iframe with
 * native-ui loaded via external CSS and register script URLs.
 */

export interface SrcdocOptions {
  /** User's HTML from the HTML pane */
  html: string;
  /** User's CSS from the CSS pane */
  css: string;
  /** User's JS from the JS pane */
  js: string;
  /** Pre-resolved framework CSS to inline as <style> (preferred) */
  frameworkCss?: string;
  /** URL to native-ui.css — fallback when frameworkCss is not available */
  cssUrl?: string;
  /** URL to native-ui register script (CDN or bundled) */
  registerUrl: string;
  /** Optional OKLCH token overrides as CSS custom properties */
  themeOverrides?: string;
}

/**
 * Escape `</script>` sequences in user-provided JS to prevent
 * breaking out of the inline script tag.
 */
function escapeScriptClose(js: string): string {
  return js.replace(/<\/script>/gi, '<\\/script>');
}

export function buildSrcdoc(options: SrcdocOptions): string {
  const { html, css, js, frameworkCss, cssUrl, registerUrl, themeOverrides } = options;

  // Prefer inline CSS (avoids Vite dev server MIME-type issues with srcdoc iframes).
  // Falls back to <link> for backwards compatibility when frameworkCss is not resolved.
  const cssBlock = frameworkCss
    ? `<style id="framework-css">${frameworkCss}</style>`
    : cssUrl
      ? `<link rel="stylesheet" href="${cssUrl}">`
      : '';

  const themeBlock = themeOverrides
    ? `\n  <style id="theme-overrides">:root { ${themeOverrides} }</style>`
    : '';

  const safeJs = escapeScriptClose(js);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${cssBlock}${themeBlock}
  <style id="base-styles">
    :where(body) {
      font-family: var(--n-font-family, system-ui, -apple-system, sans-serif);
      line-height: var(--n-text-line-height, 1.5);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
  </style>
  <style id="user-css">${css}</style>
</head>
<body>
  ${html}
  <script src="${registerUrl}" type="module"><\/script>
  <script>
    (function() {
      const _log = console.log;
      const _warn = console.warn;
      const _error = console.error;
      const _clear = console.clear;
      function send(level, args) {
        window.parent.postMessage({
          type: 'playground:console',
          level: level,
          args: args.map(function(a) {
            try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
            catch (_e) { return String(a); }
          })
        }, '*');
      }
      console.log = function() { var args = [].slice.call(arguments); _log.apply(console, args); send('log', args); };
      console.warn = function() { var args = [].slice.call(arguments); _warn.apply(console, args); send('warn', args); };
      console.error = function() { var args = [].slice.call(arguments); _error.apply(console, args); send('error', args); };
      console.clear = function() { _clear.call(console); send('clear', []); };
      window.addEventListener('error', function(e) {
        send('error', [e.message + ' (' + e.filename + ':' + e.lineno + ':' + e.colno + ')']);
      });
      window.addEventListener('unhandledrejection', function(e) {
        send('error', ['Unhandled rejection: ' + e.reason]);
      });
      window.parent.postMessage({ type: 'playground:ready' }, '*');
    })();
  <\/script>
  <script type="module">${safeJs}<\/script>
</body>
</html>`;
}
