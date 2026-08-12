import { Component, inject } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/**
 * Read-only on purpose. The account lives in musanna-platform — name, phone,
 * email and password are edited there, and an editable copy here would be a
 * form that silently changes nothing.
 */
@Component({
  selector: 'app-profile',
  imports: [AvatarModule, TagModule, ButtonModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="'profile.title' | translate"
      [subtitle]="'profile.subtitle' | translate"
    />

    <div
      class="max-w-2xl rounded-xl border border-surface-200 bg-surface-0 p-6 dark:border-surface-800 dark:bg-surface-900"
    >
      <div class="flex items-center gap-4">
        <p-avatar
          [label]="auth.initials()"
          size="xlarge"
          shape="circle"
          styleClass="!h-20 !w-20 !text-2xl !bg-primary !text-white"
        />
        <div class="min-w-0">
          <div class="text-lg font-semibold">{{ auth.user()?.name || '—' }}</div>
          <div class="text-sm text-surface-500 dark:text-surface-400">
            {{ auth.user()?.email || '—' }}
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            @for (role of auth.user()?.roles ?? []; track role) {
              <p-tag [value]="role" severity="info" />
            } @empty {
              <span class="text-xs text-surface-400">{{ 'profile.no_role' | translate }}</span>
            }
          </div>
        </div>
      </div>

      <dl class="mt-6 grid gap-4 border-t border-surface-200 pt-6 text-sm dark:border-surface-800">
        <div class="flex flex-wrap justify-between gap-2">
          <dt class="text-surface-500 dark:text-surface-400">{{ 'profile.subject' | translate }}</dt>
          <dd class="font-mono text-xs">{{ auth.user()?.sub }}</dd>
        </div>
        <div class="flex flex-wrap justify-between gap-2">
          <dt class="text-surface-500 dark:text-surface-400">{{ 'profile.idp' | translate }}</dt>
          <dd class="font-mono text-xs">{{ authority }}</dd>
        </div>
      </dl>

      <div class="mt-6">
        <p-button
          [label]="'profile.sign_out' | translate"
          icon="pi pi-sign-out"
          severity="danger"
          [outlined]="true"
          (onClick)="auth.logout()"
        />
      </div>
    </div>
  `,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly authority = environment.oidc.authority;
}
