import { Component, input } from '@angular/core';

/** Page title + subtitle, with a projected slot for actions on the right. */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input('');
  readonly subtitle = input<string | undefined>(undefined);
}
