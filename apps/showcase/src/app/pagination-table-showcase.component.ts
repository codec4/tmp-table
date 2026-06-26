import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import {
  DataTableComponent,
  DataTableTemplateDirective,
  TABLE_DATA,
  provideTableColumns,
  provideTableTemplates
} from '@table-provider/data-table';
import { ProductRow, productColumns, productRows } from './showcase-data';

@Injectable()
class PaginationTableShowcaseStore {
  readonly rows = productRows.slice(0, 32);
  readonly pageSize = 8;
  readonly pageIndex = signal(0);
  readonly pageCount = computed(() => Math.ceil(this.rows.length / this.pageSize));
  readonly pageStart = computed(() => this.pageIndex() * this.pageSize + 1);
  readonly pageEnd = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize, this.rows.length));
  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;

    return this.rows.slice(start, start + this.pageSize);
  });

  previousPage(): void {
    this.pageIndex.update(page => Math.max(page - 1, 0));
  }

  nextPage(): void {
    this.pageIndex.update(page => Math.min(page + 1, this.pageCount() - 1));
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    PaginationTableShowcaseStore,
    provideTableTemplates(),
    ...provideTableColumns<ProductRow>(productColumns),
    {
      provide: TABLE_DATA,
      useFactory: () => inject(PaginationTableShowcaseStore).pagedRows
    }
  ],
  selector: 'app-pagination-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">Pagination</h2>
          <p class="text-sm text-slate-500">
            {{ store.pageStart() }}-{{ store.pageEnd() }} of {{ store.rows.length }} rows
          </p>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            [disabled]="store.pageIndex() === 0"
            (click)="store.previousPage()"
          >
            Previous
          </button>
          <span class="min-w-24 text-center text-slate-600">
            Page {{ store.pageIndex() + 1 }} of {{ store.pageCount() }}
          </span>
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            [disabled]="store.pageIndex() + 1 === store.pageCount()"
            (click)="store.nextPage()"
          >
            Next
          </button>
        </div>
      </div>

      <ng-template tableTemplate="statusBadge" let-value="value">
        <span
          class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
          [class.bg-emerald-50]="value === 'active'"
          [class.text-emerald-700]="value === 'active'"
          [class.ring-emerald-600/20]="value === 'active'"
          [class.bg-amber-50]="value === 'review'"
          [class.text-amber-700]="value === 'review'"
          [class.ring-amber-600/20]="value === 'review'"
          [class.bg-slate-100]="value === 'paused'"
          [class.text-slate-700]="value === 'paused'"
          [class.ring-slate-600/20]="value === 'paused'"
        >
          {{ value }}
        </span>
      </ng-template>

      <lib-data-table />
    </section>
  `
})
export class PaginationTableShowcaseComponent {
  readonly store = inject(PaginationTableShowcaseStore);
}
