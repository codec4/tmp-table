import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ColumnDef,
  DataTableComponent,
  DataTableTemplateDirective,
  DataTableVirtualScrollComponent,
  provideTableTemplates
} from '@table-provider/data-table';

type ProductStatus = 'active' | 'review' | 'paused';

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: string;
  discount: string;
  weight: string;
  status: ProductStatus;
  warehouse: string;
  owner: string;
  stock: number;
  leadTime: string;
  detail: string;
  nextAudit: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency'
});

const productNames = [
  'Laptop Pro',
  'Wireless Mouse',
  'Mech Keyboard',
  'Docking Station',
  'USB-C Hub',
  'Studio Display',
  'Noise Canceling Headset',
  'Ergo Chair',
  'Portable SSD',
  'Webcam 4K'
];

const categories = ['Computing', 'Accessories', 'Workspace', 'Storage'];
const warehouses = ['Cleveland', 'Phoenix', 'Raleigh', 'Portland'];
const owners = ['North Ops', 'Channel Team', 'Retail Desk', 'Enterprise'];
const statuses: ProductStatus[] = ['active', 'review', 'paused'];

const columns: ColumnDef<ProductRow>[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Product Name' },
  { key: 'category', header: 'Category' },
  { key: 'price', header: 'Price' },
  { key: 'discount', header: 'Discount' },
  { key: 'weight', header: 'Weight' },
  { key: 'status', header: 'Status', templateKey: 'statusBadge' }
];

const productRows = createProducts(1250);

@Component({
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [provideTableTemplates()],
  selector: 'app-pagination-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">Pagination</h2>
          <p class="text-sm text-slate-500">{{ pageStart() }}-{{ pageEnd() }} of {{ rows.length }} rows</p>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            [disabled]="pageIndex() === 0"
            (click)="previousPage()"
          >
            Previous
          </button>
          <span class="min-w-24 text-center text-slate-600">Page {{ pageIndex() + 1 }} of {{ pageCount() }}</span>
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            [disabled]="pageIndex() + 1 === pageCount()"
            (click)="nextPage()"
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

      <lib-data-table [columns]="columns" [data]="pagedRows()" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class PaginationTableShowcaseComponent {
  readonly columns = columns;
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
  imports: [DataTableVirtualScrollComponent, DataTableTemplateDirective],
  providers: [provideTableTemplates()],
  selector: 'app-virtual-scroll-table-showcase',
  template: `
    <section class="mb-14 space-y-4 border-b border-slate-300 pb-14">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 class="text-lg font-semibold text-slate-950">Table + Virtual Scroll</h2>
        <p class="text-sm text-slate-500">{{ rows.length }} rows</p>
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

      <lib-data-table-virtual-scroll
        [columns]="columns"
        [data]="rows"
        [initialRows]="24"
        [overscanRows]="24"
        height="26rem"
      />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class VirtualScrollTableShowcaseComponent {
  readonly columns = columns;
  readonly rows = productRows;
}

@Component({
  imports: [DataTableVirtualScrollComponent, DataTableTemplateDirective],
  providers: [provideTableTemplates()],
  selector: 'app-child-row-virtual-scroll-table-showcase',
  template: `
    <section class="space-y-4 pb-10">
      <div class="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 class="text-lg font-semibold text-slate-950">Table + Row + Child Row + Virtual Scroll</h2>
        <p class="text-sm text-slate-500">{{ rows.length }} parent rows, {{ detailRowCount() }} with child rows</p>
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

      <lib-data-table-virtual-scroll
        [columns]="columns"
        [data]="rows"
        [initialRows]="16"
        [overscanRows]="16"
        [childRowWhen]="hasChildRow"
        childRowTemplateKey="productDetail"
        height="28rem"
      />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class ChildRowVirtualScrollTableShowcaseComponent {
  readonly columns = columns;
  readonly rows = productRows.slice(0, 1100);
  readonly hasChildRow = (row: ProductRow): boolean => row.id % 3 !== 0;
  readonly detailRowCount = computed(() => this.rows.filter(row => this.hasChildRow(row)).length);
}

@Component({
  imports: [
    PaginationTableShowcaseComponent,
    VirtualScrollTableShowcaseComponent,
    ChildRowVirtualScrollTableShowcaseComponent
  ],
  selector: 'app-root',
  template: `
    <main class="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 lg:px-10">
      <section class="mx-auto max-w-7xl">
        <header class="mb-10 border-b border-slate-300 pb-6">
          <p class="text-sm font-semibold uppercase text-slate-500">Table Provider</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-950">Product Inventory</h1>
        </header>

        <app-pagination-table-showcase />
        <app-virtual-scroll-table-showcase />
        <app-child-row-virtual-scroll-table-showcase />
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}

function createProducts(count: number): ProductRow[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const name = productNames[index % productNames.length];
    const price = index === 0 ? 1299.99 : 39 + ((index * 47) % 950) + 0.99;
    const discount = 5 + ((index * 3) % 28);
    const weight = 0.2 + ((index * 7) % 34) / 10;
    const status = statuses[index % statuses.length];

    return {
      id,
      sku: `PRD-${String(id).padStart(4, '0')}`,
      name,
      category: categories[index % categories.length],
      price: currencyFormatter.format(price),
      discount: `${discount}%`,
      weight: `${weight.toFixed(1)} kg`,
      status,
      warehouse: warehouses[index % warehouses.length],
      owner: owners[index % owners.length],
      stock: 20 + ((index * 11) % 180),
      leadTime: `${2 + (index % 9)} days`,
      detail: `${name} has ${20 + ((index * 11) % 180)} units with a ${2 + (index % 9)} day lead time.`,
      nextAudit: `2026-Q${(index % 4) + 1}`
    };
  });
}
