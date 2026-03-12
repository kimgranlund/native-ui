// ── Demo 1: Basic (static connections) ──

const basic = document.getElementById('demo-basic') as HTMLElement & {
  connect(from: string, to: string, fromPort?: string, toPort?: string): string;
};

// Wait for element to be defined, then connect
customElements.whenDefined('n-noodles').then(() => {
  basic.connect('b-start', 'b-mid', 'right', 'left');
  basic.connect('b-start', 'b-mid2', 'right', 'left');
  basic.connect('b-mid', 'b-end', 'right', 'left');
  basic.connect('b-mid2', 'b-end', 'right', 'left');
});

// ── Demo 2: Editable ──

const editable = document.getElementById('demo-editable') as HTMLElement & {
  connections: unknown[];
  connect(from: string, to: string, fromPort?: string, toPort?: string): string;
  clear(): void;
};
const editStatus = document.getElementById('edit-status')!;

function updateStatus(): void {
  const count = editable.connections.length;
  editStatus.textContent = `${count} connection${count !== 1 ? 's' : ''}`;
}

customElements.whenDefined('n-noodles').then(() => {
  editable.connect('e-input', 'e-validate', 'right', 'left');
  updateStatus();
});

editable.addEventListener('native:noodle-connect', updateStatus);
editable.addEventListener('native:noodle-disconnect', updateStatus);

document.getElementById('edit-clear')!.addEventListener('native:press', () => {
  editable.clear();
  updateStatus();
});

// ── Demo 3: Styled ──

const styled = document.getElementById('demo-styled') as HTMLElement & {
  connect(from: string, to: string, fromPort?: string, toPort?: string): string;
  setConnections(c: { id: string; from: string; to: string; fromPort: string; toPort: string; color?: string }[]): void;
};

customElements.whenDefined('n-noodles').then(() => {
  styled.setConnections([
    { id: 's-1', from: 's-a', to: 's-b', fromPort: 'right', toPort: 'left' },
    { id: 's-2', from: 's-a', to: 's-c', fromPort: 'bottom', toPort: 'left', color: 'var(--n-color-warning-500)' },
    { id: 's-3', from: 's-b', to: 's-d', fromPort: 'right', toPort: 'left' },
    { id: 's-4', from: 's-c', to: 's-d', fromPort: 'right', toPort: 'left', color: 'var(--n-color-danger-500)' },
  ]);
});

// Curve style buttons
for (const curve of ['bezier', 'step', 'straight'] as const) {
  document.getElementById(`style-${curve}`)!.addEventListener('native:press', () => {
    styled.setAttribute('curve', curve);
  });
}

// Animate toggle
let animating = false;
document.getElementById('style-animate')!.addEventListener('native:press', () => {
  animating = !animating;
  if (animating) {
    styled.setAttribute('animated', '');
  } else {
    styled.removeAttribute('animated');
  }
});

// ── Copy buttons ──

document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('native:press', () => {
    const code = btn.closest('.demo-code')?.querySelector('code');
    if (code) navigator.clipboard.writeText(code.textContent ?? '');
  });
});
