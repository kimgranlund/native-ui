import { UIElement } from '../core/ui-element.ts';
import type { UILayoutChat } from '../containers/ui-layout-chat/ui-layout-chat-element.ts';
import type { UILayoutInspector } from '../containers/ui-layout-inspector/ui-layout-inspector-element.ts';
import { buildInspector } from './inspector/build-inspector.ts';
import foundationCss from '../styles/index.css?inline';
import componentsCss from '../styles/components.css?inline';
import layoutDevCss from '../styles/ui-layout.css?inline';
import inspectorCss from './inspector/ds-inspector.css?inline';
import sitemapData from './sitemap.json';

// Import component registrations
import '../components/ui-button/ui-button.ts';
import '../components/ui-command/index.ts';
import '../components/ui-dialog/ui-dialog.ts';
import '../components/ui-listbox/ui-listbox.ts';
import '../components/ui-listbox/ui-option-group-header.ts';
import '../icons/ui-icon.ts';
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
import '../components/ui-nav/ui-nav.ts';
import '../components/ui-breadcrumb/ui-breadcrumb.ts';
import '../containers/ui-layout-sidebar/ui-layout-sidebar.ts';
import '../containers/ui-layout-chat/ui-layout-chat.ts';
import '../containers/ui-layout-inspector/ui-layout-inspector.ts';
import '../icons/phosphor/caret-up-down.ts';
import '../icons/phosphor/plus.ts';
import '../icons/phosphor/user.ts';
import '../icons/phosphor/gear.ts';
import '../icons/phosphor/sign-out.ts';
import '../icons/phosphor/sparkle.ts';
import '../icons/phosphor/credit-card.ts';
import '../icons/phosphor/bell.ts';
import '../icons/phosphor/cpu.ts';
import '../icons/phosphor/code.ts';
import '../icons/phosphor/code-fill.ts';

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
layoutSheet.replaceSync(hostCss + '\n' + foundationCss + '\n' + componentsCss + '\n' + layoutDevCss + '\n' + inspectorCss);

export class UILayout extends UIElement {
  #keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  #chatObserver: MutationObserver | null = null;
  #inspectorObserver: MutationObserver | null = null;

  get chatPanel(): UILayoutChat | null {
    return this.shadowRoot?.querySelector('ui-layout-chat') as UILayoutChat | null;
  }

  get inspectorPanel(): UILayoutInspector | null {
    return this.shadowRoot?.querySelector('ui-layout-inspector') as UILayoutInspector | null;
  }

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
    if (width) this.style.setProperty('--ui-layout-sidebar-width', width);
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

    const layout = document.createElement('ui-layout-sidebar') as HTMLElement;
    if (isCollapsed) layout.setAttribute('collapsed', '');

    // ── Sidebar aside ──

    const sidebar = document.createElement('aside');
    sidebar.setAttribute('slot', 'sidebar');

    // Restore persisted width (only when not collapsed)
    const storedWidth = localStorage.getItem(STORAGE_WIDTH);
    if (storedWidth && !isCollapsed) sidebar.style.width = storedWidth;

    // Header — system menu trigger + popover
    const header = document.createElement('ui-layout-sidebar-header');

    const systemTrigger = document.createElement('ui-layout-sidebar-trigger');
    systemTrigger.innerHTML =
      '<span class="nav-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="2"/><path d="M8 16V8l8 8V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span slot="label">NativeUI</span>' +
      '<ui-icon name="caret-up-down" slot="trailing"></ui-icon>' +
      '<ui-listbox popover="manual">' +
        '<ui-option-group>' +
          '<ui-option-group-header>Teams</ui-option-group-header>' +
          '<ui-option value="native-ui" selected>' +
            '<span class="nav-logo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="2"/><path d="M8 16V8l8 8V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
            'NativeUI' +
          '</ui-option>' +
        '</ui-option-group>' +
        '<ui-option-group>' +
          '<ui-option value="add-team"><ui-icon name="plus"></ui-icon> Add team</ui-option>' +
        '</ui-option-group>' +
      '</ui-listbox>';

    header.append(systemTrigger);

    // Content area (scrollable middle)
    const inner = document.createElement('ui-layout-sidebar-content');

    // Search hint
    const searchHint = document.createElement('ui-button');
    searchHint.className = 'nav-search-hint';
    searchHint.setAttribute('size', 'md');
    searchHint.setAttribute('radius', 'default');
    searchHint.setAttribute('justify', 'spread');
    searchHint.innerHTML =
      '<ui-icon name="magnifying-glass" slot="leading"></ui-icon>' +
      '<span slot="label">Search</span>' +
      '<kbd slot="trailing">\u2318K</kbd>';
    searchHint.addEventListener('click', () => openDialog());

    // Nav links
    const nav = document.createElement('ui-nav') as HTMLElement;
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
      Containers: 'package',
      Traits: 'lightning',
      Blocks: 'squares-four',
      Core: 'cpu',
      Other: 'compass',
    };

    for (const [groupName, entries] of groups) {
      const group = document.createElement('ui-nav-group');

      // WHY: Default to collapsed for all groups except Components.
      // User-persisted state (from localStorage) overrides the default.
      const defaultOpen = groupName === 'Components';
      const isOpen = groupStates[groupName] ?? defaultOpen;
      if (!isOpen) (group as unknown as { open: boolean }).open = false;

      const groupHeader = document.createElement('ui-nav-group-header');
      const iconName = groupIcons[groupName];
      if (iconName) {
        const icon = document.createElement('ui-icon');
        icon.setAttribute('name', iconName);
        groupHeader.appendChild(icon);
      }
      groupHeader.appendChild(document.createTextNode(groupName));
      group.appendChild(groupHeader);

      for (const entry of entries) {
        const item = document.createElement('ui-nav-item');
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

    nav.addEventListener('ui-change', ((e: CustomEvent) => {
      window.location.href = e.detail.value;
    }) as EventListener);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'layout-resize-handle';

    inner.append(searchHint, nav);

    // Footer — user menu trigger + popover
    const footer = document.createElement('ui-layout-sidebar-footer');

    const userTrigger = document.createElement('ui-layout-sidebar-trigger');
    userTrigger.innerHTML =
      '<ui-icon name="user"></ui-icon>' +
      '<span slot="label">User</span>' +
      '<ui-icon name="caret-up-down" slot="trailing"></ui-icon>' +
      '<ui-listbox popover="manual">' +
        '<ui-option-group>' +
          '<ui-option-group-header>Account</ui-option-group-header>' +
          '<ui-option value="upgrade"><ui-icon name="sparkle"></ui-icon> Upgrade to Pro</ui-option>' +
          '<ui-option value="account"><ui-icon name="gear"></ui-icon> Account</ui-option>' +
          '<ui-option value="billing"><ui-icon name="credit-card"></ui-icon> Billing</ui-option>' +
          '<ui-option value="notifications"><ui-icon name="bell"></ui-icon> Notifications</ui-option>' +
        '</ui-option-group>' +
        '<ui-option-group>' +
          '<ui-option value="sign-out"><ui-icon name="sign-out"></ui-icon> Log out</ui-option>' +
        '</ui-option-group>' +
      '</ui-listbox>';

    footer.append(userTrigger);

    sidebar.append(header, inner, footer, resizeHandle);

    // Persist width on resize end
    sidebar.addEventListener('ui-resize-end', () => {
      localStorage.setItem(STORAGE_WIDTH, sidebar.style.width);
    });

    // ── Content column ──

    // Breadcrumb bar
    const currentEntry = sitemap.find(e => e.path === currentPath);
    const breadcrumbBar = document.createElement('ui-layout-breadcrumb');

    // Leading: sidebar toggle
    const sidebarToggle = document.createElement('ui-button');
    sidebarToggle.setAttribute('variant', 'ghost');
    sidebarToggle.setAttribute('size', 'sm');
    sidebarToggle.setAttribute('slot', 'leading');
    sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
    sidebarToggle.innerHTML = isCollapsed
      ? '<ui-icon name="sidebar-simple-fill" size="md"></ui-icon>'
      : '<ui-icon name="sidebar-simple" size="md"></ui-icon>';
    sidebarToggle.addEventListener('click', () => {
      const collapsed = layout.hasAttribute('collapsed');
      if (collapsed) {
        layout.removeAttribute('collapsed');
        const w = localStorage.getItem(STORAGE_WIDTH);
        if (w) sidebar.style.width = w;
        localStorage.setItem(STORAGE_COLLAPSED, 'false');
        sidebarToggle.innerHTML = '<ui-icon name="sidebar-simple" size="md"></ui-icon>';
      } else {
        sidebar.style.removeProperty('width');
        layout.setAttribute('collapsed', '');
        localStorage.setItem(STORAGE_COLLAPSED, 'true');
        sidebarToggle.innerHTML = '<ui-icon name="sidebar-simple-fill" size="md"></ui-icon>';
      }
    });

    // Center: breadcrumb
    const breadcrumb = document.createElement('ui-breadcrumb');
    if (currentEntry) {
      const groupItem = document.createElement('ui-breadcrumb-item');
      groupItem.textContent = currentEntry.group;
      const pageItem = document.createElement('ui-breadcrumb-item');
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
    const inspectorToggle = document.createElement('ui-button');
    inspectorToggle.setAttribute('variant', 'ghost');
    inspectorToggle.setAttribute('size', 'sm');
    inspectorToggle.setAttribute('aria-label', 'Toggle inspector');
    inspectorToggle.innerHTML = '<ui-icon name="sliders-horizontal" size="md"></ui-icon>';
    inspectorToggle.addEventListener('click', () => {
      const inspEl = layout.querySelector('ui-layout-inspector') as UILayoutInspector | null;
      inspEl?.toggle();
    });

    // Chat toggle
    const chatToggle = document.createElement('ui-button');
    chatToggle.setAttribute('variant', 'ghost');
    chatToggle.setAttribute('size', 'sm');
    chatToggle.setAttribute('aria-label', 'Toggle chat');
    chatToggle.innerHTML = '<ui-icon name="chat-dots" size="md"></ui-icon>';
    chatToggle.addEventListener('click', () => {
      const chatEl = layout.querySelector('ui-layout-chat') as UILayoutChat | null;
      chatEl?.toggle();
    });

    // Code toggle — drives the page's `.demo-code` blocks.
    // WHY: Persists via `demo-show-code` localStorage key across pages.
    // Only shown on pages that have `.demo-code` blocks — detected via slotchange.
    const CODE_STORAGE = 'demo-show-code';
    const codeVisible = localStorage.getItem(CODE_STORAGE) === 'true';
    const codeToggle = document.createElement('ui-button');
    codeToggle.setAttribute('variant', 'ghost');
    codeToggle.setAttribute('size', 'sm');
    codeToggle.setAttribute('aria-label', 'Toggle source code');
    codeToggle.style.display = 'none'; // hidden until we confirm page has code blocks
    codeToggle.innerHTML = codeVisible
      ? '<ui-icon name="code-fill" size="md"></ui-icon>'
      : '<ui-icon name="code" size="md"></ui-icon>';

    // Theme toggle
    const isDark = storedScheme
      ? storedScheme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    const themeToggle = document.createElement('ui-button');
    themeToggle.setAttribute('variant', 'ghost');
    themeToggle.setAttribute('size', 'sm');
    themeToggle.setAttribute('aria-label', 'Toggle color scheme');
    themeToggle.innerHTML = isDark
      ? '<ui-icon name="sun" size="md"></ui-icon>'
      : '<ui-icon name="moon" size="md"></ui-icon>';
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.style.colorScheme;
      const currentIsDark = current === 'dark' ||
        (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = currentIsDark ? 'light' : 'dark';
      document.documentElement.style.colorScheme = next;
      localStorage.setItem(STORAGE_COLOR_SCHEME, next);
      themeToggle.innerHTML = next === 'dark'
        ? '<ui-icon name="sun" size="md"></ui-icon>'
        : '<ui-icon name="moon" size="md"></ui-icon>';
    });

    trailingActions.append(inspectorToggle, chatToggle, codeToggle, themeToggle);
    breadcrumbBar.append(sidebarToggle, breadcrumb, trailingActions);

    // Canvas (body + chat)
    const canvas = document.createElement('ui-layout-canvas');

    const body = document.createElement('ui-layout-body');
    // WHY: <slot> projects author's <main> from light DOM without moving it —
    // no disconnect→reconnect cycle on nested custom elements.
    const slot = document.createElement('slot');

    body.appendChild(slot);

    function syncCodeState(show: boolean) {
      localStorage.setItem(CODE_STORAGE, String(show));
      codeToggle.innerHTML = show
        ? '<ui-icon name="code-fill" size="md"></ui-icon>'
        : '<ui-icon name="code" size="md"></ui-icon>';
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

    // Inspector panel
    const inspector = document.createElement('ui-layout-inspector');
    const inspectorResizeHandle = document.createElement('div');
    inspectorResizeHandle.className = 'layout-resize-handle';
    inspector.append(inspectorResizeHandle);
    buildInspector(inspector);

    // WHY: Sync toggle icon when inspector opens/closes programmatically.
    this.#inspectorObserver = new MutationObserver(() => {
      const isOpen = inspector.hasAttribute('open');
      inspectorToggle.innerHTML = isOpen
        ? '<ui-icon name="sliders-horizontal-fill" size="md"></ui-icon>'
        : '<ui-icon name="sliders-horizontal" size="md"></ui-icon>';
    });
    this.#inspectorObserver.observe(inspector, { attributes: true, attributeFilter: ['open'] });

    // Chat panel
    const chat = document.createElement('ui-layout-chat');
    const chatResizeHandle = document.createElement('div');
    chatResizeHandle.className = 'layout-resize-handle';

    const chatApp = document.createElement('ui-chat');
    chatApp.setAttribute('size', 'sm');
    const chatContent = document.createElement('ui-chat-content');
    chatApp.appendChild(chatContent);

    chat.append(chatResizeHandle, chatApp);

    // WHY: Sync toggle icon when chat opens/closes programmatically (e.g. via A2UI onRender).
    this.#chatObserver = new MutationObserver(() => {
      const isOpen = chat.hasAttribute('open');
      chatToggle.innerHTML = isOpen
        ? '<ui-icon name="chat-dots-fill" size="md"></ui-icon>'
        : '<ui-icon name="chat-dots" size="md"></ui-icon>';
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

    const dialog = document.createElement('ui-dialog') as HTMLElement & { showModal(): void; close(): void; open: boolean };
    dialog.className = 'nav-cmd-dialog';

    const cmdHtml = sitemap.map(entry =>
      `<ui-command-item value="${entry.path}" keywords="${entry.group}">${entry.title}</ui-command-item>`
    ).join('\n');

    dialog.innerHTML = `
      <ui-command>
        <ui-command-input>
          <ui-icon name="magnifying-glass"></ui-icon>
          <input type="text" placeholder="Search pages..." />
        </ui-command-input>
        <ui-command-list>
          ${cmdHtml}
        </ui-command-list>
        <ui-command-empty>No pages found.</ui-command-empty>
      </ui-command>
    `;
    sidebar.appendChild(dialog);

    const uiCommand = dialog.querySelector('ui-command')!;

    uiCommand.addEventListener('ui-change', ((e: CustomEvent) => {
      dialog.close();
      window.location.href = e.detail.value;
    }) as EventListener);

    dialog.addEventListener('close', () => {
      const input = dialog.querySelector<HTMLInputElement>('ui-command-input input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    function openDialog() {
      dialog.showModal();
      requestAnimationFrame(() => {
        dialog.querySelector<HTMLInputElement>('ui-command-input input')?.focus();
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
    super.teardown();
  }
}
