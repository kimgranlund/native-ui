// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  resolveNativeTag,
  resolveA2UIType,
  textVariantTag,
  dateTimeInputType,
  textFieldInputType,
  getSupportedTypes,
  COMPONENT_MAP,
} from '../../a2ui/a2ui-component-map.ts';

describe('A2UI Component Map', () => {
  // ── Forward Mapping ──

  describe('resolveNativeTag', () => {
    it('maps Text to span', () => {
      const m = resolveNativeTag('Text');
      expect(m).not.toBeNull();
      expect(m!.nativeTag).toBe('span');
      expect(m!.childStrategy).toBe('textContent');
    });

    it('maps Button to ui-button', () => {
      const m = resolveNativeTag('Button');
      expect(m!.nativeTag).toBe('ui-button');
      expect(m!.childStrategy).toBe('slot-label');
      expect(m!.actionEvent).toBe('ui-press');
    });

    it('maps TextField to ui-input', () => {
      const m = resolveNativeTag('TextField');
      expect(m!.nativeTag).toBe('ui-input');
      expect(m!.defaultAttributes).toEqual({ size: 'sm' });
    });

    it('maps TextArea to ui-textarea', () => {
      const m = resolveNativeTag('TextArea');
      expect(m!.nativeTag).toBe('ui-textarea');
    });

    it('maps CheckBox to ui-checkbox', () => {
      const m = resolveNativeTag('CheckBox');
      expect(m!.nativeTag).toBe('ui-checkbox');
      expect(m!.childStrategy).toBe('textContent');
    });

    it('maps Switch to ui-switch', () => {
      const m = resolveNativeTag('Switch');
      expect(m!.nativeTag).toBe('ui-switch');
    });

    it('maps ChoicePicker to ui-select', () => {
      const m = resolveNativeTag('ChoicePicker');
      expect(m!.nativeTag).toBe('ui-select');
    });

    it('maps Slider to ui-range', () => {
      const m = resolveNativeTag('Slider');
      expect(m!.nativeTag).toBe('ui-range');
    });

    it('maps DateTimeInput to ui-input', () => {
      const m = resolveNativeTag('DateTimeInput');
      expect(m!.nativeTag).toBe('ui-input');
    });

    it('maps Row to div', () => {
      const m = resolveNativeTag('Row');
      expect(m!.nativeTag).toBe('div');
    });

    it('maps Column to div', () => {
      const m = resolveNativeTag('Column');
      expect(m!.nativeTag).toBe('div');
    });

    it('maps Card to ui-card', () => {
      const m = resolveNativeTag('Card');
      expect(m!.nativeTag).toBe('ui-card');
    });

    it('maps Modal to ui-dialog', () => {
      const m = resolveNativeTag('Modal');
      expect(m!.nativeTag).toBe('ui-dialog');
    });

    it('maps Tabs to ui-tabs', () => {
      const m = resolveNativeTag('Tabs');
      expect(m!.nativeTag).toBe('ui-tabs');
    });

    it('maps List to ui-listbox', () => {
      const m = resolveNativeTag('List');
      expect(m!.nativeTag).toBe('ui-listbox');
    });

    it('maps ListItem to ui-option', () => {
      const m = resolveNativeTag('ListItem');
      expect(m!.nativeTag).toBe('ui-option');
    });

    it('maps Image to img', () => {
      const m = resolveNativeTag('Image');
      expect(m!.nativeTag).toBe('img');
      expect(m!.propertyMap?.url).toBe('src');
    });

    it('maps Icon to ui-icon', () => {
      const m = resolveNativeTag('Icon');
      expect(m!.nativeTag).toBe('ui-icon');
      expect(m!.defaultAttributes?.['aria-hidden']).toBe('true');
    });

    it('maps Divider to ui-divider', () => {
      const m = resolveNativeTag('Divider');
      expect(m!.nativeTag).toBe('ui-divider');
    });

    it('maps Badge to ui-badge', () => {
      const m = resolveNativeTag('Badge');
      expect(m!.nativeTag).toBe('ui-badge');
    });

    it('maps Avatar to ui-avatar', () => {
      const m = resolveNativeTag('Avatar');
      expect(m!.nativeTag).toBe('ui-avatar');
    });

    it('maps Select to ui-select', () => {
      const m = resolveNativeTag('Select');
      expect(m!.nativeTag).toBe('ui-select');
    });

    it('maps Video to video', () => {
      const m = resolveNativeTag('Video');
      expect(m!.nativeTag).toBe('video');
      expect(m!.childStrategy).toBe('none');
      expect(m!.defaultAttributes).toEqual({ controls: '' });
      expect(m!.propertyMap).toEqual({ url: 'src', poster: 'poster' });
    });

    it('maps AudioPlayer to audio', () => {
      const m = resolveNativeTag('AudioPlayer');
      expect(m!.nativeTag).toBe('audio');
      expect(m!.childStrategy).toBe('none');
      expect(m!.defaultAttributes).toEqual({ controls: '' });
      expect(m!.propertyMap).toEqual({ url: 'src' });
    });

    it('returns null for unknown type', () => {
      expect(resolveNativeTag('FancyWidget')).toBeNull();
    });
  });

  // ── Reverse Mapping ──

  describe('resolveA2UIType', () => {
    it('maps ui-button to Button', () => {
      expect(resolveA2UIType('ui-button')).toBe('Button');
    });

    it('maps ui-input to TextField', () => {
      expect(resolveA2UIType('ui-input')).toBe('TextField');
    });

    it('maps ui-checkbox to CheckBox', () => {
      expect(resolveA2UIType('ui-checkbox')).toBe('CheckBox');
    });

    it('maps ui-switch to Switch', () => {
      expect(resolveA2UIType('ui-switch')).toBe('Switch');
    });

    it('maps ui-range to Slider', () => {
      expect(resolveA2UIType('ui-range')).toBe('Slider');
    });

    it('maps ui-card to Card', () => {
      expect(resolveA2UIType('ui-card')).toBe('Card');
    });

    it('maps ui-dialog to Modal', () => {
      expect(resolveA2UIType('ui-dialog')).toBe('Modal');
    });

    it('maps ui-tabs to Tabs', () => {
      expect(resolveA2UIType('ui-tabs')).toBe('Tabs');
    });

    it('maps ui-listbox to List', () => {
      expect(resolveA2UIType('ui-listbox')).toBe('List');
    });

    it('maps ui-option to ListItem', () => {
      expect(resolveA2UIType('ui-option')).toBe('ListItem');
    });

    it('maps ui-icon to Icon', () => {
      expect(resolveA2UIType('ui-icon')).toBe('Icon');
    });

    it('maps ui-divider to Divider', () => {
      expect(resolveA2UIType('ui-divider')).toBe('Divider');
    });

    it('maps ui-badge to Badge', () => {
      expect(resolveA2UIType('ui-badge')).toBe('Badge');
    });

    it('maps ui-avatar to Avatar', () => {
      expect(resolveA2UIType('ui-avatar')).toBe('Avatar');
    });

    it('maps span to Text', () => {
      expect(resolveA2UIType('span')).toBe('Text');
    });

    it('maps img to Image', () => {
      expect(resolveA2UIType('img')).toBe('Image');
    });

    it('maps video to Video', () => {
      expect(resolveA2UIType('video')).toBe('Video');
    });

    it('maps audio to AudioPlayer', () => {
      expect(resolveA2UIType('audio')).toBe('AudioPlayer');
    });

    it('maps h1 to Text', () => {
      expect(resolveA2UIType('h1')).toBe('Text');
    });

    it('maps h3 to Text', () => {
      expect(resolveA2UIType('h3')).toBe('Text');
    });

    it('disambiguates div with flex-direction:column as Column', () => {
      expect(resolveA2UIType('div', { style: 'display:flex;flex-direction:column;gap:0.5rem' })).toBe('Column');
    });

    it('disambiguates div with display:flex (no column) as Row', () => {
      expect(resolveA2UIType('div', { style: 'display:flex;gap:0.5rem' })).toBe('Row');
    });

    it('uses data-a2ui attribute for disambiguation', () => {
      expect(resolveA2UIType('div', { 'data-a2ui': 'Row' })).toBe('Row');
      expect(resolveA2UIType('div', { 'data-a2ui': 'Column' })).toBe('Column');
    });

    it('defaults plain div to Column', () => {
      expect(resolveA2UIType('div')).toBe('Column');
    });

    it('returns null for unknown tag', () => {
      expect(resolveA2UIType('my-unknown-element')).toBeNull();
    });
  });

  // ── Text Variant Tag ──

  describe('textVariantTag', () => {
    it('returns h1 for h1 variant', () => {
      expect(textVariantTag('h1')).toBe('h1');
    });

    it('returns h3 for h3 variant', () => {
      expect(textVariantTag('h3')).toBe('h3');
    });

    it('returns small for caption variant', () => {
      expect(textVariantTag('caption')).toBe('small');
    });

    it('returns span for body variant', () => {
      expect(textVariantTag('body')).toBe('span');
    });

    it('returns span for undefined variant', () => {
      expect(textVariantTag()).toBe('span');
    });

    it('returns span for unknown variant', () => {
      expect(textVariantTag('unknown')).toBe('span');
    });
  });

  // ── DateTimeInput Type ──

  describe('dateTimeInputType', () => {
    it('returns date by default', () => {
      expect(dateTimeInputType()).toBe('date');
    });

    it('returns date when enableDate only', () => {
      expect(dateTimeInputType(true, false)).toBe('date');
    });

    it('returns time when enableTime only', () => {
      expect(dateTimeInputType(false, true)).toBe('time');
    });

    it('returns datetime-local when both enabled', () => {
      expect(dateTimeInputType(true, true)).toBe('datetime-local');
    });
  });

  // ── TextField Input Type ──

  describe('textFieldInputType', () => {
    it('returns text by default', () => {
      expect(textFieldInputType()).toBe('text');
    });

    it('returns number for number variant', () => {
      expect(textFieldInputType('number')).toBe('number');
    });

    it('returns password for obscured variant', () => {
      expect(textFieldInputType('obscured')).toBe('password');
    });

    it('returns text for shortText variant', () => {
      expect(textFieldInputType('shortText')).toBe('text');
    });

    it('returns text for unknown variant', () => {
      expect(textFieldInputType('unknown')).toBe('text');
    });
  });

  // ── Supported Types ──

  describe('getSupportedTypes', () => {
    it('returns all A2UI standard types', () => {
      const types = getSupportedTypes();
      expect(types).toContain('Text');
      expect(types).toContain('Button');
      expect(types).toContain('TextField');
      expect(types).toContain('CheckBox');
      expect(types).toContain('Row');
      expect(types).toContain('Column');
      expect(types).toContain('Card');
      expect(types).toContain('Modal');
      expect(types).toContain('Tabs');
      expect(types).toContain('Video');
      expect(types).toContain('AudioPlayer');
      expect(types.length).toBeGreaterThanOrEqual(22);
    });
  });

  // ── COMPONENT_MAP ──

  describe('COMPONENT_MAP', () => {
    it('is a ReadonlyMap', () => {
      expect(COMPONENT_MAP instanceof Map).toBe(true);
    });

    it('has entries for all standard types', () => {
      expect(COMPONENT_MAP.has('Text')).toBe(true);
      expect(COMPONENT_MAP.has('Button')).toBe(true);
      expect(COMPONENT_MAP.has('Row')).toBe(true);
    });
  });
});
