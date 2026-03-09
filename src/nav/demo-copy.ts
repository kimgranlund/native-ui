/** Shared copy-to-clipboard handler for demo page code blocks. */
export function initCopyButtons(): void {
  for (const btn of Array.from(document.querySelectorAll('.copy-btn'))) {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.demo-code')?.querySelector('code');
      if (!code) return;
      await navigator.clipboard.writeText(code.textContent ?? '');
      const icon = btn.querySelector('n-icon');
      if (icon) {
        icon.setAttribute('name', 'check');
        setTimeout(() => {
          icon.setAttribute('name', 'copy');
        }, 1500);
      }
    });
  }
}
