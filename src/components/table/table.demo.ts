import '../../nav/native-dashboard.ts';
import './table.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';

// ── Sortable demo: populate + sort logic ──
const repos = [
  { name: 'React', language: 'JavaScript', stars: 228 },
  { name: 'Vue', language: 'TypeScript', stars: 208 },
  { name: 'Angular', language: 'TypeScript', stars: 96 },
  { name: 'Svelte', language: 'JavaScript', stars: 80 },
  { name: 'Solid', language: 'TypeScript', stars: 33 },
];

const sortableTable = document.getElementById('sortable-table');
const sortableBody = document.getElementById('sortable-body');

function renderSortableRows(data) {
  sortableBody.innerHTML = '';
  for (const item of data) {
    sortableBody.innerHTML += `
      <n-table-row>
        <n-table-cell>${item.name}</n-table-cell>
        <n-table-cell>${item.language}</n-table-cell>
        <n-table-cell>${item.stars}k</n-table-cell>
      </n-table-row>`;
  }
}

renderSortableRows(repos);

sortableTable.addEventListener('native:table-sort', (e) => {
  const { column, direction } = e.detail;
  if (direction === 'none') {
    renderSortableRows(repos);
    return;
  }
  const sorted = [...repos].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];
    if (typeof aVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
  renderSortableRows(sorted);
});

// ── Selectable demo ──
const selectionLog = document.getElementById('selection-log');
let selCount = 0;
document.querySelector('n-table[selectable]').addEventListener('native:table-select', (e) => {
  selCount++;
  const { allSelected } = e.detail;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${selCount} native:table-select — ${allSelected.length ? allSelected.join(', ') : '(none)'}`;
  selectionLog.prepend(entry);
});

// ── Colspan demo: sort logic ──
const colspanTable = document.getElementById('colspan-table');
const colspanRows = [
  { name: 'Alice Johnson', role: 'Senior Engineer', salary: '$180k', group: 'Engineering' },
  { name: 'Bob Smith', role: 'Staff Engineer', salary: '$210k', group: 'Engineering' },
  { name: 'Carol White', role: 'Lead Designer', salary: '$165k', group: 'Design' },
  { name: 'Dan Lee', role: 'UX Researcher', salary: '$140k', group: 'Design' },
];

colspanTable.addEventListener('native:table-sort', (e) => {
  const { column, direction } = e.detail;
  const body = colspanTable.querySelector('n-table-body');
  body.innerHTML = '';

  if (direction === 'none') {
    // Restore grouped view with colspan headers
    const groups = {};
    for (const r of colspanRows) {
      (groups[r.group] ??= []).push(r);
    }
    for (const [group, members] of Object.entries(groups)) {
      body.innerHTML += `<n-table-row colspan><n-table-cell>${group}</n-table-cell></n-table-row>`;
      for (const m of members) {
        body.innerHTML += `<n-table-row>
          <n-table-cell>${m.name}</n-table-cell>
          <n-table-cell>${m.role}</n-table-cell>
          <n-table-cell>${m.salary}</n-table-cell>
        </n-table-row>`;
      }
    }
    return;
  }

  const sorted = [...colspanRows].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];
    return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  for (const m of sorted) {
    body.innerHTML += `<n-table-row>
      <n-table-cell>${m.name}</n-table-cell>
      <n-table-cell>${m.role}</n-table-cell>
      <n-table-cell>${m.salary}</n-table-cell>
    </n-table-row>`;
  }
});

// ── Sticky header demo: populate rows ──
const stickyBody = document.getElementById('sticky-body');
const people = [
  ['Alice Johnson', 'Engineering', 'Active'],
  ['Bob Smith', 'Design', 'Active'],
  ['Carol White', 'Engineering', 'Away'],
  ['Dan Lee', 'Marketing', 'Active'],
  ['Eve Chen', 'Engineering', 'Active'],
  ['Frank Wu', 'Design', 'Away'],
  ['Grace Kim', 'Marketing', 'Active'],
  ['Hank Brown', 'Engineering', 'Active'],
  ['Iris Patel', 'Design', 'Active'],
  ['Jake Ross', 'Marketing', 'Away'],
];
for (const [name, dept, status] of people) {
  stickyBody.innerHTML += `
    <n-table-row>
      <n-table-cell>${name}</n-table-cell>
      <n-table-cell>${dept}</n-table-cell>
      <n-table-cell>${status}</n-table-cell>
    </n-table-row>`;
}

// ── Sticky colspan demo: populate groups ──
const stickyColspanBody = document.getElementById('sticky-colspan-body');
const teams = {
  Engineering: [
    ['Alice Johnson', 'Staff Engineer', '$210k'],
    ['Bob Smith', 'Senior Engineer', '$180k'],
    ['Eve Chen', 'Engineer', '$145k'],
    ['Hank Brown', 'Senior Engineer', '$175k'],
  ],
  Design: [
    ['Carol White', 'Lead Designer', '$165k'],
    ['Frank Wu', 'Senior Designer', '$155k'],
    ['Iris Patel', 'UX Researcher', '$140k'],
  ],
  Marketing: [
    ['Dan Lee', 'Marketing Lead', '$160k'],
    ['Grace Kim', 'Content Strategist', '$130k'],
    ['Jake Ross', 'Growth Analyst', '$125k'],
  ],
};
for (const [team, members] of Object.entries(teams)) {
  stickyColspanBody.innerHTML += `<n-table-row colspan sticky><n-table-cell>${team}</n-table-cell></n-table-row>`;
  for (const [name, role, salary] of members) {
    stickyColspanBody.innerHTML += `
      <n-table-row>
        <n-table-cell>${name}</n-table-cell>
        <n-table-cell>${role}</n-table-cell>
        <n-table-cell>${salary}</n-table-cell>
      </n-table-row>`;
  }
}

// ── Reorderable demo: log events ──
const reorderLog = document.getElementById('reorder-log');
let reorderCount = 0;
document.querySelector('n-table[reorderable]').addEventListener('native:table-reorder', (e) => {
  reorderCount++;
  const { fromIndex, toIndex } = e.detail;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${reorderCount} native:table-reorder — row ${fromIndex} → ${toIndex}`;
  reorderLog.prepend(entry);
});

// ── Resize demo: log events ──
const resizeLog = document.getElementById('resize-log');
let resizeCount = 0;
document.querySelector('n-table[resizable]').addEventListener('native:table-resize-end', (e) => {
  resizeCount++;
  const { column, width, allWidths } = e.detail;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `#${resizeCount} col ${column} → ${Math.round(width)}px  [${allWidths.map(w => Math.round(w)).join(', ')}]`;
  resizeLog.prepend(entry);
});

// ── Sortable + Resizable demo: populate + sort ──
const sortResizeTable = document.getElementById('sort-resize-table');
const sortResizeBody = document.getElementById('sort-resize-body');

function renderSortResizeRows(data) {
  sortResizeBody.innerHTML = '';
  for (const item of data) {
    sortResizeBody.innerHTML += `
      <n-table-row>
        <n-table-cell>${item.name}</n-table-cell>
        <n-table-cell>${item.language}</n-table-cell>
        <n-table-cell>${item.stars}k</n-table-cell>
      </n-table-row>`;
  }
}

renderSortResizeRows(repos);

sortResizeTable.addEventListener('native:table-sort', (e) => {
  const { column, direction } = e.detail;
  if (direction === 'none') {
    renderSortResizeRows(repos);
    return;
  }
  const sorted = [...repos].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];
    if (typeof aVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
  renderSortResizeRows(sorted);
});

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
