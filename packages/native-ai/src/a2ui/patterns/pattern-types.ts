/**
 * A2UI Pattern Library — Type Definitions
 *
 * Patterns are reusable UI composition templates that ground the AI generation
 * pipeline in proven, tested component arrangements. Two tiers:
 *
 * - **Blocks**: Larger compositions (5–15 components) — auth card, data table, settings form
 * - **Micro**: Atomic sub-patterns (2–5 components) — button pair, form field, metric tile
 *
 * The pattern catalog (pattern-catalog.json) is the System of Record index
 * consumed by the reasoning pipeline for concept matching.
 */

/** A2UI component reference within a pattern. */
export interface PatternComponent {
  /** Unique ID within the pattern (kebab-case). */
  id: string;
  /** A2UI component type (Button, TextField, Card, etc.). */
  component: string;
  /** Child component IDs (multi-child containers). */
  children?: string[];
  /** Single child ID (Body container). */
  child?: string;
  /** Static text content or placeholder. */
  text?: string;
  /** Component-specific properties. */
  properties?: Record<string, unknown>;
  /** Visual variant. */
  variant?: string;
  /** Color intent. */
  intent?: string;
  /** Size scale. */
  size?: string;
  /** Action event binding. */
  action?: { event: { name: string } };
  /** Slot assignment (e.g., "label", "leading", "trailing"). */
  slot?: string;
}

/** A complete pattern definition. */
export interface Pattern {
  /** Unique ID (kebab-case). Must match filename. */
  id: string;
  /** Human-readable name. */
  label: string;
  /** Pattern tier. */
  tier: 'block' | 'micro';
  /** Semantic concept keywords for pipeline matching. */
  concepts: string[];
  /** One-line description for the LLM reasoning context. */
  description: string;
  /** Category for organization. */
  category: PatternCategory;
  /** The A2UI component tree (flat adjacency list, same format as presets). */
  components: PatternComponent[];
  /** Recommended LLM temperature for regeneration (0.0–1.0). */
  temperature?: number;
  /** Optional scoped CSS (uses :scope for the root element). */
  css?: string;
  /** Optional JS behavior hints (event handler patterns). */
  js?: string;
  /** Trait controllers to apply (e.g., "validatable", "sortable"). */
  traits?: string[];
  /** IDs of micro patterns this block composes (blocks only). */
  composedOf?: string[];
}

/** Pattern categories for organization and filtering. */
export type PatternCategory =
  | 'auth'          // Authentication flows
  | 'form'          // Form layouts and inputs
  | 'commerce'      // E-commerce patterns
  | 'dashboard'     // Metrics, charts, analytics
  | 'content'       // Articles, media, text
  | 'data'          // Tables, lists, grids
  | 'navigation'    // Menus, breadcrumbs, tabs
  | 'communication' // Chat, comments, notifications
  | 'media'         // Video, audio, galleries
  | 'feedback'      // Alerts, toasts, empty states
  | 'overlay'       // Modals, dialogs, drawers
  | 'interactive'   // Games, polls, quizzes
  | 'admin'         // User management, CRUD
  | 'primitive';    // Atomic micro patterns (buttons, fields)

/** Catalog entry — lightweight reference for the LLM index. */
export interface CatalogEntry {
  id: string;
  label: string;
  tier: 'block' | 'micro';
  concepts: string[];
  description: string;
  category: PatternCategory;
  /** Number of components in the pattern. */
  componentCount: number;
  /** Which micro patterns this composes (blocks only). */
  composedOf?: string[];
}

/** The full catalog — System of Record for the reasoning pipeline. */
export interface PatternCatalog {
  /** Schema version for forward compatibility. */
  version: string;
  /** Total pattern count. */
  count: number;
  /** Category index — category → pattern IDs. */
  categories: Record<string, string[]>;
  /** All catalog entries. */
  patterns: CatalogEntry[];
}
