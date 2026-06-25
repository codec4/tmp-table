import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, TemplateRef, computed, inject, input } from '@angular/core';
import { DataTableVirtualScrollControllerDirective } from './data-table-virtual-scroll-controller.directive';
import { DataTableVirtualScrollMeasureDirective } from './data-table-virtual-scroll-measure.directive';
import {
  DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT,
  DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS,
  DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS,
  DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT,
  virtualRowMeasurementKey
} from './data-table-virtual-scroll.math';
import type { VirtualRowPart, VirtualRowsRange } from './data-table-virtual-scroll.math';
import { DataTableVirtualScrollSentinelDirective } from './data-table-virtual-scroll-sentinel.directive';
import { DataTableVirtualScrollViewportDirective } from './data-table-virtual-scroll-viewport.directive';
import {
  COLUMNS,
  ColumnDef,
  DataTableChildRowPredicate,
  TABLE_DATA,
  TABLE_LOADING,
  TABLE_TEMPLATES,
  TableColumnSource
} from './data-table.tokens';
import { EMPTY_ROWS, resolveColumnSource } from './data-table.utils';

@Component({
  selector: 'lib-data-table-virtual-scroll',
  imports: [
    NgTemplateOutlet,
    DataTableVirtualScrollControllerDirective,
    DataTableVirtualScrollMeasureDirective,
    DataTableVirtualScrollSentinelDirective,
    DataTableVirtualScrollViewportDirective
  ],
  template: `
    <div
      class="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      dataTableVirtualScrollController
      #virtualScroll="dataTableVirtualScrollController"
      [dataTableVirtualScrollRows]="virtualRows()"
      [dataTableVirtualScrollInitialRows]="initialRows()"
      [dataTableVirtualScrollOverscanRows]="overscanRows()"
      [dataTableVirtualScrollRowHeight]="rowHeight()"
      [dataTableVirtualScrollChildRowHeight]="childRowHeight()"
      [dataTableVirtualScrollRootMargin]="rootMargin()"
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
          <tbody>
            <tr>
              <td class="px-4 py-8 text-center text-sm text-slate-500" [attr.colspan]="colspan()">
                No results available
              </td>
            </tr>
          </tbody>
        </table>
      } @else {
        <div
          class="relative overflow-auto"
          data-testid="table-scroll-root"
          dataTableVirtualScrollViewport
          [style.max-height]="height()"
          style="overflow-anchor: none"
        >
          <div
            class="relative min-w-full overflow-hidden"
            data-testid="virtual-scroll-space"
            [style.height.px]="virtualScroll.totalHeight()"
          >
            <div class="absolute left-0 top-0 h-px w-px" dataTableVirtualScrollSentinel aria-hidden="true"></div>
            <div class="absolute bottom-0 left-0 h-px w-px" dataTableVirtualScrollSentinel aria-hidden="true"></div>

            <table
              class="absolute left-0 top-0 w-full min-w-full table-fixed border-separate border-spacing-0 text-sm will-change-transform"
              dataTableVirtualScrollMeasure
              [style.transform]="bodyTransform(virtualScroll.topOffset())"
            >
              <colgroup>
                @for (column of tableColumns(); track column.key) {
                  <col [style.width.%]="columnWidthPercent()" />
                }
              </colgroup>
              <tbody class="divide-y divide-slate-100">
                @for (row of visibleRows(virtualScroll.range()); track trackRow(row); let rowIndex = $index) {
                  <tr
                    class="hover:bg-slate-50"
                    [attr.data-virtual-row-key]="
                      rowMeasurementKey(row, virtualRowIndex(rowIndex, virtualScroll.range()), 'parent')
                    "
                  >
                    @for (column of tableColumns(); track column.key) {
                      <td class="max-w-80 truncate px-4 py-3 text-slate-700" title="{{ row[column.key] ?? '' }}">
                        @if (templateFor(column); as template) {
                          <ng-container
                            *ngTemplateOutlet="
                              template;
                              context: {
                                $implicit: row,
                                row: row,
                                value: row[column.key],
                                column: column
                              }
                            "
                          />
                        } @else {
                          {{ row[column.key] }}
                        }
                      </td>
                    }
                  </tr>
                  @if (childRowTemplateFor(row, virtualRowIndex(rowIndex, virtualScroll.range())); as childTemplate) {
                    <tr
                      class="bg-slate-200/80"
                      [attr.data-virtual-row-key]="
                        rowMeasurementKey(row, virtualRowIndex(rowIndex, virtualScroll.range()), 'child')
                      "
                    >
                      <td class="border-t border-slate-100 px-4 py-3 text-slate-600" [attr.colspan]="colspan()">
                        <ng-container
                          *ngTemplateOutlet="
                            childTemplate;
                            context: {
                              $implicit: row,
                              row: row,
                              rowIndex: virtualRowIndex(rowIndex, virtualScroll.range())
                            }
                          "
                        />
                      </td>
                    </tr>
                  }
                }
              </tbody>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableVirtualScrollComponent<T extends Record<string, unknown>> {
  readonly #injectedRows = inject<Signal<T[]> | null>(TABLE_DATA, { optional: true });
  readonly #injectedColumns = inject<TableColumnSource<T>>(COLUMNS);
  readonly #injectedLoading = inject<Signal<boolean> | null>(TABLE_LOADING, { optional: true });
  readonly #templatesRegistry = inject(TABLE_TEMPLATES);

  readonly data = input<T[] | null>(null);
  readonly columns = input<ColumnDef<T>[] | null>(null);
  readonly loading = input<boolean | null>(null);
  readonly height = input<string | null>('28rem');
  readonly initialRows = input(DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS);
  readonly overscanRows = input(DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS);
  readonly rowHeight = input(DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT);
  readonly childRowHeight = input(DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT);
  readonly rootMargin = input('240px 0px');
  readonly childRowTemplateKey = input<string | null>(null);
  readonly childRowWhen = input<DataTableChildRowPredicate<T> | null>(null);

  readonly virtualRows = computed(() =>
    this.rows().map((row, index) => ({
      hasChildRow: this.#hasChildRow(row, index),
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

  templateFor(column: { key: string; templateKey?: string }): TemplateRef<unknown> | undefined {
    return (
      (column.templateKey ? this.#templatesRegistry.get(column.templateKey) : undefined) ??
      this.#templatesRegistry.get(column.key)
    );
  }

  colspan(): number {
    return Math.max(this.tableColumns().length, 1);
  }

  columnWidthPercent(): number {
    return 100 / this.colspan();
  }

  bodyTransform(topOffset: number): string {
    return `translateY(${topOffset}px)`;
  }

  visibleRows(range: VirtualRowsRange): T[] {
    return this.rows().slice(range.start, range.end);
  }

  virtualRowIndex(visibleRowIndex: number, range: VirtualRowsRange): number {
    return range.start + visibleRowIndex;
  }

  rowMeasurementKey(row: T, index: number, part: VirtualRowPart): string {
    return virtualRowMeasurementKey(this.rowKey(row, index), part);
  }

  childRowTemplateFor(row: T, rowIndex: number): TemplateRef<unknown> | undefined {
    const templateKey = this.childRowTemplateKey();

    if (!templateKey) {
      return undefined;
    }

    const predicate = this.childRowWhen();

    if (predicate && !predicate(row, rowIndex)) {
      return undefined;
    }

    return this.#templatesRegistry.get(templateKey);
  }

  rowKey(row: T, index: number): string {
    const id = row['id'];

    return id === undefined || id === null ? `${index}` : String(id);
  }

  trackRow(row: T): unknown {
    const id = row['id'];

    return id === undefined || id === null ? row : String(id);
  }

  #hasChildRow(row: T, rowIndex: number): boolean {
    if (!this.childRowTemplateKey()) {
      return false;
    }

    const predicate = this.childRowWhen();

    return !predicate || predicate(row, rowIndex);
  }
}
