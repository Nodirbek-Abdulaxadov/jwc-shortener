import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AdminLink, ShortenerApi } from '../../core/api/shortener.api';
import { apiMessage } from '../../core/api/http-error';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/** Every link in the service, with the block / unblock switch. */
@Component({
  selector: 'app-admin-links',
  imports: [
    DatePipe,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    TranslateModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      [title]="'admin.links_title' | translate"
      [subtitle]="'admin.links_subtitle' | translate"
    >
      <p-button icon="pi pi-refresh" severity="secondary" [outlined]="true" (onClick)="load()" />
    </app-page-header>

    <div
      class="rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <p-table
        [value]="rows()"
        [loading]="loading()"
        [paginator]="true"
        [rows]="15"
        [rowsPerPageOptions]="[15, 50, 100]"
        styleClass="p-datatable-sm"
        responsiveLayout="scroll"
      >
        <ng-template pTemplate="caption">
          <p-iconfield class="w-full sm:w-96">
            <p-inputicon class="pi pi-search" />
            <input
              pInputText
              type="text"
              class="w-full"
              [placeholder]="'admin.search_placeholder' | translate"
              [(ngModel)]="query"
              (keydown.enter)="load()"
            />
          </p-iconfield>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th class="w-28">{{ 'links.code' | translate }}</th>
            <th>{{ 'links.target' | translate }}</th>
            <th class="w-52">{{ 'admin.owner' | translate }}</th>
            <th class="w-20">{{ 'links.hits' | translate }}</th>
            <th class="w-28">{{ 'links.status' | translate }}</th>
            <th class="w-40">{{ 'links.created' | translate }}</th>
            <th class="w-32 text-right">{{ 'common.actions' | translate }}</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-row>
          <tr [class.opacity-50]="row.deleted_at">
            <td>
              <a
                [href]="api.shortUrl(row.code)"
                target="_blank"
                rel="noopener"
                class="font-mono text-primary-600 hover:underline"
                >{{ row.code }}</a
              >
            </td>
            <td class="max-w-sm truncate text-surface-500" [title]="row.url">{{ row.url }}</td>
            <td class="truncate text-surface-500" [title]="row.owner_sub">
              {{ row.owner_email || row.owner_sub }}
            </td>
            <td class="font-medium">{{ row.hits }}</td>
            <td><p-tag [value]="label(row)" [severity]="severity(row)" /></td>
            <td class="text-surface-500">{{ row.created_at | date: 'yyyy-MM-dd HH:mm' }}</td>
            <td class="text-right">
              @if (!row.deleted_at) {
                @if (row.status === 'active') {
                  <p-button
                    [label]="'admin.block' | translate"
                    size="small"
                    severity="danger"
                    [outlined]="true"
                    (onClick)="setStatus(row, 'blocked')"
                  />
                } @else {
                  <p-button
                    [label]="'admin.unblock' | translate"
                    size="small"
                    severity="success"
                    [outlined]="true"
                    (onClick)="setStatus(row, 'active')"
                  />
                }
              }
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="py-10 text-center text-surface-500">
              {{ 'admin.no_links' | translate }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AdminLinksComponent {
  readonly api = inject(ShortenerApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly rows = signal<AdminLink[]>([]);
  readonly loading = signal(true);
  query = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.adminLinks(this.query.trim());
      this.rows.set(res.data ?? []);
    } catch (e) {
      this.toast.error(apiMessage(e, this.translate.instant('common.error')));
    } finally {
      this.loading.set(false);
    }
  }

  async setStatus(row: AdminLink, status: 'active' | 'blocked'): Promise<void> {
    try {
      await this.api.setLinkStatus(row.code, status);
      this.toast.success(
        this.translate.instant(status === 'blocked' ? 'admin.blocked_ok' : 'admin.unblocked_ok', {
          code: row.code,
        }),
      );
      await this.load();
    } catch (e) {
      this.toast.error(apiMessage(e, this.translate.instant('common.error')));
    }
  }

  label(row: AdminLink): string {
    if (row.deleted_at) {
      return this.translate.instant('admin.state_deleted');
    }
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      return this.translate.instant('links.state_expired');
    }
    return this.translate.instant(
      row.status === 'active' ? 'links.state_active' : 'links.state_blocked',
    );
  }

  severity(row: AdminLink): 'success' | 'danger' | 'warn' | 'secondary' {
    if (row.deleted_at) {
      return 'secondary';
    }
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      return 'warn';
    }
    return row.status === 'active' ? 'success' : 'danger';
  }
}
