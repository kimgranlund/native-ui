import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import { batch } from '../reactivity/batch.ts';
import { uid } from '../core/uid.ts';
import type { Signal, ReadonlySignal } from '../reactivity/types.ts';
import type { Command, CommandMiddleware } from './types.ts';

// ── Capability Token ──

export interface Capability {
  readonly id: string;
  readonly name: string;
  readonly patterns: readonly string[];
  readonly scopes?: readonly CapabilityScope[];
  readonly expiresAt?: number;
}

export interface CapabilityScope {
  readonly type: 'source' | 'planId' | 'custom';
  readonly value: string;
}

// ── Policy Rule ──

export type PolicyEffect = 'allow' | 'deny';

export interface PolicyRule {
  readonly id: string;
  readonly effect: PolicyEffect;
  readonly patterns: readonly string[];
  readonly priority: number;
  readonly conditions?: readonly PolicyCondition[];
  readonly description?: string;
}

export interface PolicyCondition {
  readonly field: 'source' | 'planId' | 'capability';
  readonly op: 'eq' | 'neq' | 'in' | 'matches';
  readonly value: string | readonly string[];
}

// ── Rate Limit ──

export interface RateLimit {
  readonly pattern: string;
  readonly maxPerWindow: number;
  readonly windowMs: number;
}

// ── Policy Decision ──

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly matchedRule?: string;
  readonly missingCapabilities?: readonly string[];
}

// ── Pattern Matching ──

function matchesPattern(pattern: string, type: string): boolean {
  if (pattern === '*') return true;
  if (pattern === type) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return type === prefix || type.startsWith(prefix + '.');
  }
  return false;
}

// ── Rate Limit Tracker ──

interface RateLimitEntry {
  readonly limit: RateLimit;
  timestamps: number[];
}

// ── Policy Engine ──

export class PolicyEngine {
  #capabilities: Signal<readonly Capability[]> = signal<readonly Capability[]>([]);
  #rules: Signal<readonly PolicyRule[]> = signal<readonly PolicyRule[]>([]);
  #rateLimits = new Map<string, RateLimitEntry>();
  #lastDecision: Signal<PolicyDecision | null> = signal(null);
  #deniedCount: Signal<number> = signal(0);

  readonly capabilities: ReadonlySignal<readonly Capability[]> = computed(() => this.#capabilities.value);
  readonly rules: ReadonlySignal<readonly PolicyRule[]> = computed(() => this.#rules.value);
  readonly lastDecision: ReadonlySignal<PolicyDecision | null> = computed(() => this.#lastDecision.value);
  readonly deniedCount: ReadonlySignal<number> = computed(() => this.#deniedCount.value);

  // ── Capability Management ──

  grant(capability: Omit<Capability, 'id'>): string {
    const id = uid('cap');
    const full: Capability = Object.freeze({
      id,
      ...capability,
    });
    this.#capabilities.value = [...this.#capabilities.value, full];
    return id;
  }

  revoke(capabilityId: string): void {
    const next = this.#capabilities.value.filter(c => c.id !== capabilityId);
    if (next.length !== this.#capabilities.value.length) {
      this.#capabilities.value = next;
    }
  }

  revokeAll(): void {
    this.#capabilities.value = [];
  }

  hasCapability(name: string): boolean {
    const now = Date.now();
    return this.#capabilities.value.some(
      c => c.name === name && (c.expiresAt === undefined || c.expiresAt > now),
    );
  }

  // ── Policy Rules ──

  addRule(rule: Omit<PolicyRule, 'id'>): string {
    const id = uid('rule');
    const full: PolicyRule = Object.freeze({
      id,
      ...rule,
    });
    this.#rules.value = [...this.#rules.value, full];
    return id;
  }

  removeRule(ruleId: string): void {
    const next = this.#rules.value.filter(r => r.id !== ruleId);
    if (next.length !== this.#rules.value.length) {
      this.#rules.value = next;
    }
  }

  // ── Rate Limiting ──

  addRateLimit(limit: RateLimit): void {
    this.#rateLimits.set(limit.pattern, {
      limit: Object.freeze(limit),
      timestamps: [],
    });
  }

  removeRateLimit(pattern: string): void {
    this.#rateLimits.delete(pattern);
  }

  // ── Evaluation ──

  evaluate(command: Command): PolicyDecision {
    // 1. Check rate limits
    const rateLimitDecision = this.#checkRateLimits(command);
    if (rateLimitDecision !== null) return rateLimitDecision;

    // 2. Check required capabilities declared in command meta
    const capabilityDecision = this.#checkCapabilities(command);
    if (capabilityDecision !== null) return capabilityDecision;

    // 3. Evaluate policy rules (sorted by priority, highest first)
    const ruleDecision = this.#evaluateRules(command);
    if (ruleDecision !== null) return ruleDecision;

    // 4. Default: allow
    return Object.freeze({
      allowed: true,
      reason: 'No matching policy rule; default allow',
    });
  }

  // ── Middleware Factory ──

  middleware(): CommandMiddleware {
    return (command: Command, next: () => void | Promise<void>) => {
      const decision = this.evaluate(command);

      batch(() => {
        this.#lastDecision.value = decision;
        if (!decision.allowed) {
          this.#deniedCount.value = this.#deniedCount.value + 1;
        }
      });

      if (decision.allowed) {
        return next();
      }
      // Denied: silent block — do not call next()
    };
  }

  // ── Cleanup ──

  destroy(): void {
    batch(() => {
      this.#capabilities.value = [];
      this.#rules.value = [];
      this.#lastDecision.value = null;
      this.#deniedCount.value = 0;
    });
    this.#rateLimits.clear();
  }

  // ── Private: Rate Limit Check ──

  #checkRateLimits(command: Command): PolicyDecision | null {
    const now = Date.now();

    for (const [_pattern, entry] of this.#rateLimits) {
      if (!matchesPattern(entry.limit.pattern, command.type)) continue;

      // Prune expired timestamps
      const windowStart = now - entry.limit.windowMs;
      entry.timestamps = entry.timestamps.filter(t => t >= windowStart);

      if (entry.timestamps.length >= entry.limit.maxPerWindow) {
        return Object.freeze({
          allowed: false,
          reason: `Rate limit exceeded for pattern '${entry.limit.pattern}': ${entry.limit.maxPerWindow} per ${entry.limit.windowMs}ms`,
        });
      }

      // Record this invocation
      entry.timestamps.push(now);
    }

    return null;
  }

  // ── Private: Capability Check ──

  #checkCapabilities(command: Command): PolicyDecision | null {
    const required = command.meta?.capabilities;
    if (!required || required.length === 0) return null;

    const now = Date.now();
    const active = this.#capabilities.value.filter(
      c => c.expiresAt === undefined || c.expiresAt > now,
    );

    const missing: string[] = [];

    for (const capName of required) {
      const cap = active.find(c => c.name === capName);
      if (!cap) {
        missing.push(capName);
        continue;
      }

      // Check pattern coverage — capability must cover this command type
      const coversType = cap.patterns.some(p => matchesPattern(p, command.type));
      if (!coversType) {
        missing.push(capName);
        continue;
      }

      // Check scopes if present
      if (cap.scopes && cap.scopes.length > 0) {
        const scopeSatisfied = cap.scopes.every(scope => this.#checkScope(scope, command));
        if (!scopeSatisfied) {
          missing.push(capName);
        }
      }
    }

    if (missing.length > 0) {
      return Object.freeze({
        allowed: false,
        reason: `Missing required capabilities: ${missing.join(', ')}`,
        missingCapabilities: Object.freeze(missing),
      });
    }

    return null;
  }

  #checkScope(scope: CapabilityScope, command: Command): boolean {
    switch (scope.type) {
      case 'source':
        return command.source === scope.value;
      case 'planId':
        return command.meta?.planId === scope.value;
      case 'custom':
        return true; // Custom scopes pass through — consumer-defined semantics
    }
  }

  // ── Private: Rule Evaluation ──

  #evaluateRules(command: Command): PolicyDecision | null {
    // Sort by priority descending (highest first), stable order on tie
    const sorted = [...this.#rules.value].sort((a, b) => b.priority - a.priority);

    for (const rule of sorted) {
      // Check if any rule pattern matches the command type
      const patternMatch = rule.patterns.some(p => matchesPattern(p, command.type));
      if (!patternMatch) continue;

      // Check conditions (all must pass for rule to match)
      if (rule.conditions && rule.conditions.length > 0) {
        const allConditionsMet = rule.conditions.every(c => this.#evaluateCondition(c, command));
        if (!allConditionsMet) continue;
      }

      // Rule matches — apply its effect
      return Object.freeze({
        allowed: rule.effect === 'allow',
        reason: rule.description ?? `Matched rule '${rule.id}' with effect '${rule.effect}'`,
        matchedRule: rule.id,
      });
    }

    return null;
  }

  #evaluateCondition(condition: PolicyCondition, command: Command): boolean {
    const fieldValue = this.#resolveField(condition.field, command);

    switch (condition.op) {
      case 'eq':
        return fieldValue === condition.value;

      case 'neq':
        return fieldValue !== condition.value;

      case 'in': {
        const list = Array.isArray(condition.value) ? condition.value : [condition.value];
        return list.includes(fieldValue as string);
      }

      case 'matches': {
        if (typeof condition.value !== 'string' || typeof fieldValue !== 'string') return false;
        return matchesPattern(condition.value, fieldValue);
      }
    }
  }

  #resolveField(field: PolicyCondition['field'], command: Command): string | undefined {
    switch (field) {
      case 'source':
        return command.source;
      case 'planId':
        return command.meta?.planId;
      case 'capability':
        // For capability conditions, return comma-joined list of active capability names
        return this.#capabilities.value
          .filter(c => c.expiresAt === undefined || c.expiresAt > Date.now())
          .map(c => c.name)
          .join(',');
    }
  }
}

export function createPolicyEngine(): PolicyEngine {
  return new PolicyEngine();
}
