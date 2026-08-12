import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AdminStats, ShortenerApi } from '../../core/api/shortener.api';
import { apiMessage } from '../../core/api/http-error';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

/** Platform-wide numbers: totals, the last 14 days, and the busiest links. */
@Component({
  selector: 'app-admin-dashboard',
  imports: [DecimalPipe, TableModule, ChartModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      [title]="'admin.dashboard_title' | translate"
      [subtitle]="'admin.dashboard_subtitle' | translate"
    />

    <div class="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      @for (tile of tiles(); track tile.key) {
        <div
          class="rounded-xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
        >
          <div class="text-2xl font-semibold">{{ tile.value | number }}</div>
          <div class="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {{ tile.key | translate }}
          </div>
        </div>
      }
    </div>

    <div
      class="mb-5 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <h2 class="mb-4 text-lg font-semibold">{{ 'admin.last_14_days' | translate }}</h2>
      <p-chart type="line" [data]="chartData()" [options]="chartOptions" height="240px" />
    </div>

    <div
      class="rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
    >
      <p-table [value]="stats()?.top ?? []" [loading]="loading()" styleClass="p-datatable-sm">
        <ng-template pTemplate="caption">
          <span class="font-semibold">{{ 'admin.top_links' | translate }}</span>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th class="w-32">{{ 'links.code' | translate }}</th>
            <th>{{ 'links.target' | translate }}</th>
            <th class="w-28">{{ 'links.hits' | translate }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono">{{ row.code }}</td>
            <td class="max-w-lg truncate text-surface-500" [title]="row.url">{{ row.url }}</td>
            <td class="font-medium">{{ row.hits | number }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="3" class="py-8 text-center text-surface-500">
              {{ 'admin.no_clicks' | translate }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AdminDashboardComponent {
  private readonly api = inject(ShortenerApi);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);

  readonly chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  constructor() {
    void this.load();
  }

  tiles(): { key: string; value: number }[] {
    const s = this.stats();
    return [
      { key: 'admin.tile_links', value: s?.links ?? 0 },
      { key: 'admin.tile_clicks', value: s?.clicks ?? 0 },
      { key: 'admin.tile_users', value: s?.users ?? 0 },
      { key: 'admin.tile_blocked', value: s?.blocked ?? 0 },
    ];
  }

  chartData(): unknown {
    const series = this.stats()?.series ?? [];
    return {
      labels: series.map((p) => String(p.day).slice(5)),
      datasets: [
        {
          data: series.map((p) => Number(p.hits)),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }

  private async load(): Promise<void> {
    try {
      this.stats.set(await this.api.adminStats());
    } catch (e) {
      this.toast.error(apiMessage(e, this.translate.instant('common.error')));
    } finally {
      this.loading.set(false);
    }
  }
}
