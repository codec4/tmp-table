import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  DataTableComponent,
  DataTableTemplateDirective,
  provideTableColumns,
  provideTableTemplates,
  withTableRows
} from '@table-provider/data-table';
import { ProductRow, productColumns, productRows } from './showcase-data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    provideTableTemplates(),
    ...provideTableColumns<ProductRow>(productColumns),
    withTableRows<ProductRow>(productRows)
  ],
  selector: 'app-virtual-scroll-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 class="text-lg font-semibold text-slate-950">Table + Virtual Scroll</h2>
        <p class="text-sm text-slate-500">{{ rowCount }} rows</p>
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

      <div class="h-[30rem]">
        <lib-data-table [fillContainer]="true" [virtualScroll]="true" [initialRows]="24" [overscanRows]="24" />
      </div>
    </section>
  `
})
export class VirtualScrollTableShowcaseComponent {
  readonly rowCount = productRows.length;
}
