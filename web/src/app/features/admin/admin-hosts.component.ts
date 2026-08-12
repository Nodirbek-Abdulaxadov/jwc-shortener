import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ShortenerApi } from '../../core/api/shortener.api';
import { apiMessage } from '../../core/api/http-error';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/**
 * Destination blocklist. It is checked when a link is CREATED, so blocking a
 * host does not retire links that already point at it — use the links page
 * for those.
 */
@Component({
  selector: 'app-admin-hosts',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ConfirmDialogModule,
    TranslateModule,
    PageHeaderComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <app-page-header
      [title]="'admin.hosts_title' | translate"
      [subtitle]="'admin.hosts_subtitle' | translate"
    />

    <div
      class="mb-5 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <form [formGroup]="form" (ngSubmit)="add()" class="flex flex-wrap items-end gap-3">
        <div class="flex min-w-64 flex-1 flex-col gap-1">
          <label for="host" class="text-sm font-medium">{{ 'admin.host' | translate }}</label>
          <input id="host" pInputText formControlName="host" placeholder="spam.example" class="w-full" />
        </div>
        <p-button
          type="submit"
          [label]="'admin.block_host' | translate"
          icon="pi pi-ban"
          [loading]="busy()"
        />
      </form>
    </div>

    <div
      class="rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <p-table [value]="rows()" [loading]="loading()" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ 'admin.host' | translate }}</th>
            <th class="w-32 text-right">{{ 'common.actions' | translate }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono">{{ row.host }}</td>
            <td class="text-right">
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                (onClick)="remove(row.host)"
              />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="2" class="py-10 text-center text-surface-500">
              {{ 'admin.no_hosts' | translate }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <p-confirmDialog />
  `,
})
export class AdminHostsComponent {
  private readonly api = inject(ShortenerApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly rows = signal<{ host: string }[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);

  readonly form = this.fb.nonNullable.group({
    host: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.blockedHosts();
      this.rows.set(res.data ?? []);
    } catch (e) {
      this.toast.error(apiMessage(e, this.translate.instant('common.error')));
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const host = this.form.getRawValue().host.trim().toLowerCase();
      await this.api.blockHost(host);
      this.form.reset({ host: '' });
      this.toast.success(this.translate.instant('admin.host_blocked', { host }));
      await this.load();
    } catch (e) {
      this.toast.error(apiMessage(e, this.translate.instant('common.error')));
    } finally {
      this.busy.set(false);
    }
  }

  remove(host: string): void {
    this.confirm.confirm({
      header: this.translate.instant('admin.unblock_title'),
      message: this.translate.instant('admin.unblock_body', { host }),
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      accept: async () => {
        try {
          await this.api.unblockHost(host);
          await this.load();
        } catch (e) {
          this.toast.error(apiMessage(e, this.translate.instant('common.error')));
        }
      },
    });
  }
}
