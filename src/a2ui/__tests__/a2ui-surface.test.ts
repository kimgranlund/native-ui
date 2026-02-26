// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SurfaceManager, resolveJsonPointer, setJsonPointer, diffComponents } from '../../a2ui/a2ui-surface.ts';
import { Kernel, resetKernel } from '../../kernel/kernel.ts';
import type { A2UIActionMessage, A2UIComponent } from '../../a2ui/a2ui-types.ts';

describe('A2UI Surface Manager', () => {
  let kernel: Kernel;
  let actions: A2UIActionMessage[];
  let manager: SurfaceManager;
  let container: HTMLElement;

  beforeEach(() => {
    resetKernel();
    kernel = new Kernel({ allowUnregistered: true });
    actions = [];
    manager = new SurfaceManager(kernel, (msg) => actions.push(msg));
    container = document.createElement('div');
  });

  afterEach(() => {
    manager.destroy();
    resetKernel();
  });

  // ── JSON Pointer Utilities ──

  describe('resolveJsonPointer', () => {
    it('resolves root path', () => {
      expect(resolveJsonPointer({ a: 1 }, '/')).toEqual({ a: 1 });
    });

    it('resolves simple path', () => {
      expect(resolveJsonPointer({ user: { name: 'Alice' } }, '/user/name')).toBe('Alice');
    });

    it('resolves nested path', () => {
      expect(resolveJsonPointer({ a: { b: { c: 42 } } }, '/a/b/c')).toBe(42);
    });

    it('resolves array index', () => {
      expect(resolveJsonPointer({ items: ['x', 'y', 'z'] }, '/items/1')).toBe('y');
    });

    it('returns undefined for missing path', () => {
      expect(resolveJsonPointer({ a: 1 }, '/b')).toBeUndefined();
    });

    it('returns undefined for deep missing path', () => {
      expect(resolveJsonPointer({ a: 1 }, '/a/b/c')).toBeUndefined();
    });

    it('handles escaped tilde', () => {
      expect(resolveJsonPointer({ 'a~b': 1 }, '/a~0b')).toBe(1);
    });

    it('handles escaped slash', () => {
      expect(resolveJsonPointer({ 'a/b': 1 }, '/a~1b')).toBe(1);
    });

    it('returns data for empty path', () => {
      expect(resolveJsonPointer({ a: 1 }, '')).toEqual({ a: 1 });
    });
  });

  describe('setJsonPointer', () => {
    it('sets simple path', () => {
      const data: Record<string, unknown> = {};
      setJsonPointer(data, '/name', 'Alice');
      expect(data.name).toBe('Alice');
    });

    it('sets nested path, creating intermediate objects', () => {
      const data: Record<string, unknown> = {};
      setJsonPointer(data, '/user/name', 'Bob');
      expect((data.user as Record<string, unknown>).name).toBe('Bob');
    });

    it('removes value with undefined', () => {
      const data: Record<string, unknown> = { name: 'Alice' };
      setJsonPointer(data, '/name', undefined);
      expect(data.name).toBeUndefined();
    });
  });

  // ── Surface Lifecycle ──

  describe('createSurface', () => {
    it('creates a surface record', () => {
      manager.handleMessage({ createSurface: { surfaceId: 'test' } }, container);
      const surface = manager.getSurface('test');
      expect(surface).not.toBeNull();
      expect(surface!.surfaceId).toBe('test');
      expect(surface!.rendered).toBe(false);
    });

    it('stores catalog and theme', () => {
      manager.handleMessage({
        createSurface: {
          surfaceId: 'test',
          catalogId: 'standard',
          theme: { primaryColor: '#ff0000' },
        },
      }, container);

      const surface = manager.getSurface('test');
      expect(surface!.catalogId).toBe('standard');
      expect(surface!.theme?.primaryColor).toBe('#ff0000');
    });

    it('increments surface count', () => {
      expect(manager.surfaceCount.value).toBe(0);
      manager.handleMessage({ createSurface: { surfaceId: 'a' } }, container);
      expect(manager.surfaceCount.value).toBe(1);
      manager.handleMessage({ createSurface: { surfaceId: 'b' } }, container);
      expect(manager.surfaceCount.value).toBe(2);
    });
  });

  describe('updateComponents', () => {
    it('renders components to DOM', () => {
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [
            { id: 'root', component: 'Column', children: ['title'] },
            { id: 'title', component: 'Text', text: 'Hello A2UI' },
          ],
        },
      }, container);

      const surface = manager.getSurface('test');
      expect(surface!.rendered).toBe(true);
      expect(container.querySelector('span')?.textContent).toBe('Hello A2UI');
    });

    it('auto-creates surface if not yet created', () => {
      // Send updateComponents before createSurface
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'auto',
          components: [
            { id: 'root', component: 'Text', text: 'Auto' },
          ],
        },
      }, container);

      expect(manager.getSurface('auto')).not.toBeNull();
      expect(manager.getSurface('auto')!.rendered).toBe(true);
    });

    it('patches on subsequent updates', () => {
      // First render
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [
            { id: 'root', component: 'Text', text: 'Before' },
          ],
        },
      }, container);

      expect(container.querySelector('span')?.textContent).toBe('Before');

      // Update: change text
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [
            { id: 'root', component: 'Text', text: 'After' },
          ],
        },
      });

      expect(container.querySelector('span')?.textContent).toBe('After');
    });

    it('handles Button with action', () => {
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [
            {
              id: 'root',
              component: 'Button',
              text: 'Click',
              action: { event: { name: 'do_click' } },
            },
          ],
        },
      }, container);

      expect(container.querySelector('ui-button')).not.toBeNull();
    });
  });

  describe('updateDataModel', () => {
    it('replaces entire data model', () => {
      manager.handleMessage({ createSurface: { surfaceId: 'test' } }, container);
      manager.handleMessage({
        updateDataModel: { surfaceId: 'test', value: { name: 'Alice', age: 30 } },
      });

      const data = manager.getDataModel('test');
      expect(data).toEqual({ name: 'Alice', age: 30 });
    });

    it('sets value at path', () => {
      manager.handleMessage({ createSurface: { surfaceId: 'test' } }, container);
      manager.handleMessage({
        updateDataModel: { surfaceId: 'test', path: '/user/name', value: 'Bob' },
      });

      const data = manager.getDataModel('test');
      expect((data?.user as Record<string, unknown>)?.name).toBe('Bob');
    });

    it('removes value with undefined', () => {
      manager.handleMessage({ createSurface: { surfaceId: 'test' } }, container);
      manager.handleMessage({
        updateDataModel: { surfaceId: 'test', value: { a: 1, b: 2 } },
      });
      manager.handleMessage({
        updateDataModel: { surfaceId: 'test', path: '/a', value: undefined },
      });

      const data = manager.getDataModel('test');
      expect(data?.a).toBeUndefined();
      expect(data?.b).toBe(2);
    });

    it('ignores message for unknown surface', () => {
      // Should not throw
      manager.handleMessage({
        updateDataModel: { surfaceId: 'nonexistent', path: '/x', value: 1 },
      });
    });
  });

  describe('deleteSurface', () => {
    it('removes surface', () => {
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [{ id: 'root', component: 'Text', text: 'Gone' }],
        },
      }, container);

      expect(manager.getSurface('test')).not.toBeNull();

      manager.handleMessage({ deleteSurface: { surfaceId: 'test' } });
      expect(manager.getSurface('test')).toBeNull();
    });

    it('decrements surface count', () => {
      manager.handleMessage({ createSurface: { surfaceId: 'a' } }, container);
      manager.handleMessage({ createSurface: { surfaceId: 'b' } }, container);
      expect(manager.surfaceCount.value).toBe(2);

      manager.handleMessage({ deleteSurface: { surfaceId: 'a' } });
      expect(manager.surfaceCount.value).toBe(1);
    });

    it('ignores unknown surface', () => {
      // Should not throw
      manager.handleMessage({ deleteSurface: { surfaceId: 'nonexistent' } });
    });
  });

  describe('action routing', () => {
    it('routes command bus actions to onAction callback', () => {
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [
            {
              id: 'btn',
              component: 'Button',
              text: 'Go',
              action: { event: { name: 'submit' } },
            },
          ],
        },
      }, container);

      // Simulate the command that would be dispatched when the button is pressed
      kernel.bus.dispatch('a2ui:test:btn:submit', {});

      expect(actions).toHaveLength(1);
      expect(actions[0].action.surfaceId).toBe('test');
      expect(actions[0].action.sourceComponentId).toBe('btn');
      expect(actions[0].action.name).toBe('submit');
    });

    it('resolves action context from data model', () => {
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [
            {
              id: 'btn',
              component: 'Button',
              text: 'Send',
              action: {
                event: {
                  name: 'send',
                  context: { userId: { path: '/currentUser/id' } as unknown },
                },
              },
            },
          ],
        },
      }, container);

      // Set data model
      manager.handleMessage({
        updateDataModel: {
          surfaceId: 'test',
          value: { currentUser: { id: 'user-42' } },
        },
      });

      // Trigger action
      kernel.bus.dispatch('a2ui:test:btn:send', {});

      expect(actions).toHaveLength(1);
      expect(actions[0].action.context?.userId).toBe('user-42');
    });
  });

  describe('getSurfaceIds', () => {
    it('returns all surface IDs', () => {
      manager.handleMessage({ createSurface: { surfaceId: 'alpha' } }, container);
      manager.handleMessage({ createSurface: { surfaceId: 'beta' } }, container);

      const ids = manager.getSurfaceIds();
      expect(ids).toContain('alpha');
      expect(ids).toContain('beta');
      expect(ids).toHaveLength(2);
    });
  });

  describe('destroy', () => {
    it('cleans up all surfaces', () => {
      manager.handleMessage({
        updateComponents: {
          surfaceId: 'test',
          components: [{ id: 'root', component: 'Text', text: 'Bye' }],
        },
      }, container);

      manager.destroy();
      expect(manager.getSurfaceIds()).toHaveLength(0);
    });
  });

  // ── Component Diffing ──

  describe('diffComponents', () => {
    it('detects text changes', () => {
      const old: A2UIComponent[] = [{ id: 'a', component: 'Text', text: 'Old' }];
      const nw: A2UIComponent[] = [{ id: 'a', component: 'Text', text: 'New' }];

      const ops = diffComponents(old, nw, 'test');
      const textOp = ops.find((o) => o.type === 'set-text');
      expect(textOp).toBeDefined();
      expect(textOp!.type === 'set-text' && textOp!.text).toBe('New');
    });

    it('detects removed components', () => {
      const old: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['a'] },
        { id: 'a', component: 'Text', text: 'Gone' },
      ];
      const nw: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: [] },
      ];

      const ops = diffComponents(old, nw, 'test');
      const removeOp = ops.find((o) => o.type === 'remove');
      expect(removeOp).toBeDefined();
      expect(removeOp!.type === 'remove' && removeOp!.targetId).toBe('a');
    });

    it('detects added components', () => {
      const old: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: [] },
      ];
      const nw: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['b'] },
        { id: 'b', component: 'Text', text: 'New' },
      ];

      const ops = diffComponents(old, nw, 'test');
      const addOp = ops.find((o) => o.type === 'add');
      expect(addOp).toBeDefined();
    });

    it('detects disabled changes', () => {
      const old: A2UIComponent[] = [{ id: 'btn', component: 'Button', text: 'Go' }];
      const nw: A2UIComponent[] = [{ id: 'btn', component: 'Button', text: 'Go', disabled: true }];

      const ops = diffComponents(old, nw, 'test');
      const attrOp = ops.find((o) => o.type === 'set-attribute');
      expect(attrOp).toBeDefined();
    });

    it('returns empty ops for identical components', () => {
      const comps: A2UIComponent[] = [{ id: 'a', component: 'Text', text: 'Same' }];
      const ops = diffComponents(comps, comps, 'test');
      expect(ops).toHaveLength(0);
    });

    it('replaces when component type changes', () => {
      const old: A2UIComponent[] = [{ id: 'a', component: 'Text', text: 'Hello' }];
      const nw: A2UIComponent[] = [{ id: 'a', component: 'Button', text: 'Hello' }];

      const ops = diffComponents(old, nw, 'test');
      expect(ops).toHaveLength(1);
      expect(ops[0].type).toBe('replace');
    });

    it('replaces when children structure changes', () => {
      const old: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['a'] },
        { id: 'a', component: 'Text', text: 'A' },
      ];
      const nw: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['a', 'b'] },
        { id: 'a', component: 'Text', text: 'A' },
        { id: 'b', component: 'Text', text: 'B' },
      ];

      const ops = diffComponents(old, nw, 'test');
      // root gets replaced (children changed), plus 'b' is added
      const replaceOp = ops.find((o) => o.type === 'replace' && o.targetId === 'root');
      expect(replaceOp).toBeDefined();
    });

    it('diffs variant attribute', () => {
      const old: A2UIComponent[] = [{ id: 'btn', component: 'Button', text: 'Go', variant: 'primary' }];
      const nw: A2UIComponent[] = [{ id: 'btn', component: 'Button', text: 'Go', variant: 'danger' }];

      const ops = diffComponents(old, nw, 'test');
      const attrOp = ops.find(
        (o) => o.type === 'set-attribute' && o.name === 'variant',
      );
      expect(attrOp).toBeDefined();
      expect(attrOp!.type === 'set-attribute' && attrOp!.value).toBe('danger');
    });

    it('removes attribute when cleared', () => {
      const old: A2UIComponent[] = [{ id: 'inp', component: 'TextField', placeholder: 'Type...' }];
      const nw: A2UIComponent[] = [{ id: 'inp', component: 'TextField' }];

      const ops = diffComponents(old, nw, 'test');
      const removeOp = ops.find(
        (o) => o.type === 'remove-attribute' && o.name === 'placeholder',
      );
      expect(removeOp).toBeDefined();
    });

    it('diffs value as property (not attribute)', () => {
      const old: A2UIComponent[] = [{ id: 'inp', component: 'TextField', value: 'old' }];
      const nw: A2UIComponent[] = [{ id: 'inp', component: 'TextField', value: 'new' }];

      const ops = diffComponents(old, nw, 'test');
      const propOp = ops.find(
        (o) => o.type === 'set-property' && o.name === 'value',
      );
      expect(propOp).toBeDefined();
      expect(propOp!.type === 'set-property' && propOp!.value).toBe('new');
    });

    it('diffs multiple attributes at once', () => {
      const old: A2UIComponent[] = [{ id: 'img', component: 'Image', src: '/a.png', alt: 'old' }];
      const nw: A2UIComponent[] = [{ id: 'img', component: 'Image', src: '/b.png', alt: 'new' }];

      const ops = diffComponents(old, nw, 'test');
      const srcOp = ops.find((o) => o.type === 'set-attribute' && o.name === 'src');
      const altOp = ops.find((o) => o.type === 'set-attribute' && o.name === 'alt');
      expect(srcOp).toBeDefined();
      expect(altOp).toBeDefined();
    });

    it('skips property-level ops when type changes (replace takes priority)', () => {
      const old: A2UIComponent[] = [{ id: 'a', component: 'Text', text: 'Hi', variant: 'h1' }];
      const nw: A2UIComponent[] = [{ id: 'a', component: 'Button', text: 'Hi', variant: 'primary' }];

      const ops = diffComponents(old, nw, 'test');
      // Should only have replace, no individual set-attribute ops
      expect(ops).toHaveLength(1);
      expect(ops[0].type).toBe('replace');
    });

    it('detects label changes', () => {
      const old: A2UIComponent[] = [{ id: 'btn', component: 'Button', label: 'Save' }];
      const nw: A2UIComponent[] = [{ id: 'btn', component: 'Button', label: 'Submit' }];

      const ops = diffComponents(old, nw, 'test');
      const textOp = ops.find((o) => o.type === 'set-text');
      expect(textOp).toBeDefined();
      expect(textOp!.type === 'set-text' && textOp!.text).toBe('Submit');
    });

    it('removes disabled attribute when re-enabled', () => {
      const old: A2UIComponent[] = [{ id: 'btn', component: 'Button', text: 'Go', disabled: true }];
      const nw: A2UIComponent[] = [{ id: 'btn', component: 'Button', text: 'Go', disabled: false }];

      const ops = diffComponents(old, nw, 'test');
      const removeOp = ops.find((o) => o.type === 'remove-attribute' && o.name === 'disabled');
      expect(removeOp).toBeDefined();
    });
  });
});
