import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  DataTableComponent,
  DataTableTemplateDirective,
  provideTableColumns,
  provideTableTemplates,
  withTableRows
} from '@table-provider/data-table';
import { ProductRow, productColumns, productRows } from './showcase-data';

const childRowProducts = productRows.slice(0, 1100);
const hasProductChildRow = (row: ProductRow): boolean => row.id % 3 !== 0;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    provideTableTemplates(),
    ...provideTableColumns<ProductRow>(productColumns),
    withTableRows<ProductRow>(childRowProducts)
  ],
  selector: 'app-child-row-virtual-scroll-table-showcase',
  template: `
    <section class="space-y-4 pb-10">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 class="text-lg font-semibold text-slate-950">Table + Row + Child Row + Virtual Scroll</h2>
        <p class="text-sm text-slate-500">{{ rowCount }} parent rows, {{ detailRowCount() }} with child rows</p>
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

      <ng-template tableTemplate="productDetail" let-row let-rowIndex="rowIndex">
        <div class="grid gap-2 text-xs text-slate-600 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <span class="font-medium text-slate-800">#{{ rowIndex + 1 }} {{ row.detail }}</span>
          <span>Warehouse: {{ row.warehouse }}</span>
          <span>Owner: {{ row.owner }}</span>
          <span>Next audit: {{ row.nextAudit }}</span>
        </div>
      </ng-template>

      <lib-data-table
        [virtualScroll]="true"
        [initialRows]="16"
        [overscanRows]="16"
        [childRowWhen]="hasChildRow"
        childRowTemplateKey="productDetail"
        height="28rem"
      />
    </section>
  `
})
export class ChildRowVirtualScrollTableShowcaseComponent {
  readonly hasChildRow = hasProductChildRow;
  readonly rowCount = childRowProducts.length;
  readonly detailRowCount = computed(() => childRowProducts.filter(row => this.hasChildRow(row)).length);
}
