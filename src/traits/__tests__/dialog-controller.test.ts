// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DialogController } from '../dialog-controller.ts';

describe('DialogController', () => {
  let host: HTMLElement;
  let ctrl: DialogController;

  beforeEach(() => {
    host = document.createElement('div');
    host.innerHTML = '<p>Dialog content</p>';
    document.body.appendChild(host);
    ctrl = new DialogController(host);
  });

  afterEach(() => {
    ctrl.destroy();
    host.remove();
  });

  it('creates a dialog element inside host', () => {
    const dialog = host.querySelector('dialog');
    expect(dialog).toBeTruthy();
  });

  it('moves host children into dialog', () => {
    const dialog = host.querySelector('dialog')!;
    expect(dialog.querySelector('p')?.textContent).toBe('Dialog content');
    // Direct children of host should only be the dialog
    expect(host.children.length).toBe(1);
    expect(host.children[0].tagName).toBe('DIALOG');
  });

  it('open is false initially', () => {
    expect(ctrl.open).toBe(false);
  });

  it('showModal opens the dialog', () => {
    // happy-dom has limited dialog support, but the controller sets the open attribute
    ctrl.showModal();
    expect(host.hasAttribute('open')).toBe(true);
  });

  it('close closes the dialog', () => {
    ctrl.showModal();
    ctrl.close();
    expect(host.hasAttribute('open')).toBe(false);
  });

  it('close dispatches close event', () => {
    ctrl.showModal();
    let closed = false;
    host.addEventListener('close', () => { closed = true; }, { once: true });
    ctrl.close();
    expect(closed).toBe(true);
  });

  it('showModal is idempotent when already open', () => {
    ctrl.showModal();
    // Second call should not throw
    expect(() => ctrl.showModal()).not.toThrow();
  });

  it('close is idempotent when already closed', () => {
    expect(() => ctrl.close()).not.toThrow();
  });

  it('responds to native:dismiss event', () => {
    ctrl.showModal();
    host.dispatchEvent(new CustomEvent('native:dismiss'));
    expect(host.hasAttribute('open')).toBe(false);
  });

  it('no-close-on-escape prevents dismiss from closing', () => {
    host.setAttribute('no-close-on-escape', '');
    ctrl.showModal();
    host.dispatchEvent(new CustomEvent('native:dismiss'));
    // Should remain open because no-close-on-escape is set
    expect(host.hasAttribute('open')).toBe(true);
  });

  it('destroy removes the dialog reference', () => {
    ctrl.destroy();
    expect(ctrl.open).toBe(false);
    // Should not throw after destroy
    expect(() => ctrl.showModal()).not.toThrow();
    expect(() => ctrl.close()).not.toThrow();
  });

  it('uses contentTarget option when provided', () => {
    host.remove();
    host = document.createElement('div');
    host.innerHTML = '<span>Inner</span>';
    document.body.appendChild(host);

    ctrl = new DialogController(host, {
      contentTarget: (dialog) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('dialog-body');
        dialog.appendChild(wrapper);
        return wrapper;
      },
    });

    const dialog = host.querySelector('dialog')!;
    const wrapper = dialog.querySelector('.dialog-body');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.querySelector('span')?.textContent).toBe('Inner');
  });
});
