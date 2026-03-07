/**
 * A2UI Protocol — Wire Format Types
 *
 * Type definitions for Google's A2UI (Agent-to-UI) protocol.
 * Supports both v0.8 and v0.9 message formats.
 * No runtime code except type guard functions.
 */

// ── Protocol Version ──

export type A2UIProtocolVersion = '0.8' | '0.9';

// ── Server-to-Client Messages ──

export type A2UIServerMessage =
  | A2UICreateSurface
  | A2UIUpdateComponents
  | A2UIUpdateDataModel
  | A2UIDeleteSurface
  | A2UICatalogRequest;

export interface A2UICreateSurface {
  readonly createSurface: {
    readonly surfaceId: string;
    readonly catalogId?: string;
    readonly theme?: Readonly<Record<string, string>>;
  };
}

export interface A2UIUpdateComponents {
  readonly updateComponents: {
    readonly surfaceId: string;
    readonly components: readonly A2UIComponent[];
  };
}

export interface A2UIUpdateDataModel {
  readonly updateDataModel: {
    readonly surfaceId: string;
    readonly path?: string;
    readonly value?: unknown;
  };
}

export interface A2UIDeleteSurface {
  readonly deleteSurface: {
    readonly surfaceId: string;
  };
}

// ── Catalog Negotiation ──

export interface A2UICatalogRequest {
  readonly requestCatalog: {
    readonly surfaceId?: string;
  };
}

export interface A2UICatalogResponse {
  readonly catalog: {
    readonly surfaceId?: string;
    readonly supportedTypes: readonly string[];
    readonly version: string;
  };
}

// ── Client-to-Server Messages ──

export type A2UIClientMessage = A2UIActionMessage | A2UIErrorMessage | A2UICatalogResponse;

export interface A2UIActionMessage {
  readonly action: {
    readonly surfaceId: string;
    readonly sourceComponentId: string;
    readonly name: string;
    readonly timestamp: string;
    readonly context?: Readonly<Record<string, unknown>>;
  };
}

export interface A2UIErrorMessage {
  readonly error: {
    readonly surfaceId: string;
    readonly code: string;
    readonly message: string;
  };
}

// ── A2UI Component ──

export interface A2UIComponent {
  readonly id: string;
  readonly component: string;
  readonly children?: readonly string[];
  readonly child?: string;
  readonly text?: string;
  readonly label?: string;
  readonly variant?: string;
  readonly disabled?: boolean;
  readonly action?: A2UIComponentAction;
  readonly accessibility?: {
    readonly label?: string;
    readonly description?: string;
  };
  readonly [key: string]: unknown;
}

export interface A2UIComponentAction {
  readonly event: {
    readonly name: string;
    readonly context?: Readonly<Record<string, unknown>>;
  };
}

// ── Data Binding ──

export interface A2UIDataBinding {
  readonly path: string;
}

// ── Standard Catalog Types ──

export type A2UIStandardType =
  | 'Text'
  | 'Button'
  | 'TextField'
  | 'TextArea'
  | 'CheckBox'
  | 'Switch'
  | 'ChoicePicker'
  | 'Slider'
  | 'DateTimeInput'
  | 'Row'
  | 'Column'
  | 'Card'
  | 'Modal'
  | 'Tabs'
  | 'List'
  | 'ListItem'
  | 'Image'
  | 'Icon'
  | 'Divider'
  | 'Badge'
  | 'Avatar'
  | 'Select'
  | 'Video'
  | 'AudioPlayer';

// ── Type Guards ──

export function isDataBinding(value: unknown): value is A2UIDataBinding {
  return (
    value !== null &&
    typeof value === 'object' &&
    'path' in value &&
    typeof (value as A2UIDataBinding).path === 'string' &&
    Object.keys(value as object).length === 1
  );
}

export function isCreateSurface(msg: A2UIServerMessage): msg is A2UICreateSurface {
  return 'createSurface' in msg;
}

export function isUpdateComponents(msg: A2UIServerMessage): msg is A2UIUpdateComponents {
  return 'updateComponents' in msg;
}

export function isUpdateDataModel(msg: A2UIServerMessage): msg is A2UIUpdateDataModel {
  return 'updateDataModel' in msg;
}

export function isDeleteSurface(msg: A2UIServerMessage): msg is A2UIDeleteSurface {
  return 'deleteSurface' in msg;
}

export function isCatalogRequest(msg: A2UIServerMessage): msg is A2UICatalogRequest {
  return 'requestCatalog' in msg;
}

export function isActionMessage(msg: A2UIClientMessage): msg is A2UIActionMessage {
  return 'action' in msg;
}

export function isErrorMessage(msg: A2UIClientMessage): msg is A2UIErrorMessage {
  return 'error' in msg;
}

export function isCatalogResponse(msg: A2UIClientMessage): msg is A2UICatalogResponse {
  return 'catalog' in msg;
}

/**
 * Parse a raw JSON string into a typed A2UI server message.
 * Returns null if the JSON is not a valid A2UI message.
 */
export function parseServerMessage(json: string): A2UIServerMessage | null {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    if ('createSurface' in obj) return obj as unknown as A2UICreateSurface;
    if ('updateComponents' in obj) return obj as unknown as A2UIUpdateComponents;
    if ('updateDataModel' in obj) return obj as unknown as A2UIUpdateDataModel;
    if ('deleteSurface' in obj) return obj as unknown as A2UIDeleteSurface;
    if ('requestCatalog' in obj) return obj as unknown as A2UICatalogRequest;
    return null;
  } catch {
    return null;
  }
}
