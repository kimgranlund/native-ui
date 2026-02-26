// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  isDataBinding,
  isCreateSurface,
  isUpdateComponents,
  isUpdateDataModel,
  isDeleteSurface,
  isActionMessage,
  isErrorMessage,
  parseServerMessage,
} from '../../a2ui/a2ui-types.ts';
import type {
  A2UIServerMessage,
  A2UIClientMessage,
  A2UICreateSurface,
  A2UIUpdateComponents,
  A2UIUpdateDataModel,
  A2UIDeleteSurface,
  A2UIActionMessage,
  A2UIErrorMessage,
} from '../../a2ui/a2ui-types.ts';

describe('A2UI Types', () => {
  // ── isDataBinding ──

  describe('isDataBinding', () => {
    it('returns true for valid data binding', () => {
      expect(isDataBinding({ path: '/user/name' })).toBe(true);
    });

    it('returns true for root path', () => {
      expect(isDataBinding({ path: '/' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDataBinding(null)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isDataBinding('/user/name')).toBe(false);
    });

    it('returns false for number', () => {
      expect(isDataBinding(42)).toBe(false);
    });

    it('returns false for object without path', () => {
      expect(isDataBinding({ url: '/api' })).toBe(false);
    });

    it('returns false for object with non-string path', () => {
      expect(isDataBinding({ path: 42 })).toBe(false);
    });

    it('returns false for object with extra keys', () => {
      expect(isDataBinding({ path: '/user', extra: true })).toBe(false);
    });
  });

  // ── Server Message Type Guards ──

  describe('isCreateSurface', () => {
    const msg: A2UICreateSurface = {
      createSurface: { surfaceId: 'test' },
    };

    it('returns true for createSurface message', () => {
      expect(isCreateSurface(msg)).toBe(true);
    });

    it('returns false for other message types', () => {
      const other: A2UIUpdateComponents = {
        updateComponents: { surfaceId: 'test', components: [] },
      };
      expect(isCreateSurface(other)).toBe(false);
    });
  });

  describe('isUpdateComponents', () => {
    const msg: A2UIUpdateComponents = {
      updateComponents: { surfaceId: 'test', components: [] },
    };

    it('returns true for updateComponents message', () => {
      expect(isUpdateComponents(msg)).toBe(true);
    });

    it('returns false for other message types', () => {
      const other: A2UIDeleteSurface = {
        deleteSurface: { surfaceId: 'test' },
      };
      expect(isUpdateComponents(other)).toBe(false);
    });
  });

  describe('isUpdateDataModel', () => {
    const msg: A2UIUpdateDataModel = {
      updateDataModel: { surfaceId: 'test', path: '/user', value: 'Alice' },
    };

    it('returns true for updateDataModel message', () => {
      expect(isUpdateDataModel(msg)).toBe(true);
    });

    it('returns false for other message types', () => {
      const other: A2UICreateSurface = {
        createSurface: { surfaceId: 'test' },
      };
      expect(isUpdateDataModel(other)).toBe(false);
    });
  });

  describe('isDeleteSurface', () => {
    const msg: A2UIDeleteSurface = {
      deleteSurface: { surfaceId: 'test' },
    };

    it('returns true for deleteSurface message', () => {
      expect(isDeleteSurface(msg)).toBe(true);
    });

    it('returns false for other message types', () => {
      const other: A2UIUpdateDataModel = {
        updateDataModel: { surfaceId: 'test' },
      };
      expect(isDeleteSurface(other)).toBe(false);
    });
  });

  // ── Client Message Type Guards ──

  describe('isActionMessage', () => {
    const msg: A2UIActionMessage = {
      action: {
        surfaceId: 'test',
        sourceComponentId: 'btn-1',
        name: 'click',
        timestamp: '2026-01-01T00:00:00Z',
      },
    };

    it('returns true for action message', () => {
      expect(isActionMessage(msg)).toBe(true);
    });

    it('returns false for error message', () => {
      const other: A2UIErrorMessage = {
        error: { surfaceId: 'test', code: 'RENDER_FAILED', message: 'oops' },
      };
      expect(isActionMessage(other)).toBe(false);
    });
  });

  describe('isErrorMessage', () => {
    const msg: A2UIErrorMessage = {
      error: { surfaceId: 'test', code: 'RENDER_FAILED', message: 'oops' },
    };

    it('returns true for error message', () => {
      expect(isErrorMessage(msg)).toBe(true);
    });

    it('returns false for action message', () => {
      const other: A2UIActionMessage = {
        action: {
          surfaceId: 'test',
          sourceComponentId: 'btn-1',
          name: 'click',
          timestamp: '2026-01-01T00:00:00Z',
        },
      };
      expect(isErrorMessage(other)).toBe(false);
    });
  });

  // ── parseServerMessage ──

  describe('parseServerMessage', () => {
    it('parses createSurface', () => {
      const json = JSON.stringify({ createSurface: { surfaceId: 'test' } });
      const msg = parseServerMessage(json);
      expect(msg).not.toBeNull();
      expect(isCreateSurface(msg!)).toBe(true);
    });

    it('parses updateComponents', () => {
      const json = JSON.stringify({
        updateComponents: { surfaceId: 'test', components: [{ id: 'root', component: 'Column' }] },
      });
      const msg = parseServerMessage(json);
      expect(msg).not.toBeNull();
      expect(isUpdateComponents(msg!)).toBe(true);
    });

    it('parses updateDataModel', () => {
      const json = JSON.stringify({
        updateDataModel: { surfaceId: 'test', path: '/user', value: { name: 'Alice' } },
      });
      const msg = parseServerMessage(json);
      expect(msg).not.toBeNull();
      expect(isUpdateDataModel(msg!)).toBe(true);
    });

    it('parses deleteSurface', () => {
      const json = JSON.stringify({ deleteSurface: { surfaceId: 'test' } });
      const msg = parseServerMessage(json);
      expect(msg).not.toBeNull();
      expect(isDeleteSurface(msg!)).toBe(true);
    });

    it('returns null for invalid JSON', () => {
      expect(parseServerMessage('not json')).toBeNull();
    });

    it('returns null for unrecognized message', () => {
      expect(parseServerMessage('{"unknown": {}}')).toBeNull();
    });

    it('returns null for empty object', () => {
      expect(parseServerMessage('{}')).toBeNull();
    });
  });
});
