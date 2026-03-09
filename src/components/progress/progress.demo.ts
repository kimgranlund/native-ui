import '../../nav/native-dashboard.ts';
      import '../button/button.ts';
      import '../../icons/icon.ts';
      import '../../icons/phosphor/copy.ts';
      import '../../icons/phosphor/check.ts';
      import '../../containers/container/container.ts';

// ── JS-driven progress animation ──

      const bar = document.getElementById('js-progress');
      const btnReset = document.getElementById('btn-reset');
      const btnAnimate = document.getElementById('btn-animate');

      btnReset?.addEventListener('click', () => {
        bar?.style.setProperty('--n-progress', '0');
      });

      btnAnimate?.addEventListener('click', () => {
        bar?.style.setProperty('--n-progress', '0');
        let val = 0;
        const step = () => {
          val += 0.02;
          if (val > 1) val = 1;
          bar?.style.setProperty('--n-progress', String(val));
          if (val < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
