import { NgTemplateOutlet } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
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
  DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT,
  DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS,
  DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS,
  DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT,
  SCROLL_IDLE_MEASUREMENT_DELAY_MS,
  calculatePreservedScrollTop,
  calculateRenderedRowsHeight,
  calculateVirtualRange,
  calculateVirtualRowsLayout,
  calculateVirtualTopOffset,
  virtualRowMeasurementKey
} from './data-table-virtual-scroll.math';
import type { VirtualRowMeasurement, VirtualRowPart, VirtualRowsLayout } from './data-table-virtual-scroll.math';
import { EMPTY_ROWS, resolveColumnSource } from './data-table.utils';

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
          (mousedown)="onScrollPointerDown()"
          (pointerdown)="onScrollPointerDown()"
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
                  <tr
                    class="hover:bg-slate-50"
                    [attr.data-virtual-row-key]="rowMeasurementKey(row, virtualRowIndex(rowIndex), 'parent')"
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
                  @if (childRowTemplateFor(row, virtualRowIndex(rowIndex)); as childTemplate) {
                    <tr
                      class="bg-slate-200/80"
                      [attr.data-virtual-row-key]="rowMeasurementKey(row, virtualRowIndex(rowIndex), 'child')"
                    >
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
export class DataTableVirtualScrollComponent<T extends Record<string, unknown>> implements AfterViewChecked, OnDestroy {
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
  private resizeObserver?: ResizeObserver;
  private scrollRootElement?: HTMLElement;
  private topSentinelElement?: HTMLElement;
  private bottomSentinelElement?: HTMLElement;
  private observedRowElements = new Set<HTMLElement>();
  private measurementTimer?: ReturnType<typeof setTimeout>;
  private scrollIdleTimer?: ReturnType<typeof setTimeout>;
  private isPointerActive = false;
  private isScrolling = false;
  private pendingMeasurements: VirtualRowMeasurement[] = [];

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

  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);
  private readonly measuredHeights = signal<Record<string, number>>({});
  private readonly renderedRowsHeight = signal(0);

  private readonly virtualRows = computed(() =>
    this.rows().map((row, index) => ({
      hasChildRow: this.hasChildRow(row, index),
      key: this.rowKey(row, index)
    }))
  );

  private readonly rowsLayout = computed<VirtualRowsLayout>(() => {
    return calculateVirtualRowsLayout({
      childRowHeight: this.childRowHeight(),
      measuredHeights: this.measuredHeights(),
      rowHeight: this.rowHeight(),
      rows: this.virtualRows()
    });
  });

  private readonly virtualRange = computed(() => {
    return calculateVirtualRange({
      initialRows: this.initialRows(),
      layout: this.rowsLayout(),
      overscanRows: this.overscanRows(),
      rowHeight: this.rowHeight(),
      scrollTop: this.scrollTop(),
      viewportHeight: this.viewportHeight()
    });
  });

  readonly visibleRows = computed(() => {
    const range = this.virtualRange();

    return this.rows().slice(range.start, range.end);
  });

  readonly topSpacerHeight = computed(() => {
    return calculateVirtualTopOffset({
      layout: this.rowsLayout(),
      range: this.virtualRange(),
      renderedRowsHeight: this.renderedRowsHeight(),
      scrollTop: this.scrollTop(),
      viewportHeight: this.viewportHeight()
    });
  });

  readonly totalHeight = computed(() => this.rowsLayout().totalHeight);

  constructor() {
    effect(() => {
      this.rootMargin();
      this.connectObserver();
    });
  }

  ngAfterViewChecked(): void {
    this.scheduleRenderedRowsMeasurement();
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
    if (this.measurementTimer !== undefined) {
      clearTimeout(this.measurementTimer);
      this.measurementTimer = undefined;
    }

    if (this.scrollIdleTimer !== undefined) {
      clearTimeout(this.scrollIdleTimer);
      this.scrollIdleTimer = undefined;
    }

    this.disconnectObserver();
    this.disconnectResizeObserver();
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

  virtualRowIndex(visibleRowIndex: number): number {
    return this.virtualRange().start + visibleRowIndex;
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

    return this.templatesRegistry.get(templateKey);
  }

  onScroll(): void {
    this.deferMeasurementsUntilScrollIdle();
    this.syncViewport();
  }

  @HostListener('document:mousedown')
  @HostListener('document:pointerdown')
  onScrollPointerDown(): void {
    this.isPointerActive = true;
  }

  @HostListener('document:pointercancel')
  @HostListener('document:pointerup')
  @HostListener('document:mouseup')
  onDocumentPointerRelease(): void {
    if (!this.isPointerActive) {
      return;
    }

    this.isPointerActive = false;

    if (!this.isScrolling) {
      this.flushPendingMeasurements();
    }
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

  private disconnectResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.observedRowElements.clear();
  }

  private deferMeasurementsUntilScrollIdle(): void {
    this.isScrolling = true;

    if (this.scrollIdleTimer !== undefined) {
      clearTimeout(this.scrollIdleTimer);
    }

    this.scrollIdleTimer = setTimeout(() => {
      this.scrollIdleTimer = undefined;
      this.isScrolling = false;

      if (this.isPointerActive) {
        return;
      }

      this.flushPendingMeasurements();
    }, SCROLL_IDLE_MEASUREMENT_DELAY_MS);
  }

  private syncViewport(): void {
    const scrollRoot = this.scrollRootElement;

    if (!scrollRoot) {
      return;
    }

    this.scrollTop.set(scrollRoot.scrollTop);
    this.viewportHeight.set(scrollRoot.clientHeight);
  }

  private scheduleRenderedRowsMeasurement(): void {
    if (this.measurementTimer !== undefined) {
      return;
    }

    this.measurementTimer = setTimeout(() => {
      this.measurementTimer = undefined;
      this.measureRenderedRows();
    }, 0);
  }

  private measureRenderedRows(): void {
    const scrollRoot = this.scrollRootElement;

    if (!scrollRoot) {
      return;
    }

    const rowElements = Array.from(scrollRoot.querySelectorAll<HTMLElement>('[data-virtual-row-key]'));
    const measurements = rowElements.map(rowElement => ({
      height: this.heightForElement(rowElement),
      key: rowElement.dataset['virtualRowKey']
    }));

    this.updateRenderedRowsHeight(measurements);
    this.observeRenderedRows(rowElements);
    this.applyMeasuredHeights(measurements);
  }

  private observeRenderedRows(rowElements: HTMLElement[]): void {
    const Observer = globalThis.ResizeObserver;

    if (!Observer) {
      return;
    }

    if (!this.resizeObserver) {
      this.ngZone.runOutsideAngular(() => {
        this.resizeObserver = new Observer(entries => {
          const measurements = entries.map(entry => {
            const element = entry.target as HTMLElement;

            return {
              height: this.heightForElement(element, entry),
              key: element.dataset['virtualRowKey']
            };
          });

          this.ngZone.run(() => {
            this.applyMeasuredHeights(measurements);
          });
        });
      });
    }

    const nextObservedElements = new Set(rowElements);

    for (const observedElement of this.observedRowElements) {
      if (!nextObservedElements.has(observedElement)) {
        this.resizeObserver?.unobserve(observedElement);
      }
    }

    for (const rowElement of nextObservedElements) {
      if (!this.observedRowElements.has(rowElement)) {
        this.resizeObserver?.observe(rowElement);
      }
    }

    this.observedRowElements = nextObservedElements;
  }

  private applyMeasuredHeights(measurements: VirtualRowMeasurement[]): void {
    if (this.isScrolling || this.isPointerActive) {
      this.pendingMeasurements.push(...measurements);
      return;
    }

    this.commitMeasuredHeights(measurements);
  }

  private updateRenderedRowsHeight(measurements: VirtualRowMeasurement[]): void {
    const height = calculateRenderedRowsHeight(measurements);

    if (!height || Math.abs(this.renderedRowsHeight() - height) < 0.5) {
      return;
    }

    this.renderedRowsHeight.set(height);
  }

  private flushPendingMeasurements(): void {
    if (!this.pendingMeasurements.length) {
      return;
    }

    const measurements = this.pendingMeasurements;
    this.pendingMeasurements = [];
    this.commitMeasuredHeights(measurements);
  }

  private commitMeasuredHeights(measurements: VirtualRowMeasurement[]): void {
    const scrollRoot = this.scrollRootElement;
    const previousTotalHeight = this.totalHeight();
    const previousScrollTop = scrollRoot?.scrollTop ?? 0;
    let changed = false;

    this.measuredHeights.update(currentHeights => {
      let nextHeights = currentHeights;

      for (const measurement of measurements) {
        if (!measurement.key || measurement.height === null) {
          continue;
        }

        const currentHeight = currentHeights[measurement.key];

        if (currentHeight !== undefined && Math.abs(currentHeight - measurement.height) < 0.5) {
          continue;
        }

        if (nextHeights === currentHeights) {
          nextHeights = { ...currentHeights };
        }

        nextHeights[measurement.key] = measurement.height;
        changed = true;
      }

      return nextHeights;
    });

    if (!changed) {
      return;
    }

    if (scrollRoot) {
      scrollRoot.scrollTop = calculatePreservedScrollTop({
        nextTotalHeight: this.totalHeight(),
        previousScrollTop,
        previousTotalHeight,
        viewportHeight: scrollRoot.clientHeight
      });
    }

    this.syncViewport();
    this.changeDetectorRef.markForCheck();
  }

  private heightForElement(element: HTMLElement, entry?: ResizeObserverEntry): number | null {
    const borderBoxSize = entry?.borderBoxSize;
    const firstBorderBoxSize = Array.isArray(borderBoxSize) ? borderBoxSize[0] : borderBoxSize;
    const height = Math.max(
      firstBorderBoxSize?.blockSize ?? 0,
      entry?.contentRect.height ?? 0,
      element.getBoundingClientRect().height,
      element.offsetHeight
    );

    return Number.isFinite(height) && height > 0 ? height : null;
  }

  private hasChildRow(row: T, rowIndex: number): boolean {
    if (!this.childRowTemplateKey()) {
      return false;
    }

    const predicate = this.childRowWhen();

    return !predicate || predicate(row, rowIndex);
  }
}
