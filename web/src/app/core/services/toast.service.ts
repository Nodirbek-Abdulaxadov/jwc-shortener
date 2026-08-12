import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** Thin wrapper over PrimeNG MessageService (replaces sonner/shadcn toast). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messages = inject(MessageService);

  success(detail: string, summary = 'Success'): void {
    this.messages.add({ severity: 'success', summary, detail });
  }
  info(detail: string, summary = 'Info'): void {
    this.messages.add({ severity: 'info', summary, detail });
  }
  warn(detail: string, summary = 'Warning'): void {
    this.messages.add({ severity: 'warn', summary, detail });
  }
  error(detail: string, summary = 'Error'): void {
    this.messages.add({ severity: 'error', summary, detail });
  }
}
