export function isValidPhone(value: string) {
  return /^[\d().\s-]+$/.test(value) && value.replace(/\D/g, '').length === 10;
}

export function validateForm(form: HTMLFormElement) {
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  for (const field of fields) {
    if (field.disabled) continue;
    const label = field.labels?.[0]?.textContent?.replace(/\s*\*\s*$/, '').trim() || 'This field';
    let message = '';
    if (field.name === 'phone' && (field.required || field.value) && !isValidPhone(field.value)) {
      message = 'Enter a valid phone number with exactly 10 digits, for example 8175550123. Leave out the country code.';
    }
    else if (field.required && !field.value.trim()) message = 'Please fill in this field.';
    else if ('minLength' in field && field.minLength > 0 && field.value.length < field.minLength) {
      message = `Use at least ${field.minLength} characters.`;
    } else if (!field.validity.valid) message = field.validationMessage;
    if (message) {
      field.focus();
      return `${label}: ${message}`;
    }
  }
  return '';
}
