import { AbstractControl, ValidationErrors } from '@angular/forms';

export function floatValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  const floatRegex = /^[+-]?\d+(\.\d+)?(,\d+)?$/;
  if (value && !floatRegex.test(value)) {
    return { invalidFloat: true };
  }
  return null;
}

export function positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') {
    return { required: true };
  }
  const num = parseFloat(raw.toString().replace(',', '.'));
  if (isNaN(num) || num <= 0) {
    return { notPositive: true };
  }
  return null;
}
