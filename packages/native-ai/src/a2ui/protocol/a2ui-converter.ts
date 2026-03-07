/**
 * A2UI Converter
 *
 * Bidirectional conversion between A2UI flat adjacency lists
 * and native-ui nested UINode trees.
 */

import { uid } from '@nonoun/native-ui';
import type { UINode, UIPlan, CommandSource } from './kernel-bridge.ts';
import type { A2UIComponent, A2UIDataBinding, A2UIProtocolVersion } from './a2ui-types.ts';
import { isDataBinding } from './a2ui-types.ts';
import {
  resolveNativeTag,
  resolveA2UIType,
  textVariantTag,
  textFieldInputType,
  dateTimeInputType,
} from './a2ui-component-map.ts';

// ── Conversion Result ──

export interface ConversionResult {
  readonly root: UINode;
  readonly bindings: ReadonlyMap<string, readonly DataBindingEntry[]>;
  readonly warnings: readonly string[];
  readonly orphans: readonly string[];
}

export interface DataBindingEntry {
  readonly property: string;
  readonly path: string;
}

// ── Options ──

export interface ToUINodeOptions {
  readonly rootId?: string;
  readonly surfaceId?: string;
  readonly version?: A2UIProtocolVersion;
}

export interface ToA2UIOptions {
  readonly surfaceId?: string;
  readonly version?: A2UIProtocolVersion;
}

// ── Known A2UI component properties (not to be treated as attributes) ──

const KNOWN_PROPS = new Set([
  'id', 'component', 'children', 'child', 'text', 'label', 'variant',
  'disabled', 'action', 'accessibility', 'value', 'placeholder',
  'min', 'max', 'step', 'url', 'src', 'alt', 'name', 'fit',
  'justify', 'align', 'weight', 'direction',
  'enableDate', 'enableTime', 'options', 'filterable', 'displayStyle',
  'validationRegexp', 'checks', 'trigger', 'content', 'tabs', 'poster',
]);

// ── Flat → Tree: a2uiToUINode ──

export function a2uiToUINode(
  components: readonly A2UIComponent[],
  options?: ToUINodeOptions,
): ConversionResult {
  if (components.length === 0) {
    return {
      root: { id: 'empty-root', tag: 'div' },
      bindings: new Map(),
      warnings: ['No components provided'],
      orphans: [],
    };
  }

  // 1. Build index
  const index = new Map<string, A2UIComponent>();
  for (const c of components) {
    index.set(c.id, c);
  }

  // 2. Find root
  const referencedIds = new Set<string>();
  for (const c of components) {
    if (c.children) {
      for (const childId of c.children) referencedIds.add(childId);
    }
    if (c.child) referencedIds.add(c.child);
  }

  let rootId = options?.rootId;
  if (!rootId) {
    // Find component whose ID is not referenced by any other
    const candidates = components.filter((c) => !referencedIds.has(c.id));
    // Prefer 'root' ID if it exists among candidates
    const rootCandidate = candidates.find((c) => c.id === 'root') ?? candidates[0];
    rootId = rootCandidate?.id;
  }

  if (!rootId || !index.has(rootId)) {
    return {
      root: { id: 'error-root', tag: 'div', textContent: 'Error: no root component found' },
      bindings: new Map(),
      warnings: ['No root component found'],
      orphans: [],
    };
  }

  // 3. Recursive resolve
  const visited = new Set<string>();
  const bindings = new Map<string, DataBindingEntry[]>();
  const warnings: string[] = [];
  const surfaceId = options?.surfaceId ?? 'default';

  const root = resolveComponent(rootId, index, visited, bindings, warnings, surfaceId);

  // 4. Detect orphans
  const orphans = components
    .filter((c) => !visited.has(c.id))
    .map((c) => c.id);

  if (orphans.length > 0) {
    warnings.push(`Orphan components not reachable from root: ${orphans.join(', ')}`);
  }

  return { root, bindings, warnings, orphans };
}

function resolveComponent(
  id: string,
  index: Map<string, A2UIComponent>,
  visited: Set<string>,
  bindings: Map<string, DataBindingEntry[]>,
  warnings: string[],
  surfaceId: string,
): UINode {
  // Cycle detection
  if (visited.has(id)) {
    warnings.push(`Cycle detected at component "${id}"`);
    return { id: `${id}-cycle`, tag: 'div', textContent: `[Cycle: ${id}]` };
  }
  visited.add(id);

  const comp = index.get(id);
  if (!comp) {
    warnings.push(`Component "${id}" referenced but not found`);
    return { id, tag: 'div', textContent: `[Missing: ${id}]` };
  }

  const mapping = resolveNativeTag(comp.component);
  if (!mapping) {
    warnings.push(`Unknown A2UI type "${comp.component}" for component "${id}"`);
    return {
      id,
      tag: 'div',
      textContent: comp.text ?? `[Unknown: ${comp.component}]`,
    };
  }

  // Determine tag (special case for Text with heading variants)
  let tag = mapping.nativeTag;
  if (comp.component === 'Text' && comp.variant) {
    tag = textVariantTag(comp.variant as string);
  }

  // Build attributes
  const attributes: Record<string, string> = {};

  // Stamp A2UI type for CSS targeting
  attributes['data-a2ui'] = comp.component;

  // Apply default attributes
  if (mapping.defaultAttributes) {
    Object.assign(attributes, mapping.defaultAttributes);
  }

  // Map variant
  if (comp.variant && mapping.variantMap) {
    const mapped = mapping.variantMap[comp.variant as string];
    if (mapped) attributes.variant = mapped;
  } else if (comp.variant && comp.component !== 'Text') {
    // Pass variant through as-is if no mapping
    attributes.variant = comp.variant as string;
  }

  // Map known properties to attributes
  if (mapping.propertyMap) {
    for (const [a2uiProp, nativeProp] of Object.entries(mapping.propertyMap)) {
      const val = comp[a2uiProp];
      if (val !== undefined) {
        if (isDataBinding(val)) {
          // Collect binding, don't set attribute
          let entries = bindings.get(id);
          if (!entries) { entries = []; bindings.set(id, entries); }
          entries.push({ property: nativeProp, path: (val as A2UIDataBinding).path });
        } else {
          attributes[nativeProp] = String(val);
        }
      }
    }
  }

  // Handle disabled
  if (comp.disabled) {
    attributes.disabled = '';
  }

  // Handle accessibility
  if (comp.accessibility?.label) {
    attributes['aria-label'] = comp.accessibility.label;
  }

  // Handle TextField-specific: map variant to input type
  if (comp.component === 'TextField') {
    const inputType = textFieldInputType(comp.variant as string | undefined);
    if (inputType !== 'text') attributes.type = inputType;
  }

  // Handle DateTimeInput: map enableDate/enableTime to input type
  if (comp.component === 'DateTimeInput') {
    const inputType = dateTimeInputType(
      comp.enableDate as boolean | undefined,
      comp.enableTime as boolean | undefined,
    );
    attributes.type = inputType;
  }

  // Handle label for TextField/DateTimeInput → aria-label
  if ((comp.component === 'TextField' || comp.component === 'DateTimeInput' || comp.component === 'Slider') && comp.label) {
    if (isDataBinding(comp.label)) {
      let entries = bindings.get(id);
      if (!entries) { entries = []; bindings.set(id, entries); }
      entries.push({ property: 'aria-label', path: (comp.label as unknown as A2UIDataBinding).path });
    } else {
      attributes['aria-label'] = comp.label as string;
    }
  }

  // Handle Slider attributes
  if (comp.component === 'Slider') {
    if (comp.min !== undefined) attributes.min = String(comp.min);
    if (comp.max !== undefined) attributes.max = String(comp.max);
  }

  // Handle Progress: convert value/max to --n-progress CSS custom property
  if (comp.component === 'Progress') {
    const val = parseFloat(attributes.value ?? '0');
    const max = parseFloat(attributes.max ?? '100');
    const ratio = max > 0 ? Math.min(1, Math.max(0, val / max)) : 0;
    attributes.style = `--n-progress: ${ratio}`;
    // Keep value/max as data attributes for round-tripping
    if (attributes.value) { attributes['data-value'] = attributes.value; delete attributes.value; }
    if (attributes.max) { attributes['data-max'] = attributes.max; delete attributes.max; }
  }

  // Collect data bindings from text
  let textContent: string | undefined;
  if (comp.text !== undefined) {
    if (isDataBinding(comp.text)) {
      let entries = bindings.get(id);
      if (!entries) { entries = []; bindings.set(id, entries); }
      entries.push({ property: 'textContent', path: (comp.text as unknown as A2UIDataBinding).path });
    } else {
      textContent = comp.text as string;
    }
  }

  // Handle extra properties (not in KNOWN_PROPS) as attributes
  for (const [key, val] of Object.entries(comp)) {
    if (KNOWN_PROPS.has(key)) continue;
    if (typeof val === 'string') {
      attributes[key] = val;
    }
  }

  // Build events from action
  let events: Record<string, string> | undefined;
  if (comp.action?.event && mapping.actionEvent) {
    events = {
      [mapping.actionEvent]: `a2ui:${surfaceId}:${id}:${comp.action.event.name}`,
    };
  }

  // Build children
  let children: UINode[] | undefined;
  const childIds = comp.children ?? (comp.child ? [comp.child] : undefined);

  // Tabs: convert children into ui-tab triggers + ui-tab-panels container
  if (comp.component === 'Tabs' && childIds && childIds.length > 0) {
    children = [];
    const panelNodes: UINode[] = [];
    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i];
      const child = index.get(childId);
      if (!child) continue;
      visited.add(childId);

      const tabValue = String(child.value ?? child.id ?? `tab-${i}`);
      const tabLabel = String(child.label ?? child.text ?? `Tab ${i + 1}`);

      // Create <n-tab value="...">Label</n-tab>
      children.push({
        id: `${childId}-tab`,
        tag: 'n-tab',
        attributes: { value: tabValue },
        textContent: tabLabel,
      });

      // Create <n-tab-panel value="...">content</n-tab-panel>
      // Recursively resolve the child's own children for the panel content
      const panelChildIds = child.children ?? (child.child ? [child.child] : undefined);
      const panelChildren = panelChildIds
        ? panelChildIds.map((pid) => resolveComponent(pid, index, visited, bindings, warnings, surfaceId))
        : undefined;

      const panelText = typeof child.text === 'string' ? child.text : undefined;

      panelNodes.push({
        id: `${childId}-panel`,
        tag: 'n-tab-panel',
        attributes: { value: tabValue },
        ...(panelChildren && panelChildren.length > 0 ? { children: panelChildren } : {}),
        ...(panelText && !panelChildren ? { textContent: panelText } : {}),
      });
    }
    // Wrap panels in ui-tab-panels container
    children.push({
      id: `${id}-panels`,
      tag: 'n-tab-panels',
      children: panelNodes,
    });
    // Auto-select first tab
    if (!attributes.value && childIds.length > 0) {
      const first = index.get(childIds[0]);
      attributes.value = String(first?.value ?? first?.id ?? 'tab-0');
    }
  }

  // Select/ChoicePicker: convert to data-driven `options` attribute
  else if (comp.component === 'Select' || comp.component === 'ChoicePicker') {
    // Option A: inline options array (strings or objects)
    if (Array.isArray(comp.options) && comp.options.length > 0) {
      const selectOptions = (comp.options as unknown[]).map(o =>
        typeof o === 'string'
          ? { value: o, label: o }
          : o as { value: string; label: string; disabled?: boolean },
      );
      attributes.options = JSON.stringify(selectOptions);
      if (comp.label) attributes.placeholder = String(comp.label);
    }
    // Option B: ListItem children
    else if (childIds && childIds.length > 0) {
      const selectOptions: { value: string; label: string; disabled?: boolean }[] = [];
      for (const childId of childIds) {
        const child = index.get(childId);
        if (child && child.component === 'ListItem') {
          visited.add(childId);
          selectOptions.push({
            value: String(child.value ?? ''),
            label: String(child.label ?? child.text ?? ''),
            ...(child.disabled ? { disabled: true } : {}),
          });
        }
      }
      if (selectOptions.length > 0) {
        attributes.options = JSON.stringify(selectOptions);
        if (comp.label) attributes.placeholder = String(comp.label);
      }
    }
  } else if (childIds && childIds.length > 0) {
    children = childIds.map((childId) =>
      resolveComponent(childId, index, visited, bindings, warnings, surfaceId),
    );
  }

  // Handle child strategy
  if (mapping.childStrategy === 'slot-label' && textContent && !children) {
    // Create a slot label child (e.g., for ui-button)
    children = [{
      id: `${id}-label`,
      tag: 'span',
      attributes: { slot: 'label' },
      textContent,
    }];
    textContent = undefined;
  } else if (mapping.childStrategy === 'textContent' && comp.label && !textContent) {
    // Use label as textContent for components like CheckBox, Switch
    if (isDataBinding(comp.label)) {
      let entries = bindings.get(id);
      if (!entries) { entries = []; bindings.set(id, entries); }
      entries.push({ property: 'textContent', path: (comp.label as unknown as A2UIDataBinding).path });
    } else {
      textContent = comp.label as string;
    }
  }

  // Handle ListItem value
  if (comp.component === 'ListItem' && comp.value !== undefined) {
    attributes.value = String(comp.value);
  }

  // Handle media wrapper elements (n-picture, n-video, n-audio)
  // These are CSS containers — create an inner native element as a child
  if (comp.component === 'Image' || comp.component === 'Video' || comp.component === 'AudioPlayer') {
    const innerTag = comp.component === 'Image' ? 'img'
      : comp.component === 'Video' ? 'video'
      : 'audio';
    const innerAttrs: Record<string, string> = {};
    if (innerTag !== 'img') innerAttrs.controls = '';

    // Move media-specific attributes from the wrapper to the inner element
    const mediaProps = ['src', 'alt', 'poster'];
    for (const prop of mediaProps) {
      if (attributes[prop]) {
        innerAttrs[prop] = attributes[prop];
        delete attributes[prop];
      }
    }

    // Handle Image url → src (may also be set via propertyMap above)
    if (comp.component === 'Image' && comp.url !== undefined) {
      if (isDataBinding(comp.url)) {
        // Bind to inner element — use wrapper id + '-inner' for targeting
        let entries = bindings.get(`${id}-inner`);
        if (!entries) { entries = []; bindings.set(`${id}-inner`, entries); }
        entries.push({ property: 'src', path: (comp.url as unknown as A2UIDataBinding).path });
      } else {
        innerAttrs.src = comp.url as string;
      }
      if (comp.alt) innerAttrs.alt = comp.alt as string;
    }

    children = [{
      id: `${id}-inner`,
      tag: innerTag,
      ...(Object.keys(innerAttrs).length > 0 ? { attributes: innerAttrs } : {}),
    }];
  }

  // Clean up empty attributes
  const cleanAttrs = Object.keys(attributes).length > 0 ? attributes : undefined;

  const node: UINode = {
    id,
    tag,
    ...(cleanAttrs ? { attributes: cleanAttrs } : {}),
    ...(textContent !== undefined ? { textContent } : {}),
    ...(children && children.length > 0 ? { children } : {}),
    ...(events ? { events } : {}),
  };

  return node;
}

// ── Tree → Flat: uiNodeToA2UI ──

export function uiNodeToA2UI(
  root: UINode,
  options?: ToA2UIOptions,
): readonly A2UIComponent[] {
  const components: A2UIComponent[] = [];
  flattenNode(root, components, options?.surfaceId ?? 'default');
  return components;
}

function flattenNode(
  node: UINode,
  components: A2UIComponent[],
  surfaceId: string,
): void {
  const a2uiType = resolveA2UIType(node.tag, node.attributes as Record<string, string> | undefined);
  if (!a2uiType) {
    // Unknown tag — emit as generic Column wrapper
    const comp: A2UIComponent = {
      id: node.id,
      component: 'Column',
      ...(node.children ? { children: node.children.map((c) => c.id) } : {}),
      ...(node.textContent ? { text: node.textContent } : {}),
    };
    components.push(comp);

    if (node.children) {
      for (const child of node.children) {
        flattenNode(child, components, surfaceId);
      }
    }
    return;
  }

  const mapping = resolveNativeTag(a2uiType);
  const comp: Record<string, unknown> = {
    id: node.id,
    component: a2uiType,
  };

  // Map children IDs
  if (node.children && node.children.length > 0) {
    // Media wrappers: absorb inner <img>/<video>/<audio> — extract src/alt from inner element
    if (
      (a2uiType === 'Image' || a2uiType === 'Video' || a2uiType === 'AudioPlayer') &&
      node.children.length === 1 &&
      (node.children[0].tag === 'img' || node.children[0].tag === 'video' || node.children[0].tag === 'audio')
    ) {
      const inner = node.children[0];
      if (inner.attributes?.src) comp.url = inner.attributes.src;
      if (inner.attributes?.alt) comp.alt = inner.attributes.alt;
      if (inner.attributes?.poster) comp.poster = inner.attributes.poster;
      // Don't recurse — inner media element is absorbed
    }
    // Check if there's a single slot-label child that should become text
    else if (
      mapping?.childStrategy === 'slot-label' &&
      node.children.length === 1 &&
      node.children[0].attributes?.slot === 'label' &&
      node.children[0].textContent
    ) {
      comp.text = node.children[0].textContent;
      // Don't recurse — the label child is absorbed
    } else {
      comp.children = node.children.map((c) => c.id);
      for (const child of node.children) {
        flattenNode(child, components, surfaceId);
      }
    }
  }

  // Map text content
  if (node.textContent) {
    if (a2uiType === 'CheckBox' || a2uiType === 'Switch' || a2uiType === 'ListItem') {
      comp.label = node.textContent;
    } else {
      comp.text = node.textContent;
    }
  }

  // Map attributes back to A2UI properties
  if (node.attributes) {
    const reversePropertyMap = mapping?.propertyMap
      ? invertMap(mapping.propertyMap)
      : {};

    for (const [attr, val] of Object.entries(node.attributes)) {
      // Skip internal/structural attributes
      if (attr === 'style' || attr === 'data-a2ui' || attr === 'slot') continue;

      if (reversePropertyMap[attr]) {
        comp[reversePropertyMap[attr]] = val;
      } else if (attr === 'aria-label') {
        comp.label = val;
      } else if (attr === 'disabled' && val === '') {
        comp.disabled = true;
      } else if (attr === 'variant') {
        // Reverse-map variant value
        const reverseVariantMap = mapping?.variantMap
          ? invertMap(mapping.variantMap)
          : {};
        comp.variant = reverseVariantMap[val] ?? val;
      }
    }
  }

  // Map events back to actions
  if (node.events) {
    for (const [_eventName, commandType] of Object.entries(node.events)) {
      const parts = commandType.split(':');
      if (parts[0] === 'a2ui' && parts.length >= 4) {
        comp.action = { event: { name: parts[3] } };
      }
    }
  }

  components.push(comp as A2UIComponent);
}

function invertMap(map: Readonly<Record<string, string>>): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    inv[v] = k;
  }
  return inv;
}

// ── Plan Helpers ──

/**
 * Wrap a conversion result as a UIPlan.
 */
export function conversionToPlan(
  result: ConversionResult,
  source: CommandSource = 'generated',
): UIPlan {
  return Object.freeze({
    id: uid('a2ui-plan'),
    version: 1,
    root: result.root,
    source,
    timestamp: Date.now(),
  });
}
