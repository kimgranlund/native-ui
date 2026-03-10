// Protocol
export {
  A2UIAdapter, createA2UIAdapter,
  SurfaceManager, createSurfaceManager, resolveJsonPointer, setJsonPointer,
  a2uiToUINode, uiNodeToA2UI, conversionToPlan,
  ComponentRegistry, defaultRegistry,
  resolveNativeTag, resolveA2UIType, COMPONENT_MAP, getSupportedTypes, getComponentCategory, getCompatibleTypes, textVariantTag, textFieldInputType, dateTimeInputType,
  CompositionRegistry, defaultCompositionRegistry, COMPOSITION_MAP, resolveComponent,
  isDataBinding, isCreateSurface, isUpdateComponents, isUpdateDataModel,
  isDeleteSurface, isCatalogRequest, isCatalogResponse,
  isActionMessage, isErrorMessage, parseServerMessage,
  WebSocketTransport, SSETransport, createWebSocketTransport, createSSETransport,
} from './protocol/index.ts';

export type {
  A2UIAdapterOptions, SurfaceState,
  ConversionResult, DataBindingEntry, ToUINodeOptions, ToA2UIOptions,
  ComponentMapping, ChildStrategy, RegistrySnapshot, EventSpec, PropertySpec, MethodSpec,
  CompositionSpec, CompositionTemplate, TemplateNode, PropDelegation, StateProjection, EventBubble, CompositionGap,
  A2UIProtocolVersion, A2UIServerMessage, A2UICreateSurface, A2UIUpdateComponents,
  A2UIUpdateDataModel, A2UIDeleteSurface, A2UICatalogRequest, A2UICatalogResponse,
  A2UIClientMessage, A2UIActionMessage, A2UIErrorMessage,
  A2UIComponent, A2UIComponentAction, A2UIDataBinding, A2UIStandardType,
  TransportState, TransportEvents, WebSocketTransportOptions, SSETransportOptions,
} from './protocol/index.ts';

// Bridge types (for consumers who need to type kernel integration)
export type {
  A2UIKernelBridge,
  UINode, UIPlan, PatchOp, UIPatch, PlanResult,
  CommandSource, Command, CommandFilter, CommandHandler,
} from './protocol/kernel-bridge.ts';

// Plugin installer
export { installA2UI } from './install.ts';

// Workbench element
export { NA2UI } from './a2ui-element.ts';

// Session management
export {
  NSessionManager,
  NAgentSession,
  NSurfaceRegistry,
  NEventEmitter,
  NCatalog,
  buildCatalogFromRegistry,
} from './session/index.ts';

export type {
  NAgentSessionConfig,
  NCatalogEntry,
  NSessionConfig,
  NSessionStatus,
  NInteractionEvent,
  NSurfaceState,
} from './session/index.ts';

// Adapters
export type { NAdapter, NAdapterConfig } from './adapters/index.ts';
export { DirectAdapter } from './adapters/index.ts';
export type { DirectAdapterOptions } from './adapters/index.ts';
export { A2AAdapter } from './adapters/index.ts';
export type { A2AAdapterOptions, A2ATaskRequest } from './adapters/index.ts';
export { AGUIAdapter } from './adapters/index.ts';
export type { AGUIAdapterOptions } from './adapters/index.ts';
