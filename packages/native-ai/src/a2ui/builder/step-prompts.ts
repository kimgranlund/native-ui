// ── Pipeline step prompts ──
// Each function returns a system prompt for one pipeline step.

export function interpretPrompt(): string {
  return `You are a UI intent interpreter. Given a user's request to build or modify a UI, produce a clear restatement of their intent.

Respond with ONLY a JSON object (no markdown fences):
{
  "intent": "Clear 2-4 sentence restatement of what the user wants to build",
  "uiKind": "Category (form, dashboard, game, settings, data-display, landing, tool, etc.)",
  "assumptions": ["Any ambiguities you resolved by assumption — omit if none"],
  "isIteration": false
}

Be concise and precise. Focus on WHAT the user wants, not HOW to build it.`;
}

export function conceptsPrompt(): string {
  return `You are a UI design pattern analyst. Given a user's UI request and its interpretation, identify the abstract design concepts and interaction patterns needed.

Focus on WHY patterns are chosen, not WHAT components to use. Think in terms of design patterns, not implementation.

Respond with ONLY a JSON object (no markdown fences):
{
  "concepts": [
    { "pattern": "Pattern name", "rationale": "Why this pattern fits" }
  ],
  "interactions": ["Key interaction patterns (e.g. click-to-reveal, drag-reorder, live-validate)"],
  "dataFlow": "How data flows through the UI (e.g. form input → validation → submit → feedback)",
  "stateModel": "What state exists and how it changes (e.g. form fields, loading state, error state)"
}

Keep concepts high-level: "Progressive disclosure", "Card-based data grid", "Inline validation with error recovery" — NOT "TextField", "Button", "Card".`;
}

export function planPrompt(componentRef: string): string {
  return `You are a UI structure planner for the A2UI component system. Given an interpretation and concept analysis, produce a concrete implementation plan mapping concepts to components.

Available A2UI components:
${componentRef}

Respond with ONLY a JSON object (no markdown fences):
{
  "layout": "Container/layout strategy description",
  "components": [
    { "type": "A2UIType", "role": "What it does in this UI", "count": 1 }
  ],
  "traits": ["Trait controllers needed (e.g. validatable, draggable, collapsible)"],
  "cssNeeded": false,
  "jsNeeded": false,
  "cssNotes": "What custom CSS is needed and why (omit if cssNeeded is false)",
  "jsNotes": "What JS wiring is needed and why (omit if jsNeeded is false)",
  "hierarchy": "Brief nesting sketch, e.g. Card > Column > [TextField, TextField, Button]"
}

Be specific about which A2UI types map to which parts of the design. Reference the concept analysis to justify choices.`;
}

export function constructionContextPrefix(
  interpretation: string,
  concepts: string,
  plan: string,
): string {
  return `[PIPELINE CONTEXT]
The following analysis was performed before this generation step:

## Interpretation
${interpretation}

## Concept Analysis
${concepts}

## Implementation Plan
${plan}
[/PIPELINE CONTEXT]

Use this analysis to inform your schema generation. The concepts and plan have already been validated — now produce the schema, CSS, and JS that implement them.

`;
}
