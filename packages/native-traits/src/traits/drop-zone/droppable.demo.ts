import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';

// ── Helpers ──

function appendLog(el, msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderFiles(listEl, files) {
  listEl.innerHTML = '';
  listEl.style.display = 'flex';
  for (const file of files) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<span class="file-name">${file.name}</span><span class="file-size">${formatSize(file.size)}</span>`;
    listEl.appendChild(item);
  }
}

// ── File Drop Zone ──

const filesZone = document.getElementById('files-zone');
filesZone.addEventListener('native:file-drop', (e) => {
  renderFiles(document.getElementById('files-list'), e.detail.files);
  for (const file of e.detail.files) {
    appendLog(document.getElementById('files-log'), `${file.name} (${formatSize(file.size)})`);
  }
});

// ── Image Only ──

const imagesZone = document.getElementById('images-zone');
imagesZone.addEventListener('native:file-drop', (e) => {
  renderFiles(document.getElementById('images-list'), e.detail.files);
  for (const file of e.detail.files) {
    appendLog(document.getElementById('images-log'), `${file.name} (${file.type}, ${formatSize(file.size)})`);
  }
});

// ── Text Drop ──

const textZone = document.getElementById('text-zone');
textZone.addEventListener('native:text-drop', (e) => {
  const contentEl = document.getElementById('text-content');
  contentEl.style.display = 'block';
  contentEl.textContent = e.detail.text;
  appendLog(document.getElementById('text-log'), `Dropped ${e.detail.text.length} characters`);
});

// ── Single File ──

const singleZone = document.getElementById('single-zone');
singleZone.addEventListener('native:file-drop', (e) => {
  renderFiles(document.getElementById('single-list'), e.detail.files);
  const file = e.detail.files[0];
  appendLog(document.getElementById('single-log'), `${file.name} (${formatSize(file.size)}) — only 1 file accepted`);
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
