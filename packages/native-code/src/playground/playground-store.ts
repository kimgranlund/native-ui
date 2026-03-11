import { signal } from '@nonoun/native-core';
import type { Signal } from '@nonoun/native-core';

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'clear';
  args: string[];
}

export interface PlaygroundStore {
  // Code state
  html: Signal<string>;
  css: Signal<string>;
  js: Signal<string>;

  // Initial code (for reset)
  initialHtml: string;
  initialCss: string;
  initialJs: string;

  // UI state
  activeTab: Signal<'html' | 'css' | 'js'>;
  consoleOpen: Signal<boolean>;
  fullscreen: Signal<boolean>;
  orientation: Signal<'horizontal' | 'vertical' | 'auto'>;
  autoRun: Signal<boolean>;
  debounce: Signal<number>;
  readonly: Signal<boolean>;

  // Console
  consoleEntries: Signal<ConsoleEntry[]>;

  // Preview
  previewTheme: Signal<string>;
}

export function createPlaygroundStore(
  initialHtml: string,
  initialCss: string,
  initialJs: string,
): PlaygroundStore {
  return {
    html: signal(initialHtml),
    css: signal(initialCss),
    js: signal(initialJs),

    initialHtml,
    initialCss,
    initialJs,

    activeTab: signal<'html' | 'css' | 'js'>('html'),
    consoleOpen: signal(false),
    fullscreen: signal(false),
    orientation: signal<'horizontal' | 'vertical' | 'auto'>('auto'),
    autoRun: signal(true),
    debounce: signal(300),
    readonly: signal(false),

    consoleEntries: signal<ConsoleEntry[]>([]),

    previewTheme: signal(''),
  };
}
