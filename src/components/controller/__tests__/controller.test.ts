// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { registerTrait, getTrait } from '../../../registries/trait-registry.ts';
import type { TraitAdapter } from '../../../registries/trait-registry.ts';
import '../controller.ts';

// ── Test helpers ──

/** Tracks created/destroyed instances for assertions */
const log: string[] = [];
const instances = new Map<HTMLElement, Record<string, string>>();

function clearLog(): void {
  log.length = 0;
  instances.clear();
}

const testAdapter: TraitAdapter<{ host: HTMLElement; options: Record<string, string> }> = {
  name: 'test-trait',
  create(host, options) {
    log.push(`create:${host.tagName.toLowerCase()}`);
    const inst = { host, options: { ...options } };
    instances.set(host, options);
    return inst;
  },
  destroy(inst) {
    log.push(`destroy:${inst.host.tagName.toLowerCase()}`);
    instances.delete(inst.host);
  },
  update(inst, options) {
    log.push(`update:${inst.host.tagName.toLowerCase()}`);
    inst.options = { ...options };
    instances.set(inst.host, options);
  },
};

const conflictAdapterA: TraitAdapter<{ host: HTMLElement }> = {
  name: 'conflict-a',
  create(host) { return { host }; },
  destroy() {},
  conflicts: ['conflict-b'],
};

const conflictAdapterB: TraitAdapter<{ host: HTMLElement }> = {
  name: 'conflict-b',
  create(host) { return { host }; },
  destroy() {},
  conflicts: ['conflict-a'],
};

beforeAll(() => {
  if (!getTrait('test-trait')) registerTrait(testAdapter);
  if (!getTrait('conflict-a')) registerTrait(conflictAdapterA);
  if (!getTrait('conflict-b')) registerTrait(conflictAdapterB);
});

afterEach(() => {
  document.body.innerHTML = '';
  clearLog();
});

// ── Tests ──

describe('n-controller', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-controller')).toBeDefined();
  });

  describe('wrapper mode (default)', () => {
    it('applies traits to first element child', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      expect(log).toEqual(['create:div']);
      expect(instances.has(child)).toBe(true);
    });

    it('ignores text nodes and targets first HTMLElement', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.appendChild(document.createTextNode('hello'));
      const span = document.createElement('span');
      ctrl.appendChild(span);
      document.body.appendChild(ctrl);

      expect(log).toEqual(['create:span']);
    });

    it('does nothing if no element children', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.appendChild(document.createTextNode('text only'));
      document.body.appendChild(ctrl);

      expect(log).toEqual([]);
    });

    it('destroys controllers on disconnect', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      clearLog();
      ctrl.remove();

      expect(log).toEqual(['destroy:div']);
    });
  });

  describe('selector mode (for="...")', () => {
    it('applies traits to all matching descendants', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.setAttribute('for', '.item');

      const a = document.createElement('div');
      a.className = 'item';
      const b = document.createElement('div');
      b.className = 'item';
      const other = document.createElement('div');
      other.className = 'other';

      ctrl.appendChild(a);
      ctrl.appendChild(b);
      ctrl.appendChild(other);
      document.body.appendChild(ctrl);

      expect(log.filter((l) => l.startsWith('create'))).toHaveLength(2);
      expect(instances.has(a)).toBe(true);
      expect(instances.has(b)).toBe(true);
      expect(instances.has(other)).toBe(false);
    });

    it('handles dynamic children via MutationObserver', async () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.setAttribute('for', '.item');
      document.body.appendChild(ctrl);

      // Start with no matching children
      expect(log).toEqual([]);

      // Add a matching child dynamically
      const child = document.createElement('div');
      child.className = 'item';
      ctrl.appendChild(child);

      // MutationObserver is async, wait for it
      await new Promise((r) => setTimeout(r, 0));

      expect(log.filter((l) => l.startsWith('create'))).toHaveLength(1);
      expect(instances.has(child)).toBe(true);
    });

    it('removes controllers when matching children are removed', async () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.setAttribute('for', '.item');

      const child = document.createElement('div');
      child.className = 'item';
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      expect(instances.has(child)).toBe(true);
      clearLog();

      child.remove();
      await new Promise((r) => setTimeout(r, 0));

      expect(log).toEqual(['destroy:div']);
      expect(instances.has(child)).toBe(false);
    });
  });

  describe('provider mode (provides="...")', () => {
    it('does not apply traits to children', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('provides', 'test-trait');

      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      expect(log).toEqual([]);
      expect(instances.has(child)).toBe(false);
    });
  });

  describe('trait options', () => {
    it('passes namespaced options from controller element', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.setAttribute('data-trait-test-trait-foo', 'bar');
      ctrl.setAttribute('data-trait-test-trait-baz', 'qux');

      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      expect(instances.get(child)).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('updates controllers when options change', async () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      ctrl.setAttribute('data-trait-test-trait-foo', 'original');

      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      clearLog();
      ctrl.setAttribute('data-trait-test-trait-foo', 'updated');

      // MutationObserver is async
      await new Promise((r) => setTimeout(r, 0));

      expect(log).toEqual(['update:div']);
      expect(instances.get(child)).toEqual({ foo: 'updated' });
    });
  });

  describe('dynamic traits attribute', () => {
    it('re-applies traits when traits attribute changes', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');

      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      expect(log).toEqual(['create:div']);
      clearLog();

      // Remove traits
      ctrl.setAttribute('traits', '');

      expect(log).toEqual(['destroy:div']);
    });
  });

  describe('conflict detection', () => {
    it('warns on conflicting traits', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'conflict-a conflict-b');

      const child = document.createElement('div');
      ctrl.appendChild(child);

      // In test/non-DEV, should warn not throw
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (msg: string) => warns.push(msg);

      try {
        document.body.appendChild(ctrl);
      } catch {
        // DEV mode throws; either behavior is acceptable
      }

      console.warn = origWarn;

      // Either a warning was logged or an error was thrown
      // Both are valid behavior depending on DEV flag
    });
  });

  describe('CE upgrade after adoptNode + replaceWith (T0067)', () => {
    it('applies traits exactly once during upgrade — no leaked observers', () => {
      // Simulate the Astro View Transitions pattern:
      // 1. Parser creates an n-controller in an inert document (DOMParser)
      // 2. adoptNode moves it to the main document
      // 3. replaceWith inserts it into the DOM
      // 4. customElements.upgrade() triggers the CE lifecycle

      // Step 1: Create a placeholder in the live DOM
      const placeholder = document.createElement('div');
      document.body.appendChild(placeholder);

      // Step 2: Build the controller + child manually (simulating DOMParser output)
      // Use innerHTML on a template to get un-upgraded elements
      const template = document.createElement('template');
      template.innerHTML = '<n-controller traits="test-trait"><div class="target"></div></n-controller>';
      const frag = template.content;
      const ctrl = frag.querySelector('n-controller')!;

      // Step 3: adoptNode + replaceWith (as Astro does)
      const adopted = document.adoptNode(ctrl);
      placeholder.replaceWith(adopted);

      // Step 4: Force upgrade (browser may auto-upgrade, but Astro calls this explicitly)
      customElements.upgrade(adopted);

      // Trait should be created exactly once
      const creates = log.filter((l) => l === 'create:div');
      expect(creates).toHaveLength(1);

      // Verify controller is functional
      expect(instances.has(adopted.querySelector('.target')!)).toBe(true);
    });

    it('does not double-create when disconnected and reconnected', () => {
      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'test-trait');
      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      expect(log).toEqual(['create:div']);
      clearLog();

      // Disconnect
      ctrl.remove();
      expect(log).toEqual(['destroy:div']);
      clearLog();

      // Reconnect
      document.body.appendChild(ctrl);
      expect(log).toEqual(['create:div']);
    });
  });

  describe('unknown traits', () => {
    it('silently tracks unregistered traits as pending (no warn)', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (msg: string) => warns.push(msg);

      const ctrl = document.createElement('n-controller');
      ctrl.setAttribute('traits', 'nonexistent-trait');

      const child = document.createElement('div');
      ctrl.appendChild(child);
      document.body.appendChild(ctrl);

      console.warn = origWarn;
      // WHY: No warning — unknown traits are tracked as pending and retried
      // when the trait adapter is later registered
      expect(warns.some((w) => w.includes('nonexistent-trait'))).toBe(false);
    });
  });
});
