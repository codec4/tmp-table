import { ChangeDetectionStrategy, Component, Injectable, computed, inject } from '@angular/core';
import {
  DataTableComponent,
  DataTableTemplateDirective,
  TABLE_DATA,
  TABLE_LOADING,
  provideTableColumns,
  provideTableTemplates
} from '@table-provider/data-table';
import { MockUsersService } from './mock-users.service';
import { MockUsersVirtualTableStore, PagedUserRow, userColumns } from './mock-users-table';

const hasUserChildRow = (row: PagedUserRow): boolean => row.id % 2 === 0;

@Injectable()
class ContractChildRowVirtualScrollTableShowcaseStore extends MockUsersVirtualTableStore {
  constructor() {
    super(inject(MockUsersService));
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    MockUsersService,
    ContractChildRowVirtualScrollTableShowcaseStore,
    provideTableTemplates(),
    ...provideTableColumns<PagedUserRow>(userColumns),
    {
      provide: TABLE_DATA,
      useFactory: () => inject(ContractChildRowVirtualScrollTableShowcaseStore).rows
    },
    {
      provide: TABLE_LOADING,
      useFactory: () => inject(ContractChildRowVirtualScrollTableShowcaseStore).isInitialLoading
    }
  ],
  selector: 'app-contract-child-row-virtual-scroll-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">Paged API + Child Row + Virtual Scroll</h2>
          <p class="text-sm text-slate-500">
            Loaded {{ store.loadedCount() }} of {{ store.pagination().totalItems }} users from
            {{ store.loadedPageCount() }} cached pages, {{ childRowCount() }} profile child rows
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

      <ng-template tableTemplate="userProfile" let-row let-rowIndex="rowIndex">
        <div class="grid gap-2 text-xs text-slate-700 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <span class="font-medium text-slate-900">
            #{{ rowIndex + 1 }} {{ row.isPlaceholder ? 'Loading user profile' : row.name + ' profile' }}
          </span>
          <span>Email: {{ row.email }}</span>
          <span>Role: {{ row.role }}</span>
          <span>Region: {{ row.region }}</span>
          <span>Usage: {{ row.usage }}</span>
          <span>Last seen: {{ row.lastSeen }}</span>
          <span>Status: {{ row.isPlaceholder ? 'Pending' : row.status }}</span>
        </div>
      </ng-template>

      <div class="h-[32rem]">
        <lib-data-table
          [fillContainer]="true"
          [virtualScroll]="true"
          [initialRows]="16"
          [overscanRows]="16"
          [childRowWhen]="hasChildRow"
          childRowTemplateKey="userProfile"
          (rangeChange)="store.loadVisibleRange($event)"
        />
      </div>
    </section>
  `
})
export class ContractChildRowVirtualScrollTableShowcaseComponent {
  readonly store = inject(ContractChildRowVirtualScrollTableShowcaseStore);
  readonly hasChildRow = hasUserChildRow;
  readonly childRowCount = computed(() => Math.floor(this.store.pagination().totalItems / 2));
}
