import { HttpErrorResponse } from '@angular/common/http';

/**
 * The JWC service answers failures as `{ "error": "..." }`, so the useful
 * sentence is inside the body rather than in the status text — surfacing
 * `e.message` instead would show "Http failure response for …" and hide
 * "daily quota exceeded".
 *
 * `fallback` is passed in already translated: this is a plain function, not
 * an injectable, so it has no TranslateService of its own.
 */
export function apiMessage(e: unknown, fallback: string): string {
  if (e instanceof HttpErrorResponse) {
    const body = e.error as { error?: string; message?: string; detail?: string } | null;
    return body?.error ?? body?.message ?? body?.detail ?? `HTTP ${e.status}`;
  }
  return (e as Error)?.message || fallback;
}
