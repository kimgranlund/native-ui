import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/textarea/textarea.ts';
import '../../../../../src/components/input/input.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/listbox/listbox.ts';
import '../../../../../src/components/listbox/option.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/components/table/table.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';
import { MentionController } from './mention-controller.ts';

// ── Helper: event logging ──

function appendLog(el: HTMLElement | null, msg: string): void {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild!);
}

// ── Shared mention items ──

const teamMembers = [
  { value: 'kim', label: 'Kim Granlund', description: 'Designer' },
  { value: 'alex', label: 'Alex Chen', description: 'Engineer' },
  { value: 'sam', label: 'Sam Rivera', description: 'Product Manager' },
  { value: 'kai', label: 'Kai Nakamura', description: 'QA Lead' },
  { value: 'jordan', label: 'Jordan Lee', description: 'Engineer' },
  { value: 'taylor', label: 'Taylor Brooks', description: 'DevOps' },
];

// ── Basic Mentions (Textarea) ──

const basicWrapper = document.getElementById('basic-wrapper')!;
const basicTextarea = document.getElementById('basic-textarea')!;
const basicLog = document.getElementById('basic-log');

const _basicMention = new MentionController(basicWrapper, {
  input: basicTextarea,
  items: teamMembers,
});

basicWrapper.addEventListener('native:mention-select', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(basicLog, `Mentioned: @${detail.command.label} (${detail.command.value})`);
});
basicWrapper.addEventListener('native:mention-query', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(basicLog, `Query: "@${detail.query}" — ${detail.commands.length} match(es)`);
});

// ── With n-input ──

const inputWrapper = document.getElementById('input-wrapper')!;
const inputField = document.getElementById('input-field')!;
const inputLog = document.getElementById('input-log');

const _inputMention = new MentionController(inputWrapper, {
  input: inputField,
  items: teamMembers.slice(0, 3),
});

inputWrapper.addEventListener('native:mention-select', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(inputLog, `Mentioned: @${detail.command.label}`);
});

// ── Combined: Slash + Mention ──

import { SlashCommandController } from '../slash-command/slash-command-controller.ts';

const comboWrapper = document.getElementById('combo-wrapper')!;
const comboTextarea = document.getElementById('combo-textarea')!;
const comboLog = document.getElementById('combo-log');

const _comboSlash = new SlashCommandController(comboWrapper, {
  input: comboTextarea,
  commands: [
    { value: 'help', label: 'Help', description: 'Get help' },
    { value: 'clear', label: 'Clear', description: 'Clear conversation' },
    { value: 'summarize', label: 'Summarize', description: 'Summarize thread' },
  ],
});

const _comboMention = new MentionController(comboWrapper, {
  input: comboTextarea,
  items: teamMembers,
});

comboWrapper.addEventListener('native:slash-select', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `Command: /${detail.command.value}`);
});
comboWrapper.addEventListener('native:mention-select', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `Mention: @${detail.command.label}`);
});
comboWrapper.addEventListener('native:slash-query', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `/ query: "${detail.query}"`);
});
comboWrapper.addEventListener('native:mention-query', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `@ query: "${detail.query}"`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
