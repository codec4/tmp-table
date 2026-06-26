import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import {
  DataTableComponent,
  DataTableKey,
  DataTableSelectionOptions,
  DataTableTemplateDirective,
  withTableColumns,
  withTableTemplates,
  withTableRows,
  withTableSelection
} from '@table-provider/data-table';
import { ProductRow, productColumns, productRows } from './showcase-data';

const selectionRows = productRows.slice(0, 24);

@Injectable()
class SelectionTableShowcaseStore {
  readonly selectedKeys = signal<ReadonlySet<DataTableKey>>(new Set([2, 5, 8]));
  readonly selection = computed<DataTableSelectionOptions<ProductRow>>(() => ({
    disabled: row => row.status === 'paused',
    onChange: change => this.selectedKeys.set(change.selectedKeys),
    rowKey: 'id',
    selectAll: 'data',
    selectedKeys: this.selectedKeys()
  }));
  readonly disabledCount = selectionRows.filter(row => row.status === 'paused').length;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    SelectionTableShowcaseStore,
    withTableTemplates(),
    ...withTableColumns<ProductRow>(productColumns),
    withTableRows<ProductRow>(selectionRows),
    withTableSelection<ProductRow>(() => inject(SelectionTableShowcaseStore).selection)
  ],
  selector: 'app-selection-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 class="text-lg font-semibold text-slate-950">Checkbox Selection</h2>
        <p class="text-sm text-slate-500">
          {{ store.selectedKeys().size }} selected, {{ store.disabledCount }} disabled rows
        </p>
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
export class SelectionTableShowcaseComponent {
  readonly store = inject(SelectionTableShowcaseStore);
}
