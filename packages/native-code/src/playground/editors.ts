import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

export type TabName = 'html' | 'css' | 'js';

export const TAB_LABELS: Record<TabName, string> = { html: 'HTML', css: 'CSS', js: 'JS' };

export function getLanguageExtension(language: TabName) {
  switch (language) {
    case 'html': return html();
    case 'css': return css();
    case 'js': return javascript();
  }
}
