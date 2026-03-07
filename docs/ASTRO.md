# Astro Integration Guide

Complete guide for using `@nonoun/native-ui` in an Astro project. Based on the production reference implementation in `native-host`.

---

## 1. Install

```bash
npm install @nonoun/native-ui
```

Optional extension packages:

```bash
npm install @nonoun/native-dashboard         # sidebar layout + navigation
npm install @nonoun/native-design      # design token inspector
npm install @nonoun/native-chat        # chat panel
npm install @nonoun/native-codemirror  # CodeMirror 6 integration
npm install @nonoun/native-editor      # markdown editor
npm install @nonoun/native-playground  # live code sandbox
```

---

## 2. Astro Config

No special Astro config is needed. Standard `output: 'server'` (or `'static'`) works.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel'; // or any adapter

export default defineConfig({
  output: 'server',
  adapter: vercel(),
});
```

---

## 3. Base Layout

The base layout loads CSS globally and imports the client-side setup script.

```astro
---
// src/layouts/BaseLayout.astro
interface Props { title: string }
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <style is:global>
      @import '@nonoun/native-ui/css/foundation';
      @import '@nonoun/native-ui/css/components';
    </style>
  </head>
  <body>
    <script>
      import '../scripts/setup';
    </script>
    <slot />
  </body>
</html>
```

### CSS load order

Foundation must come before components. When using extension packages, maintain this order:

```css
@import '@nonoun/native-ui/css/foundation';   /* 1. colors, tokens, themes, base */
@import '@nonoun/native-ui/css/components';    /* 2. component styles */
@import '@nonoun/native-dashboard/css';              /* 3. app shell (optional) */
@import '@nonoun/native-chat/css';             /* 4. chat panel (optional) */
@import '@nonoun/native-design/css';           /* 5. token inspector (optional) */
@import './page.css';                          /* 6. page overrides */
```

For production, use the lean variant to strip `force-*` debug selectors:

```css
@import '@nonoun/native-ui/css/lean';
```

### Why `<style is:global>`

Astro scopes `<style>` blocks by default. `is:global` prevents Astro from adding scoped class hashes to the imported CSS. Alternatively, use `<link>` tags, but `@import` in `<style is:global>` is the idiomatic Astro pattern and lets the bundler resolve npm package specifiers.

---

## 4. Setup Script

Register components and traits in a single client-side script.

```ts
// src/scripts/setup.ts
import '@nonoun/native-ui/register';
import { registerAllTraits } from '@nonoun/native-ui';

registerAllTraits();
```

`registerAllTraits()` is optional -- only needed if you use `<n-controller traits="...">` declarative traits. Load order doesn't matter; late-registered traits auto-initialize on elements that were waiting for them.

When using extension packages, add their registrations:

```ts
// src/scripts/setup.ts
import '@nonoun/native-ui/register';
import '@nonoun/native-dashboard';
import '@nonoun/native-chat/register';
import { registerAllTraits } from '@nonoun/native-ui';

registerAllTraits();
```

---

## 5. Icon Registration

Icons are not bundled -- you register only the ones you use. Use `@phosphor-icons/core` with Vite's `?raw` import for SVG inlining at build time.

```bash
npm install -D @phosphor-icons/core
```

```ts
// src/scripts/icons.ts
import { registerIcon } from '@nonoun/native-ui';

import house from '@phosphor-icons/core/assets/regular/house.svg?raw';
import gear from '@phosphor-icons/core/assets/regular/gear.svg?raw';
import magnifyingGlass from '@phosphor-icons/core/assets/regular/magnifying-glass.svg?raw';
import caretUpDown from '@phosphor-icons/core/assets/regular/caret-up-down.svg?raw';
import x from '@phosphor-icons/core/assets/regular/x.svg?raw';

// Fill weight variants
import sidebarSimpleFill from '@phosphor-icons/core/assets/fill/sidebar-simple-fill.svg?raw';

const icons: Record<string, string> = {
  house, gear, 'magnifying-glass': magnifyingGlass,
  'caret-up-down': caretUpDown, x,
  'sidebar-simple-fill': sidebarSimpleFill,
};

for (const [name, svg] of Object.entries(icons)) {
  registerIcon(name, svg);
}
```

Import this from your base layout before setup:

```astro
<script>
  import '../scripts/icons';
  import '../scripts/setup';
</script>
```

Unregistered icons collapse to zero dimensions (`:empty` CSS). Icons self-heal via `onIconRegistered()` -- if an icon is registered after the element renders, it updates automatically.

---

## 6. Using Components in Astro Pages

All native-ui components work as standard HTML in `.astro` files:

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <main>
    <n-card>
      <n-header>
        <h2>Welcome</h2>
      </n-header>
      <n-body>
        <n-button variant="primary" intent="accent">Get Started</n-button>
        <n-input placeholder="Search..." name="query"></n-input>
      </n-body>
    </n-card>
  </main>
</BaseLayout>
```

### Data-driven components

Pass JSON data via attributes:

```astro
---
const countries = [
  { value: 'us', label: 'United States' },
  { value: 'se', label: 'Sweden' },
  { value: 'jp', label: 'Japan' },
];
---
<n-select
  placeholder="Country"
  options={JSON.stringify(countries)}
></n-select>
```

### Boolean attributes

Astro renders boolean attributes as present/absent. Use conditional expressions:

```astro
<n-sidebar collapsed={prefs.sidebarCollapsed ? '' : undefined}>
<n-sidebar-group open={isOpen ? '' : undefined}>
<n-button disabled={isDisabled ? '' : undefined}>
```

---

## 7. Sidebar Layout (with `@nonoun/native-dashboard`)

Full sidebar layout with navigation, breadcrumb, and collapsible aside.

```astro
---
// src/layouts/SidebarLayout.astro
import BaseLayout from './BaseLayout.astro';

interface Props { title: string }
const { title } = Astro.props;

const currentPath = Astro.url.pathname.replace(/\/$/, '') || '/';

const navGroups = [
  {
    label: 'Components', icon: 'cube',
    items: [
      { path: '/button', title: 'Button' },
      { path: '/input', title: 'Input' },
    ],
  },
  {
    label: 'Containers', icon: 'package',
    items: [
      { path: '/card', title: 'Card' },
      { path: '/stack', title: 'Stack' },
    ],
  },
];
---
<BaseLayout title={title}>
  <style is:global>
    @import '@nonoun/native-dashboard/css';
  </style>

  <n-sidebar id="layout-sidebar">
    <aside slot="sidebar">
      <n-sidebar-header>
        <n-sidebar-item>
          <span slot="label">My App</span>
        </n-sidebar-item>
      </n-sidebar-header>

      <n-sidebar-content>
        <n-sidebar-nav value={currentPath}>
          {navGroups.map(group => (
            <n-sidebar-group open="">
              <n-sidebar-group-header>
                <n-icon name={group.icon}></n-icon>
                {group.label}
              </n-sidebar-group-header>
              {group.items.map(item => (
                <n-sidebar-nav-item
                  value={item.path}
                  aria-current={currentPath === item.path ? 'page' : undefined}
                >
                  {item.title}
                </n-sidebar-nav-item>
              ))}
            </n-sidebar-group>
          ))}
        </n-sidebar-nav>
      </n-sidebar-content>

      <n-sidebar-footer>
        <n-sidebar-item>
          <span slot="icon"><n-icon name="user-circle"></n-icon></span>
          <span slot="label">User</span>
        </n-sidebar-item>
      </n-sidebar-footer>
    </aside>

    <div>
      <n-dashboard-breadcrumb>
        <n-button variant="ghost" size="sm" slot="leading" id="sidebar-toggle">
          <n-icon name="sidebar-simple" size="md"></n-icon>
        </n-button>
        <n-breadcrumb>
          <n-breadcrumb-item current>{title}</n-breadcrumb-item>
        </n-breadcrumb>
      </n-dashboard-breadcrumb>

      <n-dashboard-canvas>
        <n-dashboard-panel>
          <slot />
        </n-dashboard-panel>
      </n-dashboard-canvas>
    </div>
  </n-sidebar>

  <script>
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('layout-sidebar');
    toggle?.addEventListener('click', () => {
      sidebar?.toggleAttribute('collapsed');
    });
  </script>
</BaseLayout>
```

---

## 8. View Transitions

Astro View Transitions (`<ClientRouter />`) enable SPA-style navigation. native-ui components work out of the box. For sidebar layouts, a custom swap preserves the sidebar DOM across navigations.

### Enable View Transitions

```astro
---
import { ClientRouter } from 'astro:transitions';
---
<head>
  <ClientRouter />
  ...
</head>
```

### Custom swap for sidebar persistence

Without this, the entire `<body>` is replaced on navigation -- sidebar scroll position, group open/closed states, and collapse state are lost.

```ts
// src/scripts/layout.ts
import { navigate, swapFunctions } from 'astro:transitions/client';

document.addEventListener('astro:before-swap', ((e: any) => {
  const currentSidebar = document.getElementById('layout-sidebar');
  const newSidebar = (e.newDocument as Document).getElementById('layout-sidebar');

  // Fall through to default swap when either page lacks sidebar
  if (!currentSidebar || !newSidebar) return;

  e.swap = () => {
    swapFunctions.deselectScripts(e.newDocument);
    swapFunctions.swapRootAttributes(e.newDocument);
    swapFunctions.swapHeadElements(e.newDocument);
    const restore = swapFunctions.saveFocus();

    // Swap only the content panel (sidebar stays in DOM)
    const currentPanel = currentSidebar.querySelector('n-dashboard-panel:not([aside])');
    const newPanel = newSidebar.querySelector('n-dashboard-panel:not([aside])');
    if (currentPanel && newPanel) {
      currentPanel.replaceWith(document.adoptNode(newPanel));
    }

    // Swap breadcrumb text
    const currentBreadcrumb = currentSidebar.querySelector('n-dashboard-breadcrumb n-breadcrumb');
    const newBreadcrumb = newSidebar.querySelector('n-dashboard-breadcrumb n-breadcrumb');
    if (currentBreadcrumb && newBreadcrumb) {
      currentBreadcrumb.replaceWith(document.adoptNode(newBreadcrumb));
    }

    // Update nav active item
    const nav = currentSidebar.querySelector('n-sidebar-nav');
    const newNav = newSidebar.querySelector('n-sidebar-nav');
    if (nav && newNav) {
      const newValue = newNav.getAttribute('value');
      if (newValue) {
        nav.setAttribute('value', newValue);
        for (const item of nav.querySelectorAll('n-sidebar-nav-item[aria-current]')) {
          item.removeAttribute('aria-current');
        }
        nav.querySelector(`n-sidebar-nav-item[value="${CSS.escape(newValue)}"]`)
          ?.setAttribute('aria-current', 'page');
      }
    }

    restore();
  };
}) as EventListener);

// Wire nav clicks to Astro navigation
document.addEventListener('astro:page-load', () => {
  const nav = document.querySelector('n-sidebar-nav');
  nav?.addEventListener('native:change', ((e: CustomEvent) => {
    navigate(e.detail.value);
  }) as EventListener);
});
```

### Event wiring with View Transitions

With `<ClientRouter />`, scripts run once and the DOM persists. Use `astro:page-load` for per-page setup:

```ts
// Runs once per DOM lifetime (sidebar wiring, global shortcuts)
document.addEventListener('keydown', (e) => { /* Cmd+K */ });

// Runs on initial load + every navigation (per-page content wiring)
document.addEventListener('astro:page-load', () => {
  // Wire copy buttons, toggle buttons, etc.
});
```

---

## 9. Persisting Preferences (SSR)

For flicker-free SSR, persist user preferences in cookies so the server can read them at render time. Store in both cookies (SSR) and localStorage (client fallback).

### Shared preference keys

```ts
// src/lib/preferences.ts
export const PREF_COLOR_SCHEME = 'nav-color-scheme';
export const PREF_SIDEBAR_COLLAPSED = 'nav-sidebar-collapsed';

export interface Preferences {
  colorScheme: string;
  sidebarCollapsed: boolean;
}

export function parsePreferences(cookies: {
  get(name: string): { value: string } | undefined;
}): Preferences {
  return {
    colorScheme: cookies.get(PREF_COLOR_SCHEME)?.value || '',
    sidebarCollapsed: cookies.get(PREF_SIDEBAR_COLLAPSED)?.value === 'true',
  };
}
```

### Server-side: read cookies in layout

```astro
---
import { parsePreferences } from '../lib/preferences';
const prefs = parsePreferences(Astro.cookies);
---
<html style={prefs.colorScheme ? `color-scheme: ${prefs.colorScheme}` : undefined}>
  ...
  <n-sidebar collapsed={prefs.sidebarCollapsed ? '' : undefined}>
```

### Client-side: write cookies + localStorage

```ts
function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${expires};SameSite=Lax`;
}

// On sidebar toggle:
const collapsed = !sidebar.hasAttribute('collapsed');
sidebar.toggleAttribute('collapsed', collapsed);
localStorage.setItem(PREF_SIDEBAR_COLLAPSED, String(collapsed));
setCookie(PREF_SIDEBAR_COLLAPSED, String(collapsed));

// On theme toggle:
const next = isDark ? 'light' : 'dark';
document.documentElement.style.colorScheme = next;
localStorage.setItem(PREF_COLOR_SCHEME, next);
setCookie(PREF_COLOR_SCHEME, next);
```

---

## 10. Dark Mode

Dark mode is automatic via `light-dark()` in the design system. No class toggles needed.

**System default** -- works with zero config:
```astro
<html lang="en">
```

**Server-rendered preference** -- prevents flash:
```astro
<html lang="en" style={prefs.colorScheme ? `color-scheme: ${prefs.colorScheme}` : undefined}>
```

**Client toggle:**
```ts
document.documentElement.style.colorScheme = 'dark'; // or 'light'
```

---

## 11. Dialogs and Command Palette

Dialogs work with standard `showModal()` / `close()` API:

```astro
<n-dialog id="my-dialog">
  <n-card>
    <n-header><h3>Confirm</h3></n-header>
    <n-body><p>Are you sure?</p></n-body>
    <n-footer>
      <n-button id="cancel-btn">Cancel</n-button>
      <n-button variant="primary" intent="accent" id="confirm-btn">Confirm</n-button>
    </n-footer>
  </n-card>
</n-dialog>

<script>
  const dialog = document.getElementById('my-dialog') as HTMLElement & { showModal(): void; close(): void };
  document.getElementById('open-btn')?.addEventListener('click', () => dialog.showModal());
  document.getElementById('cancel-btn')?.addEventListener('click', () => dialog.close());
  document.getElementById('confirm-btn')?.addEventListener('click', () => {
    // handle confirm
    dialog.close();
  });
</script>
```

### Command palette (Cmd+K)

```astro
<n-dialog id="cmd-dialog">
  <n-command>
    <n-command-input>
      <n-icon name="magnifying-glass"></n-icon>
      <input type="text" placeholder="Search..." />
    </n-command-input>
    <n-command-list>
      {pages.map(p => (
        <n-command-item value={p.path}>{p.title}</n-command-item>
      ))}
    </n-command-list>
    <n-command-empty>No results.</n-command-empty>
  </n-command>
</n-dialog>

<script>
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const dialog = document.getElementById('cmd-dialog') as any;
      dialog?.open ? dialog.close() : dialog.showModal();
    }
  });

  document.getElementById('cmd-dialog')?.querySelector('n-command')
    ?.addEventListener('native:change', ((e: CustomEvent) => {
      (document.getElementById('cmd-dialog') as any).close();
      // Navigate to e.detail.value
    }) as EventListener);
</script>
```

---

## 12. Gotchas

### Scripts inside custom elements render as visible text

Browser behavior -- any `<script>` inside an element with `display: flex/grid/block` renders as visible text. Place scripts outside `n-*` elements:

```astro
<!-- Wrong -->
<n-sidebar>
  <script>/* visible as text! */</script>
</n-sidebar>

<!-- Right -->
<script>/* runs normally */</script>
<n-sidebar>...</n-sidebar>
```

### FOUC prevention is built-in

`foundation.css` includes `:not(:defined) { visibility: hidden }` for all registered elements. No consumer-side FOUC workaround needed. CSS-only containers (`n-stack`, `n-grid`, `n-divider`, etc.) are excluded since they never call `define()`.

### Transition suppression on initial render

`n-sidebar` suppresses CSS transitions until `[data-ready]` is set. Attribute changes before upgrade (e.g., `collapsed` from cookies) apply instantly without animation.

### `transition:animate="none"` for persistent elements

When using View Transitions, add `transition:animate="none"` to elements that should not animate during navigation (sidebar, command dialog):

```astro
<aside slot="sidebar" transition:animate="none">
<n-dialog id="cmd-dialog" transition:animate="none">
```

### CSS-only containers need no JS

`n-stack`, `n-grid`, `n-divider`, `n-inset`, `n-header`, `n-body`, `n-footer` are pure CSS -- they work in server-rendered HTML without any JS.

### Events use `native:` prefix with colon

All custom events use `native:` prefix (not `ui-`):

```ts
element.addEventListener('native:change', (e: CustomEvent) => { ... });
element.addEventListener('native:press', (e: CustomEvent) => { ... });
```

---

## 13. Minimal Starter

Complete minimal Astro project with native-ui:

```
src/
  layouts/
    BaseLayout.astro    # CSS + script imports
  scripts/
    setup.ts            # register + registerAllTraits()
    icons.ts            # registerIcon() calls
  pages/
    index.astro         # your page
  lib/
    preferences.ts      # cookie helpers (optional, for SSR prefs)
astro.config.mjs
package.json
```

```json
{
  "dependencies": {
    "@nonoun/native-ui": "^0.6.1",
    "astro": "^5.17.0"
  },
  "devDependencies": {
    "@phosphor-icons/core": "^2.1.1"
  }
}
```

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <main style="max-width: 40rem; margin: 2rem auto; padding: 0 1rem;">
    <h1>Hello native-ui</h1>
    <n-stack gap="md">
      <n-input placeholder="Name" name="name"></n-input>
      <n-button variant="primary" intent="accent">Submit</n-button>
    </n-stack>
  </main>
</BaseLayout>
```
