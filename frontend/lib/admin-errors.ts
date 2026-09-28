/**
 * Which form field a FastAPI error points at, so a Server Action can show it
 * inline: 409 → `conflictField`; 422 → the last `loc` entry of the first error,
 * or a plain-string detail that starts with the field name ("title cannot be null").
 */
export function fieldFromError<F extends string>(
  status: number,
  detail: unknown,
  message: string,
  fields: readonly F[],
  conflictField?: F,
): F | undefined {
  if (status === 409) return conflictField;
  if (status !== 422) return undefined;
  if (Array.isArray(detail)) {
    const loc = (detail[0] as { loc?: unknown } | undefined)?.loc;
    const last = Array.isArray(loc) ? loc.at(-1) : undefined;
    if (fields.includes(last as F)) return last as F;
  }
  return fields.find((f) => message.toLowerCase().startsWith(f));
}
