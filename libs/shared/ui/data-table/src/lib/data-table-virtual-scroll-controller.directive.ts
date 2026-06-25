import { ChangeDetectorRef, Directive, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT,
  DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS,
  DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS,
  DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT,
  calculatePreservedScrollTop,
  calculateRenderedRowsHeight,
  calculateVirtualRange,
  calculateVirtualRowsLayout,
  calculateVirtualTopOffset
} from './data-table-virtual-scroll.math';
import type {
  VirtualRowMeasurement,
  VirtualRowsLayout,
  VirtualRowsRange,
  VirtualScrollRow
} from './data-table-virtual-scroll.math';

@Directive({
  exportAs: 'dataTableVirtualScrollController',
  selector: '[dataTableVirtualScrollController]'
})
export class DataTableVirtualScrollControllerDirective {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #scrollTop = signal(0);
  readonly #viewportHeight = signal(0);
  readonly #measuredHeights = signal<Record<string, number>>({});
  readonly #renderedRowsHeight = signal(0);
  readonly #isPointerActive = signal(false);
  readonly #isScrolling = signal(false);
  #pendingMeasurements: VirtualRowMeasurement[] = [];
  #emittedRange: VirtualRowsRange | null = null;

  readonly rows = input<VirtualScrollRow[]>([], {
    alias: 'dataTableVirtualScrollRows'
  });
  readonly initialRows = input(DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS, {
    alias: 'dataTableVirtualScrollInitialRows'
  });
  readonly overscanRows = input(DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS, {
    alias: 'dataTableVirtualScrollOverscanRows'
  });
  readonly rowHeight = input(DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT, {
    alias: 'dataTableVirtualScrollRowHeight'
  });
  readonly childRowHeight = input(DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT, {
    alias: 'dataTableVirtualScrollChildRowHeight'
  });
  readonly rootMargin = input('240px 0px', {
    alias: 'dataTableVirtualScrollRootMargin'
  });
  readonly rangeChange = output<VirtualRowsRange>({
    alias: 'dataTableVirtualScrollRangeChange'
  });

  readonly scrollRootElement = signal<HTMLElement | null>(null);

  readonly layout = computed<VirtualRowsLayout>(() =>
    calculateVirtualRowsLayout({
      childRowHeight: this.childRowHeight(),
      measuredHeights: this.#measuredHeights(),
      rowHeight: this.rowHeight(),
      rows: this.rows()
    })
  );

  readonly range = computed<VirtualRowsRange>(() =>
    calculateVirtualRange({
      initialRows: this.initialRows(),
      layout: this.layout(),
      overscanRows: this.overscanRows(),
      rowHeight: this.rowHeight(),
      scrollTop: this.#scrollTop(),
      viewportHeight: this.#viewportHeight()
    })
  );

  readonly topOffset = computed(() =>
    calculateVirtualTopOffset({
      layout: this.layout(),
      range: this.range(),
      renderedRowsHeight: this.#renderedRowsHeight(),
      scrollTop: this.#scrollTop(),
      viewportHeight: this.#viewportHeight()
    })
  );

  readonly totalHeight = computed(() => this.layout().totalHeight);

  constructor() {
    effect(() => {
      const range = this.range();

      if (this.#emittedRange?.start === range.start && this.#emittedRange.end === range.end) {
        return;
      }

      this.#emittedRange = range;
      this.rangeChange.emit(range);
    });
  }

  setScrollRoot(scrollRoot: HTMLElement | null): void {
    this.scrollRootElement.set(scrollRoot);
    this.syncViewportFromRoot();
  }

  clearScrollRoot(scrollRoot: HTMLElement): void {
    if (this.scrollRootElement() === scrollRoot) {
      this.scrollRootElement.set(null);
    }
  }

  syncViewport(scrollTop: number, viewportHeight: number): void {
    this.#scrollTop.set(scrollTop);
    this.#viewportHeight.set(viewportHeight);
  }

  syncViewportFromRoot(): void {
    const scrollRoot = this.scrollRootElement();

    if (!scrollRoot) {
      return;
    }

    this.syncViewport(scrollRoot.scrollTop, scrollRoot.clientHeight);
    this.#changeDetectorRef.markForCheck();
  }

  beginScroll(): void {
    this.#isScrolling.set(true);
  }

  endScroll(): void {
    this.#isScrolling.set(false);

    if (!this.#isPointerActive()) {
      this.#flushPendingMeasurements();
    }
  }

  beginPointer(): void {
    this.#isPointerActive.set(true);
  }

  endPointer(): void {
    if (!this.#isPointerActive()) {
      return;
    }

    this.#isPointerActive.set(false);

    if (!this.#isScrolling()) {
      this.#flushPendingMeasurements();
    }
  }

  recordRenderedMeasurements(measurements: VirtualRowMeasurement[]): void {
    this.#updateRenderedRowsHeight(measurements);

    if (this.#isScrolling() || this.#isPointerActive()) {
      this.#pendingMeasurements.push(...measurements);
      return;
    }

    this.#commitMeasuredHeights(measurements);
  }

  #updateRenderedRowsHeight(measurements: VirtualRowMeasurement[]): void {
    const height = calculateRenderedRowsHeight(measurements);

    if (!height || Math.abs(this.#renderedRowsHeight() - height) < 0.5) {
      return;
    }

    this.#renderedRowsHeight.set(height);
  }

  #flushPendingMeasurements(): void {
    if (!this.#pendingMeasurements.length) {
      return;
    }

    const measurements = this.#pendingMeasurements;
    this.#pendingMeasurements = [];
    this.#commitMeasuredHeights(measurements);
  }

  #commitMeasuredHeights(measurements: VirtualRowMeasurement[]): void {
    const scrollRoot = this.scrollRootElement();
    const previousTotalHeight = this.totalHeight();
    const previousScrollTop = scrollRoot?.scrollTop ?? 0;
    let changed = false;

    this.#measuredHeights.update(currentHeights => {
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

    this.syncViewportFromRoot();
    this.#changeDetectorRef.markForCheck();
  }
}
