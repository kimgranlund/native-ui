// Protocol
export {
  A2UIAdapter, createA2UIAdapter,
  SurfaceManager, createSurfaceManager, resolveJsonPointer, setJsonPointer,
  a2uiToUINode, uiNodeToA2UI, conversionToPlan,
  resolveNativeTag, resolveA2UIType, COMPONENT_MAP, getSupportedTypes, textVariantTag, textFieldInputType, dateTimeInputType,
  isDataBinding, isCreateSurface, isUpdateComponents, isUpdateDataModel,
  isDeleteSurface, isCatalogRequest, isCatalogResponse,
  isActionMessage, isErrorMessage, parseServerMessage,
  WebSocketTransport, SSETransport, createWebSocketTransport, createSSETransport,
} from './protocol/index.ts';

export type {
  A2UIAdapterOptions, SurfaceState,
  ConversionResult, DataBindingEntry, ToUINodeOptions, ToA2UIOptions,
  ComponentMapping, ChildStrategy,
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
