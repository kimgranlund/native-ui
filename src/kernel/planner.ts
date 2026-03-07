/**
 * GenUI Planner
 *
 * Takes structured UIIntent objects and produces validated UIPlan objects.
 * Bridge between "what the AI wants to create" and the deterministic kernel execution.
 *
 * Intent → UINode tree → UIPlan → schema validation → accessibility audit → PlanResult
 */

import { uid } from '../core/uid.ts';
import type {
  UINode,
  UIPlan,
  CommandSource,
  ComponentRegistration,
  ValidationResult,
} from './types.ts';
import type { ComponentSchema } from './schema-catalog.ts';
import { getSchema } from './schema-catalog.ts';
import { validatePlan } from './schema.ts';
import { validateAccessibility } from './accessibility.ts';
import type { A11yResult } from './accessibility.ts';

// ── Intent Types ──

export interface UIIntent {
  readonly type: 'form' | 'display' | 'action' | 'layout' | 'composite';
  readonly elements: readonly ElementIntent[];
  readonly id?: string;
  readonly title?: string;
}

export interface ElementIntent {
  readonly component: string;
  readonly label?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly events?: Readonly<Record<string, string>>;
  readonly children?: readonly ElementIntent[];
  readonly slot?: string;
}

// ── Plan Result ──

export interface PlanResult {
  readonly plan: UIPlan;
  readonly validation: ValidationResult;
  readonly accessibility: A11yResult;
  readonly warnings: readonly string[];
}

// ── Quick Builder Intent Types ──

export interface FormFieldIntent {
  readonly name: string;
  readonly type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly options?: readonly { value: string; label: string }[];
}

export interface ButtonIntent {
  readonly label: string;
  readonly command: string;
  readonly variant?: string;
  readonly intent?: string;
}

export interface CardIntent {
  readonly heading?: string;
  readonly body: string;
  readonly footer?: readonly ButtonIntent[];
  readonly media?: { src: string; alt: string; height?: string };
  readonly interactive?: boolean;
  readonly href?: string;
}

export interface DialogIntent {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly confirmCommand: string;
  readonly cancelCommand?: string;
  readonly intent?: string;
}

export interface SettingIntent {
  readonly label: string;
  readonly description?: string;
  readonly name: string;
  readonly checked?: boolean;
  readonly command?: string;
}

export interface TabIntent {
  readonly label: string;
  readonly value: string;
  readonly content: string;
  readonly disabled?: boolean;
}

export interface NavItemIntent {
  readonly label: string;
  readonly value: string;
  readonly icon?: string;
  readonly group?: string;
}

// ── Constants ──

/** Tags that suppress the wrapper div when they are the sole root element. */
const STRUCTURAL_TAGS: ReadonlySet<string> = new Set([
  'div', 'form', 'section', 'main', 'nav', 'header', 'footer', 'article', 'aside',
]);

/** Tags that are self-labeling (text content serves as the accessible name). */
const SELF_LABELING_TAGS: ReadonlySet<string> = new Set([
  'n-button', 'button', 'a', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'li', 'td', 'th', 'caption', 'summary', 'legend',
  'n-option', 'n-command-item', 'n-breadcrumb-item', 'n-tab', 'n-switch',
  'span.badge',
]);

/**
 * Tags that require a `<span slot="label">` child for their label text,
 * instead of bare textContent. The CSS grid layout depends on this slot.
 */
const SLOT_LABEL_TAGS: ReadonlySet<string> = new Set([
  'n-button',
]);

const MAX_SAFE_DEPTH = 10;

// ── Helpers ──

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

function measureDepth(node: UINode, depth: number): number {
  if (!node.children || node.children.length === 0) return depth;
  let max = depth;
  for (const child of node.children) {
    const d = measureDepth(child, depth + 1);
    if (d > max) max = d;
  }
  return max;
}

// ── Planner ──

export class Planner {
  #registry: Map<string, ComponentRegistration>;
  #idCounter: number = 0;

  constructor(registry?: Map<string, ComponentRegistration>) {
    this.#registry = registry ?? new Map();
  }

  // ── Main Entry ──

  generate(intent: UIIntent, source?: CommandSource): PlanResult {
    // 1. Reset ID counter for a fresh plan
    this.#idCounter = 0;

    // 2. Build root UINode from intent
    const root = this.#buildRoot(intent);

    // 3. Create UIPlan
    const plan: UIPlan = deepFreeze({
      id: intent.id ?? uid('plan'),
      version: 1,
      root,
      source: source ?? 'generated',
      timestamp: Date.now(),
    });

    // 4. Validate schema
    const validation = validatePlan(plan, this.#registry, { allowUnregistered: true });

    // 5. Validate accessibility
    const accessibility = validateAccessibility(plan.root);

    // 6. Collect warnings
    const warnings = Object.freeze(this.#collectWarnings(intent, plan));

    return deepFreeze({ plan, validation, accessibility, warnings });
  }

  // ── Root Builder ──

  #buildRoot(intent: UIIntent): UINode {
    const children = intent.elements.map((el) => this.#buildNode(el));

    // If there's exactly one element and it's structural, skip the wrapper
    if (children.length === 1) {
      const only = children[0]!;
      if (STRUCTURAL_TAGS.has(only.tag.toLowerCase())) {
        // Apply title as aria-label if provided and not already present
        if (intent.title && !only.attributes?.['aria-label']) {
          return {
            ...only,
            attributes: {
              ...only.attributes,
              'aria-label': intent.title,
            },
          };
        }
        return only;
      }
    }

    // Build a wrapper div as the root
    const wrapperAttrs: Record<string, string> = { role: 'region' };
    if (intent.title) {
      wrapperAttrs['aria-label'] = intent.title;
    }

    // Form / composite intents: vertical stack with gap
    if (intent.type === 'form' || intent.type === 'composite') {
      wrapperAttrs['style'] = 'display: flex; flex-direction: column; gap: 1rem;';
    }

    return {
      id: this.#nextId('div'),
      tag: 'div',
      attributes: wrapperAttrs,
      children,
    };
  }

  // ── Node Builder ──

  #buildNode(element: ElementIntent): UINode {
    // Component-aware transforms: convert intent children to native-ui-compatible structures
    const transformed = this.#transformIntent(element);

    // 1. Generate an ID
    const id = this.#nextId(transformed.component);

    // 2. Start with element attributes
    const baseAttrs: Record<string, string> = { ...(transformed.attributes ?? {}) };

    // 3. Auto-populate ARIA attributes from schema
    const ariaAttrs = this.#autoAria(transformed.component, baseAttrs, transformed);
    const mergedAttrs: Record<string, string> = { ...baseAttrs, ...ariaAttrs };

    // 4. Handle label
    let textContent: string | undefined;
    let labelChild: UINode | undefined;

    if (transformed.label) {
      const tag = transformed.component.toLowerCase();
      if (SLOT_LABEL_TAGS.has(tag)) {
        // Slot-label tags: generate <span slot="label">text</span> child
        labelChild = {
          id: this.#nextId('span'),
          tag: 'span',
          attributes: { slot: 'label' },
          textContent: transformed.label,
        };
      } else if (SELF_LABELING_TAGS.has(tag)) {
        // Self-labeling: text content serves as accessible name
        textContent = transformed.label;
      } else if (!mergedAttrs['aria-label']) {
        // Not self-labeling: add aria-label
        mergedAttrs['aria-label'] = transformed.label;
      }
    }

    // 5. Recursively build children
    const builtChildren = transformed.children
      ? transformed.children.map((child) => this.#buildNode(child))
      : undefined;

    // 6. Merge label child with explicit children
    let allChildren: UINode[] | undefined;
    if (labelChild || (builtChildren && builtChildren.length > 0)) {
      allChildren = [];
      if (labelChild) allChildren.push(labelChild);
      if (builtChildren) allChildren.push(...builtChildren);
    }

    // 7. Assemble the node
    const node: UINode = {
      id,
      tag: transformed.component,
      ...(Object.keys(mergedAttrs).length > 0 ? { attributes: mergedAttrs } : {}),
      ...(transformed.properties ? { properties: transformed.properties } : {}),
      ...(transformed.events ? { events: transformed.events } : {}),
      ...(textContent !== undefined ? { textContent } : {}),
      ...(allChildren && allChildren.length > 0 ? { children: allChildren } : {}),
      ...(transformed.slot ? { slot: transformed.slot } : {}),
    };

    return node;
  }

  // ── ID Generator ──

  #nextId(tag: string): string {
    return `${tag}-${this.#idCounter++}`;
  }

  // ── Component-Aware Transforms ──

  /**
   * Transforms an ElementIntent to match native-ui component DOM requirements.
   * For example, `n-select` with `n-option` children gets converted to
   * data-driven mode (options attribute) since manual mode requires a complex
   * `n-button` + `n-listbox[popover]` structure.
   */
  #transformIntent(element: ElementIntent): ElementIntent {
    const tag = element.component.toLowerCase();

    // n-select with n-option children → convert to data-driven mode
    if (tag === 'n-select' && element.children && element.children.length > 0) {
      const optionChildren = element.children.filter(
        (c) => c.component.toLowerCase() === 'n-option',
      );

      if (optionChildren.length > 0) {
        // Extract options from children into JSON attribute
        const options = optionChildren.map((c) => ({
          value: c.attributes?.['value'] ?? '',
          label: c.label ?? c.attributes?.['label'] ?? c.attributes?.['value'] ?? '',
        }));

        // Keep non-option children (if any)
        const otherChildren = element.children.filter(
          (c) => c.component.toLowerCase() !== 'n-option',
        );

        return {
          ...element,
          attributes: {
            ...(element.attributes ?? {}),
            options: JSON.stringify(options),
          },
          children: otherChildren.length > 0 ? otherChildren : undefined,
        };
      }
    }

    return element;
  }

  // ── Auto-ARIA ──

  #autoAria(
    tag: string,
    existing: Record<string, string>,
    element: ElementIntent,
  ): Record<string, string> {
    const additions: Record<string, string> = {};

    // Look up schema from the catalog
    let schema: ComponentSchema | undefined;
    try {
      schema = getSchema(tag);
    } catch {
      // Schema catalog may not have this tag — that's fine
    }

    if (schema) {
      // Add role if schema specifies one and it's not already set
      if (schema.aria?.role && !existing['role']) {
        additions['role'] = schema.aria.role;
      }

      // Add required ARIA attributes with sensible defaults
      if (schema.aria?.requiredAttributes) {
        for (const attr of schema.aria.requiredAttributes) {
          if (!existing[attr]) {
            additions[attr] = this.#ariaDefault(attr);
          }
        }
      }
    }

    // Icons: add aria-hidden="true" unless explicitly labeled
    if (tag.toLowerCase() === 'n-icon') {
      if (!existing['aria-label'] && !element.label) {
        additions['aria-hidden'] = 'true';
      }
    }

    return additions;
  }

  /** Sensible defaults for required ARIA attributes. */
  #ariaDefault(attr: string): string {
    switch (attr) {
      case 'aria-checked': return 'false';
      case 'aria-expanded': return 'false';
      case 'aria-selected': return 'false';
      case 'aria-disabled': return 'false';
      case 'aria-hidden': return 'false';
      case 'aria-valuenow': return '0';
      case 'aria-valuemin': return '0';
      case 'aria-valuemax': return '100';
      case 'aria-level': return '2';
      default: return '';
    }
  }

  // ── Warning Collection ──

  #collectWarnings(intent: UIIntent, plan: UIPlan): string[] {
    const warnings: string[] = [];

    // Warn if form elements are missing labels
    if (intent.type === 'form') {
      for (const el of intent.elements) {
        this.#warnMissingLabels(el, warnings);
      }
    }

    // Warn if buttons have no text content or aria-label
    this.#warnUnlabeledButtons(intent.elements, warnings);

    // Warn if plan tree is too deep
    const depth = measureDepth(plan.root, 0);
    if (depth > MAX_SAFE_DEPTH) {
      warnings.push(
        `Plan nesting depth is ${depth} levels (recommended maximum: ${MAX_SAFE_DEPTH}). ` +
        'Deep nesting may affect performance and accessibility.',
      );
    }

    // Warn if custom elements are used that aren't in the schema catalog
    this.#warnUnknownComponents(intent.elements, warnings);

    return warnings;
  }

  #warnMissingLabels(element: ElementIntent, warnings: string[]): void {
    const tag = element.component.toLowerCase();
    const isFormElement =
      tag === 'n-input' || tag === 'n-select' || tag === 'n-combobox' ||
      tag === 'n-textarea' || tag === 'n-range' || tag === 'input' ||
      tag === 'select' || tag === 'textarea';

    if (isFormElement && !element.label && !element.attributes?.['aria-label'] && !element.attributes?.['aria-labelledby']) {
      warnings.push(`Form element <${element.component}> is missing a label.`);
    }

    if (element.children) {
      for (const child of element.children) {
        this.#warnMissingLabels(child, warnings);
      }
    }
  }

  #warnUnlabeledButtons(elements: readonly ElementIntent[], warnings: string[]): void {
    for (const el of elements) {
      const tag = el.component.toLowerCase();
      if (tag === 'n-button' || tag === 'button') {
        const hasLabel = el.label || el.attributes?.['aria-label'] || el.attributes?.['aria-labelledby'];
        if (!hasLabel) {
          warnings.push(`Button <${el.component}> has no text content or aria-label.`);
        }
      }

      if (el.children) {
        this.#warnUnlabeledButtons(el.children, warnings);
      }
    }
  }

  #warnUnknownComponents(elements: readonly ElementIntent[], warnings: string[]): void {
    for (const el of elements) {
      const tag = el.component.toLowerCase();
      // Only check custom elements (contain a hyphen)
      if (tag.includes('-')) {
        let schema: ComponentSchema | undefined;
        try {
          schema = getSchema(tag);
        } catch {
          // ignore
        }
        if (!schema) {
          warnings.push(`Custom element <${el.component}> is not in the schema catalog.`);
        }
      }

      if (el.children) {
        this.#warnUnknownComponents(el.children, warnings);
      }
    }
  }

  // ── Static Quick Builders ──

  /**
   * Build a form plan from field descriptors.
   * Produces a `<form>` with `n-field` + `n-input`/`n-select`/`n-textarea` per field,
   * plus a submit `n-button` at the end.
   */
  static form(
    fields: readonly FormFieldIntent[],
    options?: {
      title?: string;
      submitLabel?: string;
      submitCommand?: string;
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    const elements: ElementIntent[] = [];

    for (const field of fields) {
      const fieldType = field.type ?? 'text';
      let inputElement: ElementIntent;

      if (fieldType === 'select' && field.options) {
        // Use data-driven mode: set options attribute as JSON + placeholder
        inputElement = {
          component: 'n-select',
          label: field.name,
          attributes: {
            options: JSON.stringify(field.options.map((o) => ({ value: o.value, label: o.label }))),
            ...(field.placeholder ? { placeholder: field.placeholder } : {}),
            ...(field.required ? { required: '' } : {}),
          },
        };
      } else if (fieldType === 'textarea') {
        inputElement = {
          component: 'n-textarea',
          label: field.name,
          attributes: {
            ...(field.placeholder ? { placeholder: field.placeholder } : {}),
            ...(field.required ? { required: '' } : {}),
          },
        };
      } else {
        inputElement = {
          component: 'n-input',
          label: field.name,
          attributes: {
            type: fieldType,
            ...(field.placeholder ? { placeholder: field.placeholder } : {}),
            ...(field.required ? { required: '' } : {}),
          },
        };
      }

      // Wrap in n-field
      elements.push({
        component: 'n-field',
        children: [
          { component: 'label', label: field.name, slot: 'label' },
          inputElement,
        ],
      });
    }

    // Submit button
    elements.push({
      component: 'n-button',
      label: options?.submitLabel ?? 'Submit',
      attributes: { variant: 'primary', intent: 'accent' },
      events: options?.submitCommand
        ? { 'native:press': options.submitCommand }
        : {},
    });

    const intent: UIIntent = {
      type: 'form',
      elements: [
        {
          component: 'form',
          attributes: { novalidate: '', style: 'display: flex; flex-direction: column; gap: 1rem;' },
          children: elements,
        },
      ],
      title: options?.title,
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }

  /**
   * Build a simple action bar from button descriptors.
   * Produces a horizontal `<div>` with `n-button` children.
   */
  static actions(
    buttons: readonly ButtonIntent[],
    options?: {
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    const buttonElements: ElementIntent[] = buttons.map((btn) => ({
      component: 'n-button',
      label: btn.label,
      attributes: {
        variant: btn.variant ?? 'default',
        ...(btn.intent ? { intent: btn.intent } : {}),
      },
      events: { 'native:press': btn.command },
    }));

    const intent: UIIntent = {
      type: 'action',
      elements: [
        {
          component: 'div',
          attributes: {
            style: 'display: flex; gap: 0.5rem; align-items: center;',
            role: 'toolbar',
          },
          children: buttonElements,
        },
      ],
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }

  /**
   * Build a content card with optional heading, body, media, and footer actions.
   * Produces a `<n-card>` with slotted children.
   */
  static card(
    card: CardIntent,
    options?: {
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    const children: ElementIntent[] = [];

    // Media slot (renders first in DOM → full-bleed top)
    if (card.media) {
      children.push({
        component: 'img',
        slot: 'media',
        attributes: {
          src: card.media.src,
          alt: card.media.alt,
          ...(card.media.height ? { style: `height: ${card.media.height}; object-fit: cover;` } : {}),
        },
      });
    }

    // Header slot
    if (card.heading) {
      children.push({
        component: 'div',
        slot: 'header',
        children: [{ component: 'span', label: card.heading }],
      });
    }

    // Body (default slot, no slot attribute)
    children.push({
      component: 'p',
      label: card.body,
    });

    // Footer slot with action buttons
    if (card.footer && card.footer.length > 0) {
      children.push({
        component: 'div',
        slot: 'footer',
        children: card.footer.map((btn) => ({
          component: 'n-button',
          label: btn.label,
          attributes: {
            variant: btn.variant ?? 'ghost',
            ...(btn.intent ? { intent: btn.intent } : {}),
          },
          events: { 'native:press': btn.command },
        })),
      });
    }

    const cardAttrs: Record<string, string> = {};
    if (card.interactive) cardAttrs['interactive'] = '';
    if (card.href) {
      cardAttrs['href'] = card.href;
      cardAttrs['interactive'] = '';
    }

    const intent: UIIntent = {
      type: 'display',
      elements: [
        {
          component: 'n-card',
          attributes: Object.keys(cardAttrs).length > 0 ? cardAttrs : undefined,
          children,
        },
      ],
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }

  /**
   * Build a confirmation/alert dialog.
   * Produces a `<n-dialog>` with a styled panel containing title, body, and action buttons.
   */
  static dialog(
    dialog: DialogIntent,
    options?: {
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    const actionButtons: ElementIntent[] = [];

    // Cancel button (optional)
    if (dialog.cancelLabel !== undefined || dialog.cancelCommand) {
      actionButtons.push({
        component: 'n-button',
        label: dialog.cancelLabel ?? 'Cancel',
        attributes: { variant: 'ghost' },
        events: dialog.cancelCommand ? { 'native:press': dialog.cancelCommand } : {},
      });
    }

    // Confirm button
    actionButtons.push({
      component: 'n-button',
      label: dialog.confirmLabel ?? 'Confirm',
      attributes: {
        variant: 'primary',
        intent: dialog.intent ?? 'accent',
      },
      events: { 'native:press': dialog.confirmCommand },
    });

    const intent: UIIntent = {
      type: 'composite',
      elements: [
        {
          component: 'n-dialog',
          children: [
            {
              component: 'div',
              attributes: {
                style: 'background: var(--n-body-neutral); border: 1px solid var(--n-border-muted-neutral); border-radius: 0.75rem; padding: 1.5rem; width: min(28rem, calc(100vw - 2rem));',
              },
              children: [
                { component: 'h3', label: dialog.title },
                { component: 'p', label: dialog.body, attributes: { style: 'margin-block: 1rem 1.5rem;' } },
                {
                  component: 'div',
                  attributes: { style: 'display: flex; gap: 0.5rem; justify-content: flex-end;' },
                  children: actionButtons,
                },
              ],
            },
          ],
        },
      ],
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }

  /**
   * Build a settings toggle list.
   * Produces a vertical list of `n-switch` elements with labels and optional descriptions.
   */
  static settings(
    settings: readonly SettingIntent[],
    options?: {
      title?: string;
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    const items: ElementIntent[] = settings.map((setting) => {
      const switchAttrs: Record<string, string> = { name: setting.name };
      if (setting.checked) switchAttrs['checked'] = '';

      const switchEl: ElementIntent = {
        component: 'n-switch',
        label: setting.label,
        attributes: switchAttrs,
        events: setting.command ? { 'native:change': setting.command } : undefined,
      };

      if (setting.description) {
        return {
          component: 'div',
          attributes: { style: 'display: flex; flex-direction: column; gap: 0.25rem;' },
          children: [
            switchEl,
            { component: 'p', label: setting.description, attributes: { style: 'font-size: 0.875em; color: var(--n-ink-muted-neutral); margin: 0; padding-inline-start: 2.5rem;' } },
          ],
        };
      }

      return switchEl;
    });

    const intent: UIIntent = {
      type: 'composite',
      title: options?.title,
      elements: [
        {
          component: 'div',
          attributes: { style: 'display: flex; flex-direction: column; gap: 1rem;' },
          children: items,
        },
      ],
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }

  /**
   * Build a tabbed interface.
   * Produces a `<n-tabs>` with `<n-tab>` triggers + `<n-tab-panels>` container.
   */
  static tabs(
    tabs: readonly TabIntent[],
    options?: {
      defaultValue?: string;
      orientation?: 'horizontal' | 'vertical';
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    const children: ElementIntent[] = [];

    // Tab triggers first
    for (const tab of tabs) {
      const tabAttrs: Record<string, string> = { value: tab.value };
      if (tab.disabled) tabAttrs['disabled'] = '';

      children.push({
        component: 'n-tab',
        label: tab.label,
        attributes: tabAttrs,
      });
    }

    // Tab panels wrapped in n-tab-panels container
    const panelChildren: ElementIntent[] = [];
    for (const tab of tabs) {
      panelChildren.push({
        component: 'n-tab-panel',
        attributes: { value: tab.value },
        children: [{ component: 'p', label: tab.content }],
      });
    }
    children.push({
      component: 'n-tab-panels',
      children: panelChildren,
    });

    const tabsAttrs: Record<string, string> = {};
    const defaultVal = options?.defaultValue ?? tabs[0]?.value;
    if (defaultVal) tabsAttrs['value'] = defaultVal;
    if (options?.orientation) tabsAttrs['orientation'] = options.orientation;

    const intent: UIIntent = {
      type: 'layout',
      elements: [
        {
          component: 'n-tabs',
          attributes: tabsAttrs,
          children,
        },
      ],
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }

  /**
   * Build a navigation list.
   * Produces a `<n-listbox>` with `<n-option>` items, optionally grouped with `<n-option-group>`.
   */
  static nav(
    items: readonly NavItemIntent[],
    options?: {
      title?: string;
      registry?: Map<string, ComponentRegistration>;
    },
  ): PlanResult {
    // Group items by their group field
    const grouped = new Map<string | undefined, NavItemIntent[]>();
    for (const item of items) {
      const key = item.group;
      let group = grouped.get(key);
      if (!group) {
        group = [];
        grouped.set(key, group);
      }
      group.push(item);
    }

    const listChildren: ElementIntent[] = [];

    for (const [groupName, groupItems] of grouped) {
      const optionElements: ElementIntent[] = groupItems.map((item) => {
        const optionChildren: ElementIntent[] = [];
        if (item.icon) {
          optionChildren.push({
            component: 'n-icon',
            attributes: { name: item.icon, slot: 'leading' },
          });
        }

        return {
          component: 'n-option',
          label: item.label,
          attributes: { value: item.value },
          children: optionChildren.length > 0 ? optionChildren : undefined,
        };
      });

      if (groupName) {
        // Wrap in n-option-group
        const headingChildren: ElementIntent[] = [];
        // Check if first item in group has icon — use it for the heading too
        const firstIcon = groupItems[0]?.icon;
        if (firstIcon) {
          headingChildren.push({
            component: 'n-icon',
            attributes: { name: firstIcon },
          });
        }

        listChildren.push({
          component: 'n-option-group',
          children: [
            {
              component: 'span',
              label: groupName,
              slot: 'heading',
              children: headingChildren.length > 0 ? headingChildren : undefined,
            },
            ...optionElements,
          ],
        });
      } else {
        // Ungrouped items go directly
        listChildren.push(...optionElements);
      }
    }

    const intent: UIIntent = {
      type: 'layout',
      title: options?.title,
      elements: [
        {
          component: 'n-listbox',
          attributes: { 'aria-label': options?.title ?? 'Navigation' },
          children: listChildren,
        },
      ],
    };

    const planner = new Planner(options?.registry);
    return planner.generate(intent);
  }
}

// ── Factory ──

export function createPlanner(registry?: Map<string, ComponentRegistration>): Planner {
  return new Planner(registry);
}
