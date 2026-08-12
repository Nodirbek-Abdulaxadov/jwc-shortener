import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AdminUser, ShortenerApi } from '../../core/api/shortener.api';
import { apiMessage } from '../../core/api/http-error';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/**
 * Users this service has seen. It is not the platform's user directory —
 * a row appears the first time someone creates a link here, so `sub` is the
 * only identifier guaranteed to be present (a phone-only musanna account has
 * no email).
 */
@Component({
  selector: 'app-admin-users',
  imports: [
    DatePipe,
    DecimalPipe,
    TableModule,
    ButtonModule,
    TagModule,
    TranslateModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      [title]="'admin.users_title' | translate"
      [subtitle]="'admin.users_subtitle' | translate"
    >
      <p-button icon="pi pi-refresh" severity="secondary" [outlined]="true" (onClick)="load()" />
    </app-page-header>

    <div
      class="rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <p-table
        [value]="rows()"
        [loading]="loading()"
        [paginator]="rows().length > 15"
        [rows]="15"
        styleClass="p-datatable-sm"
        responsiveLayout="scroll"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Email</th>
            <th class="w-96">{{ 'admin.subject' | translate }}</th>
            <th class="w-24" pSortableColumn="links">
              {{ 'admin.links_count' | translate }} <p-sortIcon field="links" />
            </th>
            <th class="w-24" pSortableColumn="clicks">
              {{ 'admin.clicks_count' | translate }} <p-sortIcon field="clicks" />
            </th>
            <th class="w-28">{{ 'links.status' | translate }}</th>
            <th class="w-40">{{ 'admin.joined' | translate }}</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-medium">{{ row.email || '—' }}</td>
            <td class="font-mono text-xs text-surface-500">{{ row.sub }}</td>
            <td>{{ row.links | number }}</td>
            <td>{{ row.clicks | number }}</td>
            <td>
              <p-tag
                [value]="row.status"
                [severity]="row.status === 'active' ? 'success' : 'danger'"
              />
            </td>
            <td class="text-surface-500">{{ row.created_at | date: 'yyyy-MM-dd' }}</td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="py-10 text-center text-surface-500">
              {{ 'admin.no_users' | translate }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AdminUsersComponent {
  private readonly api = inject(ShortenerApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly rows = signal<AdminUser[]>([]);
  readonly loading = signal(true);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.adminUsers();
      this.rows.set(res.data ?? []);
    } catch (e) {
      this.toast.error(apiMessage(e, this.translate.instant('common.error')));
    } finally {
      this.loading.set(false);
    }
  }
}
