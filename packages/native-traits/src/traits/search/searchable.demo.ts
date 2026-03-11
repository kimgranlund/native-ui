import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/input/input.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';
import { SearchController } from '../index.ts';

// ── Helper: event logging ──

function appendLog(el, msg) {
  if (!el) return;
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 20) el.removeChild(el.firstChild);
}

// ── Basic Filter ──

const basicWrap = document.getElementById('basic-wrap');
const basicSearch = new SearchController(basicWrap, {
  selector: '.search-item',
});

const basicInput = document.getElementById('basic-input');
basicInput.addEventListener('native:input', (e) => {
  basicSearch.filter(e.detail.value);
});

const basicLogEl = document.getElementById('basic-log');
basicWrap.addEventListener('native:search', (e) => {
  const { query, matchCount, total } = e.detail;
  appendLog(basicLogEl, `"${query}" — ${matchCount}/${total} matches`);
});

// ── Custom Text Field ──

const fieldWrap = document.getElementById('field-wrap');
const fieldSearch = new SearchController(fieldWrap, {
  selector: '.search-item',
  textField: 'data-search',
});

const fieldInput = document.getElementById('field-input');
fieldInput.addEventListener('native:input', (e) => {
  fieldSearch.filter(e.detail.value);
});

// ── Highlight Matches ──

const highlightWrap = document.getElementById('highlight-wrap');
const highlightSearch = new SearchController(highlightWrap, {
  selector: '.search-item',
});

const highlightInput = document.getElementById('highlight-input');
highlightInput.addEventListener('native:input', (e) => {
  const query = e.detail.value;
  highlightSearch.filter(query);
  for (const item of highlightWrap.querySelectorAll('.search-item')) {
    const original = item.getAttribute('data-original');
    item.innerHTML = SearchController.highlight(original, query);
  }
});

// ── SearchController — Attach to Any Element ──

const ctrlList = document.getElementById('controller-list');
const ctrlSearch = new SearchController(ctrlList, {
  selector: '.search-item',
});

const ctrlInput = document.getElementById('ctrl-input');
ctrlInput.addEventListener('native:input', (e) => {
  const { matches, hidden, total } = ctrlSearch.filter(e.detail.value);
  appendLog(ctrlLogEl, `${matches.length}/${total} matches`);
});

const ctrlLogEl = document.getElementById('ctrl-log');
ctrlList.addEventListener('native:search', (e) => {
  const { query, matchCount, total } = e.detail;
  appendLog(ctrlLogEl, `"${query}" — ${matchCount}/${total} matches`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
