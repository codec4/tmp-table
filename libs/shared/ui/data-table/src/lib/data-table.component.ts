import { ChangeDetectionStrategy, Component, Signal, computed, inject, input, isSignal, output } from '@angular/core';
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
  DataTableKey,
  DataTableRowKey,
  DataTableSelectAllScope,
  DataTableSelectionChange,
  DataTableSelectionMode,
  DataTableSelectionOptions,
  DataTableSelectionSource,
  TABLE_DATA,
  TABLE_LOADING,
  TABLE_SELECTION,
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
  fillContainer?: boolean;
  height?: string | null;
  initialRows?: number;
  overscanRows?: number;
  rootMargin?: string;
  rowHeight?: number;
};

type NormalizedDataTableVirtualScrollOptions = {
  childRowHeight: number;
  enabled: boolean;
  fillContainer: boolean;
  height: string | null;
  initialRows: number;
  overscanRows: number;
  rootMargin: string;
  rowHeight: number;
};

type NormalizedDataTableSelectionOptions<T extends Record<string, unknown>> = {
  columnWidth: string;
  disabled: (row: T, rowIndex: number) => boolean;
  enabled: boolean;
  mode: DataTableSelectionMode;
  onChange?: (change: DataTableSelectionChange<T>) => void;
  rowKey?: DataTableRowKey<T>;
  selectAll: DataTableSelectAllScope;
  selectedKeys: ReadonlySet<DataTableKey>;
};

@Component({
  selector: 'lib-data-table',
  host: {
    '[style.display]': '"block"',
    '[style.height]': 'hostHeight()'
  },
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
        data-testid="table-virtual-shell"
        dataTableVirtualScrollController
        #virtualScrollController="dataTableVirtualScrollController"
        [class.flex]="fillsVirtualScrollContainer()"
        [class.flex-col]="fillsVirtualScrollContainer()"
        [rows]="virtualRows()"
        [initialRows]="virtualScrollOptions().initialRows"
        [overscanRows]="virtualScrollOptions().overscanRows"
        [rowHeight]="virtualScrollOptions().rowHeight"
        [childRowHeight]="virtualScrollOptions().childRowHeight"
        [rootMargin]="virtualScrollOptions().rootMargin"
        [style.height]="virtualScrollShellHeight()"
        (rangeChange)="rangeChange.emit($event)"
      >
        <table
          class="sticky top-0 z-20 w-full min-w-full shrink-0 table-fixed border-separate border-spacing-0 text-sm"
        >
          <colgroup>
            @if (isSelectionEnabled()) {
              <col [style.width]="selectionColumnWidth()" />
            }
            @for (column of tableColumns(); track column.key) {
              <col [style.width.%]="columnWidthPercent()" />
            }
          </colgroup>
          <thead class="bg-slate-50">
            <tr>
              @if (isSelectionEnabled()) {
                <th
                  class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                  [style.width]="selectionColumnWidth()"
                >
                  @if (showsHeaderSelection()) {
                    <input
                      class="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      data-testid="table-header-selection"
                      type="checkbox"
                      aria-label="Select rows"
                      [checked]="areAllSelectableRowsSelected(virtualScrollController.range())"
                      [disabled]="!hasSelectableRows(virtualScrollController.range())"
                      [indeterminate]="isSelectionPartiallySelected(virtualScrollController.range())"
                      (change)="toggleAllRows(virtualScrollController.range())"
                    />
                  }
                </th>
              }
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
              @if (isSelectionEnabled()) {
                <col [style.width]="selectionColumnWidth()" />
              }
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
              [isRowSelected]="isRowSelected"
              [isRowSelectionDisabled]="isRowSelectionDisabled"
              [selectionColumnWidth]="selectionColumnWidth()"
              [selectionEnabled]="isSelectionEnabled()"
              (rowSelectionChange)="toggleRowSelection($event.row, $event.rowIndex)"
            ></tbody>
          </table>
        } @else {
          <div
            class="relative overflow-auto"
            data-testid="table-scroll-root"
            dataTableVirtualScrollViewport
            [class.min-h-0]="fillsVirtualScrollContainer()"
            [class.flex-1]="fillsVirtualScrollContainer()"
            [style.max-height]="virtualScrollBodyMaxHeight()"
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
                  @if (isSelectionEnabled()) {
                    <col [style.width]="selectionColumnWidth()" />
                  }
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
                  [isRowSelected]="isRowSelected"
                  [isRowSelectionDisabled]="isRowSelectionDisabled"
                  [selectionColumnWidth]="selectionColumnWidth()"
                  [selectionEnabled]="isSelectionEnabled()"
                  [virtualMeasurement]="true"
                  (rowSelectionChange)="toggleRowSelection($event.row, $event.rowIndex)"
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
              @if (isSelectionEnabled()) {
                <th
                  class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                  [style.width]="selectionColumnWidth()"
                >
                  @if (showsHeaderSelection()) {
                    <input
                      class="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      data-testid="table-header-selection"
                      type="checkbox"
                      aria-label="Select rows"
                      [checked]="areAllSelectableRowsSelected()"
                      [disabled]="!hasSelectableRows()"
                      [indeterminate]="isSelectionPartiallySelected()"
                      (change)="toggleAllRows()"
                    />
                  }
                </th>
              }
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
            [isRowSelected]="isRowSelected"
            [isRowSelectionDisabled]="isRowSelectionDisabled"
            [selectionColumnWidth]="selectionColumnWidth()"
            [selectionEnabled]="isSelectionEnabled()"
            (rowSelectionChange)="toggleRowSelection($event.row, $event.rowIndex)"
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
  readonly #injectedSelection = inject<Signal<DataTableSelectionSource<T>> | null>(TABLE_SELECTION, { optional: true });

  readonly data = input<T[] | null>(null);
  readonly columns = input<ColumnDef<T>[] | null>(null);
  readonly loading = input<boolean | null>(null);
  readonly selection = input<DataTableSelectionSource<T>>(null);
  readonly virtualScroll = input<boolean | DataTableVirtualScrollOptions>(false);
  readonly fillContainer = input(false);
  readonly height = input<string | null>(null);
  readonly initialRows = input(DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS);
  readonly overscanRows = input(DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS);
  readonly rowHeight = input(DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT);
  readonly childRowHeight = input(DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT);
  readonly rootMargin = input('240px 0px');
  readonly childRowTemplateKey = input<string | null>(null);
  readonly childRowWhen = input<DataTableChildRowPredicate<T> | null>(null);
  readonly rangeChange = output<VirtualRowsRange>();
  readonly selectionChange = output<DataTableSelectionChange<T>>();

  readonly virtualScrollOptions = computed(() =>
    normalizeVirtualScrollOptions(this.virtualScroll(), {
      childRowHeight: this.childRowHeight(),
      fillContainer: this.fillContainer(),
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

  readonly selectionOptions = computed(() =>
    normalizeSelectionOptions(this.selection() ?? this.#injectedSelection?.() ?? null)
  );

  readonly isRowSelected = (row: T, rowIndex: number): boolean =>
    this.selectionOptions().selectedKeys.has(this.selectionKey(row, rowIndex));

  readonly isRowSelectionDisabled = (row: T, rowIndex: number): boolean =>
    this.selectionOptions().disabled(row, rowIndex);

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

  isSelectionEnabled(): boolean {
    return this.selectionOptions().enabled;
  }

  selectionColumnWidth(): string {
    return this.selectionOptions().columnWidth;
  }

  showsHeaderSelection(): boolean {
    const options = this.selectionOptions();

    return options.enabled && options.mode === 'multiple' && options.selectAll !== false;
  }

  hasSelectableRows(range?: VirtualRowsRange): boolean {
    return this.selectableSelectionRows(range).length > 0;
  }

  areAllSelectableRowsSelected(range?: VirtualRowsRange): boolean {
    const rows = this.selectableSelectionRows(range);

    return rows.length > 0 && rows.every(row => this.selectionOptions().selectedKeys.has(row.key));
  }

  isSelectionPartiallySelected(range?: VirtualRowsRange): boolean {
    const rows = this.selectableSelectionRows(range);

    if (!rows.length) {
      return false;
    }

    const selectedCount = rows.filter(row => this.selectionOptions().selectedKeys.has(row.key)).length;

    return selectedCount > 0 && selectedCount < rows.length;
  }

  toggleRowSelection(row: T, rowIndex: number): void {
    const options = this.selectionOptions();

    if (!options.enabled || options.disabled(row, rowIndex)) {
      return;
    }

    const key = this.selectionKey(row, rowIndex);
    const currentKeys = options.selectedKeys;
    const nextKeys = options.mode === 'single' ? new Set<DataTableKey>() : new Set(currentKeys);

    if (currentKeys.has(key)) {
      nextKeys.delete(key);
    } else {
      nextKeys.add(key);
    }

    this.emitSelectionChange({
      nextKeys,
      previousKeys: currentKeys,
      row,
      rowIndex,
      source: 'row'
    });
  }

  toggleAllRows(range?: VirtualRowsRange): void {
    const options = this.selectionOptions();

    if (!this.showsHeaderSelection()) {
      return;
    }

    const rows = this.selectableSelectionRows(range);

    if (!rows.length) {
      return;
    }

    const currentKeys = options.selectedKeys;
    const nextKeys = new Set(currentKeys);
    const allSelected = rows.every(row => currentKeys.has(row.key));

    for (const row of rows) {
      if (allSelected) {
        nextKeys.delete(row.key);
      } else {
        nextKeys.add(row.key);
      }
    }

    this.emitSelectionChange({
      nextKeys,
      previousKeys: currentKeys,
      source: 'header'
    });
  }

  fillsVirtualScrollContainer(): boolean {
    return this.virtualScrollOptions().fillContainer;
  }

  hostHeight(): string | null {
    return this.isVirtualScrollEnabled() && this.fillsVirtualScrollContainer() ? '100%' : null;
  }

  virtualScrollShellHeight(): string | null {
    return this.fillsVirtualScrollContainer() ? '100%' : null;
  }

  virtualScrollBodyMaxHeight(): string | null {
    return this.fillsVirtualScrollContainer() ? null : this.virtualScrollOptions().height;
  }

  virtualScrollBodyMinHeight(): string | null {
    if (this.fillsVirtualScrollContainer()) {
      return null;
    }

    return this.isLoading() && !this.rows().length ? this.virtualScrollOptions().height : null;
  }

  rowKey(row: T, index: number): string {
    return String(this.selectionKey(row, index));
  }

  selectionKey(row: T, index: number): DataTableKey {
    const key = this.selectionOptions().rowKey;

    if (typeof key === 'function') {
      return normalizedSelectionKey(key(row, index), index);
    }

    if (key) {
      return normalizedSelectionKey(row[key], index);
    }

    const id = row['id'];

    return normalizedSelectionKey(id, index);
  }

  hasChildRow(row: T, rowIndex: number): boolean {
    if (!this.childRowTemplateKey()) {
      return false;
    }

    const predicate = this.childRowWhen();

    return !predicate || predicate(row, rowIndex);
  }

  selectableSelectionRows(range?: VirtualRowsRange): Array<{ key: DataTableKey; row: T; rowIndex: number }> {
    const options = this.selectionOptions();

    if (!options.enabled) {
      return [];
    }

    const scope = options.selectAll === 'visible' && range ? range : null;
    const rows = scope ? this.rows().slice(scope.start, scope.end) : this.rows();
    const rowIndexOffset = scope?.start ?? 0;

    return rows.reduce<Array<{ key: DataTableKey; row: T; rowIndex: number }>>((selectableRows, row, rowIndex) => {
      const absoluteRowIndex = rowIndexOffset + rowIndex;

      if (!options.disabled(row, absoluteRowIndex)) {
        selectableRows.push({
          key: this.selectionKey(row, absoluteRowIndex),
          row,
          rowIndex: absoluteRowIndex
        });
      }

      return selectableRows;
    }, []);
  }

  emitSelectionChange(options: {
    nextKeys: ReadonlySet<DataTableKey>;
    previousKeys: ReadonlySet<DataTableKey>;
    row?: T;
    rowIndex?: number;
    source: 'header' | 'row';
  }): void {
    const change: DataTableSelectionChange<T> = {
      addedKeys: difference(options.nextKeys, options.previousKeys),
      removedKeys: difference(options.previousKeys, options.nextKeys),
      row: options.row,
      rowIndex: options.rowIndex,
      selectedKeys: options.nextKeys,
      source: options.source
    };

    this.selectionChange.emit(change);
    this.selectionOptions().onChange?.(change);
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
    fillContainer: options.fillContainer ?? fallback.fillContainer,
    height: options.height ?? fallback.height ?? '28rem',
    initialRows: options.initialRows ?? fallback.initialRows,
    overscanRows: options.overscanRows ?? fallback.overscanRows,
    rootMargin: options.rootMargin ?? fallback.rootMargin,
    rowHeight: options.rowHeight ?? fallback.rowHeight
  };
};

const normalizeSelectionOptions = <T extends Record<string, unknown>>(
  selection: DataTableSelectionSource<T>
): NormalizedDataTableSelectionOptions<T> => {
  if (!selection) {
    return {
      columnWidth: '3rem',
      disabled: () => false,
      enabled: false,
      mode: 'multiple',
      selectAll: 'data',
      selectedKeys: new Set()
    };
  }

  const options: DataTableSelectionOptions<T> = typeof selection === 'boolean' ? {} : selection;

  return {
    columnWidth: options.columnWidth ?? '3rem',
    disabled: options.disabled ?? (() => false),
    enabled: true,
    mode: options.mode ?? 'multiple',
    onChange: options.onChange,
    rowKey: options.rowKey,
    selectAll: normalizeSelectAll(options.selectAll),
    selectedKeys: resolveSelectedKeys(options.selectedKeys)
  };
};

const normalizeSelectAll = (selectAll: boolean | DataTableSelectAllScope | undefined): DataTableSelectAllScope => {
  if (selectAll === false) {
    return false;
  }

  if (selectAll === true || selectAll === undefined) {
    return 'data';
  }

  return selectAll;
};

const resolveSelectedKeys = (
  selectedKeys: DataTableSelectionOptions['selectedKeys'] | undefined
): ReadonlySet<DataTableKey> => {
  if (!selectedKeys) {
    return new Set();
  }

  if (isSignal(selectedKeys)) {
    return selectedKeys();
  }

  if (typeof selectedKeys === 'function') {
    const resolved = selectedKeys();

    return isSignal(resolved) ? resolved() : resolved;
  }

  return selectedKeys;
};

const normalizedSelectionKey = (key: unknown, fallbackIndex: number): DataTableKey =>
  typeof key === 'string' || typeof key === 'number' ? key : fallbackIndex;

const difference = (left: ReadonlySet<DataTableKey>, right: ReadonlySet<DataTableKey>): ReadonlySet<DataTableKey> => {
  const next = new Set<DataTableKey>();

  for (const key of left) {
    if (!right.has(key)) {
      next.add(key);
    }
  }

  return next;
};
