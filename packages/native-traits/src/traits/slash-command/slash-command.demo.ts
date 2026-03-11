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
import { SlashCommandController } from './slash-command-controller.ts';

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ── Shared command definitions ──

const defaultCommands = [
  { value: 'help', label: 'Help', description: 'Get help with the interface' },
  { value: 'clear', label: 'Clear', description: 'Clear the conversation' },
  { value: 'summarize', label: 'Summarize', description: 'Summarize the thread' },
  { value: 'translate', label: 'Translate', description: 'Translate text to another language' },
  { value: 'format', label: 'Format', description: 'Format selection as markdown' },
  { value: 'search', label: 'Search', description: 'Search through messages' },
];

// ── Basic Slash Commands (Textarea) ──

const basicWrapper = document.getElementById('basic-wrapper');
const basicTextarea = document.getElementById('basic-textarea');
const basicLog = document.getElementById('basic-log');

const basicSlash = new SlashCommandController(basicWrapper, {
  input: basicTextarea,
  commands: defaultCommands,
});

basicWrapper.addEventListener('native:slash-select', (e) => {
  appendLog(basicLog, `Selected: /${e.detail.command.value} — ${e.detail.command.label}`);
});
basicWrapper.addEventListener('native:slash-query', (e) => {
  appendLog(basicLog, `Query: "/${e.detail.query}" — ${e.detail.commands.length} match(es)`);
});

// ── With n-input ──

const inputWrapper = document.getElementById('input-wrapper');
const inputField = document.getElementById('input-field');
const inputLog = document.getElementById('input-log');

const inputSlash = new SlashCommandController(inputWrapper, {
  input: inputField,
  commands: [
    { value: 'help', label: 'Help', description: 'Get help' },
    { value: 'clear', label: 'Clear', description: 'Clear conversation' },
    { value: 'search', label: 'Search', description: 'Search messages' },
  ],
});

inputWrapper.addEventListener('native:slash-select', (e) => {
  appendLog(inputLog, `Selected: /${e.detail.command.value} — ${e.detail.command.label}`);
});
inputWrapper.addEventListener('native:slash-query', (e) => {
  appendLog(inputLog, `Query: "/${e.detail.query}" — ${e.detail.commands.length} match(es)`);
});

// ── Filtered Commands ──

const filterWrapper = document.getElementById('filter-wrapper');
const filterTextarea = document.getElementById('filter-textarea');
const filterLog = document.getElementById('filter-log');

const filterSlash = new SlashCommandController(filterWrapper, {
  input: filterTextarea,
  commands: defaultCommands,
});

filterWrapper.addEventListener('native:slash-query', (e) => {
  const labels = e.detail.commands.map(c => c.label).join(', ');
  appendLog(filterLog, `Query: "/${e.detail.query}" — matches: [${labels}]`);
});
filterWrapper.addEventListener('native:slash-select', (e) => {
  appendLog(filterLog, `Selected: /${e.detail.command.value} — ${e.detail.command.label}`);
});

// ── Action Types ──

const actionWrapper = document.getElementById('action-wrapper');
const actionTextarea = document.getElementById('action-textarea');
const actionLog = document.getElementById('action-log');

const actionSlash = new SlashCommandController(actionWrapper, {
  input: actionTextarea,
  commands: [
    { value: 'mention', label: '@mention', action: 'tag' },
    { value: 'heading', label: 'Heading', action: 'insert', insertText: '## ' },
    { value: 'divider', label: 'Divider', action: 'insert', insertText: '---\n' },
    { value: 'upload', label: 'Upload File', action: 'event', description: 'Open file picker' },
    { value: 'emoji', label: 'Emoji', action: 'event', description: 'Open emoji picker' },
  ],
});

actionWrapper.addEventListener('native:slash-select', (e) => {
  const { command, action } = e.detail;
  appendLog(actionLog, `Selected: /${command.value} — action: ${action}`);
  if (action === 'event') {
    appendLog(actionLog, `  → Host would handle: ${command.description ?? command.label}`);
  }
});
actionWrapper.addEventListener('native:slash-query', (e) => {
  appendLog(actionLog, `Query: "/${e.detail.query}" — ${e.detail.commands.length} match(es)`);
});

// ── Dynamic Commands ──

const setA = [
  { value: 'help', label: 'Help', description: 'Get help' },
  { value: 'clear', label: 'Clear', description: 'Clear conversation' },
  { value: 'summarize', label: 'Summarize', description: 'Summarize the thread' },
  { value: 'translate', label: 'Translate', description: 'Translate text' },
];

const setB = [
  { value: 'format', label: 'Format', description: 'Format as markdown' },
  { value: 'search', label: 'Search', description: 'Search messages' },
  { value: 'export', label: 'Export', description: 'Export conversation' },
  { value: 'settings', label: 'Settings', description: 'Open settings' },
];

const dynamicWrapper = document.getElementById('dynamic-wrapper');
const dynamicTextarea = document.getElementById('dynamic-textarea');
const dynamicLog = document.getElementById('dynamic-log');
const toggleBtn = document.getElementById('toggle-btn');
const setLabel = document.getElementById('set-label');

const dynamicSlash = new SlashCommandController(dynamicWrapper, {
  input: dynamicTextarea,
  commands: setA,
});

let currentSet = 'A';

toggleBtn.addEventListener('native:press', () => {
  if (currentSet === 'A') {
    dynamicSlash.commands = setB;
    currentSet = 'B';
    toggleBtn.textContent = 'Switch to Set A';
    setLabel.textContent = 'Current: Set B (Format, Search, Export, Settings)';
  } else {
    dynamicSlash.commands = setA;
    currentSet = 'A';
    toggleBtn.textContent = 'Switch to Set B';
    setLabel.textContent = 'Current: Set A (Help, Clear, Summarize, Translate)';
  }
  appendLog(dynamicLog, `Switched to Set ${currentSet}`);
});

dynamicWrapper.addEventListener('native:slash-select', (e) => {
  appendLog(dynamicLog, `Selected: /${e.detail.command.value} — ${e.detail.command.label}`);
});
dynamicWrapper.addEventListener('native:slash-query', (e) => {
  appendLog(dynamicLog, `Query: "/${e.detail.query}" — ${e.detail.commands.length} match(es)`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
