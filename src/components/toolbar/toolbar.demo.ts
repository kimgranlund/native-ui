import '../../nav/native-dashboard.ts';
      import './toolbar.ts';
      import '../../components/button/button.ts';
      import '../../icons/icon.ts';
      import '../../icons/phosphor/text-b.ts';
      import '../../icons/phosphor/text-italic.ts';
      import '../../icons/phosphor/text-underline.ts';
      import '../../icons/phosphor/text-strikethrough.ts';
      import '../../icons/phosphor/text-align-left.ts';
      import '../../icons/phosphor/text-align-center.ts';
      import '../../icons/phosphor/text-align-right.ts';
      import '../../icons/phosphor/list-bullets.ts';
      import '../../icons/phosphor/list-numbers.ts';
      import '../../icons/phosphor/floppy-disk.ts';
      import '../../icons/phosphor/download.ts';
      import '../../icons/phosphor/printer.ts';
      import '../../icons/phosphor/arrow-counter-clockwise.ts';
      import '../../icons/phosphor/arrow-clockwise.ts';
      import '../../icons/phosphor/skip-back.ts';
      import '../../icons/phosphor/play.ts';
      import '../../icons/phosphor/skip-forward.ts';
      import '../../icons/phosphor/speaker-high.ts';
      import '../../icons/phosphor/shuffle.ts';
      import '../../icons/phosphor/repeat.ts';
      import '../../icons/phosphor/magnifying-glass.ts';
      import '../../icons/phosphor/funnel.ts';
      import '../../icons/phosphor/sort-ascending.ts';
      import '../../icons/phosphor/copy.ts';
      import '../../icons/phosphor/scissors.ts';
      import '../../icons/phosphor/clipboard.ts';
      import '../../icons/phosphor/share.ts';
      import '../../icons/phosphor/gear.ts';
      import '../../icons/phosphor/check.ts';
      import '../../icons/custom/dots-three-bold.ts';
      import '../../components/listbox/listbox.ts';
      import '../../components/listbox/option.ts';
// ── Overflow diagnostics ──
      const diagToolbar = document.getElementById('diag-toolbar');
      const overflowLog = document.getElementById('overflow-log');
      let overflowCount = 0;

      diagToolbar?.addEventListener('native:toolbar-overflow', (e) => {
        overflowCount++;
        const d = e.detail;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `#${overflowCount} visible: ${d.visibleCount}, overflowed: ${d.overflowedCount}` +
          (d.overflowedLabels?.length ? ` — hidden: ${d.overflowedLabels.join(', ')}` : '');
        overflowLog.prepend(entry);
      });

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
