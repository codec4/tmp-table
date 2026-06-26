import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  ColumnDef,
  DataTableComponent,
  DataTableTemplateDirective,
  withTableColumns,
  withTableRows,
  withTableTemplates
} from '@table-provider/data-table';
import { ProductRow, ProductStatus, productColumns, productRows } from './showcase-data';

type ProductStatusChange = {
  row: ProductRow;
  status: ProductStatus;
};

const formProductRows = productRows;
const formProductColumns: ColumnDef<ProductRow>[] = productColumns.map(column =>
  column.key === 'status'
    ? {
        ...column,
        cellClass: 'min-w-44',
        cellKind: 'interactive',
        templateKey: 'statusSelect',
        truncate: false
      }
    : column
);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective, ReactiveFormsModule],
  providers: [
    withTableTemplates(),
    withTableColumns<ProductRow>(formProductColumns),
    withTableRows<ProductRow>(formProductRows)
  ],
  selector: 'app-form-virtual-scroll-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 class="text-lg font-semibold text-slate-950">Editable Form Cells + Virtual Scroll</h2>
        <div class="text-sm text-slate-500 md:text-right">
          <p>{{ editedCount() }} edited across {{ rowCount }} rows</p>
          @if (lastStatusChange(); as change) {
            <p data-testid="last-status-change">
              {{ change.row.sku }} {{ change.row.name }} changed to {{ change.status }}
            </p>
          } @else {
            <p data-testid="last-status-change">No status changes yet</p>
          }
        </div>
      </div>

      <ng-template tableTemplate="statusSelect" let-row let-value="value">
        <select
          class="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          data-testid="product-status-select"
          [attr.aria-label]="'Status for ' + row.name"
          [formControl]="statusControl(row)"
        >
          @for (status of statusOptions; track status) {
            <option [value]="status">{{ status }}</option>
          }
        </select>
      </ng-template>

      <div class="h-[34rem]">
        <lib-data-table [fillContainer]="true" [virtualScroll]="true" [initialRows]="28" [overscanRows]="28" />
      </div>
    </section>
  `
})
export class FormVirtualScrollTableShowcaseComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #statusControls = new Map<number, FormControl<ProductStatus>>();
  readonly #editedIds = signal<ReadonlySet<number>>(new Set());
  readonly #lastStatusChange = signal<ProductStatusChange | null>(null);

  readonly editedCount = computed(() => this.#editedIds().size);
  readonly lastStatusChange = this.#lastStatusChange.asReadonly();
  readonly rowCount = formProductRows.length;
  readonly statusOptions: ProductStatus[] = ['active', 'review', 'paused'];

  statusControl(row: ProductRow): FormControl<ProductStatus> {
    const existingControl = this.#statusControls.get(row.id);

    if (existingControl) {
      return existingControl;
    }

    const control = new FormControl(row.status, { nonNullable: true });

    control.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(status => this.onStatusChange(row, status));

    this.#statusControls.set(row.id, control);

    return control;
  }

  onStatusChange(row: ProductRow, status: ProductStatus): void {
    console.log(row, status);
    this.#lastStatusChange.set({ row, status });
    this.#editedIds.update(ids => {
      const nextIds = new Set(ids);

      if (status === row.status) {
        nextIds.delete(row.id);
      } else {
        nextIds.add(row.id);
      }

      return nextIds;
    });
  }
}
