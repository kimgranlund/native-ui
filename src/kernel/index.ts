// Kernel
export { Kernel, getKernel, resetKernel } from './kernel.ts';

// Command system
export { CommandBus, createCommandBus } from './command-bus.ts';
export { CommandHistory, createCommandHistory } from './command-history.ts';

// Overlay
export { OverlayManager, createOverlayManager } from './overlay-manager.ts';
export type { OverlayHandle } from './overlay-manager.ts';

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

// Plugin system
export { PluginRegistry } from '@nonoun/native-core';
export type { PluginFactory } from '@nonoun/native-core';

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
