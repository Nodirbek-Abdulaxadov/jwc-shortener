import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, ButtonModule, TranslateModule],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <i class="pi pi-lock text-4xl text-surface-400"></i>
      <h1 class="text-2xl font-bold">{{ 'auth.forbidden_title' | translate }}</h1>
      <p class="max-w-sm text-surface-500 dark:text-surface-400">
        {{ 'auth.forbidden_body' | translate }}
      </p>
      <p-button
        [label]="'auth.back_to_links' | translate"
        icon="pi pi-arrow-left"
        routerLink="/"
      />
    </div>
  `,
})
export class ForbiddenComponent {}
