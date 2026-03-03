import { NativeElement } from '../core/native-element.ts';
import { ResizeController } from '../traits/resize-controller.ts';
// WHY: Import source directly — the package entry resolves to dist/native-tokens.js
// which pulls in dist/native-ui.js, creating dual-module conflicts in Vite dev.
import '../../packages/native-tokens/src/index.ts';
import '../../packages/native-chat/src/register.ts';
import foundationCss from '../styles/index.css?inline';
import componentsCss from '../styles/components.css?inline';
import layoutDevCss from '../styles/n-layout.css?inline';
import inspectorCss from '../../packages/native-tokens/src/tokens.css?inline';
import chatCss from '../../packages/native-chat/src/chat.css?inline';
import appCss from '../../packages/native-app/src/app.css?inline';
import sitemapData from './sitemap.json';

// Import component registrations
import '../components/button/button.ts';
import '../components/command/index.ts';
import '../components/dialog/dialog.ts';
import '../components/listbox/listbox.ts';
import '../components/listbox/option-group-header.ts';
import '../icons/icon.ts';
import '../icons/phosphor/sidebar-simple.ts';
import '../icons/phosphor/sidebar-simple-fill.ts';
import '../icons/phosphor/sun.ts';
import '../icons/phosphor/moon.ts';
import '../icons/phosphor/magnifying-glass.ts';
import '../icons/phosphor/compass.ts';
import '../icons/phosphor/cube.ts';
import '../icons/phosphor/package.ts';
import '../icons/phosphor/lightning.ts';
import '../icons/phosphor/squares-four.ts';
import '../icons/phosphor/chat-dots.ts';
import '../icons/phosphor/chat-dots-fill.ts';
import '../icons/phosphor/sliders-horizontal.ts';
import '../icons/phosphor/sliders-horizontal-fill.ts';
import '../../packages/native-app/src/index.ts';
import '../components/breadcrumb/breadcrumb.ts';
import '../icons/phosphor/caret-up-down.ts';
import '../icons/phosphor/plus.ts';
import '../icons/phosphor/user-circle.ts';
import '../icons/phosphor/gear.ts';
import '../icons/phosphor/sign-out.ts';
import '../icons/phosphor/sparkle.ts';
import '../icons/phosphor/credit-card.ts';
import '../icons/phosphor/bell.ts';
import '../icons/phosphor/cpu.ts';
import '../icons/phosphor/layout.ts';
import '../icons/phosphor/code.ts';
import '../icons/phosphor/code-fill.ts';
import '../icons/phosphor/command.ts';
import '../components/kbd/kbd.ts';

interface SitemapEntry {
  title: string;
  path: string;
  group: string;
}

const STORAGE_COLLAPSED = 'nav-sidebar-collapsed';
const STORAGE_COLOR_SCHEME = 'nav-color-scheme';
const STORAGE_GROUP_STATES = 'nav-group-states';
const STORAGE_WIDTH = 'nav-sidebar-width';

// WHY: Parse CSS once at module level — shared by all instances via adoptedStyleSheets.
// ?inline imports resolve @import chains at build time, so this is the full flattened CSS.
// The :host rule hides shadow children until setup() finishes building the shell.
// Uses visibility on children (not host) so the host still paints its background
// during view transitions — prevents a flash of bare body background.
const hostCss = ':host(:not([data-ready])) > * { visibility: hidden; }';
const layoutSheet = new CSSStyleSheet();
layoutSheet.replaceSync(hostCss + '\n' + foundationCss + '\n' + componentsCss + '\n' + appCss + '\n' + layoutDevCss + '\n' + inspectorCss + '\n' + chatCss);

export class NApp extends NativeElement {
  #keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  #chatObserver: MutationObserver | null = null;
  #inspectorObserver: MutationObserver | null = null;
  #inspectorResize: ResizeController | null = null;
  #chatResize: ResizeController | null = null;
  #chatPanel: HTMLElement | null = null;
  #inspectorPanel: HTMLElement | null = null;

  get chatPanel(): HTMLElement | null { return this.#chatPanel; }
  get inspectorPanel(): HTMLElement | null { return this.#inspectorPanel; }

  constructor() {
    super();
    // WHY: Shadow DOM with <slot> projects author content without moving it —
    // eliminates disconnect→reconnect cycles that caused event listener stacking.
    const shadow = this.attachShadow({ mode: 'open' });
    // WHY: adoptedStyleSheets is synchronous — CSS is available before first paint.
    // The sheet is parsed once at module level and shared across instances.
    shadow.adoptedStyleSheets = [layoutSheet];
    // WHY: Apply persisted visual state synchronously — runs before first paint
    // so the CSS placeholder width and color scheme match the final state.
    if (localStorage.getItem(STORAGE_COLLAPSED) === 'true') {
      this.setAttribute('collapsed', '');
    }
    const width = localStorage.getItem(STORAGE_WIDTH);
    if (width) this.style.setProperty('--n-app-sidebar-width', width);
    const scheme = localStorage.getItem(STORAGE_COLOR_SCHEME);
    if (scheme) document.documentElement.style.colorScheme = scheme;
  }

  setup(): void {
    super.setup();
    const shadow = this.shadowRoot!;

    const sitemap: SitemapEntry[] = sitemapData as SitemapEntry[];
    const currentPath = location.pathname;

    // Read persisted state (color scheme already applied in constructor)
    const isCollapsed = localStorage.getItem(STORAGE_COLLAPSED) === 'true';
    const storedScheme = localStorage.getItem(STORAGE_COLOR_SCHEME);

    // ── Build layout ──

    const layout = document.createElement('n-sidebar') as HTMLElement;
    if (isCollapsed) layout.setAttribute('collapsed', '');

    // ── Sidebar aside ──

    const sidebar = document.createElement('aside');
    sidebar.setAttribute('slot', 'sidebar');

    // Restore persisted width (only when not collapsed)
    const storedWidth = localStorage.getItem(STORAGE_WIDTH);
    if (storedWidth && !isCollapsed) sidebar.style.width = storedWidth;

    // Header — system menu item + popover
    const header = document.createElement('n-sidebar-header');

    const systemTrigger = document.createElement('n-sidebar-item');
    systemTrigger.innerHTML =
      '<span class="nav-logo" slot="icon"><svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="96" fill="currentColor"/><path d="M285.324 112.64H418.909V122.415C401.804 122.415 379.811 160.291 379.811 196.131V325.644C379.811 363.52 387.142 389.585 399.36 389.585V399.36H303.244L148.48 198.167V299.578C148.48 348.451 180.247 389.585 226.676 389.585V399.36H93.0909V389.585C110.196 389.585 132.189 351.709 132.189 315.869V166.807C132.189 129.745 110.196 122.415 93.0909 122.415V112.64H246.225V122.415C223.011 122.415 243.375 173.324 275.142 212.422L363.52 321.164V212.422C363.52 163.549 331.753 122.415 285.324 122.415V112.64Z" fill="var(--n-ground)"/></svg></span>' +
      '<span slot="label">NativeUI</span>' +
      '<n-icon name="caret-up-down" slot="trailing"></n-icon>' +
      '<n-listbox popover="manual">' +
        '<n-option-group>' +
          '<n-option-group-header>Teams</n-option-group-header>' +
          '<n-option value="native-ui" selected>' +
            '<span class="nav-logo"><svg width="16" height="16" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="96" fill="currentColor"/><path d="M285.324 112.64H418.909V122.415C401.804 122.415 379.811 160.291 379.811 196.131V325.644C379.811 363.52 387.142 389.585 399.36 389.585V399.36H303.244L148.48 198.167V299.578C148.48 348.451 180.247 389.585 226.676 389.585V399.36H93.0909V389.585C110.196 389.585 132.189 351.709 132.189 315.869V166.807C132.189 129.745 110.196 122.415 93.0909 122.415V112.64H246.225V122.415C223.011 122.415 243.375 173.324 275.142 212.422L363.52 321.164V212.422C363.52 163.549 331.753 122.415 285.324 122.415V112.64Z" fill="var(--n-ground)"/></svg></span>' +
            'NativeUI' +
          '</n-option>' +
        '</n-option-group>' +
        '<n-option-group>' +
          '<n-option value="add-team"><n-icon name="plus"></n-icon> Add team</n-option>' +
        '</n-option-group>' +
      '</n-listbox>';

    // Search hint — wrapped in sidebar-item for consistent inline padding
    const searchItem = document.createElement('n-sidebar-item');
    const searchIconWell = document.createElement('span');
    searchIconWell.setAttribute('slot', 'icon');
    searchIconWell.innerHTML = '<n-icon name="magnifying-glass"></n-icon>';
    const searchHint = document.createElement('n-button');
    searchHint.className = 'nav-search-hint';
    searchHint.setAttribute('size', 'md');
    searchHint.setAttribute('radius', 'default');
    searchHint.setAttribute('justify', 'spread');
    searchHint.innerHTML =
      '<n-icon name="magnifying-glass" slot="leading"></n-icon>' +
      '<span slot="label">Search</span>' +
      '<n-kbd slot="trailing"><n-icon name="command"></n-icon>K</n-kbd>';
    searchItem.addEventListener('click', () => openDialog());
    searchItem.append(searchIconWell, searchHint);

    header.append(systemTrigger, searchItem);

    // Content area (scrollable middle)
    const inner = document.createElement('n-sidebar-content');

    // Nav links
    const nav = document.createElement('n-sidebar-nav') as HTMLElement;
    nav.className = 'nav-links';
    nav.setAttribute('size', 'md');

    const groups = new Map<string, SitemapEntry[]>();
    for (const entry of sitemap) {
      if (!groups.has(entry.group)) groups.set(entry.group, []);
      groups.get(entry.group)!.push(entry);
    }

    let activeValue: string | null = null;

    // Restore persisted group open/closed states
    const groupStates: Record<string, boolean> = {};
    try {
      const stored = localStorage.getItem(STORAGE_GROUP_STATES);
      if (stored) Object.assign(groupStates, JSON.parse(stored));
    } catch { /* ignore */ }

    function persistGroupStates() {
      localStorage.setItem(STORAGE_GROUP_STATES, JSON.stringify(groupStates));
    }

    const groupIcons: Record<string, string> = {
      Components: 'cube',
      Containers: 'layout',
      Traits: 'lightning',
      Blocks: 'squares-four',
      Packages: 'package',
      Core: 'cpu',
      Other: 'compass',
    };

    for (const [groupName, entries] of groups) {
      const group = document.createElement('n-sidebar-group');

      // WHY: Default to collapsed for all groups except Components.
      // User-persisted state (from localStorage) overrides the default.
      const defaultOpen = groupName === 'Components';
      const isOpen = groupStates[groupName] ?? defaultOpen;
      if (!isOpen) (group as unknown as { open: boolean }).open = false;

      const groupHeader = document.createElement('n-sidebar-group-header');
      const iconName = groupIcons[groupName];
      if (iconName) {
        const icon = document.createElement('n-icon');
        icon.setAttribute('name', iconName);
        groupHeader.appendChild(icon);
      }
      groupHeader.appendChild(document.createTextNode(groupName));
      group.appendChild(groupHeader);

      for (const entry of entries) {
        const item = document.createElement('n-sidebar-nav-item');
        item.setAttribute('value', entry.path);
        item.textContent = entry.title;
        if (currentPath === entry.path) activeValue = entry.path;
        group.appendChild(item);
      }

      const obs = new MutationObserver(() => {
        groupStates[groupName] = group.hasAttribute('open');
        persistGroupStates();
      });
      obs.observe(group, { attributes: true, attributeFilter: ['open'] });

      nav.appendChild(group);
    }

    if (activeValue) nav.setAttribute('value', activeValue);

    nav.addEventListener('native:change', ((e: CustomEvent) => {
      window.location.href = e.detail.value;
    }) as EventListener);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'layout-resize-handle';

    inner.append(nav);

    // Footer — user menu trigger + popover
    const footer = document.createElement('n-sidebar-footer');

    const userTrigger = document.createElement('n-sidebar-item');
    userTrigger.innerHTML =
      '<span slot="icon"><n-icon name="user-circle"></n-icon></span>' +
      '<span slot="label">User</span>' +
      '<n-icon name="caret-up-down" slot="trailing"></n-icon>' +
      '<n-listbox popover="manual">' +
        '<n-option-group>' +
          '<n-option-group-header>Account</n-option-group-header>' +
          '<n-option value="upgrade"><n-icon name="sparkle"></n-icon> Upgrade to Pro</n-option>' +
          '<n-option value="account"><n-icon name="gear"></n-icon> Account</n-option>' +
          '<n-option value="billing"><n-icon name="credit-card"></n-icon> Billing</n-option>' +
          '<n-option value="notifications"><n-icon name="bell"></n-icon> Notifications</n-option>' +
        '</n-option-group>' +
        '<n-option-group>' +
          '<n-option value="sign-out"><n-icon name="sign-out"></n-icon> Log out</n-option>' +
        '</n-option-group>' +
      '</n-listbox>';

    footer.append(userTrigger);

    sidebar.append(header, inner, footer, resizeHandle);

    // Persist width on resize end
    sidebar.addEventListener('native:resize-end', () => {
      localStorage.setItem(STORAGE_WIDTH, sidebar.style.width);
    });

    // ── Content column ──

    // Breadcrumb bar
    const currentEntry = sitemap.find(e => e.path === currentPath);
    const breadcrumbBar = document.createElement('n-app-breadcrumb');

    // Leading: sidebar toggle
    const sidebarToggle = document.createElement('n-button');
    sidebarToggle.setAttribute('variant', 'ghost');
    sidebarToggle.setAttribute('size', 'sm');
    sidebarToggle.setAttribute('slot', 'leading');
    sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
    sidebarToggle.innerHTML = isCollapsed
      ? '<n-icon name="sidebar-simple-fill" size="md"></n-icon>'
      : '<n-icon name="sidebar-simple" size="md"></n-icon>';
    sidebarToggle.addEventListener('click', () => {
      const collapsed = layout.hasAttribute('collapsed');
      if (collapsed) {
        layout.removeAttribute('collapsed');
        const w = localStorage.getItem(STORAGE_WIDTH);
        if (w) sidebar.style.width = w;
        localStorage.setItem(STORAGE_COLLAPSED, 'false');
        sidebarToggle.innerHTML = '<n-icon name="sidebar-simple" size="md"></n-icon>';
      } else {
        sidebar.style.removeProperty('width');
        layout.setAttribute('collapsed', '');
        localStorage.setItem(STORAGE_COLLAPSED, 'true');
        sidebarToggle.innerHTML = '<n-icon name="sidebar-simple-fill" size="md"></n-icon>';
      }
    });

    // Center: breadcrumb
    const breadcrumb = document.createElement('n-breadcrumb');
    if (currentEntry) {
      const groupItem = document.createElement('n-breadcrumb-item');
      groupItem.textContent = currentEntry.group;
      const pageItem = document.createElement('n-breadcrumb-item');
      pageItem.setAttribute('current', '');
      pageItem.textContent = currentEntry.title;
      breadcrumb.append(groupItem, pageItem);
    }

    // Trailing actions
    const trailingActions = document.createElement('div');
    trailingActions.setAttribute('slot', 'trailing');
    trailingActions.style.display = 'flex';
    trailingActions.style.alignItems = 'center';
    trailingActions.style.gap = '0.125rem';

    // Inspector toggle
    const inspectorToggle = document.createElement('n-button');
    inspectorToggle.setAttribute('variant', 'ghost');
    inspectorToggle.setAttribute('size', 'sm');
    inspectorToggle.setAttribute('aria-label', 'Toggle inspector');
    inspectorToggle.innerHTML = '<n-icon name="sliders-horizontal" size="md"></n-icon>';
    inspectorToggle.addEventListener('click', () => {
      inspector.toggleAttribute('open');
    });

    // Chat toggle
    const chatToggle = document.createElement('n-button');
    chatToggle.setAttribute('variant', 'ghost');
    chatToggle.setAttribute('size', 'sm');
    chatToggle.setAttribute('aria-label', 'Toggle chat');
    chatToggle.innerHTML = '<n-icon name="chat-dots" size="md"></n-icon>';
    chatToggle.addEventListener('click', () => {
      chat.toggleAttribute('open');
    });

    // Code toggle — drives the page's `.demo-code` blocks.
    // WHY: Persists via `demo-show-code` localStorage key across pages.
    // Only shown on pages that have `.demo-code` blocks — detected via slotchange.
    const CODE_STORAGE = 'demo-show-code';
    const codeVisible = localStorage.getItem(CODE_STORAGE) === 'true';
    const codeToggle = document.createElement('n-button');
    codeToggle.setAttribute('variant', 'ghost');
    codeToggle.setAttribute('size', 'sm');
    codeToggle.setAttribute('aria-label', 'Toggle source code');
    codeToggle.style.display = 'none'; // hidden until we confirm page has code blocks
    codeToggle.innerHTML = codeVisible
      ? '<n-icon name="code-fill" size="md"></n-icon>'
      : '<n-icon name="code" size="md"></n-icon>';

    // Theme toggle
    const isDark = storedScheme
      ? storedScheme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    const themeToggle = document.createElement('n-button');
    themeToggle.setAttribute('variant', 'ghost');
    themeToggle.setAttribute('size', 'sm');
    themeToggle.setAttribute('aria-label', 'Toggle color scheme');
    themeToggle.innerHTML = isDark
      ? '<n-icon name="sun" size="md"></n-icon>'
      : '<n-icon name="moon" size="md"></n-icon>';
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.style.colorScheme;
      const currentIsDark = current === 'dark' ||
        (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = currentIsDark ? 'light' : 'dark';
      document.documentElement.style.colorScheme = next;
      localStorage.setItem(STORAGE_COLOR_SCHEME, next);
      themeToggle.innerHTML = next === 'dark'
        ? '<n-icon name="sun" size="md"></n-icon>'
        : '<n-icon name="moon" size="md"></n-icon>';
    });

    trailingActions.append(inspectorToggle, chatToggle, codeToggle, themeToggle);
    breadcrumbBar.append(sidebarToggle, breadcrumb, trailingActions);

    // Canvas (body + chat)
    const canvas = document.createElement('n-app-canvas');

    const body = document.createElement('n-panel');
    // WHY: <slot> projects author's <main> from light DOM without moving it —
    // no disconnect→reconnect cycle on nested custom elements.
    const slot = document.createElement('slot');

    body.appendChild(slot);

    function syncCodeState(show: boolean) {
      localStorage.setItem(CODE_STORAGE, String(show));
      codeToggle.innerHTML = show
        ? '<n-icon name="code-fill" size="md"></n-icon>'
        : '<n-icon name="code" size="md"></n-icon>';
      const demoBlocks = document.querySelectorAll('.demo-code');
      for (const block of demoBlocks) {
        if (show) block.setAttribute('visible', '');
        else block.removeAttribute('visible');
      }
    }

    // WHY: `slotchange` fires when light DOM children are actually projected
    // into the slot — guaranteed to fire after the content is available.
    // Check if this page has `.demo-code` blocks; if so, show the toggle
    // and apply persisted state. Pages without code blocks never see the button.
    slot.addEventListener('slotchange', () => {
      if (document.querySelectorAll('.demo-code').length > 0) {
        codeToggle.style.display = '';
        if (codeVisible) syncCodeState(true);
      }
    }, { once: true });

    codeToggle.addEventListener('click', () => {
      const willShow = localStorage.getItem(CODE_STORAGE) !== 'true';
      syncCodeState(willShow);
    });

    // WHY: Popover handles render in the top layer (escape overflow: clip).
    // JS syncs their fixed position to the aside's bounding rect.
    const syncHandlePosition = (aside: HTMLElement, handle: HTMLElement) => {
      const rect = aside.getBoundingClientRect();
      handle.style.top = `${rect.top}px`;
      handle.style.left = `${rect.left}px`;
      handle.style.height = `${rect.height}px`;
    };

    // Inspector panel — stamped panel IS the aside (no wrapper)
    const inspector = document.createElement('native-tokens-panel');
    inspector.setAttribute('aside', '');
    this.#inspectorPanel = inspector;
    const inspectorResizeHandle = document.createElement('div');
    inspectorResizeHandle.className = 'layout-resize-handle';
    inspectorResizeHandle.setAttribute('popover', 'manual');
    inspector.prepend(inspectorResizeHandle);
    this.#inspectorResize = new ResizeController(inspector, {
      handleSelector: '.layout-resize-handle',
      axis: 'horizontal',
      min: 280,
      max: 480,
      reverse: true,
    });

    // WHY: ResizeObserver keeps handle pinned during resize dragging + transitions.
    new ResizeObserver(() => {
      if (inspector.hasAttribute('open')) syncHandlePosition(inspector, inspectorResizeHandle);
    }).observe(inspector);

    // WHY: Sync toggle icon + popover handle when inspector opens/closes.
    this.#inspectorObserver = new MutationObserver(() => {
      const isOpen = inspector.hasAttribute('open');
      inspectorToggle.innerHTML = isOpen
        ? '<n-icon name="sliders-horizontal-fill" size="md"></n-icon>'
        : '<n-icon name="sliders-horizontal" size="md"></n-icon>';
      if (isOpen) {
        inspectorResizeHandle.showPopover();
        syncHandlePosition(inspector, inspectorResizeHandle);
      } else {
        try { inspectorResizeHandle.hidePopover(); } catch { /* already hidden */ }
      }
    });
    this.#inspectorObserver.observe(inspector, { attributes: true, attributeFilter: ['open'] });

    // Chat panel — stamped panel IS the aside (no wrapper)
    const chat = document.createElement('native-chat-panel');
    chat.setAttribute('aside', '');
    chat.setAttribute('size', 'md');
    this.#chatPanel = chat;
    const chatResizeHandle = document.createElement('div');
    chatResizeHandle.className = 'layout-resize-handle';
    chatResizeHandle.setAttribute('popover', 'manual');
    chat.prepend(chatResizeHandle);
    this.#chatResize = new ResizeController(chat, {
      handleSelector: '.layout-resize-handle',
      axis: 'horizontal',
      min: 280,
      max: 480,
      reverse: true,
    });

    // WHY: ResizeObserver keeps handle pinned during resize dragging + transitions.
    new ResizeObserver(() => {
      if (chat.hasAttribute('open')) syncHandlePosition(chat, chatResizeHandle);
    }).observe(chat);

    // WHY: Sync toggle icon + popover handle when chat opens/closes.
    this.#chatObserver = new MutationObserver(() => {
      const isOpen = chat.hasAttribute('open');
      chatToggle.innerHTML = isOpen
        ? '<n-icon name="chat-dots-fill" size="md"></n-icon>'
        : '<n-icon name="chat-dots" size="md"></n-icon>';
      if (isOpen) {
        chatResizeHandle.showPopover();
        syncHandlePosition(chat, chatResizeHandle);
      } else {
        try { chatResizeHandle.hidePopover(); } catch { /* already hidden */ }
      }
    });
    this.#chatObserver.observe(chat, { attributes: true, attributeFilter: ['open'] });

    canvas.append(body, inspector, chat);

    // WHY: Content column is structural (not semantic) — plain div, not <main>.
    const contentCol = document.createElement('div');
    contentCol.append(breadcrumbBar, canvas);

    // Assemble layout
    layout.append(sidebar, contentCol);

    // WHY: Append to shadow root — author content stays in light DOM, projected via <slot>.
    shadow.appendChild(layout);
    // WHY: Reveal the layout now that the shell is fully built — matches :host(:not([data-ready])) hide rule.
    this.dataset.ready = '';

    // ── Command Dialog ──

    const dialog = document.createElement('n-dialog') as HTMLElement & { showModal(): void; close(): void; open: boolean };
    dialog.className = 'nav-cmd-dialog';

    const cmdHtml = sitemap.map(entry =>
      `<n-command-item value="${entry.path}" keywords="${entry.group}">${entry.title}</n-command-item>`
    ).join('\n');

    dialog.innerHTML = `
      <n-command>
        <n-command-input>
          <n-icon name="magnifying-glass"></n-icon>
          <input type="text" placeholder="Search pages..." />
        </n-command-input>
        <n-command-list>
          ${cmdHtml}
        </n-command-list>
        <n-command-empty>No pages found.</n-command-empty>
      </n-command>
    `;
    sidebar.appendChild(dialog);

    const uiCommand = dialog.querySelector('n-command')!;

    uiCommand.addEventListener('native:change', ((e: CustomEvent) => {
      dialog.close();
      window.location.href = e.detail.value;
    }) as EventListener);

    dialog.addEventListener('close', () => {
      const input = dialog.querySelector<HTMLInputElement>('n-command-input input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    function openDialog() {
      dialog.showModal();
      requestAnimationFrame(() => {
        dialog.querySelector<HTMLInputElement>('n-command-input input')?.focus();
      });
    }

    // ── Keyboard shortcut: Cmd+K / Ctrl+K ──

    this.#keydownHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (dialog.open) {
          dialog.close();
        } else {
          openDialog();
        }
      }
    };
    document.addEventListener('keydown', this.#keydownHandler);
  }

  teardown(): void {
    if (this.#keydownHandler) {
      document.removeEventListener('keydown', this.#keydownHandler);
      this.#keydownHandler = null;
    }
    this.#chatObserver?.disconnect();
    this.#chatObserver = null;
    this.#inspectorObserver?.disconnect();
    this.#inspectorObserver = null;
    this.#inspectorResize?.destroy();
    this.#inspectorResize = null;
    this.#chatResize?.destroy();
    this.#chatResize = null;
    this.#inspectorPanel = null;
    this.#chatPanel = null;
    super.teardown();
  }
}
