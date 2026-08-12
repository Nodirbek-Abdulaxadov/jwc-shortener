import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Global error handler — logs and surfaces a toast. Replaces breezy's
 * ErrorBoundary. Uses the Injector to fetch MessageService lazily (ErrorHandler
 * is constructed very early in bootstrap).
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    console.error(error);
    const detail = error instanceof Error ? error.message : 'An unexpected error occurred';
    try {
      this.injector.get(MessageService).add({ severity: 'error', summary: 'Error', detail });
    } catch {
      // MessageService not available yet — console log above is the fallback.
    }
  }
}
