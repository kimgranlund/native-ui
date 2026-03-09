// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PresentController } from './present-controller.ts';

describe('PresentController', () => {
  let host: HTMLElement;
  let ctrl: PresentController;

  beforeEach(() => {
    host = document.createElement('div');
    host.textContent = 'Presentable content';
    document.body.appendChild(host);
  });

  afterEach(() => {
    ctrl?.destroy();
    document.body.innerHTML = '';
  });

  // ── Construction ──

  it('creates with default options', () => {
    ctrl = new PresentController(host);
    expect(ctrl.host).toBe(host);
    expect(ctrl.open).toBe(false);
  });

  // ── Present ──

  it('present creates a dialog and sets presented attribute', () => {
    ctrl = new PresentController(host);
    ctrl.present();

    expect(ctrl.open).toBe(true);
    expect(host.hasAttribute('presented')).toBe(true);
  });

  it('present dispatches native:present event', () => {
    ctrl = new PresentController(host);
    const handler = vi.fn();
    host.addEventListener('native:present', handler);

    ctrl.present();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('present is idempotent when already open', () => {
    ctrl = new PresentController(host);
    ctrl.present();

    const handler = vi.fn();
    host.addEventListener('native:present', handler);

    ctrl.present(); // second call
    expect(handler).not.toHaveBeenCalled();
  });

  it('present creates dialog with data-present attribute', () => {
    ctrl = new PresentController(host);
    ctrl.present();

    const dialog = document.querySelector('dialog[data-present]');
    expect(dialog).toBeTruthy();
  });

  // ── Dismiss ──

  it('dismiss restores host to original position', () => {
    ctrl = new PresentController(host);
    const parent = host.parentElement;

    ctrl.present();
    expect(host.parentElement).not.toBe(parent);

    ctrl.dismiss();
    expect(host.parentElement).toBe(parent);
    expect(ctrl.open).toBe(false);
  });

  it('dismiss removes presented attribute', () => {
    ctrl = new PresentController(host);
    ctrl.present();
    expect(host.hasAttribute('presented')).toBe(true);

    ctrl.dismiss();
    expect(host.hasAttribute('presented')).toBe(false);
  });

  it('dismiss dispatches native:dismiss event', () => {
    ctrl = new PresentController(host);
    ctrl.present();

    const handler = vi.fn();
    host.addEventListener('native:dismiss', handler);

    ctrl.dismiss();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dismiss is safe when not open', () => {
    ctrl = new PresentController(host);
    expect(() => ctrl.dismiss()).not.toThrow();
  });

  // ── Toggle ──

  it('toggle opens when closed', () => {
    ctrl = new PresentController(host);
    ctrl.toggle();
    expect(ctrl.open).toBe(true);
  });

  it('toggle closes when open', () => {
    ctrl = new PresentController(host);
    ctrl.present();
    ctrl.toggle();
    expect(ctrl.open).toBe(false);
  });

  // ── Options ──

  it('creates close button by default', () => {
    ctrl = new PresentController(host);
    ctrl.present();

    const dialog = document.querySelector('dialog[data-present]');
    const closeBtn = dialog?.querySelector('n-button[aria-label="Close"]');
    expect(closeBtn).toBeTruthy();
  });

  it('omits close button when closeButton is false', () => {
    ctrl = new PresentController(host, { closeButton: false });
    ctrl.present();

    const dialog = document.querySelector('dialog[data-present]');
    const closeBtn = dialog?.querySelector('n-button[aria-label="Close"]');
    expect(closeBtn).toBeNull();
  });

  // ── Destroy ──

  it('destroy dismisses if open', () => {
    ctrl = new PresentController(host);
    ctrl.present();
    expect(ctrl.open).toBe(true);

    ctrl.destroy();
    expect(ctrl.open).toBe(false);
    expect(host.hasAttribute('presented')).toBe(false);
  });

  it('destroy is safe when not open', () => {
    ctrl = new PresentController(host);
    expect(() => ctrl.destroy()).not.toThrow();
  });

  it('destroy is safe to call multiple times', () => {
    ctrl = new PresentController(host);
    ctrl.present();
    expect(() => {
      ctrl.destroy();
      ctrl.destroy();
    }).not.toThrow();
  });
});
