import '../../nav/native-dashboard.ts';
      import './textarea.ts';
      import '../field/field.ts';
      import '../button/button.ts';
      import '../../components/toolbar/toolbar.ts';
      import '../../icons/icon.ts';
      import '../../icons/phosphor/copy.ts';
      import '../../icons/phosphor/check.ts';

      // Event logging
      const eventTextarea = document.getElementById('event-textarea');
      const eventLog = document.getElementById('event-log');
      let count = 0;

      eventTextarea.addEventListener('native:input', (e) => {
        count++;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `#${count} n-input — value: "${e.detail.value}"`;
        eventLog.prepend(entry);
      });

      eventTextarea.addEventListener('native:change', (e) => {
        count++;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `#${count} native:change — value: "${e.detail.value}"`;
        eventLog.prepend(entry);
      });

      // Form logging
      const form = document.getElementById('demo-form');
      const formLog = document.getElementById('form-log');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `submit — ${[...data.entries()].map(([k, v]) => `${k}: "${v}"`).join(', ')}`;
        formLog.prepend(entry);
      });

      form.addEventListener('reset', () => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = 'reset';
        formLog.prepend(entry);
      });
// ── Inline formatting buttons ──
      // WHY: preventDefault on mousedown keeps focus in the textarea so
      // applyFormat can read the active selection.
      const fmtTextarea = document.getElementById('fmt-textarea');
      for (const id of ['fmt-code', 'fmt-bold', 'fmt-italic']) {
        const btn = document.getElementById(id);
        btn?.addEventListener('mousedown', (e) => e.preventDefault());
      }
      document.getElementById('fmt-code')?.addEventListener('native:press', () => fmtTextarea?.applyFormat('code'));
      document.getElementById('fmt-bold')?.addEventListener('native:press', () => fmtTextarea?.applyFormat('bold'));
      document.getElementById('fmt-italic')?.addEventListener('native:press', () => fmtTextarea?.applyFormat('italic'));

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
