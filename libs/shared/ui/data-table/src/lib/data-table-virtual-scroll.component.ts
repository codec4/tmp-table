import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  Signal,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import {
  COLUMNS,
  ColumnDef,
  DataTableChildRowPredicate,
  TABLE_DATA,
  TABLE_LOADING,
  TABLE_TEMPLATES,
  TableColumnSource
} from './data-table.tokens';
import {
  EMPTY_ROWS,
  clamp,
  positiveInteger,
  positiveNumber,
  resolveColumnSource,
  rowIndexAfterOffset,
  rowIndexAtOffset
} from './data-table.utils';

type VirtualRowsLayout = {
  offsets: number[];
  rowCount: number;
  totalHeight: number;
};

const DEFAULT_INITIAL_ROWS = 25;
const DEFAULT_OVERSCAN_ROWS = 25;
const DEFAULT_ROW_HEIGHT = 48;
const DEFAULT_CHILD_ROW_HEIGHT = 57;

@Component({
  selector: 'lib-data-table-virtual-scroll',
  imports: [NgTemplateOutlet],
  template: `
    <div class="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
          #scrollRoot
          class="relative overflow-auto"
          data-testid="table-scroll-root"
          [style.max-height]="height()"
          style="overflow-anchor: none"
          (scroll)="onScroll()"
        >
          <div
            class="relative min-w-full overflow-hidden"
            data-testid="virtual-scroll-space"
            [style.height.px]="totalHeight()"
          >
            <div #topVirtualSentinel class="absolute left-0 top-0 h-px w-px" aria-hidden="true"></div>
            <div #bottomVirtualSentinel class="absolute bottom-0 left-0 h-px w-px" aria-hidden="true"></div>

            <table
              class="absolute left-0 top-0 w-full min-w-full table-fixed border-separate border-spacing-0 text-sm will-change-transform"
              [style.transform]="bodyTransform()"
            >
              <colgroup>
                @for (column of tableColumns(); track column.key) {
                  <col [style.width.%]="columnWidthPercent()" />
                }
              </colgroup>
              <tbody class="divide-y divide-slate-100">
                @for (row of visibleRows(); track rowKey(row, virtualRowIndex(rowIndex)); let rowIndex = $index) {
                  <tr class="hover:bg-slate-50" [style.height.px]="parentRowHeight()">
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
                  @if (childRowTemplateFor(row, virtualRowIndex(rowIndex)); as childTemplate) {
                    <tr class="bg-slate-200/80" [style.height.px]="resolvedChildRowHeight()">
                      <td class="border-t border-slate-100 px-4 py-3 text-slate-600" [attr.colspan]="colspan()">
                        <ng-container
                          *ngTemplateOutlet="
                            childTemplate;
                            context: {
                              $implicit: row,
                              row: row,
                              rowIndex: virtualRowIndex(rowIndex)
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
export class DataTableVirtualScrollComponent<T extends Record<string, unknown>> implements OnDestroy {
  private readonly injectedRows = inject<Signal<T[]> | null>(TABLE_DATA, {
    optional: true
  });
  private readonly injectedColumns = inject<TableColumnSource<T>>(COLUMNS);
  private readonly injectedLoading = inject<Signal<boolean> | null>(TABLE_LOADING, {
    optional: true
  });
  private readonly templatesRegistry = inject(TABLE_TEMPLATES);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private intersectionObserver?: IntersectionObserver;
  private scrollRootElement?: HTMLElement;
  private topSentinelElement?: HTMLElement;
  private bottomSentinelElement?: HTMLElement;

  readonly data = input<T[] | null>(null);
  readonly columns = input<ColumnDef<T>[] | null>(null);
  readonly loading = input<boolean | null>(null);
  readonly height = input<string | null>('28rem');
  readonly initialRows = input(DEFAULT_INITIAL_ROWS);
  readonly overscanRows = input(DEFAULT_OVERSCAN_ROWS);
  readonly rowHeight = input(DEFAULT_ROW_HEIGHT);
  readonly childRowHeight = input(DEFAULT_CHILD_ROW_HEIGHT);
  readonly rootMargin = input('240px 0px');
  readonly childRowTemplateKey = input<string | null>(null);
  readonly childRowWhen = input<DataTableChildRowPredicate<T> | null>(null);

  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);

  private readonly rowsLayout = computed<VirtualRowsLayout>(() => {
    const rows = this.rows();
    const offsets = [0];
    let totalHeight = 0;

    for (let index = 0; index < rows.length; index++) {
      totalHeight += this.estimatedRowHeight(rows[index], index);
      offsets.push(totalHeight);
    }

    return {
      offsets,
      rowCount: rows.length,
      totalHeight
    };
  });

  private readonly virtualRange = computed(() => {
    const layout = this.rowsLayout();
    const rowCount = layout.rowCount;

    if (!rowCount) {
      return {
        end: 0,
        start: 0
      };
    }

    const rowHeight = positiveNumber(this.rowHeight(), DEFAULT_ROW_HEIGHT);
    const minRows = Math.min(positiveInteger(this.initialRows(), DEFAULT_INITIAL_ROWS), rowCount);
    const overscanPixels = positiveInteger(this.overscanRows(), DEFAULT_OVERSCAN_ROWS) * rowHeight;
    const fallbackViewportHeight = minRows * rowHeight;
    const viewportHeight = positiveNumber(this.viewportHeight(), fallbackViewportHeight);
    const scrollTop = clamp(this.scrollTop(), 0, layout.totalHeight);
    const start = rowIndexAtOffset(layout.offsets, Math.max(scrollTop - overscanPixels, 0));
    let end = rowIndexAfterOffset(
      layout.offsets,
      Math.min(scrollTop + viewportHeight + overscanPixels, layout.totalHeight)
    );

    end = Math.max(end, start + minRows);
    end = Math.min(end, rowCount);

    return {
      end,
      start: Math.max(Math.min(start, end - minRows), 0)
    };
  });

  readonly visibleRows = computed(() => {
    const range = this.virtualRange();

    return this.rows().slice(range.start, range.end);
  });

  readonly topSpacerHeight = computed(() => this.rowsLayout().offsets[this.virtualRange().start] ?? 0);

  readonly totalHeight = computed(() => this.rowsLayout().totalHeight);

  constructor() {
    effect(() => {
      this.rootMargin();
      this.connectObserver();
    });
  }

  @ViewChild('scrollRoot')
  set scrollRoot(scrollRoot: ElementRef<HTMLElement> | undefined) {
    this.scrollRootElement = scrollRoot?.nativeElement;
    this.connectObserver();
  }

  @ViewChild('topVirtualSentinel')
  set topVirtualSentinel(topVirtualSentinel: ElementRef<HTMLElement> | undefined) {
    this.topSentinelElement = topVirtualSentinel?.nativeElement;
    this.connectObserver();
  }

  @ViewChild('bottomVirtualSentinel')
  set bottomVirtualSentinel(bottomVirtualSentinel: ElementRef<HTMLElement> | undefined) {
    this.bottomSentinelElement = bottomVirtualSentinel?.nativeElement;
    this.connectObserver();
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
  }

  rows(): T[] {
    return this.data() ?? this.injectedRows?.() ?? (EMPTY_ROWS as T[]);
  }

  tableColumns(): ColumnDef<T>[] {
    const columns = this.columns();

    if (columns) {
      return columns;
    }

    return resolveColumnSource(this.injectedColumns);
  }

  isLoading(): boolean {
    return this.loading() ?? this.injectedLoading?.() ?? false;
  }

  templateFor(column: { key: string; templateKey?: string }): TemplateRef<unknown> | undefined {
    return (
      (column.templateKey ? this.templatesRegistry.get(column.templateKey) : undefined) ??
      this.templatesRegistry.get(column.key)
    );
  }

  colspan(): number {
    return Math.max(this.tableColumns().length, 1);
  }

  columnWidthPercent(): number {
    return 100 / this.colspan();
  }

  bodyTransform(): string {
    return `translateY(${this.topSpacerHeight()}px)`;
  }

  parentRowHeight(): number {
    return positiveNumber(this.rowHeight(), DEFAULT_ROW_HEIGHT);
  }

  resolvedChildRowHeight(): number {
    return positiveNumber(this.childRowHeight(), DEFAULT_CHILD_ROW_HEIGHT);
  }

  virtualRowIndex(visibleRowIndex: number): number {
    return this.virtualRange().start + visibleRowIndex;
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

    return this.templatesRegistry.get(templateKey);
  }

  onScroll(): void {
    this.syncViewport();
  }

  rowKey(row: T, index: number): string {
    const id = row['id'];

    return id === undefined || id === null ? `${index}` : String(id);
  }

  private connectObserver(): void {
    this.disconnectObserver();

    if (!this.scrollRootElement || (!this.topSentinelElement && !this.bottomSentinelElement)) {
      return;
    }

    const Observer = globalThis.IntersectionObserver;

    if (!Observer) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver = new Observer(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) {
            return;
          }

          this.ngZone.run(() => {
            this.syncViewport();
            this.changeDetectorRef.markForCheck();
          });
        },
        {
          root: this.scrollRootElement,
          rootMargin: this.rootMargin(),
          threshold: 0
        }
      );

      if (this.topSentinelElement) {
        this.intersectionObserver.observe(this.topSentinelElement);
      }

      if (this.bottomSentinelElement) {
        this.intersectionObserver.observe(this.bottomSentinelElement);
      }
    });
  }

  private disconnectObserver(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
  }

  private syncViewport(): void {
    const scrollRoot = this.scrollRootElement;

    if (!scrollRoot) {
      return;
    }

    this.scrollTop.set(scrollRoot.scrollTop);
    this.viewportHeight.set(scrollRoot.clientHeight);
  }

  private estimatedRowHeight(row: T, rowIndex: number): number {
    const childHeight = this.hasChildRow(row, rowIndex)
      ? positiveNumber(this.childRowHeight(), DEFAULT_CHILD_ROW_HEIGHT)
      : 0;

    return positiveNumber(this.rowHeight(), DEFAULT_ROW_HEIGHT) + childHeight;
  }

  private hasChildRow(row: T, rowIndex: number): boolean {
    if (!this.childRowTemplateKey()) {
      return false;
    }

    const predicate = this.childRowWhen();

    return !predicate || predicate(row, rowIndex);
  }
}
