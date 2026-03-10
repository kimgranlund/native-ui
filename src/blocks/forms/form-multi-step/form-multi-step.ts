const steps = ['personal', 'address', 'review'];
const indicator = document.getElementById('step-indicator') as HTMLElement & { value: string };
function goToStep(index: number) {
  const stepName = steps[index];

  // Update panels
  document.querySelectorAll('.step-panel').forEach((p) => p.removeAttribute('active'));
  document.getElementById(`step-${stepName}`)?.setAttribute('active', '');

  // Update segmented control
  indicator.value = stepName;

  // Populate review if going to step 3
  if (stepName === 'review') {
    (document.getElementById('review-name') as HTMLElement).textContent =
      (document.getElementById('input-name') as HTMLInputElement)?.value || '--';
    (document.getElementById('review-email') as HTMLElement).textContent =
      (document.getElementById('input-email') as HTMLInputElement)?.value || '--';
    (document.getElementById('review-phone') as HTMLElement).textContent =
      (document.getElementById('input-phone') as HTMLInputElement)?.value || '--';
    (document.getElementById('review-address') as HTMLElement).textContent =
      (document.getElementById('input-address') as HTMLInputElement)?.value || '--';
    (document.getElementById('review-city') as HTMLElement).textContent =
      (document.getElementById('input-city') as HTMLInputElement)?.value || '--';
    const stateSelect = document.getElementById('input-state') as HTMLElement & { value: string };
    (document.getElementById('review-state') as HTMLElement).textContent =
      stateSelect?.value || '--';
    (document.getElementById('review-zip') as HTMLElement).textContent =
      (document.getElementById('input-zip') as HTMLInputElement)?.value || '--';
  }
}

// Segmented control click navigation
indicator.addEventListener('native:change', (e) => {
  const idx = steps.indexOf((e as CustomEvent).detail.value);
  if (idx >= 0) goToStep(idx);
});

// Button navigation
document.getElementById('btn-next-1')?.addEventListener('native:press', () => goToStep(1));
document.getElementById('btn-prev-2')?.addEventListener('native:press', () => goToStep(0));
document.getElementById('btn-next-2')?.addEventListener('native:press', () => goToStep(2));
document.getElementById('btn-prev-3')?.addEventListener('native:press', () => goToStep(1));
document.getElementById('btn-submit')?.addEventListener('native:press', () => {
  alert('Account created successfully!');
});
