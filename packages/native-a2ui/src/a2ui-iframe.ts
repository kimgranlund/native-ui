/**
 * A2UI Iframe Template & Controller
 *
 * Builds the srcdoc HTML for the preview iframe and manages the
 * postMessage protocol between the workbench (parent) and the
 * sandboxed preview (child). The iframe loads native-ui's full
 * component set, kernel, and CSS, then accepts A2UI JSONL envelopes
 * via postMessage.
 */

// ── Iframe srcdoc builder ──

export interface IframeTemplateOptions {
  /** Inline CSS string for native-ui styles (resolved by parent) */
  readonly cssText?: string;
  /** URL to native-ui CSS (fallback when cssText not available) */
  readonly cssUrl?: string;
  /** URL to native-ui register script (registers all elements) */
  readonly registerUrl?: string;
  /** URL to native-ui kernel script */
  readonly kernelUrl?: string;
}

/**
 * Build the HTML string used as the preview iframe's srcdoc.
 *
 * The template loads native-ui (elements + kernel + CSS) and listens
 * for postMessage commands from the parent frame:
 *
 * - `a2ui:envelope` — feed an A2UI JSON envelope to the kernel adapter
 * - `a2ui:reset`    — destroy all surfaces, clear body, recreate adapter
 * - `a2ui:catalog`  — placeholder for custom catalog loading
 *
 * After processing each envelope the iframe reports state back via
 * `a2ui:state` messages. Action events from rendered UI components
 * are forwarded as `a2ui:action` messages.
 */
export function buildIframeTemplate(options?: IframeTemplateOptions): string {
  const cssText = options?.cssText ?? '';
  const cssUrl = options?.cssUrl ?? '';
  const registerUrl = options?.registerUrl ?? '';
  const kernelUrl = options?.kernelUrl ?? '';

  // Prefer inline CSS to avoid MIME-type issues in srcdoc iframes.
  // Falls back to <link> when cssText is not resolved.
  const cssBlock = cssText
    ? `<style id="framework-css">${cssText}</style>`
    : cssUrl
      ? `<link rel="stylesheet" href="${cssUrl}">`
      : '';

  // Register script: loads and registers all ~47 native-ui elements
  const registerBlock = registerUrl
    ? `<script src="${registerUrl}" type="module"><\/script>`
    : '';

  // Kernel script: loads A2UI runtime (Kernel, Planner, A2UIAdapter)
  const kernelBlock = kernelUrl
    ? `<script src="${kernelUrl}" type="module"><\/script>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${cssBlock}
  <style id="base-styles">
    :where(html, body) {
      margin: 0;
      padding: 0;
    }
    :where(body) {
      font-family: var(--ui-font-family, system-ui, -apple-system, sans-serif);
      line-height: var(--ui-line-height, 1.5);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      padding: 1rem;
    }
  </style>
</head>
<body>
  ${registerBlock}
  ${kernelBlock}
  <script>
    (function() {
      'use strict';

      // ── State ──

      var adapter = null;
      var kernel = null;
      var container = document.createElement('div');
      container.id = 'a2ui-root';
      document.body.appendChild(container);

      // ── Helpers ──

      function collectSurfaces() {
        var result = {};
        if (!adapter) return result;
        var ids = adapter.getSurfaceIds();
        for (var i = 0; i < ids.length; i++) {
          var sid = ids[i];
          var surface = adapter.getSurface(sid);
          var dataModel = adapter.getDataModel(sid) || {};
          result[sid] = {
            surfaceId: sid,
            components: [],
            dataModel: dataModel,
            rendered: surface ? surface.rendered : false
          };
        }
        return result;
      }

      function reportState(errors) {
        window.parent.postMessage({
          type: 'a2ui:state',
          payload: {
            surfaces: collectSurfaces(),
            errors: errors || []
          }
        }, '*');
      }

      function reportAction(action) {
        window.parent.postMessage({
          type: 'a2ui:action',
          payload: action
        }, '*');
      }

      function reportError(code, message) {
        window.parent.postMessage({
          type: 'a2ui:error',
          payload: { code: code, message: message }
        }, '*');
      }

      // ── Adapter Initialization ──

      function initAdapter() {
        // The kernel and adapter are loaded asynchronously via module scripts.
        // We poll until they are available on the global scope, or accept
        // that they may be set up by the parent via a separate mechanism.
        if (window.__nativeUIKernel && !adapter) {
          kernel = window.__nativeUIKernel;
          var A2UIAdapter = window.__nativeUIA2UIAdapter;
          if (A2UIAdapter) {
            adapter = new A2UIAdapter(kernel, {
              onClientMessage: function(msg) {
                if (msg.action) {
                  reportAction(msg.action);
                }
              },
              onRender: function(_surfaceId, _container) {
                reportState([]);
              }
            });
          }
        }
        return adapter;
      }

      // ── Message Handler ──

      window.addEventListener('message', function(e) {
        var data = e.data;
        if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

        switch (data.type) {
          case 'a2ui:envelope': {
            var currentAdapter = initAdapter();
            if (!currentAdapter) {
              // No kernel/adapter available — try to parse and report
              reportError('NO_ADAPTER', 'Kernel or A2UIAdapter not available. Ensure native-ui/kernel is loaded.');
              return;
            }
            try {
              currentAdapter.receive(data.payload, container);
              reportState([]);
            } catch (err) {
              var msg = err instanceof Error ? err.message : String(err);
              reportError('RECEIVE_ERROR', msg);
              reportState([{ severity: 'error', message: msg }]);
            }
            break;
          }

          case 'a2ui:reset': {
            // Destroy existing adapter and surfaces
            if (adapter) {
              try { adapter.destroy(); } catch (_e) { /* ignore */ }
              adapter = null;
            }
            // Clear rendered content
            container.textContent = '';
            // Re-init will happen on next envelope
            window.parent.postMessage({ type: 'a2ui:reset-ack' }, '*');
            break;
          }

          case 'a2ui:catalog': {
            // Placeholder for custom catalog loading
            // In the future, this could load a custom catalog definition
            // and pass it to the adapter
            window.parent.postMessage({ type: 'a2ui:catalog-ack' }, '*');
            break;
          }

          case 'a2ui:init-adapter': {
            // Parent injects kernel and adapter references directly
            if (data.payload) {
              if (data.payload.kernel) window.__nativeUIKernel = data.payload.kernel;
              if (data.payload.A2UIAdapter) window.__nativeUIA2UIAdapter = data.payload.A2UIAdapter;
              initAdapter();
            }
            break;
          }
        }
      });

      // ── Error Capture ──

      window.addEventListener('error', function(e) {
        reportError('RUNTIME_ERROR', e.message + ' (' + (e.filename || '') + ':' + (e.lineno || 0) + ')');
      });

      window.addEventListener('unhandledrejection', function(e) {
        reportError('UNHANDLED_REJECTION', 'Unhandled rejection: ' + e.reason);
      });

      // Signal ready
      window.parent.postMessage({ type: 'a2ui:ready' }, '*');
    })();
  <\/script>
</body>
</html>`;
}

// ── Iframe Controller ──

export interface A2UIIframeController {
  readonly iframe: HTMLIFrameElement;
  sendEnvelope(envelope: unknown): void;
  reset(): void;
  destroy(): void;
}

/**
 * Create an iframe controller that manages the preview iframe and
 * the postMessage protocol between parent and child frames.
 *
 * @param container - DOM element to append the iframe to
 * @param onState   - Called when the iframe reports surface state
 * @param onAction  - Called when a UI action fires inside the iframe
 * @param options   - Template options for CSS/script URLs
 */
export function createIframeController(
  container: HTMLElement,
  onState: (state: { surfaces: Map<string, unknown>; errors: unknown[] }) => void,
  onAction: (action: unknown) => void,
  options?: IframeTemplateOptions,
): A2UIIframeController {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('title', 'A2UI Preview');
  iframe.style.cssText = 'width: 100%; height: 100%; border: none;';

  const srcdoc = buildIframeTemplate(options);
  iframe.srcdoc = srcdoc;
  container.appendChild(iframe);

  // ── Message listener ──

  const messageHandler = (e: MessageEvent): void => {
    // Only accept messages from our iframe
    if (e.source !== iframe.contentWindow) return;

    const data = e.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'a2ui:state': {
        const payload = data.payload;
        // Convert plain object surfaces map to a Map
        const surfacesMap = new Map<string, unknown>();
        if (payload?.surfaces && typeof payload.surfaces === 'object') {
          for (const [key, value] of Object.entries(payload.surfaces)) {
            surfacesMap.set(key, value);
          }
        }
        onState({
          surfaces: surfacesMap,
          errors: Array.isArray(payload?.errors) ? payload.errors : [],
        });
        break;
      }

      case 'a2ui:action': {
        onAction(data.payload);
        break;
      }

      case 'a2ui:error': {
        onState({
          surfaces: new Map(),
          errors: [data.payload],
        });
        break;
      }
    }
  };

  window.addEventListener('message', messageHandler);

  // ── Controller API ──

  function sendEnvelope(envelope: unknown): void {
    iframe.contentWindow?.postMessage(
      { type: 'a2ui:envelope', payload: envelope },
      '*',
    );
  }

  function reset(): void {
    iframe.contentWindow?.postMessage(
      { type: 'a2ui:reset' },
      '*',
    );
  }

  function destroy(): void {
    window.removeEventListener('message', messageHandler);
    iframe.remove();
  }

  return {
    iframe,
    sendEnvelope,
    reset,
    destroy,
  };
}
