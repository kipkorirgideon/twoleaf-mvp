/** Joins truthy class names with a space (same as `cx` in bundle.js). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
