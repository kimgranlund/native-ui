# Functional Interaction OS + GenUI Runtime

## Technical Requirements Document (TRD)

**Generated:** 2026-02-20T22:31:23.637487 UTC

------------------------------------------------------------------------

# 1. Executive Summary

This document defines the technical requirements for a browser-native
**Interaction Operating System (IOS)** that also functions as a **GenUI
Runtime**.

The system must:

-   Provide deterministic, platform-native interaction primitives.
-   Use Custom Elements + `ElementInternals` as foundational units.
-   Avoid native `<input>`, `<select>`, `<textarea>`, `<button>`.
-   Treat `<dialog>` and Popover API as first-class spatial primitives.
-   Separate behavior, coordination, data, policy, and style.
-   Support probabilistic UI authorship (LLM-driven) with deterministic
    execution.
-   Enforce capability, policy, accessibility, and observability
    boundaries.
-   Be composable, schema-driven, and diff-safe.

------------------------------------------------------------------------

# 2. Scope

## In Scope

-   Interaction kernel
-   Command system
-   Windowing + overlay manager
-   Focus + input router
-   Form participation via `formAssociated`
-   Trait system
-   Controller lifecycle system
-   Data runtime (query/mutation substrate)
-   Workflow/statechart engine
-   Capability + policy engine
-   Observability + provenance
-   GenUI plan schema + executor
-   Patch/diff mechanism
-   Accessibility kernel

------------------------------------------------------------------------

# 3. Architectural Overview

    GenUI Runtime
      Intent → Plan → Patch → Validate → Execute
            ↓
    Interaction OS Kernel
      Commands | Focus | Window | Data | Workflow | Policy
            ↓
    FunctionElements + Controllers
      (Custom Elements + ElementInternals)

------------------------------------------------------------------------

# 4. Core Principles

1.  Deterministic execution.
2.  Probabilistic authorship.
3.  Explicit contracts over implicit structure.
4.  No hidden DOM.
5.  No side effects in components.
6.  Side effects mediated via command system.
7.  Accessibility enforced at runtime.
8.  Policy boundaries are first-class.
9.  Generated UI must pass validation before execution.
10. Style is fully external to behavior.

------------------------------------------------------------------------

# 5. Kernel Requirements

-   Maintain registry of components, traits, controllers.
-   Provide capability-scoped context graph.
-   Host command router.
-   Enforce policy boundaries.
-   Coordinate lifecycle for plans.
-   Support deterministic replay of commands.
-   Support multiple root instances.

------------------------------------------------------------------------

# 6. Component Model

## FunctionElement

-   Extends `HTMLElement`
-   `static formAssociated = true`
-   Uses `attachInternals()`
-   Reflects attribute/property contracts
-   Dispatches native DOM events
-   No embedded native interactive controls
-   No data fetching or external side effects

## Controller

-   Owns business logic and async operations
-   Binds to store/signals
-   Emits commands only
-   Capability-scoped
-   Hot-replaceable

## Traits

Behavioral capability slices:

-   Selectable
-   Focusable
-   Disabled
-   Validatable
-   OverlayTrigger
-   RovingTabIndex

------------------------------------------------------------------------

# 7. Command System

Commands must:

-   Be immutable
-   Have structured payload
-   Declare required capabilities
-   Support undo/redo metadata

Router must:

-   Validate policy
-   Support async
-   Log commands
-   Enable deterministic replay

GenUI emits proposed commands only.

------------------------------------------------------------------------

# 8. Window & Overlay System

-   Unified `<dialog>` and Popover management
-   Z-index arbitration
-   Focus trapping
-   Nested overlays supported
-   Spatial lifecycle events

------------------------------------------------------------------------

# 9. Focus & Input Router

-   Centralized keyboard routing
-   Roving tabindex support
-   Modal boundary enforcement
-   Command shortcuts
-   Accessibility-aligned navigation

------------------------------------------------------------------------

# 10. Form System

-   All elements use `ElementInternals`
-   Support `setFormValue`, `setValidity`, `checkValidity`
-   Support composite values
-   No hidden native inputs

------------------------------------------------------------------------

# 11. Data Runtime

-   Query abstraction
-   Mutation abstraction
-   Cache layer
-   Invalidation
-   Optimistic updates
-   Concurrency control
-   Retry/backoff

GenUI declares bindings; execution remains kernel-controlled.

------------------------------------------------------------------------

# 12. Workflow Engine

-   Statecharts
-   Guard conditions
-   Transition history
-   Resumable sessions
-   Explainable transitions

------------------------------------------------------------------------

# 13. Policy & Capability System

-   Capability tokens
-   Scoped permissions
-   Policy DSL
-   Mutation approval flows
-   Network constraints
-   Rate limiting

Generated logic operates in sandboxed capability scopes.

------------------------------------------------------------------------

# 14. Accessibility Kernel

-   Role validation
-   ARIA state consistency
-   Keyboard model enforcement
-   Runtime audits
-   Plan rejection on violation

------------------------------------------------------------------------

# 15. GenUI Runtime

## UI Schema

Defines:

-   Element types
-   Slots
-   Events
-   Command bindings
-   Constraints
-   Interaction models

## UI Plan

Includes:

-   Stable IDs
-   Tree structure
-   Binding references
-   Policy constraints
-   Provenance metadata

## Validation

-   Schema compliance
-   Accessibility
-   Policy compliance
-   Capability scope integrity

Invalid plans must not execute.

## Patch Model

-   Node add/remove
-   Binding updates
-   Interaction model changes
-   Copy updates
-   Deterministic application

------------------------------------------------------------------------

# 16. Observability & Provenance

-   Semantic event logging
-   Command audit trail
-   Plan ID tracking
-   Source attribution (human vs generated)
-   Performance metrics
-   User correction capture

------------------------------------------------------------------------

# 17. Non-Functional Requirements

Performance:

-   Cold start \< 30ms runtime overhead
-   Overlay open \< 16ms
-   Command dispatch \< 5ms (excluding async)

Security:

-   No eval
-   No arbitrary JS injection
-   Network calls capability-gated

Reliability:

-   Deterministic replay
-   Safe teardown
-   Memory leak prevention

------------------------------------------------------------------------

# 18. Milestones

Phase 1: - Kernel - Command system - Window manager - Base element +
controller - Minimal schema + executor

Phase 2: - Workflow engine - Policy DSL - Data runtime - Observability -
Patch protocol

Phase 3: - Full GenUI planner integration - Multi-user support -
Provenance tooling

------------------------------------------------------------------------

# 19. Success Criteria

-   Human and LLM-authored UI run identically.
-   Generated UI cannot bypass policy.
-   Accessibility violations rejected pre-execution.
-   Interaction independent of styling.
-   Deterministic replay of sessions.
