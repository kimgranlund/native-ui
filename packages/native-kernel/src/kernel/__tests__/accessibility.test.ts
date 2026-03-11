// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { validateAccessibility, auditDOM } from '../accessibility.ts';
import type { UINode } from '../types.ts';

describe('validateAccessibility', () => {
  it('passes for a simple valid tree', () => {
    const root: UINode = {
      id: 'root',
      tag: 'div',
      children: [
        { id: 'h', tag: 'h1', textContent: 'Title' },
        { id: 'p', tag: 'p', textContent: 'Content' },
      ],
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('flags interactive element without accessible name', () => {
    const root: UINode = {
      id: 'btn',
      tag: 'button',
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(false);
    const v = result.violations.find(v => v.rule === 'interactive-needs-name');
    expect(v).toBeDefined();
    expect(v!.severity).toBe('error');
  });

  it('passes interactive element with aria-label', () => {
    const root: UINode = {
      id: 'btn',
      tag: 'button',
      attributes: { 'aria-label': 'Close' },
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(true);
  });

  it('passes interactive element with textContent', () => {
    const root: UINode = {
      id: 'btn',
      tag: 'button',
      textContent: 'Click me',
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(true);
  });

  it('passes interactive element with child text', () => {
    const root: UINode = {
      id: 'btn',
      tag: 'button',
      children: [{ id: 'label', tag: 'span', textContent: 'Submit' }],
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(true);
  });

  it('flags custom interactive element without name', () => {
    const root: UINode = {
      id: 'btn',
      tag: 'n-button',
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.rule === 'interactive-needs-name')).toBe(true);
  });

  it('flags img without alt', () => {
    const root: UINode = {
      id: 'img',
      tag: 'img',
      attributes: { src: 'photo.jpg' },
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.rule === 'img-needs-alt')).toBe(true);
  });

  it('passes img with alt', () => {
    const root: UINode = {
      id: 'img',
      tag: 'img',
      attributes: { src: 'photo.jpg', alt: 'A photo' },
    };
    const result = validateAccessibility(root);
    const imgViolations = result.violations.filter(v => v.rule === 'img-needs-alt');
    expect(imgViolations.length).toBe(0);
  });

  it('flags role="img" without name', () => {
    const root: UINode = {
      id: 'icon',
      tag: 'div',
      attributes: { role: 'img' },
    };
    const result = validateAccessibility(root);
    expect(result.violations.some(v => v.rule === 'img-role-needs-name')).toBe(true);
  });

  it('warns on form input without label', () => {
    const root: UINode = {
      id: 'input',
      tag: 'input',
    };
    const result = validateAccessibility(root);
    // Valid because form-input-needs-label is a warning, and interactive-needs-name
    // only errors on button/a/input/select/textarea without name
    const formWarning = result.violations.find(v => v.rule === 'form-input-needs-label');
    expect(formWarning).toBeDefined();
    expect(formWarning!.severity).toBe('warning');
  });

  it('flags invalid ARIA role', () => {
    const root: UINode = {
      id: 'el',
      tag: 'div',
      attributes: { role: 'foobar' },
    };
    const result = validateAccessibility(root);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.rule === 'valid-role')).toBe(true);
  });

  it('passes valid ARIA role', () => {
    const root: UINode = {
      id: 'el',
      tag: 'div',
      attributes: { role: 'navigation' },
    };
    const result = validateAccessibility(root);
    const roleViolations = result.violations.filter(v => v.rule === 'valid-role');
    expect(roleViolations.length).toBe(0);
  });

  it('warns on missing required ARIA props for checkbox', () => {
    const root: UINode = {
      id: 'cb',
      tag: 'div',
      attributes: { role: 'checkbox', 'aria-label': 'Accept terms' },
    };
    const result = validateAccessibility(root);
    const warning = result.violations.find(v => v.rule === 'required-aria-props');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('aria-checked');
  });

  it('passes checkbox with required props', () => {
    const root: UINode = {
      id: 'cb',
      tag: 'div',
      attributes: { role: 'checkbox', 'aria-checked': 'false', 'aria-label': 'Accept' },
    };
    const result = validateAccessibility(root);
    const ariaViolations = result.violations.filter(v => v.rule === 'required-aria-props');
    expect(ariaViolations.length).toBe(0);
  });

  it('warns on heading hierarchy skip', () => {
    const root: UINode = {
      id: 'root',
      tag: 'div',
      children: [
        { id: 'h1', tag: 'h1', textContent: 'Title' },
        { id: 'h3', tag: 'h3', textContent: 'Skipped h2' },
      ],
    };
    const result = validateAccessibility(root);
    expect(result.violations.some(v => v.rule === 'heading-hierarchy')).toBe(true);
  });

  it('no heading-hierarchy warning for sequential headings', () => {
    const root: UINode = {
      id: 'root',
      tag: 'div',
      children: [
        { id: 'h1', tag: 'h1', textContent: 'Title' },
        { id: 'h2', tag: 'h2', textContent: 'Subtitle' },
        { id: 'h3', tag: 'h3', textContent: 'Section' },
      ],
    };
    const result = validateAccessibility(root);
    expect(result.violations.filter(v => v.rule === 'heading-hierarchy').length).toBe(0);
  });

  it('warns on multiple main landmarks', () => {
    const root: UINode = {
      id: 'root',
      tag: 'div',
      children: [
        { id: 'm1', tag: 'main', children: [{ id: 'h1', tag: 'h1', textContent: 'One' }] },
        { id: 'm2', tag: 'main', children: [{ id: 'h2', tag: 'h1', textContent: 'Two' }] },
      ],
    };
    const result = validateAccessibility(root);
    expect(result.violations.some(v => v.rule === 'single-main-landmark')).toBe(true);
  });

  it('flags duplicate IDs', () => {
    const root: UINode = {
      id: 'dup',
      tag: 'div',
      children: [{ id: 'dup', tag: 'span', textContent: 'text' }],
    };
    const result = validateAccessibility(root);
    expect(result.violations.some(v => v.rule === 'no-duplicate-id')).toBe(true);
  });

  it('valid only considers errors, not warnings', () => {
    // Form input without label is a warning, not an error
    const root: UINode = {
      id: 'root',
      tag: 'div',
      children: [
        { id: 'inp', tag: 'n-input' },
      ],
    };
    const result = validateAccessibility(root);
    // n-input is interactive + form — both trigger violations
    // interactive-needs-name is error, form-input-needs-label is warning
    expect(result.violations.some(v => v.severity === 'error')).toBe(true);
    expect(result.valid).toBe(false);
  });
});

describe('auditDOM', () => {
  it('passes for accessible DOM', () => {
    const root = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = 'Click me';
    root.appendChild(btn);

    const result = auditDOM(root);
    expect(result.valid).toBe(true);
  });

  it('flags focusable element without name', () => {
    const root = document.createElement('div');
    const btn = document.createElement('button');
    // No text content
    root.appendChild(btn);

    const result = auditDOM(root);
    expect(result.violations.some(v => v.rule === 'focusable-needs-name')).toBe(true);
  });

  it('flags img without alt', () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    root.appendChild(img);

    const result = auditDOM(root);
    expect(result.violations.some(v => v.rule === 'img-needs-alt')).toBe(true);
  });

  it('flags empty ARIA attribute', () => {
    const root = document.createElement('div');
    root.setAttribute('aria-label', '');

    const result = auditDOM(root);
    expect(result.violations.some(v => v.rule === 'no-empty-aria')).toBe(true);
  });

  it('passes img with alt', () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.alt = 'Description';
    root.appendChild(img);

    const result = auditDOM(root);
    const imgViolations = result.violations.filter(v => v.rule === 'img-needs-alt');
    expect(imgViolations.length).toBe(0);
  });
});
