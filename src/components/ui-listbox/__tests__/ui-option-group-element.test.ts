// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-listbox.ts';
import '../ui-option-group-header.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-option-group', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-option-group')).toBeDefined();
  });
});

describe('ui-option-group-header', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-option-group-header')).toBeDefined();
  });

  it('auto-generates an id on setup', () => {
    const listbox = document.createElement('ui-listbox');
    const group = document.createElement('ui-option-group');
    const header = document.createElement('ui-option-group-header');
    header.textContent = 'Section';
    group.appendChild(header);
    listbox.appendChild(group);
    document.body.appendChild(listbox);

    expect(header.id).toMatch(/^ogh-/);
  });

  it('sets aria-labelledby on parent group', () => {
    const listbox = document.createElement('ui-listbox');
    const group = document.createElement('ui-option-group');
    const header = document.createElement('ui-option-group-header');
    header.textContent = 'Section';
    group.appendChild(header);
    listbox.appendChild(group);
    document.body.appendChild(listbox);

    // ARIA: group is labelled by its header element
    expect(group.getAttribute('aria-labelledby')).toBe(header.id);
    expect(header.id).toBeTruthy();
  });
});
