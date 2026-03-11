// Re-export from @nonoun/native-kernel
export {
  Kernel, getKernel, resetKernel,
  CommandBus, createCommandBus,
  CommandHistory, createCommandHistory,
  OverlayManager, createOverlayManager,
  FocusRouter, createFocusRouter,
  validatePlan, validateNode,
  PlanExecutor, createPlanExecutor,
  applyPatch,
  validateAccessibility, auditDOM,
  EventLog, createEventLog, PerfMetrics, createPerfMetrics,
  DataStore, createDataStore, HttpError, createBinding,
  WorkflowEngine, createWorkflowEngine,
  PolicyEngine, createPolicyEngine,
  COMPONENT_MANIFEST, getDescriptor, getDescriptorsByCategory, registerAll, installEventBridge,
  BindingManager, createBindingManager,
  formWizard, confirmFlow, crudLifecycle, authFlow, toggleFlow,
  SCHEMA_CATALOG, getSchema, getSchemasForCategory, getSchemaAttribute,
  Planner, createPlanner,
} from '@nonoun/native-kernel';

// Plugin system
export { PluginRegistry } from '@nonoun/native-core';
export type { PluginFactory } from '@nonoun/native-core';

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
} from '@nonoun/native-kernel';
