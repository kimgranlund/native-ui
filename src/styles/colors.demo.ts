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

/* ── Config ── */

const families = ["neutral", "accent", "info", "success", "warning", "danger"];

const envParams = [
  { key: "n-env-lightness-min", label: "L min", min: 0, max: 1, step: 0.01, group: "Lightness" },
  { key: "n-env-lightness-max", label: "L max", min: 0, max: 1, step: 0.01, group: "Lightness" },
  { key: "n-env-lightness-delta", label: "L delta", min: 0, max: 0.15, step: 0.005, group: "Lightness" },
  { key: "n-env-chroma", label: "C", min: 0, max: 0.5, step: 0.005, group: "Chroma" },
  { key: "n-env-chroma-k-muted", label: "C muted", min: 0, max: 1, step: 0.01, group: "Chroma" },
  { key: "n-env-chroma-k-vivid", label: "C vivid", min: 0, max: 1, step: 0.01, group: "Chroma" },
  { key: "n-env-chroma-k-edge", label: "C edge", min: 0, max: 1, step: 0.01, group: "Chroma" },
  { key: "n-env-alpha", label: "A", min: 0, max: 1, step: 0.01, group: "Alpha" },
  { key: "n-env-alpha-delta", label: "A delta", min: 0, max: 0.15, step: 0.005, group: "Alpha" },
];

const familyParams = [
  { suffix: "hue", label: "Hue", min: 0, max: 360, step: 1 },
  { suffix: "chroma", label: "Chroma", min: 0, max: 1, step: 0.01 },
  { suffix: "lightness", label: "Lightness", min: 0, max: 1, step: 0.01 },
];

const elevations = ["lowest", "lower", "low", "base", "high", "higher", "highest"];
const brightnesses = ["brightest", "brighter", "bright", "base", "dim", "dimmer", "dimmest"];

const allSteps = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
const lightSteps = ["1", "2", "3", "4", "5"];

const root = document.documentElement;

/* ── Helpers ── */

function getVar(name: string): string {
  return getComputedStyle(root)
    .getPropertyValue("--" + name)
    .trim();
}

function setVar(name: string, val: string): void {
  root.style.setProperty("--" + name, val);
}

function paintTrack(input: HTMLInputElement): void {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  const pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
  const stop = `calc(3px + ${pct} * (100% - 6px) / 100)`;
  input.style.setProperty("--track-fill", `linear-gradient(to right, var(--n-color-neutral-950) ${stop}, rgba(128,128,128,0.25) ${stop})`);
}

interface SliderEntry {
  key: string;
  step: number;
  input: HTMLInputElement;
  valSpan: HTMLSpanElement;
}

const allSliders: SliderEntry[] = [];

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

function createSlider({ key, label, min, max, step }: SliderConfig, container: HTMLElement): void {
  const row = document.createElement("div");
  row.className = "slider-row";

  const lbl = document.createElement("label");
  lbl.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = getVar(key) || "0";

  const valSpan = document.createElement("span");
  valSpan.className = "slider-value";
  valSpan.textContent = parseFloat(input.value).toFixed(step < 0.01 ? 3 : 2);

  input.addEventListener("input", () => {
    setVar(key, input.value);
    valSpan.textContent = parseFloat(input.value).toFixed(step < 0.01 ? 3 : 2);
    paintTrack(input);
  });

  allSliders.push({ key, step, input, valSpan });

  row.append(lbl, input, valSpan);
  container.appendChild(row);
  paintTrack(input);
}

function syncSliders(): void {
  allSliders.forEach(({ key, step, input, valSpan }) => {
    const v = getVar(key);
    if (v) {
      input.value = v;
      valSpan.textContent = parseFloat(v).toFixed(step < 0.01 ? 3 : 2);
      paintTrack(input);
    }
  });
}

/* ── Adjustments ── */

const globalContainer = document.getElementById("adjustments")!;
let currentGroup = "";

envParams.forEach((p) => {
  if (p.group !== currentGroup) {
    currentGroup = p.group;
    const h = document.createElement("div");
    h.className = "adjustment-group";
    const title = document.createElement("h3");
    title.textContent = p.group;
    h.appendChild(title);
    globalContainer.appendChild(h);
  }
  const group = globalContainer.lastElementChild as HTMLElement;
  createSlider(p, group);
});

/* ── Family sections ── */

const familiesContainer = document.getElementById("families")!;

/* Icon SVG helpers */
const svg = (d: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const iconPlus = svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');
const iconCheck = svg('<polyline points="20 6 9 17 4 12"/>');
const iconTrash = svg(
  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
);
const iconEdit = svg('<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>');
const iconSearch = svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>');
const iconChevron = svg('<polyline points="6 9 12 15 18 9"/>');

families.forEach((fam) => {
  const section = document.createElement("div");
  section.className = "family-section";

  /* Title + per-family sliders */
  const title = document.createElement("div");
  title.className = "family-title";
  title.textContent = fam;
  section.appendChild(title);

  const sliderWrap = document.createElement("div");
  sliderWrap.style.marginTop = "0.375rem";
  sliderWrap.style.marginBottom = "0.25rem";
  familyParams.forEach((p) => {
    createSlider({ key: `n-env-${p.suffix}-${fam}`, label: p.label, min: p.min, max: p.max, step: p.step }, sliderWrap);
  });
  section.appendChild(sliderWrap);

  /* ═══════════════════════════════
     SURFACES
     ═══════════════════════════════ */

  const surfH = document.createElement("h2");
  surfH.textContent = "Surfaces";
  section.appendChild(surfH);

  /* Elevation */
  const elevWrap = document.createElement("div");
  elevWrap.className = "swatch-row-wrap";

  const elevLabel = document.createElement("h3");
  elevLabel.textContent = "Elevation";
  elevWrap.appendChild(elevLabel);

  const elevGrid = document.createElement("div");
  elevGrid.className = "swatch-grid swatch-grid-7";
  elevations.forEach((e) => {
    const s = document.createElement("div");
    s.className = "swatch";
    s.style.background = `var(--n-color-${fam}-${e})`;
    s.style.color = `var(--n-color-${fam}-950)`;
    s.textContent = e;
    elevGrid.appendChild(s);
  });
  elevWrap.appendChild(elevGrid);
  section.appendChild(elevWrap);

  /* Brightness */
  const brightWrap = document.createElement("div");
  brightWrap.className = "swatch-row-wrap";

  const brightLabel = document.createElement("h3");
  brightLabel.textContent = "Brightness";
  brightWrap.appendChild(brightLabel);

  const brightGrid = document.createElement("div");
  brightGrid.className = "swatch-grid swatch-grid-7";
  brightnesses.forEach((b) => {
    const s = document.createElement("div");
    s.className = "swatch";
    s.style.background = `var(--n-color-${fam}-${b})`;
    s.style.color = `var(--n-color-${fam}-950)`;
    s.textContent = b;
    brightGrid.appendChild(s);
  });
  brightWrap.appendChild(brightGrid);
  section.appendChild(brightWrap);

  /* ═══════════════════════════════
     SOLIDS (Color Ramp)
     ═══════════════════════════════ */

  const colH = document.createElement("h2");
  colH.textContent = "Solids";
  section.appendChild(colH);

  /* Solid row */
  const solidWrap = document.createElement("div");
  solidWrap.className = "swatch-row-wrap";
  const solidLabel = document.createElement("h3");
  solidLabel.textContent = "Solid";
  solidWrap.appendChild(solidLabel);

  const solidGrid = document.createElement("div");
  solidGrid.className = "swatch-grid";
  allSteps.forEach((n) => {
    const s = document.createElement("div");
    s.className = "swatch";
    s.style.background = `var(--n-color-${fam}-${n})`;
    s.style.color = lightSteps.includes(n) ? `var(--n-color-${fam}-11)` : `var(--n-color-${fam}-1)`;
    s.textContent = n;
    if (n === "6") s.style.fontWeight = "700";
    solidGrid.appendChild(s);
  });
  solidWrap.appendChild(solidGrid);
  section.appendChild(solidWrap);

  /* Scrim row */
  const scrimWrap = document.createElement("div");
  scrimWrap.className = "swatch-row-wrap";
  const scrimLabel = document.createElement("h3");
  scrimLabel.textContent = "Scrim";
  scrimWrap.appendChild(scrimLabel);

  const scrimGrid = document.createElement("div");
  scrimGrid.className = "swatch-grid";
  allSteps.forEach((n) => {
    const s = document.createElement("div");
    s.className = "swatch swatch-scrim";
    s.style.setProperty("--scrim-color", `linear-gradient(var(--n-color-${fam}-${n}-scrim), var(--n-color-${fam}-${n}-scrim))`);
    s.style.color = lightSteps.includes(n) ? `var(--n-color-${fam}-11)` : `var(--n-color-${fam}-1)`;
    s.textContent = n;
    scrimGrid.appendChild(s);
  });
  scrimWrap.appendChild(scrimGrid);
  section.appendChild(scrimWrap);

  /* ── Semantic (050–950, light-dark aware) ── */

  const semSteps = ["050", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
  const semLightSteps = ["050", "100", "200", "300", "400"];

  const semH = document.createElement("h2");
  semH.textContent = "Semantic (light-dark)";
  section.appendChild(semH);

  /* Semantic solid row */
  const semSolidWrap = document.createElement("div");
  semSolidWrap.className = "swatch-row-wrap";
  const semSolidLabel = document.createElement("h3");
  semSolidLabel.textContent = "Solid";
  semSolidWrap.appendChild(semSolidLabel);

  const semSolidGrid = document.createElement("div");
  semSolidGrid.className = "swatch-grid";
  semSteps.forEach((n) => {
    const s = document.createElement("div");
    s.className = "swatch";
    s.style.background = `var(--n-color-${fam}-${n})`;
    s.style.color = semLightSteps.includes(n) ? `var(--n-color-${fam}-950)` : `var(--n-color-${fam}-050)`;
    s.textContent = n;
    if (n === "500") s.style.fontWeight = "700";
    semSolidGrid.appendChild(s);
  });
  semSolidWrap.appendChild(semSolidGrid);
  section.appendChild(semSolidWrap);

  /* Semantic scrim row */
  const semScrimWrap = document.createElement("div");
  semScrimWrap.className = "swatch-row-wrap";
  const semScrimLabel = document.createElement("h3");
  semScrimLabel.textContent = "Scrim";
  semScrimWrap.appendChild(semScrimLabel);

  const semScrimGrid = document.createElement("div");
  semScrimGrid.className = "swatch-grid";
  semSteps.forEach((n) => {
    const s = document.createElement("div");
    s.className = "swatch swatch-scrim";
    s.style.setProperty("--scrim-color", `linear-gradient(var(--n-color-${fam}-${n}-scrim), var(--n-color-${fam}-${n}-scrim))`);
    s.style.color = semLightSteps.includes(n) ? `var(--n-color-${fam}-950)` : `var(--n-color-${fam}-050)`;
    s.textContent = n;
    semScrimGrid.appendChild(s);
  });
  semScrimWrap.appendChild(semScrimGrid);
  section.appendChild(semScrimWrap);

  /* ── Scrim palette — Tint & Shade ── */

  const scrimPaletteSteps = ["strongest", "stronger", "strong", "base", "weak", "weaker", "weakest"];

  const scrimPalH = document.createElement("h2");
  scrimPalH.textContent = "Scrim Palette";
  section.appendChild(scrimPalH);

  /* Tint row */
  const tintWrap = document.createElement("div");
  tintWrap.className = "swatch-row-wrap";
  const tintLabel = document.createElement("h3");
  tintLabel.textContent = "Tint";
  tintWrap.appendChild(tintLabel);

  const tintGrid = document.createElement("div");
  tintGrid.className = "swatch-grid swatch-grid-7";
  scrimPaletteSteps.forEach((step) => {
    const s = document.createElement("div");
    s.className = "swatch swatch-scrim";
    s.style.setProperty("--scrim-color", `linear-gradient(var(--n-color-${fam}-scrim-tint-${step}), var(--n-color-${fam}-scrim-tint-${step}))`);
    s.style.color = `var(--n-color-${fam}-11)`;
    s.textContent = step;
    tintGrid.appendChild(s);
  });
  tintWrap.appendChild(tintGrid);
  section.appendChild(tintWrap);

  /* Shade row */
  const shadeWrap = document.createElement("div");
  shadeWrap.className = "swatch-row-wrap";
  const shadeLabel = document.createElement("h3");
  shadeLabel.textContent = "Shade";
  shadeWrap.appendChild(shadeLabel);

  const shadeGrid = document.createElement("div");
  shadeGrid.className = "swatch-grid swatch-grid-7";
  scrimPaletteSteps.forEach((step) => {
    const s = document.createElement("div");
    s.className = "swatch swatch-scrim";
    s.style.setProperty("--scrim-color", `linear-gradient(var(--n-color-${fam}-scrim-shade-${step}), var(--n-color-${fam}-scrim-shade-${step}))`);
    s.style.color = `var(--n-color-${fam}-1)`;
    s.textContent = step;
    shadeGrid.appendChild(s);
  });
  shadeWrap.appendChild(shadeGrid);
  section.appendChild(shadeWrap);

  /* ═══════════════════════════════
     UI EXAMPLES
     ═══════════════════════════════ */

  const uiH = document.createElement("h2");
  uiH.textContent = "UI Examples";
  section.appendChild(uiH);

  /* Buttons row — uses ui.button.css via variant/intent attributes */
  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";
  btnRow.style.cssText = "display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;";
  btnRow.setAttribute("intent", fam);
  btnRow.setAttribute("size", "md");

  const btnDefs = [
    { label: "Primary", variant: "primary", icon: iconPlus },
    { label: "Secondary", variant: "secondary", icon: iconCheck },
    { label: "Default", variant: "default", icon: iconEdit },
    { label: "Ghost", variant: "ghost", icon: iconSearch },
    { label: "Outline", variant: "outline", icon: iconChevron },
    { label: null, variant: "primary", icon: iconTrash },
  ];

  btnDefs.forEach((d) => {
    const btn = document.createElement("button");
    btn.setAttribute("variant", d.variant);

    const leading = document.createElement("span");
    leading.setAttribute("slot", "leading");
    leading.innerHTML = d.icon;
    btn.appendChild(leading);

    if (d.label) {
      const label = document.createElement("span");
      label.setAttribute("slot", "label");
      label.textContent = d.label;
      btn.appendChild(label);
    }

    btnRow.appendChild(btn);
  });

  section.appendChild(btnRow);

  /* Profile card */
  const card = document.createElement("div");
  card.style.cssText = `background: var(--n-card-${fam}); border: 1px solid var(--n-border-muted-${fam}); border-radius: 0.5rem; padding: 1rem; max-width: 280px;`;

  const cardHeader = document.createElement("div");
  cardHeader.style.cssText = "display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;";

  const avatar = document.createElement("div");
  avatar.style.cssText = `width: 40px; height: 40px; border-radius: 50%; background: var(--n-surface-${fam}); color: var(--n-surface-ink-${fam}); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; flex-shrink: 0;`;
  avatar.textContent = "JD";

  const nameWrap = document.createElement("div");

  const name = document.createElement("div");
  name.style.cssText = `font-weight: 700; font-size: 0.875rem; color: var(--n-ink-strong-${fam});`;
  name.textContent = "Jane Doe";

  const role = document.createElement("div");
  role.style.cssText = `font-size: 0.75rem; color: var(--n-ink-muted-${fam});`;
  role.textContent = "Product Designer";

  nameWrap.append(name, role);
  cardHeader.append(avatar, nameWrap);

  const bio = document.createElement("div");
  bio.style.cssText = `font-size: 0.75rem; color: var(--n-ink-${fam}); margin-bottom: 0.75rem; line-height: 1.4;`;
  bio.textContent = "Crafting interfaces that balance form and function. Passionate about design systems and color theory.";

  const statsRow = document.createElement("div");
  statsRow.style.cssText = "display: flex; gap: 1rem;";

  (
    [
      ["128", "Posts"],
      ["2.4k", "Followers"],
      ["312", "Following"],
    ] as [string, string][]
  ).forEach(([num, label]) => {
    const stat = document.createElement("div");
    stat.style.cssText = "text-align: center;";

    const n = document.createElement("div");
    n.style.cssText = `font-weight: 700; font-size: 0.875rem; color: var(--n-ink-strong-${fam});`;
    n.textContent = num;

    const l = document.createElement("div");
    l.style.cssText = `font-size: 0.625rem; color: var(--n-ink-muted-${fam});`;
    l.textContent = label;

    stat.append(n, l);
    statsRow.appendChild(stat);
  });

  card.append(cardHeader, bio, statsRow);
  section.appendChild(card);

  familiesContainer.appendChild(section);
});

/* ── Theme select ── */

const themeSelect = document.getElementById("theme-select")!;
themeSelect.addEventListener("native:change", (e: Event) => {
  const val = (e as CustomEvent).detail.value;
  if (val) {
    root.setAttribute("theme", val);
  } else {
    root.removeAttribute("theme");
  }
  // Clear inline overrides so theme values take effect
  allSliders.forEach(({ key }) => root.style.removeProperty("--" + key));
  // Let computed styles settle, then sync sliders
  requestAnimationFrame(() => syncSliders());
});

/* ── Color scheme select ── */

const schemeSelect = document.getElementById("scheme-select")!;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const storedScheme = localStorage.getItem("color-scheme");

function applyScheme(scheme: string): void {
  if (scheme === "system") {
    root.style.removeProperty("colorScheme");
    localStorage.removeItem("color-scheme");
  } else {
    root.style.colorScheme = scheme;
    localStorage.setItem("color-scheme", scheme);
  }
}

// Apply stored preference on load
if (storedScheme) {
  applyScheme(storedScheme);
  (schemeSelect as HTMLElement & { value: string }).value = storedScheme;
}

schemeSelect.addEventListener("native:change", (e: Event) => {
  applyScheme((e as CustomEvent).detail.value);
});

systemDark.addEventListener("change", () => {
  if (!localStorage.getItem("color-scheme")) {
    // System scheme changed, no explicit override — just re-sync sliders
    requestAnimationFrame(() => syncSliders());
  }
});
