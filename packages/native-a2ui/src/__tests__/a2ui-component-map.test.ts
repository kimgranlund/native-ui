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
} from '../protocol/a2ui-component-map.ts';

describe('A2UI Component Map', () => {
  // ── Forward Mapping ──

  describe('resolveNativeTag', () => {
    it('maps Text to n-text', () => {
      const m = resolveNativeTag('Text');
      expect(m).not.toBeNull();
      expect(m!.nativeTag).toBe('n-text');
      expect(m!.childStrategy).toBe('textContent');
    });

    it('maps Button to n-button', () => {
      const m = resolveNativeTag('Button');
      expect(m!.nativeTag).toBe('n-button');
      expect(m!.childStrategy).toBe('slot-label');
      expect(m!.actionEvent).toBe('native:press');
    });

    it('maps TextField to n-input', () => {
      const m = resolveNativeTag('TextField');
      expect(m!.nativeTag).toBe('n-input');
      expect(m!.defaultAttributes).toEqual({ size: 'sm' });
    });

    it('maps TextArea to n-textarea', () => {
      const m = resolveNativeTag('TextArea');
      expect(m!.nativeTag).toBe('n-textarea');
    });

    it('maps CheckBox to n-checkbox', () => {
      const m = resolveNativeTag('CheckBox');
      expect(m!.nativeTag).toBe('n-checkbox');
      expect(m!.childStrategy).toBe('textContent');
    });

    it('maps Switch to n-switch', () => {
      const m = resolveNativeTag('Switch');
      expect(m!.nativeTag).toBe('n-switch');
    });

    it('maps ChoicePicker to n-select', () => {
      const m = resolveNativeTag('ChoicePicker');
      expect(m!.nativeTag).toBe('n-select');
    });

    it('maps Slider to n-range', () => {
      const m = resolveNativeTag('Slider');
      expect(m!.nativeTag).toBe('n-range');
    });

    it('maps DateTimeInput to n-input', () => {
      const m = resolveNativeTag('DateTimeInput');
      expect(m!.nativeTag).toBe('n-input');
    });

    it('maps Row to n-stack with direction=row', () => {
      const m = resolveNativeTag('Row');
      expect(m!.nativeTag).toBe('n-stack');
      expect(m!.defaultAttributes?.direction).toBe('row');
    });

    it('maps Column to n-stack', () => {
      const m = resolveNativeTag('Column');
      expect(m!.nativeTag).toBe('n-stack');
    });

    it('maps Card to n-card', () => {
      const m = resolveNativeTag('Card');
      expect(m!.nativeTag).toBe('n-card');
    });

    it('maps Modal to n-dialog', () => {
      const m = resolveNativeTag('Modal');
      expect(m!.nativeTag).toBe('n-dialog');
    });

    it('maps Tabs to n-tabs', () => {
      const m = resolveNativeTag('Tabs');
      expect(m!.nativeTag).toBe('n-tabs');
    });

    it('maps List to n-listbox', () => {
      const m = resolveNativeTag('List');
      expect(m!.nativeTag).toBe('n-listbox');
    });

    it('maps ListItem to n-option', () => {
      const m = resolveNativeTag('ListItem');
      expect(m!.nativeTag).toBe('n-option');
    });

    it('maps Image to n-picture', () => {
      const m = resolveNativeTag('Image');
      expect(m!.nativeTag).toBe('n-picture');
      expect(m!.propertyMap?.url).toBe('src');
    });

    it('maps Icon to n-icon', () => {
      const m = resolveNativeTag('Icon');
      expect(m!.nativeTag).toBe('n-icon');
      expect(m!.defaultAttributes?.['aria-hidden']).toBe('true');
    });

    it('maps Divider to n-divider', () => {
      const m = resolveNativeTag('Divider');
      expect(m!.nativeTag).toBe('n-divider');
    });

    it('maps Badge to n-badge', () => {
      const m = resolveNativeTag('Badge');
      expect(m!.nativeTag).toBe('n-badge');
    });

    it('maps Avatar to n-avatar', () => {
      const m = resolveNativeTag('Avatar');
      expect(m!.nativeTag).toBe('n-avatar');
    });

    it('maps Select to n-select', () => {
      const m = resolveNativeTag('Select');
      expect(m!.nativeTag).toBe('n-select');
    });

    it('maps Video to n-video', () => {
      const m = resolveNativeTag('Video');
      expect(m!.nativeTag).toBe('n-video');
      expect(m!.childStrategy).toBe('none');
      expect(m!.propertyMap).toEqual({ url: 'src', poster: 'poster' });
    });

    it('maps AudioPlayer to n-audio', () => {
      const m = resolveNativeTag('AudioPlayer');
      expect(m!.nativeTag).toBe('n-audio');
      expect(m!.childStrategy).toBe('none');
      expect(m!.propertyMap).toEqual({ url: 'src' });
    });

    it('returns null for unknown type', () => {
      expect(resolveNativeTag('FancyWidget')).toBeNull();
    });
  });

  // ── Reverse Mapping ──

  describe('resolveA2UIType', () => {
    it('maps n-button to Button', () => {
      expect(resolveA2UIType('n-button')).toBe('Button');
    });

    it('maps n-input to TextField', () => {
      expect(resolveA2UIType('n-input')).toBe('TextField');
    });

    it('maps n-checkbox to CheckBox', () => {
      expect(resolveA2UIType('n-checkbox')).toBe('CheckBox');
    });

    it('maps n-switch to Switch', () => {
      expect(resolveA2UIType('n-switch')).toBe('Switch');
    });

    it('maps n-range to Slider', () => {
      expect(resolveA2UIType('n-range')).toBe('Slider');
    });

    it('maps n-card to Card', () => {
      expect(resolveA2UIType('n-card')).toBe('Card');
    });

    it('maps n-dialog to Modal', () => {
      expect(resolveA2UIType('n-dialog')).toBe('Modal');
    });

    it('maps n-tabs to Tabs', () => {
      expect(resolveA2UIType('n-tabs')).toBe('Tabs');
    });

    it('maps n-listbox to List', () => {
      expect(resolveA2UIType('n-listbox')).toBe('List');
    });

    it('maps n-option to ListItem', () => {
      expect(resolveA2UIType('n-option')).toBe('ListItem');
    });

    it('maps n-icon to Icon', () => {
      expect(resolveA2UIType('n-icon')).toBe('Icon');
    });

    it('maps n-divider to Divider', () => {
      expect(resolveA2UIType('n-divider')).toBe('Divider');
    });

    it('maps n-badge to Badge', () => {
      expect(resolveA2UIType('n-badge')).toBe('Badge');
    });

    it('maps n-avatar to Avatar', () => {
      expect(resolveA2UIType('n-avatar')).toBe('Avatar');
    });

    it('maps n-text to Text', () => {
      expect(resolveA2UIType('n-text')).toBe('Text');
    });

    it('maps n-picture to Image', () => {
      expect(resolveA2UIType('n-picture')).toBe('Image');
    });

    it('maps n-video to Video', () => {
      expect(resolveA2UIType('n-video')).toBe('Video');
    });

    it('maps n-audio to AudioPlayer', () => {
      expect(resolveA2UIType('n-audio')).toBe('AudioPlayer');
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

    it('maps n-stack with direction=row to Row', () => {
      expect(resolveA2UIType('n-stack', { direction: 'row' })).toBe('Row');
    });

    it('maps n-stack without direction to Column', () => {
      expect(resolveA2UIType('n-stack')).toBe('Column');
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

    it('returns n-text for body variant', () => {
      expect(textVariantTag('body')).toBe('n-text');
    });

    it('returns n-text for undefined variant', () => {
      expect(textVariantTag()).toBe('n-text');
    });

    it('returns n-text for unknown variant', () => {
      expect(textVariantTag('unknown')).toBe('n-text');
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
