import '../../../../../src/nav/native-dashboard.ts';
import '../../../../../src/components/button/button.ts';
import '../../../../../src/components/input/input.ts';
import '../../../../../src/components/controller/controller.ts';
import '../../../../../src/icons/icon.ts';
import '../../../../../src/icons/phosphor/copy.ts';
import '../../../../../src/icons/phosphor/check.ts';
import { ValidateController } from '../index.ts';

// ── Wire validation field ──

function wireField(field) {
  const errorEl = field.querySelector('.error-msg');
  field.addEventListener('native:invalid', (e) => {
    if (errorEl) errorEl.textContent = e.detail.message;
  });
  field.addEventListener('native:valid', () => {
    if (errorEl) errorEl.textContent = '';
  });
}

// ── Required Field ──

const reqField = document.getElementById('required-field');
const reqValidator = new ValidateController(reqField);
reqValidator.rules = [
  ValidateController.required('Name is required'),
];
wireField(reqField);
document.getElementById('validate-required').addEventListener('native:press', () => {
  const ok = reqValidator.validate();
  document.getElementById('required-output').textContent = ok ? 'Valid!' : `Invalid: ${reqValidator.errorMessage}`;
});

// ── Password Field ──

const pwField = document.getElementById('password-field');
const pwValidator = new ValidateController(pwField);
pwValidator.rules = [
  ValidateController.required('Password is required'),
  ValidateController.minLength(8, 'Must be at least 8 characters'),
  ValidateController.pattern(/[A-Z]/, 'Must contain an uppercase letter'),
  ValidateController.pattern(/[0-9]/, 'Must contain a number'),
];
wireField(pwField);
document.getElementById('validate-password').addEventListener('native:press', () => {
  const ok = pwValidator.validate();
  document.getElementById('password-output').textContent = ok ? 'Valid!' : `Invalid: ${pwValidator.errorMessage}`;
});

// ── Email Field (blur validation) ──

const emailField = document.getElementById('email-field');
const emailValidator = new ValidateController(emailField);
emailValidator.rules = [
  ValidateController.required('Email is required'),
  ValidateController.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email address'),
];
wireField(emailField);
const emailInput = emailField.querySelector('native:input');
emailInput.addEventListener('focusout', () => {
  emailValidator.validate();
});

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
