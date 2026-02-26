import type { UINode } from './types.ts';

// ── Types ──

export interface A11yViolation {
  readonly nodeId: string;
  readonly path: string;
  readonly rule: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export interface A11yResult {
  readonly valid: boolean;
  readonly violations: readonly A11yViolation[];
}

// ── Constants ──

const VALID_ROLES: ReadonlySet<string> = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
  'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
  'contentinfo', 'definition', 'dialog', 'directory', 'document', 'feed',
  'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link',
  'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
  'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter',
  'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
  'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader',
  'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton',
  'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term',
  'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
]);

const INTERACTIVE_HTML_TAGS: ReadonlySet<string> = new Set([
  'button', 'a', 'input', 'select', 'textarea',
]);

const INTERACTIVE_ROLES: ReadonlySet<string> = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem',
  'option', 'combobox', 'listbox', 'slider',
]);

const INTERACTIVE_CUSTOM_ELEMENTS: ReadonlySet<string> = new Set([
  'ui-button', 'ui-checkbox', 'ui-switch', 'ui-radio', 'ui-input',
  'ui-select', 'ui-combobox', 'ui-range', 'ui-textarea', 'ui-tab',
  'ui-option', 'ui-command-item', 'ui-tree-item',
]);

const FORM_HTML_TAGS: ReadonlySet<string> = new Set([
  'input', 'select', 'textarea',
]);

const FORM_CUSTOM_ELEMENTS: ReadonlySet<string> = new Set([
  'ui-input', 'ui-select', 'ui-combobox', 'ui-textarea', 'ui-range',
]);

const HEADING_TAGS: ReadonlySet<string> = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

/**
 * Required ARIA properties for specific roles.
 * Key: role name. Value: list of required ARIA attributes.
 */
const REQUIRED_ARIA_FOR_ROLE: Readonly<Record<string, readonly string[]>> = {
  checkbox: ['aria-checked'],
  switch: ['aria-checked'],
  radio: ['aria-checked'],
  combobox: ['aria-expanded'],
  slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  tab: ['aria-selected'],
  heading: ['aria-level'],
};

// ── Helpers ──

function getAttr(node: UINode, name: string): string | undefined {
  return node.attributes?.[name];
}

function hasAttr(node: UINode, name: string): boolean {
  return node.attributes?.[name] !== undefined;
}

function hasAccessibleName(node: UINode): boolean {
  if (hasAttr(node, 'aria-label')) return true;
  if (hasAttr(node, 'aria-labelledby')) return true;
  if (node.textContent && node.textContent.trim().length > 0) return true;
  // Check children for textContent
  if (node.children) {
    for (const child of node.children) {
      if (child.textContent && child.textContent.trim().length > 0) return true;
    }
  }
  return false;
}

function isInteractiveElement(node: UINode): boolean {
  const tag = node.tag.toLowerCase();
  if (INTERACTIVE_HTML_TAGS.has(tag)) return true;
  if (INTERACTIVE_CUSTOM_ELEMENTS.has(tag)) return true;
  const role = getAttr(node, 'role');
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  return false;
}

function isFormElement(node: UINode): boolean {
  const tag = node.tag.toLowerCase();
  return FORM_HTML_TAGS.has(tag) || FORM_CUSTOM_ELEMENTS.has(tag);
}

function headingLevel(node: UINode): number | null {
  const tag = node.tag.toLowerCase();
  if (HEADING_TAGS.has(tag)) return parseInt(tag[1]!, 10);
  const role = getAttr(node, 'role');
  if (role === 'heading') {
    const level = getAttr(node, 'aria-level');
    if (level) {
      const parsed = parseInt(level, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) return parsed;
    }
  }
  return null;
}

// ── Tree Validation State ──

interface WalkState {
  readonly violations: A11yViolation[];
  readonly ids: Set<string>;
  readonly headingLevels: number[];
  mainCount: number;
}

// ── Tree Walker ──

function walkNode(node: UINode, path: string, state: WalkState): void {
  const tag = node.tag.toLowerCase();

  // Rule: No duplicate IDs
  if (state.ids.has(node.id)) {
    state.violations.push({
      nodeId: node.id,
      path,
      rule: 'no-duplicate-id',
      severity: 'error',
      message: `Duplicate node ID: "${node.id}"`,
    });
  }
  state.ids.add(node.id);

  // Rule: Interactive elements need accessible names
  if (isInteractiveElement(node) && !hasAccessibleName(node)) {
    state.violations.push({
      nodeId: node.id,
      path,
      rule: 'interactive-needs-name',
      severity: 'error',
      message: `Interactive element <${node.tag}> is missing an accessible name (aria-label, aria-labelledby, or text content)`,
    });
  }

  // Rule: Images need alt text
  if (tag === 'img' && !hasAttr(node, 'alt')) {
    state.violations.push({
      nodeId: node.id,
      path,
      rule: 'img-needs-alt',
      severity: 'error',
      message: '<img> element is missing an alt attribute',
    });
  }

  const role = getAttr(node, 'role');
  if (role === 'img' && !hasAttr(node, 'aria-label') && !hasAttr(node, 'aria-labelledby')) {
    state.violations.push({
      nodeId: node.id,
      path,
      rule: 'img-role-needs-name',
      severity: 'error',
      message: 'Element with role="img" is missing aria-label or aria-labelledby',
    });
  }

  // Rule: Form inputs need labels
  if (isFormElement(node) && !hasAttr(node, 'aria-label') && !hasAttr(node, 'aria-labelledby')) {
    state.violations.push({
      nodeId: node.id,
      path,
      rule: 'form-input-needs-label',
      severity: 'warning',
      message: `Form element <${node.tag}> is missing a label (aria-label or aria-labelledby)`,
    });
  }

  // Rule: ARIA role validity
  if (role && !VALID_ROLES.has(role)) {
    state.violations.push({
      nodeId: node.id,
      path,
      rule: 'valid-role',
      severity: 'error',
      message: `Invalid ARIA role: "${role}"`,
    });
  }

  // Rule: Required ARIA properties for roles
  if (role && role in REQUIRED_ARIA_FOR_ROLE) {
    const required = REQUIRED_ARIA_FOR_ROLE[role]!;
    for (const attr of required) {
      if (!hasAttr(node, attr)) {
        state.violations.push({
          nodeId: node.id,
          path,
          rule: 'required-aria-props',
          severity: 'warning',
          message: `Element with role="${role}" is missing required attribute "${attr}"`,
        });
      }
    }
  }

  // Rule: Heading hierarchy tracking
  const level = headingLevel(node);
  if (level !== null) {
    state.headingLevels.push(level);
  }

  // Rule: Landmark — count main elements
  if (tag === 'main' || role === 'main') {
    state.mainCount++;
  }

  // Recurse children
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      walkNode(node.children[i]!, `${path}.children[${i}]`, state);
    }
  }
}

// ── Public API: Plan Validation ──

export function validateAccessibility(root: UINode): A11yResult {
  const state: WalkState = {
    violations: [],
    ids: new Set(),
    headingLevels: [],
    mainCount: 0,
  };

  walkNode(root, 'root', state);

  // Post-walk checks

  // Heading hierarchy: warn if levels skip
  if (state.headingLevels.length > 1) {
    const sorted = [...state.headingLevels].sort((a, b) => a - b);
    const unique = [...new Set(sorted)];
    for (let i = 1; i < unique.length; i++) {
      const prev = unique[i - 1]!;
      const curr = unique[i]!;
      if (curr - prev > 1) {
        state.violations.push({
          nodeId: '',
          path: 'root',
          rule: 'heading-hierarchy',
          severity: 'warning',
          message: `Heading hierarchy skips from h${prev} to h${curr}`,
        });
      }
    }
  }

  // Multiple main landmarks
  if (state.mainCount > 1) {
    state.violations.push({
      nodeId: '',
      path: 'root',
      rule: 'single-main-landmark',
      severity: 'warning',
      message: `Found ${state.mainCount} main landmarks — there should be at most one`,
    });
  }

  return {
    valid: state.violations.every((v) => v.severity !== 'error'),
    violations: state.violations,
  };
}

// ── Public API: Runtime DOM Audit ──

export function auditDOM(root: HTMLElement): A11yResult {
  const violations: A11yViolation[] = [];
  auditElement(root, 'root', violations);

  return {
    valid: violations.every((v) => v.severity !== 'error'),
    violations,
  };
}

function isFocusable(el: HTMLElement): boolean {
  if (el.tabIndex >= 0) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea') return true;
  if (tag === 'a' && el.hasAttribute('href')) return true;
  if (el.isContentEditable) return true;
  return false;
}

function hasAccessibleNameDOM(el: HTMLElement): boolean {
  if (el.getAttribute('aria-label')) return true;
  if (el.getAttribute('aria-labelledby')) return true;
  const text = el.textContent?.trim();
  if (text && text.length > 0) return true;
  // Inputs: check placeholder, title, or associated label
  if (el.getAttribute('title')) return true;
  if (el.tagName.toLowerCase() === 'input' && el.getAttribute('placeholder')) return true;
  return false;
}

function auditElement(el: HTMLElement, path: string, violations: A11yViolation[]): void {
  const id = el.id || el.tagName.toLowerCase();

  // Rule: Focusable elements should have accessible names
  if (isFocusable(el) && !hasAccessibleNameDOM(el)) {
    violations.push({
      nodeId: id,
      path,
      rule: 'focusable-needs-name',
      severity: 'error',
      message: `Focusable element <${el.tagName.toLowerCase()}> is missing an accessible name`,
    });
  }

  // Rule: Images need alt text
  if (el.tagName.toLowerCase() === 'img' && !el.hasAttribute('alt')) {
    violations.push({
      nodeId: id,
      path,
      rule: 'img-needs-alt',
      severity: 'error',
      message: '<img> element is missing an alt attribute',
    });
  }

  // Rule: ARIA attribute values must not be empty strings
  for (const attr of el.attributes) {
    if (attr.name.startsWith('aria-') && attr.value === '') {
      violations.push({
        nodeId: id,
        path,
        rule: 'no-empty-aria',
        severity: 'error',
        message: `ARIA attribute "${attr.name}" has an empty value`,
      });
    }
  }

  // Recurse children
  const children = el.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child instanceof HTMLElement) {
      auditElement(child, `${path}.children[${i}]`, violations);
    }
  }
}
