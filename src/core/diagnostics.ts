/**
 * Diagnostics helper — read-only health checks for integration debugging.
 *
 * @example
 *   import { getNativeDiagnostics } from '@nonoun/native-ui';
 *   const report = getNativeDiagnostics();
 *   console.log(report.missingDefinitions); // ['n-gripper']
 *   console.log(report.tokenBaseline);      // true
 */

/** All custom element tags that `@nonoun/native-ui/register` defines. */
const CORE_TAGS = [
  'n-button', 'n-input', 'n-listbox', 'n-option', 'n-option-group', 'n-option-group-header',
  'n-select', 'n-combobox', 'n-command', 'n-command-input', 'n-command-list',
  'n-command-group', 'n-command-item', 'n-command-empty',
  'n-checkbox', 'n-switch', 'n-radio', 'n-radio-group',
  'n-segmented-control', 'n-segment', 'n-tooltip',
  'n-accordion', 'n-accordion-item', 'n-dialog',
  'n-tabs', 'n-tab', 'n-tab-panel', 'n-tab-panels',
  'n-table', 'n-table-head', 'n-table-body', 'n-table-row', 'n-table-header', 'n-table-cell',
  'n-calendar', 'n-field', 'n-textarea', 'n-range', 'n-input-otp',
  'n-avatar', 'n-badge', 'n-kbd',
  'n-breadcrumb', 'n-breadcrumb-item',
  'n-pagination', 'n-pagination-dots',
  'n-drawer', 'n-tree', 'n-tree-item',
  'n-slideshow', 'n-slide', 'n-controller', 'n-gripper',
  'n-card', 'n-section', 'n-toolbar', 'n-icon',
];

export interface DiagnosticsReport {
  /** Tags that are expected but not yet defined via `customElements.get()`. */
  missingDefinitions: string[];
  /** Tags that ARE defined. */
  definedTags: string[];
  /** Whether the CSS token baseline appears loaded (checks for `--n-size` on `:root`). */
  tokenBaseline: boolean;
  /** Whether foundation CSS appears active (checks for `--n-color-accent-500` on `:root`). */
  foundationCss: boolean;
}

export interface DiagnosticsOptions {
  /** Additional tags to check beyond the core set. */
  extraTags?: string[];
}

/**
 * Returns a read-only diagnostics report. Side-effect free.
 */
export function getNativeDiagnostics(options?: DiagnosticsOptions): DiagnosticsReport {
  const tags = [...CORE_TAGS, ...(options?.extraTags ?? [])];
  const defined: string[] = [];
  const missing: string[] = [];

  for (const tag of tags) {
    if (customElements.get(tag)) defined.push(tag);
    else missing.push(tag);
  }

  const rootStyles = getComputedStyle(document.documentElement);
  const tokenBaseline = rootStyles.getPropertyValue('--n-size').trim() !== '';
  const foundationCss = rootStyles.getPropertyValue('--n-color-accent-500').trim() !== '';

  return {
    missingDefinitions: missing,
    definedTags: defined,
    tokenBaseline,
    foundationCss,
  };
}
