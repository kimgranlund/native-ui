// A2UI Protocol
export { A2UIAdapter, createA2UIAdapter } from './a2ui-adapter.ts';
export type { A2UIAdapterOptions } from './a2ui-adapter.ts';
export { SurfaceManager, createSurfaceManager, resolveJsonPointer, setJsonPointer } from './a2ui-surface.ts';
export type { SurfaceState } from './a2ui-surface.ts';
export { a2uiToUINode, uiNodeToA2UI, conversionToPlan } from './a2ui-converter.ts';
export type { ConversionResult, DataBindingEntry, ToUINodeOptions, ToA2UIOptions } from './a2ui-converter.ts';
export { ComponentRegistry, defaultRegistry, resolveNativeTag, resolveA2UIType, COMPONENT_MAP, getSupportedTypes, getComponentCategory, getCompatibleTypes, textVariantTag, textFieldInputType, dateTimeInputType } from './a2ui-component-map.ts';
export type { ComponentMapping, ChildStrategy, RegistrySnapshot, EventSpec, PropertySpec, MethodSpec } from './a2ui-component-map.ts';
export { CompositionRegistry, defaultCompositionRegistry, COMPOSITION_MAP, resolveComponent } from './a2ui-composition-map.ts';
export type { CompositionSpec, CompositionTemplate, TemplateNode, PropDelegation, StateProjection, EventBubble, CompositionGap } from './a2ui-composition-map.ts';
export {
  isDataBinding,
  isCreateSurface,
  isUpdateComponents,
  isUpdateDataModel,
  isDeleteSurface,
  isCatalogRequest,
  isCatalogResponse,
  isActionMessage,
  isErrorMessage,
  parseServerMessage,
} from './a2ui-types.ts';
export type {
  A2UIProtocolVersion,
  A2UIServerMessage,
  A2UICreateSurface,
  A2UIUpdateComponents,
  A2UIUpdateDataModel,
  A2UIDeleteSurface,
  A2UICatalogRequest,
  A2UICatalogResponse,
  A2UIClientMessage,
  A2UIActionMessage,
  A2UIErrorMessage,
  A2UIComponent,
  A2UIComponentAction,
  A2UIDataBinding,
  A2UIStandardType,
} from './a2ui-types.ts';

// A2UI Transport
export { WebSocketTransport, SSETransport, createWebSocketTransport, createSSETransport } from './a2ui-transport.ts';
export type { TransportState, TransportEvents, WebSocketTransportOptions, SSETransportOptions } from './a2ui-transport.ts';
