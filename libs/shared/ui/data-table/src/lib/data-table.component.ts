import { ChangeDetectionStrategy, Component, Signal, computed, inject, input, output } from '@angular/core';
import { DataTableBodyComponent } from './data-table-body.component';
import { DataTableVirtualScrollControllerDirective } from './data-table-virtual-scroll-controller.directive';
import { DataTableVirtualScrollMeasureDirective } from './data-table-virtual-scroll-measure.directive';
import {
  DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT,
  DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS,
  DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS,
  DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT
} from './data-table-virtual-scroll.math';
import type { VirtualRowsRange } from './data-table-virtual-scroll.math';
import { DataTableVirtualScrollSentinelDirective } from './data-table-virtual-scroll-sentinel.directive';
import { DataTableVirtualScrollViewportDirective } from './data-table-virtual-scroll-viewport.directive';
import {
  COLUMNS,
  ColumnDef,
  DataTableChildRowPredicate,
  TABLE_DATA,
  TABLE_LOADING,
  TableColumnSource
} from './data-table.tokens';
import { EMPTY_ROWS, resolveColumnSource } from './data-table.utils';

export type DataTableCellContext<T extends Record<string, unknown> = Record<string, unknown>> = {
  $implicit: T;
  row: T;
  value: unknown;
  column: ColumnDef<T>;
};

export type DataTableChildRowContext<T extends Record<string, unknown> = Record<string, unknown>> = {
  $implicit: T;
  row: T;
  rowIndex: number;
};

export type DataTableVirtualScrollOptions = {
  childRowHeight?: number;
  enabled?: boolean;
  height?: string | null;
  initialRows?: number;
  overscanRows?: number;
  rootMargin?: string;
  rowHeight?: number;
};

type NormalizedDataTableVirtualScrollOptions = {
  childRowHeight: number;
  enabled: boolean;
  height: string | null;
  initialRows: number;
  overscanRows: number;
  rootMargin: string;
  rowHeight: number;
};

@Component({
  selector: 'lib-data-table',
  imports: [
    DataTableBodyComponent,
    DataTableVirtualScrollControllerDirective,
    DataTableVirtualScrollMeasureDirective,
    DataTableVirtualScrollSentinelDirective,
    DataTableVirtualScrollViewportDirective
  ],
  template: `
    @if (isVirtualScrollEnabled()) {
      <div
        class="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        dataTableVirtualScrollController
        #virtualScrollController="dataTableVirtualScrollController"
        [dataTableVirtualScrollRows]="virtualRows()"
        [dataTableVirtualScrollInitialRows]="virtualScrollOptions().initialRows"
        [dataTableVirtualScrollOverscanRows]="virtualScrollOptions().overscanRows"
        [dataTableVirtualScrollRowHeight]="virtualScrollOptions().rowHeight"
        [dataTableVirtualScrollChildRowHeight]="virtualScrollOptions().childRowHeight"
        [dataTableVirtualScrollRootMargin]="virtualScrollOptions().rootMargin"
        (dataTableVirtualScrollRangeChange)="rangeChange.emit($event)"
      >
        <table class="sticky top-0 z-20 w-full min-w-full table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            @for (column of tableColumns(); track column.key) {
              <col [style.width.%]="columnWidthPercent()" />
            }
          </colgroup>
          <thead class="bg-slate-50">
            <tr>
              @for (column of tableColumns(); track column.key) {
                <th
                  class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  {{ column.header }}
                </th>
              }
            </tr>
          </thead>
        </table>

        @if (!isLoading() && !rows().length) {
          <table class="w-full min-w-full table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              @for (column of tableColumns(); track column.key) {
                <col [style.width.%]="columnWidthPercent()" />
              }
            </colgroup>
            <tbody
              class="divide-y divide-slate-100"
              libDataTableBody
              [rows]="rows()"
              [columns]="tableColumns()"
              [loading]="isLoading()"
              [childRowTemplateKey]="childRowTemplateKey()"
              [childRowWhen]="childRowWhen()"
            ></tbody>
          </table>
        } @else {
          <div
            class="relative overflow-auto"
            data-testid="table-scroll-root"
            dataTableVirtualScrollViewport
            [style.max-height]="virtualScrollOptions().height"
            [style.min-height]="virtualScrollBodyMinHeight()"
            style="overflow-anchor: none"
          >
            <div
              class="relative min-w-full overflow-hidden"
              data-testid="virtual-scroll-space"
              [style.height.px]="virtualScrollController.totalHeight()"
            >
              <div class="absolute left-0 top-0 h-px w-px" dataTableVirtualScrollSentinel aria-hidden="true"></div>
              <div class="absolute bottom-0 left-0 h-px w-px" dataTableVirtualScrollSentinel aria-hidden="true"></div>

              <table
                class="absolute left-0 top-0 w-full min-w-full table-fixed border-separate border-spacing-0 text-sm will-change-transform"
                dataTableVirtualScrollMeasure
                [style.transform]="bodyTransform(virtualScrollController.topOffset())"
              >
                <colgroup>
                  @for (column of tableColumns(); track column.key) {
                    <col [style.width.%]="columnWidthPercent()" />
                  }
                </colgroup>
                <tbody
                  class="divide-y divide-slate-100"
                  libDataTableBody
                  [rows]="visibleRows(virtualScrollController.range())"
                  [columns]="tableColumns()"
                  [loading]="isLoading()"
                  [rowIndexOffset]="virtualScrollController.range().start"
                  [childRowTemplateKey]="childRowTemplateKey()"
                  [childRowWhen]="childRowWhen()"
                  [virtualMeasurement]="true"
                ></tbody>
              </table>
            </div>
          </div>
        }

        @if (isLoading()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/65">
            <div
              class="size-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
              role="status"
              aria-label="Loading rows"
            ></div>
          </div>
        }
      </div>
    } @else {
      <div class="relative overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full border-separate border-spacing-0 text-sm">
          <thead class="bg-slate-50">
            <tr>
              @for (column of tableColumns(); track column.key) {
                <th
                  class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  {{ column.header }}
                </th>
              }
            </tr>
          </thead>
          <tbody
            class="divide-y divide-slate-100"
            libDataTableBody
            [rows]="rows()"
            [columns]="tableColumns()"
            [loading]="isLoading()"
            [childRowTemplateKey]="childRowTemplateKey()"
            [childRowWhen]="childRowWhen()"
          ></tbody>
        </table>

        @if (isLoading()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/65">
            <div
              class="size-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
              role="status"
              aria-label="Loading rows"
            ></div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T extends Record<string, unknown>> {
  readonly #injectedRows = inject<Signal<T[]> | null>(TABLE_DATA, { optional: true });
  readonly #injectedColumns = inject<TableColumnSource<T>>(COLUMNS);
  readonly #injectedLoading = inject<Signal<boolean> | null>(TABLE_LOADING, { optional: true });

  readonly data = input<T[] | null>(null);
  readonly columns = input<ColumnDef<T>[] | null>(null);
  readonly loading = input<boolean | null>(null);
  readonly virtualScroll = input<boolean | DataTableVirtualScrollOptions>(false);
  readonly height = input<string | null>(null);
  readonly initialRows = input(DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS);
  readonly overscanRows = input(DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS);
  readonly rowHeight = input(DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT);
  readonly childRowHeight = input(DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT);
  readonly rootMargin = input('240px 0px');
  readonly childRowTemplateKey = input<string | null>(null);
  readonly childRowWhen = input<DataTableChildRowPredicate<T> | null>(null);
  readonly rangeChange = output<VirtualRowsRange>();

  readonly virtualScrollOptions = computed(() =>
    normalizeVirtualScrollOptions(this.virtualScroll(), {
      childRowHeight: this.childRowHeight(),
      height: this.height(),
      initialRows: this.initialRows(),
      overscanRows: this.overscanRows(),
      rootMargin: this.rootMargin(),
      rowHeight: this.rowHeight()
    })
  );

  readonly virtualRows = computed(() =>
    this.rows().map((row, index) => ({
      hasChildRow: this.hasChildRow(row, index),
      key: this.rowKey(row, index)
    }))
  );

  rows(): T[] {
    return this.data() ?? this.#injectedRows?.() ?? (EMPTY_ROWS as T[]);
  }

  tableColumns(): ColumnDef<T>[] {
    const columns = this.columns();

    if (columns) {
      return columns;
    }

    return resolveColumnSource(this.#injectedColumns);
  }

  isLoading(): boolean {
    return this.loading() ?? this.#injectedLoading?.() ?? false;
  }

  isVirtualScrollEnabled(): boolean {
    return this.virtualScrollOptions().enabled;
  }

  columnWidthPercent(): number {
    return 100 / Math.max(this.tableColumns().length, 1);
  }

  bodyTransform(topOffset: number): string {
    return `translateY(${topOffset}px)`;
  }

  visibleRows(range: VirtualRowsRange): T[] {
    return this.rows().slice(range.start, range.end);
  }

  virtualScrollBodyMinHeight(): string | null {
    return this.isLoading() && !this.rows().length ? this.virtualScrollOptions().height : null;
  }

  rowKey(row: T, index: number): string {
    const id = row['id'];

    return id === undefined || id === null ? `${index}` : String(id);
  }

  hasChildRow(row: T, rowIndex: number): boolean {
    if (!this.childRowTemplateKey()) {
      return false;
    }

    const predicate = this.childRowWhen();

    return !predicate || predicate(row, rowIndex);
  }
}

const normalizeVirtualScrollOptions = (
  virtualScroll: boolean | DataTableVirtualScrollOptions,
  fallback: Omit<NormalizedDataTableVirtualScrollOptions, 'enabled'>
): NormalizedDataTableVirtualScrollOptions => {
  const options = typeof virtualScroll === 'object' && virtualScroll !== null ? virtualScroll : {};
  const enabled = typeof virtualScroll === 'boolean' ? virtualScroll : options.enabled !== false;

  return {
    childRowHeight: options.childRowHeight ?? fallback.childRowHeight,
    enabled,
    height: options.height ?? fallback.height ?? '28rem',
    initialRows: options.initialRows ?? fallback.initialRows,
    overscanRows: options.overscanRows ?? fallback.overscanRows,
    rootMargin: options.rootMargin ?? fallback.rootMargin,
    rowHeight: options.rowHeight ?? fallback.rowHeight
  };
};
