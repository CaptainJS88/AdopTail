export function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
