import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Link, ShortenerApi } from '../../core/api/shortener.api';
import { apiMessage } from '../../core/api/http-error';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/** The user panel: create a short link, then manage your own. */
@Component({
  selector: 'app-links',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    TagModule,
    ConfirmDialogModule,
    DialogModule,
    TooltipModule,
    TranslateModule,
    PageHeaderComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <app-page-header
      [title]="'links.title' | translate"
      [subtitle]="'links.subtitle' | translate"
    />

    <div
      class="mb-5 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <form [formGroup]="form" (ngSubmit)="create()" class="flex flex-wrap items-end gap-3">
        <div class="flex min-w-72 flex-1 flex-col gap-1">
          <label for="url" class="text-sm font-medium">{{ 'links.long_url' | translate }}</label>
          <input
            id="url"
            pInputText
            formControlName="url"
            [placeholder]="'links.url_placeholder' | translate"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="expires" class="text-sm font-medium">
            {{ 'links.expires_at' | translate }}
          </label>
          <p-datepicker
            inputId="expires"
            formControlName="expiresAt"
            [showTime]="true"
            [showIcon]="true"
            dateFormat="yy-mm-dd"
            [minDate]="today"
          />
        </div>
        <p-button
          type="submit"
          [label]="'links.shorten' | translate"
          icon="pi pi-link"
          [loading]="busy()"
        />
      </form>
    </div>

    <div
      class="rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <p-table
        [value]="rows()"
        [loading]="loading()"
        [paginator]="rows().length > 10"
        [rows]="10"
        styleClass="p-datatable-sm"
        responsiveLayout="scroll"
      >
        <ng-template pTemplate="header">
          <tr>
            <th class="w-32">{{ 'links.code' | translate }}</th>
            <th>{{ 'links.target' | translate }}</th>
            <th class="w-24" pSortableColumn="hits">
              {{ 'links.hits' | translate }} <p-sortIcon field="hits" />
            </th>
            <th class="w-32">{{ 'links.status' | translate }}</th>
            <th class="w-44" pSortableColumn="created_at">
              {{ 'links.created' | translate }} <p-sortIcon field="created_at" />
            </th>
            <th class="w-36 text-right">{{ 'common.actions' | translate }}</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <a
                [href]="api.shortUrl(row.code)"
                target="_blank"
                rel="noopener"
                class="font-mono font-medium text-primary-600 hover:underline"
                >{{ row.code }}</a
              >
            </td>
            <td class="max-w-md truncate text-surface-500 dark:text-surface-400" [title]="row.url">
              {{ row.url }}
            </td>
            <td class="font-medium">{{ row.hits }}</td>
            <td>
              <p-tag [value]="stateLabel(row)" [severity]="stateSeverity(row)" />
            </td>
            <td class="text-surface-500 dark:text-surface-400">
              {{ row.created_at | date: 'yyyy-MM-dd HH:mm' }}
            </td>
            <td>
              <div class="flex items-center justify-end gap-1">
                <p-button
                  icon="pi pi-copy"
                  severity="secondary"
                  [text]="true"
                  [pTooltip]="'common.copy' | translate"
                  (onClick)="copy(row.code)"
                />
                <p-button
                  icon="pi pi-qrcode"
                  severity="secondary"
                  [text]="true"
                  (onClick)="showQr(row.code)"
                />
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  (onClick)="remove(row)"
                />
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="py-10 text-center text-surface-500">
              {{ 'links.empty' | translate }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog
      [visible]="qrCode() !== null"
      (visibleChange)="!$event && qrCode.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '320px' }"
      [header]="'links.qr_title' | translate"
    >
      @if (qrCode(); as code) {
        <div class="flex flex-col items-center gap-3">
          <img [src]="qrSrc()" width="220" height="220" alt="QR" class="rounded-lg bg-white p-2" />
          <a [href]="api.shortUrl(code)" target="_blank" rel="noopener" class="font-mono text-sm">
            {{ api.shortUrl(code) }}
          </a>
        </div>
      }
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class LinksComponent {
  readonly api = inject(ShortenerApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly today = new Date();
  readonly rows = signal<Link[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly qrCode = signal<string | null>(null);

  readonly qrSrc = computed(() => {
    const code = this.qrCode();
    if (!code) {
      return '';
    }
    return `https://barcodeapi.org/api/qr/${encodeURIComponent(this.api.shortUrl(code))}?format=svg`;
  });

  readonly form = this.fb.nonNullable.group({
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    expiresAt: [null as Date | null],
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.myLinks();
      this.rows.set(res.data ?? []);
    } catch (e) {
      this.toast.error(this.err(e));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warn(this.translate.instant('links.invalid_url'));
      return;
    }
    this.busy.set(true);
    try {
      const { url, expiresAt } = this.form.getRawValue();
      const created = await this.api.createLink(url, expiresAt ? expiresAt.toISOString() : null);
      this.form.reset({ url: '', expiresAt: null });
      this.toast.success(created.short);
      await this.copy(created.code);
      await this.load();
    } catch (e) {
      this.toast.error(this.err(e));
    } finally {
      this.busy.set(false);
    }
  }

  remove(row: Link): void {
    this.confirm.confirm({
      header: this.translate.instant('links.delete_title'),
      message: this.translate.instant('links.delete_body', { code: row.code }),
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.api.deleteLink(row.code);
          this.toast.success(this.translate.instant('links.deleted', { code: row.code }));
          await this.load();
        } catch (e) {
          this.toast.error(this.err(e));
        }
      },
    });
  }

  async copy(code: string): Promise<void> {
    await navigator.clipboard.writeText(this.api.shortUrl(code));
    this.toast.info(this.translate.instant('common.copied'));
  }

  showQr(code: string): void {
    this.qrCode.set(code);
  }

  stateLabel(row: Link): string {
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      return this.translate.instant('links.state_expired');
    }
    return this.translate.instant(
      row.status === 'active' ? 'links.state_active' : 'links.state_blocked',
    );
  }

  /** Shared error-to-sentence conversion with a translated fallback. */
  private err(e: unknown): string {
    return apiMessage(e, this.translate.instant('common.error'));
  }

  stateSeverity(row: Link): 'success' | 'danger' | 'warn' {
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      return 'warn';
    }
    return row.status === 'active' ? 'success' : 'danger';
  }
}

