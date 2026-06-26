import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import {
  DataTableComponent,
  DataTableKey,
  DataTableSelectionOptions,
  DataTableTemplateDirective,
  TABLE_DATA,
  TABLE_LOADING,
  provideTableColumns,
  provideTableTemplates,
  withTableSelection
} from '@table-provider/data-table';
import { MockUsersService } from './mock-users.service';
import { MockUsersVirtualTableStore, PagedUserRow, userColumns } from './mock-users-table';

@Injectable()
class ContractSelectionVirtualScrollTableShowcaseStore extends MockUsersVirtualTableStore {
  readonly selectedKeys = signal<ReadonlySet<DataTableKey>>(new Set([1, 4, 9]));
  readonly selection = computed<DataTableSelectionOptions<PagedUserRow>>(() => ({
    disabled: row => !!row.isPlaceholder,
    onChange: change => this.selectedKeys.set(change.selectedKeys),
    rowKey: 'id',
    selectAll: 'visible',
    selectedKeys: this.selectedKeys()
  }));

  constructor() {
    super(inject(MockUsersService));
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    MockUsersService,
    ContractSelectionVirtualScrollTableShowcaseStore,
    provideTableTemplates(),
    ...provideTableColumns<PagedUserRow>(userColumns),
    {
      provide: TABLE_DATA,
      useFactory: () => inject(ContractSelectionVirtualScrollTableShowcaseStore).rows
    },
    {
      provide: TABLE_LOADING,
      useFactory: () => inject(ContractSelectionVirtualScrollTableShowcaseStore).isInitialLoading
    },
    withTableSelection<PagedUserRow>(() => inject(ContractSelectionVirtualScrollTableShowcaseStore).selection)
  ],
  selector: 'app-contract-selection-virtual-scroll-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">Paged API + Checkbox Selection + Virtual Scroll</h2>
          <p class="text-sm text-slate-500">
            {{ store.selectedKeys().size }} selected, loaded {{ store.loadedCount() }} of
            {{ store.pagination().totalItems }} users
            @if (store.loadingPageCount()) {
              <span class="text-slate-400">
                - fetching {{ store.loadingPageCount() }} page{{ store.loadingPageCount() === 1 ? '' : 's' }}
              </span>
            }
          </p>
        </div>
        <code class="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          GET /users?page={{ store.pagination().page }}&pageSize={{ store.pageSize }}&status=All&search=
        </code>
      </div>

      <ng-template tableTemplate="pagedStatusBadge" let-row let-value="value">
        <span
          class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
          [class.bg-emerald-50]="!row.isPlaceholder && value === 'Active'"
          [class.text-emerald-700]="!row.isPlaceholder && value === 'Active'"
          [class.ring-emerald-600/20]="!row.isPlaceholder && value === 'Active'"
          [class.bg-sky-50]="!row.isPlaceholder && value === 'Invited'"
          [class.text-sky-700]="!row.isPlaceholder && value === 'Invited'"
          [class.ring-sky-600/20]="!row.isPlaceholder && value === 'Invited'"
          [class.bg-slate-100]="row.isPlaceholder || value === 'Suspended'"
          [class.text-slate-700]="row.isPlaceholder || value === 'Suspended'"
          [class.ring-slate-600/20]="row.isPlaceholder || value === 'Suspended'"
        >
          {{ row.isPlaceholder ? 'Loading' : value }}
        </span>
      </ng-template>

      <div class="h-[30rem]">
        <lib-data-table
          [fillContainer]="true"
          [virtualScroll]="true"
          [initialRows]="24"
          [overscanRows]="24"
          (rangeChange)="store.loadVisibleRange($event)"
        />
      </div>
    </section>
  `
})
export class ContractSelectionVirtualScrollTableShowcaseComponent {
  readonly store = inject(ContractSelectionVirtualScrollTableShowcaseStore);
}
