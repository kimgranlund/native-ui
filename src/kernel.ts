// Kernel
export { Kernel, getKernel, resetKernel } from './kernel/index.ts';
export { CommandBus, createCommandBus } from './kernel/index.ts';
export { CommandHistory, createCommandHistory } from './kernel/index.ts';
export { OverlayManager, createOverlayManager } from './kernel/index.ts';
export { FocusRouter, createFocusRouter } from './kernel/index.ts';
export { validatePlan, validateNode } from './kernel/index.ts';
export { PlanExecutor, createPlanExecutor } from './kernel/index.ts';
export { applyPatch } from './kernel/index.ts';
export { validateAccessibility, auditDOM } from './kernel/index.ts';
export { EventLog, createEventLog, PerfMetrics, createPerfMetrics } from './kernel/index.ts';
export { DataStore, createDataStore, HttpError, createBinding } from './kernel/index.ts';
export { WorkflowEngine, createWorkflowEngine } from './kernel/index.ts';
export { PolicyEngine, createPolicyEngine } from './kernel/index.ts';
export { COMPONENT_MANIFEST, getDescriptor, getDescriptorsByCategory, registerAll, installEventBridge } from './kernel/index.ts';
export { BindingManager, createBindingManager } from './kernel/index.ts';
export { formWizard, confirmFlow, crudLifecycle, authFlow, toggleFlow } from './kernel/index.ts';
export { SCHEMA_CATALOG, getSchema, getSchemasForCategory, getSchemaAttribute } from './kernel/index.ts';
export { Planner, createPlanner } from './kernel/index.ts';

// Plugin system
export { PluginRegistry } from './registries/plugin-registry.ts';
export type { PluginFactory } from './registries/plugin-registry.ts';

export type {
  Command, CommandSource, CommandMeta, CommandHandler, CommandMiddleware, CommandFilter,
  OverlayType, OverlayEntry,
  Shortcut, ShortcutMod,
  UINode, UIPlan, ValidationResult, ValidationError,
  ComponentRegistration, KernelOptions,
  PatchOp, UIPatch, PatchResult, PatchError,
  A11yViolation, A11yResult,
  LogEntry, LogFilter, PerfSample,
  DataBinding, CacheEntry,
  WorkflowState, WorkflowTransition, WorkflowDefinition, WorkflowContext,
  TransitionRecord, WorkflowSnapshot, TransitionExplanation,
  Capability, CapabilityScope, PolicyEffect, PolicyRule, PolicyCondition,
  RateLimit, PolicyDecision,
  ComponentDescriptor,
  NodeBinding, ActiveBinding,
  ComponentSchema, AttributeSchema, PropertySchema, SlotSchema, EventSchema, AriaRequirements,
  UIIntent, ElementIntent, PlanResult, FormFieldIntent, ButtonIntent,
  CardIntent, DialogIntent, SettingIntent, TabIntent, NavItemIntent,
} from './kernel/index.ts';
