import '../../nav/native-dashboard.ts';
import './n-feed.ts';
import '../button/button.ts';
import '../../icons/icon.ts';
import '../../icons/phosphor/copy.ts';
import '../../icons/phosphor/check.ts';
import '../../icons/phosphor/arrow-down.ts';

// ── Auto-scroll demo ──

const autoFeed = document.getElementById('auto-feed') as HTMLElement & { scrollToBottom: (smooth?: boolean) => void };
const pinStatus = document.getElementById('pin-status')!;
const addBtn = document.getElementById('add-item')!;
const scrollBtn = document.getElementById('scroll-bottom')!;
let autoCounter = 10;

addBtn.addEventListener('click', () => {
  autoCounter++;
  const div = document.createElement('div');
  div.className = 'feed-item';
  div.textContent = `Item ${autoCounter} — added at ${new Date().toLocaleTimeString()}`;
  autoFeed.appendChild(div);
});

scrollBtn.addEventListener('click', () => {
  autoFeed.scrollToBottom();
});

autoFeed.addEventListener('native:feed-scroll', ((e: CustomEvent) => {
  pinStatus.textContent = e.detail.isPinned ? 'Pinned to bottom' : 'Scrolled up';
}) as EventListener);

// ── Virtual scroll demo ──

const virtualFeed = document.getElementById('virtual-feed') as HTMLElement & {
  items: unknown[];
  itemRenderer: (item: unknown, index: number) => HTMLElement;
};

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Virtual item ${i + 1}`,
}));

virtualFeed.itemRenderer = (item: { id: number; text: string }, index: number) => {
  const div = document.createElement('div');
  div.className = 'feed-item';
  div.textContent = `${item.text} (index: ${index})`;
  return div;
};

virtualFeed.items = items;

const rangeLog = document.getElementById('range-log')!;
virtualFeed.addEventListener('native:range-change', ((e: CustomEvent) => {
  rangeLog.textContent = `Showing ${e.detail.start}–${e.detail.end} of ${e.detail.total}`;
}) as EventListener);

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
