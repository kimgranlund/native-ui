import '../nav/native-dashboard.ts';
import '../components/table/table.ts';
import '../components/button/button.ts';
import '../icons/icon.ts';
import '../icons/phosphor/copy.ts';
import '../icons/phosphor/check.ts';

// ── Copy buttons ──

for (const btn of document.querySelectorAll('.copy-btn')) {
  btn.addEventListener('click', async () => {
    const code = btn.closest('.demo-code')?.querySelector('code');
    if (!code) return;
    await navigator.clipboard.writeText(code.textContent!);
    const icon = btn.querySelector('n-icon');
    if (icon) {
      icon.setAttribute('name', 'check');
      setTimeout(() => { icon.setAttribute('name', 'copy'); }, 1500);
    }
  });
}
