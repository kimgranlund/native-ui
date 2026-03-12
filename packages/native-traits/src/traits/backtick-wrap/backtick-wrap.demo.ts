import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/textarea/textarea.ts';
import '../../../../../src/components/input/input.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/table/table.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import { BacktickWrapController } from './backtick-wrap-controller.ts';

// ── Helper: event logging ──

function appendLog(el: HTMLElement | null, msg: string): void {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild!);
}

// ── Basic Backtick Wrap ──

const basicWrapper = document.getElementById('basic-wrapper')!;
const basicTextarea = document.getElementById('basic-textarea')!;
const basicLog = document.getElementById('basic-log');

const _basicWrap = new BacktickWrapController(basicWrapper, {
  input: basicTextarea,
});

basicWrapper.addEventListener('native:backtick-wrap', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(basicLog, `Wrapped: "${detail.text}"`);
});

// ── Combined: All Text Commands ──

import { SlashCommandController } from '../slash-command/slash-command-controller.ts';
import { MentionController } from '../mention/mention-controller.ts';

const comboWrapper = document.getElementById('combo-wrapper')!;
const comboTextarea = document.getElementById('combo-textarea')!;
const comboLog = document.getElementById('combo-log');

const _comboSlash = new SlashCommandController(comboWrapper, {
  input: comboTextarea,
  commands: [
    { value: 'help', label: 'Help', description: 'Get help' },
    { value: 'clear', label: 'Clear', description: 'Clear conversation' },
  ],
});

const _comboMention = new MentionController(comboWrapper, {
  input: comboTextarea,
  items: [
    { value: 'kim', label: 'Kim Granlund', description: 'Designer' },
    { value: 'alex', label: 'Alex Chen', description: 'Engineer' },
  ],
});

const _comboWrap = new BacktickWrapController(comboWrapper, {
  input: comboTextarea,
});

comboWrapper.addEventListener('native:slash-select', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `Command: /${detail.command.value}`);
});
comboWrapper.addEventListener('native:mention-select', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `Mention: @${detail.command.label}`);
});
comboWrapper.addEventListener('native:backtick-wrap', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  appendLog(comboLog, `Code: \`${detail.text}\``);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
