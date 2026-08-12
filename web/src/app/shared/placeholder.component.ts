import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Temporary page used while feature pages are ported. Reads the route's title
 * so the shell + routing + active-link highlighting are exercised now; real
 * pages replace these routes in later phases.
 */
@Component({
  selector: 'app-placeholder',
  imports: [CardModule, TranslateModule],
  template: `
    <p-card [header]="title()">
      <p class="m-0 text-surface-500 dark:text-surface-400">
        {{ 'common.loading' | translate }} — bu sahifa keyingi bosqichda quriladi.
      </p>
    </p-card>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = signal(
    this.route.snapshot.title ?? this.route.snapshot.data['label'] ?? 'Page',
  );
}
