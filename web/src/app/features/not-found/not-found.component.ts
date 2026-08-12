import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonModule, TranslateModule],
  template: `
    <div
      class="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-50 p-4 text-center text-surface-900 dark:bg-surface-950 dark:text-surface-0"
    >
      <p class="text-6xl font-extrabold text-primary-500">404</p>
      <h1 class="text-2xl font-semibold">{{ 'not_found.title' | translate }}</h1>
      <p class="max-w-sm text-surface-500 dark:text-surface-400">
        {{ 'not_found.body' | translate }}
      </p>
      <p-button routerLink="/" [label]="'auth.back_to_links' | translate" icon="pi pi-home" />
    </div>
  `,
})
export class NotFoundComponent {}
