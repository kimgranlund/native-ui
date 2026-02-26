// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { A2UIAdapter, createA2UIAdapter } from '../../a2ui/a2ui-adapter.ts';
import { Kernel, resetKernel } from '../../kernel/kernel.ts';
import type {
  A2UIClientMessage,
  A2UIActionMessage,
  A2UIErrorMessage,
  A2UICatalogResponse,
} from '../../a2ui/a2ui-types.ts';
import { isCatalogResponse } from '../../a2ui/a2ui-types.ts';
import type { UIPlan, UINode } from '../../kernel/types.ts';

describe('A2UI Adapter', () => {
  let kernel: Kernel;
  let clientMessages: A2UIClientMessage[];
  let adapter: A2UIAdapter;
  let container: HTMLElement;

  beforeEach(() => {
    resetKernel();
    kernel = new Kernel({ allowUnregistered: true });
    clientMessages = [];
    adapter = createA2UIAdapter(kernel, {
      onClientMessage: (msg) => clientMessages.push(msg),
    });
    container = document.createElement('div');
  });

  afterEach(() => {
    adapter.destroy();
    resetKernel();
  });

  // ── receive ──

  describe('receive', () => {
    it('processes createSurface message', () => {
      adapter.receive({
        createSurface: { surfaceId: 'test' },
      }, container);

      expect(adapter.getSurface('test')).not.toBeNull();
    });

    it('processes updateComponents message', () => {
      adapter.receive({
        updateComponents: {
          surfaceId: 'test',
          components: [
            { id: 'root', component: 'Column', children: ['title'] },
            { id: 'title', component: 'Text', text: 'Hello' },
          ],
        },
      }, container);

      expect(adapter.getSurface('test')?.rendered).toBe(true);
      expect(container.querySelector('span')?.textContent).toBe('Hello');
    });

    it('processes updateDataModel message', () => {
      adapter.receive({ createSurface: { surfaceId: 'test' } }, container);
      adapter.receive({
        updateDataModel: {
          surfaceId: 'test',
          value: { greeting: 'Hi' },
        },
      });

      expect(adapter.getDataModel('test')).toEqual({ greeting: 'Hi' });
    });

    it('processes deleteSurface message', () => {
      adapter.receive({
        updateComponents: {
          surfaceId: 'test',
          components: [{ id: 'root', component: 'Text', text: 'Bye' }],
        },
      }, container);

      adapter.receive({ deleteSurface: { surfaceId: 'test' } });
      expect(adapter.getSurface('test')).toBeNull();
    });

    it('accepts JSON string input', () => {
      const json = JSON.stringify({
        updateComponents: {
          surfaceId: 'test',
          components: [{ id: 'root', component: 'Text', text: 'JSON' }],
        },
      });

      adapter.receive(json, container);
      expect(adapter.getSurface('test')?.rendered).toBe(true);
    });

    it('emits error for invalid JSON string', () => {
      adapter.receive('not valid json');
      expect(clientMessages).toHaveLength(1);
      const msg = clientMessages[0] as A2UIErrorMessage;
      expect(msg.error.code).toBe('PARSE_ERROR');
    });

    it('emits error for unrecognized message', () => {
      adapter.receive('{"unknown": {}}');
      expect(clientMessages).toHaveLength(1);
    });
  });

  // ── parse ──

  describe('parse', () => {
    it('parses valid createSurface', () => {
      const msg = adapter.parse('{"createSurface": {"surfaceId": "test"}}');
      expect(msg).not.toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(adapter.parse('garbage')).toBeNull();
    });

    it('returns null for non-A2UI JSON', () => {
      expect(adapter.parse('{"foo": "bar"}')).toBeNull();
    });
  });

  // ── emit ──

  describe('emit', () => {
    it('converts a UIPlan to A2UI format', () => {
      const plan: UIPlan = {
        id: 'plan-1',
        version: 1,
        root: {
          id: 'root',
          tag: 'div',
          attributes: {
            style: 'display:flex;flex-direction:column;gap:0.5rem',
            'data-a2ui': 'Column',
          },
          children: [
            { id: 'title', tag: 'span', textContent: 'Hello' },
          ],
        },
        source: 'generated',
        timestamp: Date.now(),
      };

      const msg = adapter.emit(plan, 'my-surface');
      expect(msg.updateComponents.surfaceId).toBe('my-surface');
      expect(msg.updateComponents.components.length).toBeGreaterThanOrEqual(2);

      const rootComp = msg.updateComponents.components.find((c) => c.id === 'root');
      expect(rootComp?.component).toBe('Column');

      const titleComp = msg.updateComponents.components.find((c) => c.id === 'title');
      expect(titleComp?.component).toBe('Text');
      expect(titleComp?.text).toBe('Hello');
    });

    it('uses plan.id as default surfaceId', () => {
      const plan: UIPlan = {
        id: 'my-plan',
        version: 1,
        root: { id: 'root', tag: 'span', textContent: 'Test' },
        source: 'generated',
        timestamp: Date.now(),
      };

      const msg = adapter.emit(plan);
      expect(msg.updateComponents.surfaceId).toBe('my-plan');
    });
  });

  // ── emitPlanResult ──

  describe('emitPlanResult', () => {
    it('converts a PlanResult to A2UI format', () => {
      const result = {
        plan: {
          id: 'pr-1',
          version: 1,
          root: { id: 'root', tag: 'span', textContent: 'Result' },
          source: 'generated' as const,
          timestamp: Date.now(),
        },
        validation: { valid: true, errors: [] },
        accessibility: { valid: true, violations: [] },
        warnings: [],
      };

      const msg = adapter.emitPlanResult(result, 'surface-1');
      expect(msg.updateComponents.surfaceId).toBe('surface-1');
      expect(msg.updateComponents.components).toHaveLength(1);
      expect(msg.updateComponents.components[0].component).toBe('Text');
    });
  });

  // ── getSupportedTypes ──

  describe('getSupportedTypes', () => {
    it('returns all A2UI standard types', () => {
      const types = adapter.getSupportedTypes();
      expect(types).toContain('Text');
      expect(types).toContain('Button');
      expect(types).toContain('Row');
      expect(types).toContain('Column');
      expect(types.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ── getSurfaceIds ──

  describe('getSurfaceIds', () => {
    it('lists active surfaces', () => {
      adapter.receive({ createSurface: { surfaceId: 'a' } }, container);
      adapter.receive({ createSurface: { surfaceId: 'b' } }, container);

      const ids = adapter.getSurfaceIds();
      expect(ids).toContain('a');
      expect(ids).toContain('b');
    });
  });

  // ── Full Integration Cycle ──

  describe('full cycle', () => {
    it('create → components → action → data → delete', () => {
      // 1. Create surface
      adapter.receive({ createSurface: { surfaceId: 'cycle' } }, container);

      // 2. Send components
      adapter.receive({
        updateComponents: {
          surfaceId: 'cycle',
          components: [
            { id: 'root', component: 'Column', children: ['greeting', 'btn'] },
            { id: 'greeting', component: 'Text', text: 'Hello' },
            {
              id: 'btn',
              component: 'Button',
              text: 'Click',
              action: { event: { name: 'greet' } },
            },
          ],
        },
      });

      // Verify rendered
      expect(adapter.getSurface('cycle')?.rendered).toBe(true);
      expect(container.querySelector('span')?.textContent).toBe('Hello');

      // 3. Simulate user action (normally triggered by DOM event)
      kernel.bus.dispatch('a2ui:cycle:btn:greet', {});
      expect(clientMessages).toHaveLength(1);
      expect((clientMessages[0] as A2UIActionMessage).action.name).toBe('greet');

      // 4. Server sends data model update
      adapter.receive({
        updateDataModel: {
          surfaceId: 'cycle',
          value: { user: 'World' },
        },
      });
      expect(adapter.getDataModel('cycle')?.user).toBe('World');

      // 5. Server updates components (new greeting)
      adapter.receive({
        updateComponents: {
          surfaceId: 'cycle',
          components: [
            { id: 'root', component: 'Column', children: ['greeting', 'btn'] },
            { id: 'greeting', component: 'Text', text: 'Hello World' },
            {
              id: 'btn',
              component: 'Button',
              text: 'Click',
              action: { event: { name: 'greet' } },
            },
          ],
        },
      });

      expect(container.querySelector('span')?.textContent).toBe('Hello World');

      // 6. Delete surface
      adapter.receive({ deleteSurface: { surfaceId: 'cycle' } });
      expect(adapter.getSurface('cycle')).toBeNull();
      expect(adapter.getSurfaceIds()).not.toContain('cycle');
    });
  });

  // ── Catalog Negotiation ──

  describe('catalog negotiation', () => {
    it('responds to requestCatalog with supported types', () => {
      adapter.receive({ requestCatalog: {} });

      expect(clientMessages).toHaveLength(1);
      const msg = clientMessages[0] as A2UICatalogResponse;
      expect(isCatalogResponse(msg)).toBe(true);
      expect(msg.catalog.supportedTypes).toContain('Text');
      expect(msg.catalog.supportedTypes).toContain('Button');
      expect(msg.catalog.supportedTypes).toContain('Row');
      expect(msg.catalog.supportedTypes.length).toBeGreaterThanOrEqual(20);
      expect(msg.catalog.version).toBe('0.9');
    });

    it('includes surfaceId when provided in request', () => {
      adapter.receive({ requestCatalog: { surfaceId: 'my-surface' } });

      expect(clientMessages).toHaveLength(1);
      const msg = clientMessages[0] as A2UICatalogResponse;
      expect(msg.catalog.surfaceId).toBe('my-surface');
    });

    it('omits surfaceId when not provided', () => {
      adapter.receive({ requestCatalog: {} });

      const msg = clientMessages[0] as A2UICatalogResponse;
      expect(msg.catalog.surfaceId).toBeUndefined();
    });

    it('uses configured protocol version', () => {
      const a = createA2UIAdapter(kernel, {
        version: '0.8',
        onClientMessage: (msg) => clientMessages.push(msg),
      });

      a.receive({ requestCatalog: {} });
      const msg = clientMessages[0] as A2UICatalogResponse;
      expect(msg.catalog.version).toBe('0.8');
      a.destroy();
    });

    it('does not create a surface for catalog request', () => {
      adapter.receive({ requestCatalog: {} });
      expect(adapter.getSurfaceIds()).toHaveLength(0);
    });

    it('parses requestCatalog from JSON string', () => {
      adapter.receive('{"requestCatalog": {}}');

      expect(clientMessages).toHaveLength(1);
      expect(isCatalogResponse(clientMessages[0])).toBe(true);
    });
  });

  // ── Factory ──

  describe('createA2UIAdapter', () => {
    it('creates an adapter instance', () => {
      const a = createA2UIAdapter(kernel);
      expect(a).toBeInstanceOf(A2UIAdapter);
      a.destroy();
    });
  });
});
