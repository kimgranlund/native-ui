// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { a2uiToUINode, uiNodeToA2UI, conversionToPlan } from '../protocol/a2ui-converter.ts';
import type { A2UIComponent } from '../protocol/a2ui-types.ts';
import type { UINode } from '../../../../src/kernel/types.ts';

describe('A2UI Converter', () => {
  // ── Flat → Tree ──

  describe('a2uiToUINode', () => {
    it('converts a simple root + text child', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['title'] },
        { id: 'title', component: 'Text', text: 'Hello World' },
      ];

      const result = a2uiToUINode(components);
      expect(result.warnings).toHaveLength(0);
      expect(result.orphans).toHaveLength(0);
      expect(result.root.id).toBe('root');
      expect(result.root.tag).toBe('div');
      expect(result.root.children).toHaveLength(1);
      expect(result.root.children![0].tag).toBe('span');
      expect(result.root.children![0].textContent).toBe('Hello World');
    });

    it('converts a Button with slot label', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['btn'] },
        {
          id: 'btn',
          component: 'Button',
          text: 'Click Me',
          action: { event: { name: 'submit' } },
        },
      ];

      const result = a2uiToUINode(components, { surfaceId: 'test' });
      const btn = result.root.children![0];
      expect(btn.tag).toBe('n-button');
      // Button uses slot-label strategy: text becomes a <span slot="label"> child
      expect(btn.children).toHaveLength(1);
      expect(btn.children![0].tag).toBe('span');
      expect(btn.children![0].attributes?.slot).toBe('label');
      expect(btn.children![0].textContent).toBe('Click Me');
      // Action wired as event
      expect(btn.events?.['native:press']).toBe('a2ui:test:btn:submit');
    });

    it('converts TextField to n-input', () => {
      const components: A2UIComponent[] = [
        {
          id: 'root',
          component: 'TextField',
          label: 'Email',
          placeholder: 'Enter email',
        },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-input');
      expect(result.root.attributes?.['aria-label']).toBe('Email');
      expect(result.root.attributes?.placeholder).toBe('Enter email');
      expect(result.root.attributes?.variant).toBeUndefined();
    });

    it('converts TextField with obscured variant to password type', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'TextField', label: 'Password', variant: 'obscured' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.type).toBe('password');
    });

    it('converts TextField with number variant', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'TextField', label: 'Age', variant: 'number' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.type).toBe('number');
    });

    it('converts DateTimeInput with enableDate + enableTime', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'DateTimeInput', label: 'When', enableDate: true, enableTime: true },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-input');
      expect(result.root.attributes?.type).toBe('datetime-local');
    });

    it('converts Text with heading variant to h2', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Text', text: 'Title', variant: 'h2' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('h2');
      expect(result.root.textContent).toBe('Title');
    });

    it('converts CheckBox with label', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'CheckBox', label: 'Accept terms' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-checkbox');
      expect(result.root.textContent).toBe('Accept terms');
    });

    it('converts Switch with label', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Switch', label: 'Dark mode' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-switch');
      expect(result.root.textContent).toBe('Dark mode');
    });

    it('converts Slider with min/max', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Slider', label: 'Volume', min: 0, max: 100 },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-range');
      expect(result.root.attributes?.min).toBe('0');
      expect(result.root.attributes?.max).toBe('100');
      expect(result.root.attributes?.['aria-label']).toBe('Volume');
    });

    it('converts ListItem with value', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'List', children: ['item-1'] },
        { id: 'item-1', component: 'ListItem', text: 'Option A', value: 'a' },
      ];

      const result = a2uiToUINode(components);
      const item = result.root.children![0];
      expect(item.tag).toBe('n-option');
      expect(item.textContent).toBe('Option A');
      expect(item.attributes?.value).toBe('a');
    });

    it('converts Image with url to src', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Image', url: 'https://example.com/img.png', alt: 'Example' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('img');
      expect(result.root.attributes?.src).toBe('https://example.com/img.png');
      expect(result.root.attributes?.alt).toBe('Example');
    });

    it('converts Video with url to src and controls', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Video', url: 'https://example.com/clip.mp4', poster: 'https://example.com/thumb.jpg' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('video');
      expect(result.root.attributes?.src).toBe('https://example.com/clip.mp4');
      expect(result.root.attributes?.poster).toBe('https://example.com/thumb.jpg');
      expect(result.root.attributes?.controls).toBe('');
    });

    it('converts AudioPlayer with url to src and controls', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'AudioPlayer', url: 'https://example.com/track.mp3' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('audio');
      expect(result.root.attributes?.src).toBe('https://example.com/track.mp3');
      expect(result.root.attributes?.controls).toBe('');
    });

    it('converts Icon with name', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Icon', name: 'search' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-icon');
      expect(result.root.attributes?.name).toBe('search');
      expect(result.root.attributes?.['aria-hidden']).toBe('true');
    });

    it('converts disabled component', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Button', text: 'Disabled', disabled: true },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.disabled).toBe('');
    });

    it('converts deep nesting', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['row'] },
        { id: 'row', component: 'Row', children: ['text'] },
        { id: 'text', component: 'Text', text: 'Deep' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.children![0].children![0].textContent).toBe('Deep');
    });

    it('handles single child shorthand', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Card', child: 'content' },
        { id: 'content', component: 'Text', text: 'Card body' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.tag).toBe('n-card');
      expect(result.root.children).toHaveLength(1);
      expect(result.root.children![0].textContent).toBe('Card body');
    });

    it('auto-detects root (prefers id "root")', () => {
      const components: A2UIComponent[] = [
        { id: 'child', component: 'Text', text: 'Hello' },
        { id: 'root', component: 'Column', children: ['child'] },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.id).toBe('root');
    });

    it('auto-detects root when no "root" id', () => {
      const components: A2UIComponent[] = [
        { id: 'wrapper', component: 'Column', children: ['child'] },
        { id: 'child', component: 'Text', text: 'Hello' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.id).toBe('wrapper');
    });

    it('uses explicit rootId override', () => {
      const components: A2UIComponent[] = [
        { id: 'a', component: 'Column', children: ['b'] },
        { id: 'b', component: 'Text', text: 'Hi' },
      ];

      const result = a2uiToUINode(components, { rootId: 'b' });
      expect(result.root.id).toBe('b');
    });

    it('detects cycles', () => {
      const components: A2UIComponent[] = [
        { id: 'a', component: 'Column', children: ['b'] },
        { id: 'b', component: 'Column', children: ['a'] },
      ];

      const result = a2uiToUINode(components, { rootId: 'a' });
      expect(result.warnings.some((w) => w.includes('Cycle'))).toBe(true);
    });

    it('detects orphan components', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['child'] },
        { id: 'child', component: 'Text', text: 'Connected' },
        { id: 'orphan', component: 'Text', text: 'Lost' },
      ];

      const result = a2uiToUINode(components);
      expect(result.orphans).toContain('orphan');
      expect(result.warnings.some((w) => w.includes('Orphan'))).toBe(true);
    });

    it('handles missing child reference gracefully', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['missing'] },
      ];

      const result = a2uiToUINode(components);
      expect(result.warnings.some((w) => w.includes('not found'))).toBe(true);
      expect(result.root.children).toHaveLength(1);
      expect(result.root.children![0].textContent).toContain('Missing');
    });

    it('handles unknown A2UI component type', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'FancyWidget', text: 'Custom' },
      ];

      const result = a2uiToUINode(components);
      expect(result.warnings.some((w) => w.includes('Unknown'))).toBe(true);
      expect(result.root.tag).toBe('div');
    });

    it('handles empty component array', () => {
      const result = a2uiToUINode([]);
      expect(result.root.tag).toBe('div');
      expect(result.warnings).toHaveLength(1);
    });

    it('extracts data bindings from text', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Text', text: { path: '/user/name' } as unknown as string },
      ];

      const result = a2uiToUINode(components);
      expect(result.bindings.size).toBe(1);
      const entries = result.bindings.get('root');
      expect(entries).toHaveLength(1);
      expect(entries![0].property).toBe('textContent');
      expect(entries![0].path).toBe('/user/name');
    });

    it('extracts data bindings from label', () => {
      const components: A2UIComponent[] = [
        {
          id: 'root',
          component: 'TextField',
          label: { path: '/form/field_label' } as unknown as string,
        },
      ];

      const result = a2uiToUINode(components);
      const entries = result.bindings.get('root');
      expect(entries).toHaveLength(1);
      expect(entries![0].property).toBe('aria-label');
    });

    it('maps Button primary variant', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Button', text: 'Go', variant: 'primary' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.variant).toBe('primary');
    });

    it('maps Button borderless variant to ghost', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Button', text: 'Link', variant: 'borderless' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.variant).toBe('ghost');
    });

    it('stamps data-a2ui attribute on all components', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Row', children: ['btn'] },
        { id: 'btn', component: 'Button', text: 'Go' },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.['data-a2ui']).toBe('Row');
      expect(result.root.children?.[0].attributes?.['data-a2ui']).toBe('Button');
    });

    it('preserves accessibility label', () => {
      const components: A2UIComponent[] = [
        {
          id: 'root',
          component: 'Button',
          text: 'X',
          accessibility: { label: 'Close dialog' },
        },
      ];

      const result = a2uiToUINode(components);
      expect(result.root.attributes?.['aria-label']).toBe('Close dialog');
    });
  });

  // ── Tree → Flat ──

  describe('uiNodeToA2UI', () => {
    it('flattens a simple tree', () => {
      const root: UINode = {
        id: 'root',
        tag: 'div',
        attributes: { style: 'display:flex;flex-direction:column;gap:0.5rem', 'data-a2ui': 'Column' },
        children: [
          { id: 'title', tag: 'span', textContent: 'Hello' },
        ],
      };

      const flat = uiNodeToA2UI(root);
      expect(flat).toHaveLength(2);

      const rootComp = flat.find((c) => c.id === 'root')!;
      expect(rootComp.component).toBe('Column');
      expect(rootComp.children).toEqual(['title']);

      const titleComp = flat.find((c) => c.id === 'title')!;
      expect(titleComp.component).toBe('Text');
      expect(titleComp.text).toBe('Hello');
    });

    it('converts n-button with slot label back to text', () => {
      const root: UINode = {
        id: 'btn',
        tag: 'n-button',
        children: [
          { id: 'btn-label', tag: 'span', attributes: { slot: 'label' }, textContent: 'Click' },
        ],
      };

      const flat = uiNodeToA2UI(root);
      expect(flat).toHaveLength(1); // label absorbed
      expect(flat[0].text).toBe('Click');
    });

    it('converts n-checkbox textContent back to label', () => {
      const root: UINode = {
        id: 'cb',
        tag: 'n-checkbox',
        textContent: 'Accept',
      };

      const flat = uiNodeToA2UI(root);
      expect(flat[0].label).toBe('Accept');
    });

    it('converts events back to actions', () => {
      const root: UINode = {
        id: 'btn',
        tag: 'n-button',
        events: { 'native:press': 'a2ui:surf:btn:submit' },
        children: [
          { id: 'btn-label', tag: 'span', attributes: { slot: 'label' }, textContent: 'Go' },
        ],
      };

      const flat = uiNodeToA2UI(root);
      expect(flat[0].action).toEqual({ event: { name: 'submit' } });
    });

    it('converts disabled attribute', () => {
      const root: UINode = {
        id: 'btn',
        tag: 'n-button',
        attributes: { disabled: '' },
        textContent: 'Nope',
      };

      const flat = uiNodeToA2UI(root);
      expect(flat[0].disabled).toBe(true);
    });

    it('converts aria-label to label', () => {
      const root: UINode = {
        id: 'input',
        tag: 'n-input',
        attributes: { 'aria-label': 'Search' },
      };

      const flat = uiNodeToA2UI(root);
      expect(flat[0].label).toBe('Search');
    });

    it('handles unknown tags gracefully', () => {
      const root: UINode = {
        id: 'custom',
        tag: 'my-custom-element',
        textContent: 'Custom content',
      };

      const flat = uiNodeToA2UI(root);
      expect(flat).toHaveLength(1);
      expect(flat[0].component).toBe('Column'); // fallback
      expect(flat[0].text).toBe('Custom content');
    });

    it('round-trips simple structure', () => {
      const original: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['text'] },
        { id: 'text', component: 'Text', text: 'Round trip' },
      ];

      const conversion = a2uiToUINode(original);
      const roundTripped = uiNodeToA2UI(conversion.root);

      expect(roundTripped).toHaveLength(2);
      const rootComp = roundTripped.find((c) => c.id === 'root')!;
      expect(rootComp.component).toBe('Column');
      expect(rootComp.children).toEqual(['text']);

      const textComp = roundTripped.find((c) => c.id === 'text')!;
      expect(textComp.component).toBe('Text');
      expect(textComp.text).toBe('Round trip');
    });

    it('round-trips Button with action', () => {
      const original: A2UIComponent[] = [
        {
          id: 'btn',
          component: 'Button',
          text: 'Submit',
          action: { event: { name: 'do_submit' } },
        },
      ];

      const conversion = a2uiToUINode(original, { surfaceId: 'test' });
      const roundTripped = uiNodeToA2UI(conversion.root, { surfaceId: 'test' });

      expect(roundTripped).toHaveLength(1);
      expect(roundTripped[0].text).toBe('Submit');
      expect(roundTripped[0].action).toEqual({ event: { name: 'do_submit' } });
    });
  });

  // ── conversionToPlan ──

  describe('conversionToPlan', () => {
    it('wraps conversion result as UIPlan', () => {
      const result = a2uiToUINode([
        { id: 'root', component: 'Text', text: 'Hello' },
      ]);

      const plan = conversionToPlan(result);
      expect(plan.id).toMatch(/^a2ui-plan-/);
      expect(plan.version).toBe(1);
      expect(plan.root.id).toBe('root');
      expect(plan.source).toBe('generated');
      expect(plan.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it('accepts custom source', () => {
      const result = a2uiToUINode([
        { id: 'root', component: 'Text', text: 'Hello' },
      ]);

      const plan = conversionToPlan(result, 'replay');
      expect(plan.source).toBe('replay');
    });
  });
});
