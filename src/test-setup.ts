// WHY: happy-dom doesn't support setPointerCapture/releasePointerCapture.
// Stub them to avoid errors in pointer-based traits (Resizable, Draggable, etc.)
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = function () {};
  HTMLElement.prototype.releasePointerCapture = function () {};
}

// WHY: happy-dom doesn't support the Popover API (showPopover/hidePopover).
// Stub them so Draggable's popover-based ghost works in tests.
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {};
  HTMLElement.prototype.hidePopover = function () {};
}

// WHY: happy-dom doesn't support ElementInternals. This polyfill
// provides a minimal stub so components using attachInternals() can
// be tested. It covers role, aria-* properties, and setFormValue().

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function () {
    return {
      role: null,
      ariaChecked: null,
      ariaDisabled: null,
      ariaRequired: null,
      ariaSelected: null,
      ariaLabel: null,
      ariaLabelledBy: null,
      ariaExpanded: null,
      ariaHidden: null,
      ariaDescribedBy: null,
      form: null,
      states: new Set(),
      setFormValue(_value: any, _state?: any) {},
      setValidity(_flags?: any, _message?: string, _anchor?: HTMLElement) {},
      reportValidity() { return true; },
      checkValidity() { return true; },
      validationMessage: '',
      willValidate: true,
      validity: {
        valueMissing: false,
        typeMismatch: false,
        patternMismatch: false,
        tooLong: false,
        tooShort: false,
        rangeUnderflow: false,
        rangeOverflow: false,
        stepMismatch: false,
        badInput: false,
        customError: false,
        valid: true,
      },
      labels: [],
      shadowRoot: null,
    } as unknown as ElementInternals;
  };
}
