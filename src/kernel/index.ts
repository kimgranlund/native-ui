// Kernel
export { Kernel, getKernel, resetKernel } from './kernel.ts';

// Command system
export { CommandBus, createCommandBus } from './command-bus.ts';
export { CommandHistory, createCommandHistory } from './command-history.ts';

// Overlay
export { OverlayManager, createOverlayManager } from './overlay-manager.ts';

// Focus
export { FocusRouter, createFocusRouter } from './focus-router.ts';

// Schema + Executor
export { validatePlan, validateNode } from './schema.ts';
export { PlanExecutor, createPlanExecutor } from './executor.ts';

// Patch Protocol
export { applyPatch } from './patch.ts';
export type { PatchOp, UIPatch, PatchResult, PatchError } from './patch.ts';

// Accessibility
export { validateAccessibility, auditDOM } from './accessibility.ts';
export type { A11yViolation, A11yResult } from './accessibility.ts';

// Observability
export { EventLog, createEventLog, PerfMetrics, createPerfMetrics } from './observability.ts';
export type { LogEntry, LogFilter, PerfSample } from './observability.ts';

// Data Runtime
export { DataStore, createDataStore, HttpError, createBinding } from './data-runtime.ts';
export type { DataBinding, CacheEntry } from './data-runtime.ts';

// Workflow Engine
export { WorkflowEngine, createWorkflowEngine } from './workflow.ts';
export type {
  WorkflowState,
  WorkflowTransition,
  WorkflowDefinition,
  WorkflowContext,
  TransitionRecord,
  WorkflowSnapshot,
  TransitionExplanation,
} from './workflow.ts';

// Policy & Capability
export { PolicyEngine, createPolicyEngine } from './policy.ts';
export type {
  Capability,
  CapabilityScope,
  PolicyEffect,
  PolicyRule,
  PolicyCondition,
  RateLimit,
  PolicyDecision,
} from './policy.ts';

// Component Integration
export {
  COMPONENT_MANIFEST,
  getDescriptor,
  getDescriptorsByCategory,
  registerAll,
  installEventBridge,
} from './components.ts';
export type { ComponentDescriptor } from './components.ts';

// Data Binding
export { BindingManager, createBindingManager } from './data-binding.ts';
export type { NodeBinding, ActiveBinding } from './data-binding.ts';

// Workflow Templates
export {
  formWizard,
  confirmFlow,
  crudLifecycle,
  authFlow,
  toggleFlow,
} from './workflow-templates.ts';

// Schema Catalog
export {
  SCHEMA_CATALOG,
  getSchema,
  getSchemasForCategory,
  getSchemaAttribute,
} from './schema-catalog.ts';
export type {
  ComponentSchema,
  AttributeSchema,
  PropertySchema,
  SlotSchema,
  EventSchema,
  AriaRequirements,
} from './schema-catalog.ts';

// GenUI Planner
export { Planner, createPlanner } from './planner.ts';
export type {
  UIIntent,
  ElementIntent,
  PlanResult,
  FormFieldIntent,
  ButtonIntent,
  CardIntent,
  DialogIntent,
  SettingIntent,
  TabIntent,
  NavItemIntent,
} from './planner.ts';

// A2UI Protocol (re-exported from src/a2ui)
export {
  A2UIAdapter, createA2UIAdapter,
  SurfaceManager, createSurfaceManager, resolveJsonPointer, setJsonPointer,
  a2uiToUINode, uiNodeToA2UI, conversionToPlan,
  resolveNativeTag, resolveA2UIType, COMPONENT_MAP, getSupportedTypes, textVariantTag, textFieldInputType, dateTimeInputType,
  isDataBinding, isCreateSurface, isUpdateComponents, isUpdateDataModel, isDeleteSurface,
  isCatalogRequest, isCatalogResponse, isActionMessage, isErrorMessage, parseServerMessage,
  WebSocketTransport, SSETransport, createWebSocketTransport, createSSETransport,
} from '../a2ui/index.ts';
export type {
  A2UIAdapterOptions, SurfaceState,
  ConversionResult, DataBindingEntry, ToUINodeOptions, ToA2UIOptions,
  ComponentMapping, ChildStrategy,
  A2UIProtocolVersion, A2UIServerMessage, A2UICreateSurface, A2UIUpdateComponents,
  A2UIUpdateDataModel, A2UIDeleteSurface, A2UICatalogRequest, A2UICatalogResponse,
  A2UIClientMessage, A2UIActionMessage, A2UIErrorMessage,
  A2UIComponent, A2UIComponentAction, A2UIDataBinding, A2UIStandardType,
  TransportState, TransportEvents, WebSocketTransportOptions, SSETransportOptions,
} from '../a2ui/index.ts';

// Types
export type {
  Command,
  CommandSource,
  CommandMeta,
  CommandHandler,
  CommandMiddleware,
  CommandFilter,
  OverlayType,
  OverlayEntry,
  Shortcut,
  ShortcutMod,
  UINode,
  UIPlan,
  ValidationResult,
  ValidationError,
  ComponentRegistration,
  KernelOptions,
} from './types.ts';
