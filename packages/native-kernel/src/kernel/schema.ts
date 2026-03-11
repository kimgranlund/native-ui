import type {
  UINode,
  UIPlan,
  ValidationResult,
  ValidationError,
  ComponentRegistration,
} from './types.ts';

const FORBIDDEN_TAGS = new Set([
  'script', 'style', 'link', 'iframe', 'object', 'embed', 'base', 'meta',
]);

// Standard HTML tags that don't need registry registration
const HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo',
  'blockquote', 'br', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'header', 'hgroup', 'hr', 'i', 'img', 'ins', 'kbd', 'label',
  'legend', 'li', 'main', 'map', 'mark', 'menu', 'nav', 'ol', 'optgroup',
  'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's',
  'samp', 'search', 'section', 'small', 'source', 'span', 'strong', 'sub',
  'summary', 'sup', 'table', 'tbody', 'td', 'template', 'tfoot', 'th', 'thead',
  'time', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
]);

const MAX_DEPTH = 20;

export function validatePlan(
  plan: UIPlan,
  registry: Map<string, ComponentRegistration>,
  options?: { allowUnregistered?: boolean },
): ValidationResult {
  const errors: ValidationError[] = [];
  const ids = new Set<string>();

  validateNodeRecursive(plan.root, registry, 'root', errors, ids, 0, options?.allowUnregistered ?? false);

  return { valid: errors.length === 0, errors };
}

export function validateNode(
  node: UINode,
  registry: Map<string, ComponentRegistration>,
  path = 'root',
): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set<string>();
  validateNodeRecursive(node, registry, path, errors, ids, 0, false);
  return errors;
}

function validateNodeRecursive(
  node: UINode,
  registry: Map<string, ComponentRegistration>,
  path: string,
  errors: ValidationError[],
  ids: Set<string>,
  depth: number,
  allowUnregistered: boolean,
): void {
  // Depth check
  if (depth > MAX_DEPTH) {
    errors.push({
      path,
      code: 'max_depth_exceeded',
      message: `Nesting depth exceeds maximum of ${MAX_DEPTH}`,
    });
    return;
  }

  // ID uniqueness
  if (ids.has(node.id)) {
    errors.push({
      path,
      code: 'duplicate_id',
      message: `Duplicate node ID: "${node.id}"`,
    });
  }
  ids.add(node.id);

  // Forbidden tags
  const tagLower = node.tag.toLowerCase();
  if (FORBIDDEN_TAGS.has(tagLower)) {
    errors.push({
      path,
      code: 'forbidden_tag',
      message: `Tag "${node.tag}" is not allowed`,
    });
  }

  // Tag must be known (HTML or registered custom element)
  if (!allowUnregistered) {
    const isHtml = HTML_TAGS.has(tagLower);
    const isRegistered = registry.has(tagLower);
    // Custom elements must contain a hyphen
    const isCustom = tagLower.includes('-');

    if (!isHtml && !isRegistered && isCustom) {
      errors.push({
        path,
        code: 'unknown_tag',
        message: `Custom element "${node.tag}" is not registered in the kernel`,
      });
    }
  }

  // Attribute values must be strings
  if (node.attributes) {
    for (const [key, val] of Object.entries(node.attributes)) {
      if (typeof val !== 'string') {
        errors.push({
          path: `${path}.attributes.${key}`,
          code: 'invalid_attribute_type',
          message: `Attribute "${key}" must be a string, got ${typeof val}`,
        });
      }
    }
  }

  // Recurse children
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      validateNodeRecursive(
        node.children[i]!,
        registry,
        `${path}.children[${i}]`,
        errors,
        ids,
        depth + 1,
        allowUnregistered,
      );
    }
  }
}
