import { describe, it, expect } from 'vitest';
import { SelectController } from '../controller/select-controller.ts';

describe('SelectController', () => {
  it('starts with open=false, value=null, label=""', () => {
    const ctrl = new SelectController();
    expect(ctrl.open.value).toBe(false);
    expect(ctrl.value.value).toBeNull();
    expect(ctrl.label.value).toBe('');
  });

  it('toggle flips open state', () => {
    const ctrl = new SelectController();
    ctrl.toggle();
    expect(ctrl.open.value).toBe(true);
    ctrl.toggle();
    expect(ctrl.open.value).toBe(false);
  });

  it('show/hide control open state', () => {
    const ctrl = new SelectController();
    ctrl.show();
    expect(ctrl.open.value).toBe(true);
    ctrl.hide();
    expect(ctrl.open.value).toBe(false);
  });

  it('select sets value, label and closes', () => {
    const ctrl = new SelectController();
    ctrl.show();
    ctrl.select('us', 'United States');
    expect(ctrl.value.value).toBe('us');
    expect(ctrl.label.value).toBe('United States');
    expect(ctrl.open.value).toBe(false);
  });

  it('reset clears all state', () => {
    const ctrl = new SelectController();
    ctrl.select('us', 'United States');
    ctrl.reset();
    expect(ctrl.open.value).toBe(false);
    expect(ctrl.value.value).toBeNull();
    expect(ctrl.label.value).toBe('');
  });

});
