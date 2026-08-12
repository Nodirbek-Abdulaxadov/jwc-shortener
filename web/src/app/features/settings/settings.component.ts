import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/**
 * Only the settings this app actually owns: appearance and language, both
 * client-side and persisted to localStorage. Account settings (name, phone,
 * password, MFA) belong to musanna-platform — duplicating them here would
 * mean forms that appear to save and do not.
 */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, SelectButtonModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="'settings.title' | translate"
      [subtitle]="'settings.subtitle' | translate"
    />

    <div
      class="max-w-2xl rounded-xl border border-surface-200 bg-surface-0 p-6 dark:border-surface-800 dark:bg-surface-900"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="font-medium">{{ 'settings.appearance' | translate }}</div>
          <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {{ 'settings.appearance_help' | translate }}
          </p>
        </div>
        <p-selectbutton
          [options]="themes()"
          [ngModel]="theme.theme()"
          (ngModelChange)="theme.set($event)"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
        />
      </div>

      <div
        class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-surface-200 pt-6 dark:border-surface-800"
      >
        <div>
          <div class="font-medium">{{ 'language' | translate }}</div>
          <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {{ 'settings.language_help' | translate }}
          </p>
        </div>
        <p-selectbutton
          [options]="language.languages"
          [ngModel]="language.current()"
          (ngModelChange)="language.use($event)"
          optionLabel="label"
          optionValue="code"
          [allowEmpty]="false"
        />
      </div>

      <dl
        class="mt-6 grid gap-3 border-t border-surface-200 pt-6 text-sm dark:border-surface-800"
      >
        <div class="flex flex-wrap justify-between gap-2">
          <dt class="text-surface-500 dark:text-surface-400">{{ 'settings.api' | translate }}</dt>
          <dd class="font-mono text-xs">{{ api }}</dd>
        </div>
        <div class="flex flex-wrap justify-between gap-2">
          <dt class="text-surface-500 dark:text-surface-400">{{ 'profile.idp' | translate }}</dt>
          <dd class="font-mono text-xs">{{ authority }}</dd>
        </div>
      </dl>
    </div>
  `,
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  readonly api = environment.apiBaseUrl;
  readonly authority = environment.oidc.authority;

  // Reading `language.current()` is what makes these labels re-translate
  // when the language changes; `instant` on its own would freeze them.
  readonly themes = computed(() => {
    this.language.current();
    return [
      { label: this.translate.instant('theme.light'), value: 'light' as const },
      { label: this.translate.instant('theme.dark'), value: 'dark' as const },
    ];
  });
}
