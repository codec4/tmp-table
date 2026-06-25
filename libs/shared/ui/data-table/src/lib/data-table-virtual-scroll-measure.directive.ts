import { AfterViewChecked, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { DataTableVirtualScrollControllerDirective } from './data-table-virtual-scroll-controller.directive';
import type { VirtualRowMeasurement } from './data-table-virtual-scroll.math';

@Directive({
  selector: '[dataTableVirtualScrollMeasure]'
})
export class DataTableVirtualScrollMeasureDirective implements AfterViewChecked, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly controller = inject(DataTableVirtualScrollControllerDirective);
  private readonly ngZone = inject(NgZone);
  private resizeObserver?: ResizeObserver;
  private observedRowElements = new Set<HTMLElement>();
  private measurementTimer?: ReturnType<typeof setTimeout>;

  ngAfterViewChecked(): void {
    this.scheduleRenderedRowsMeasurement();
  }

  ngOnDestroy(): void {
    if (this.measurementTimer !== undefined) {
      clearTimeout(this.measurementTimer);
      this.measurementTimer = undefined;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.observedRowElements.clear();
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
    const rowElements = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>('[data-virtual-row-key]')
    );
    const measurements = rowElements.map(rowElement => this.measureRow(rowElement));

    this.observeRenderedRows(rowElements);
    this.controller.recordRenderedMeasurements(measurements);
  }

  private observeRenderedRows(rowElements: HTMLElement[]): void {
    const Observer = globalThis.ResizeObserver;

    if (!Observer) {
      return;
    }

    if (!this.resizeObserver) {
      this.ngZone.runOutsideAngular(() => {
        this.resizeObserver = new Observer(entries => {
          const measurements = entries.map(entry => this.measureRow(entry.target as HTMLElement, entry));

          this.ngZone.run(() => {
            this.controller.recordRenderedMeasurements(measurements);
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

  private measureRow(element: HTMLElement, entry?: ResizeObserverEntry): VirtualRowMeasurement {
    return {
      height: this.heightForElement(element, entry),
      key: element.dataset['virtualRowKey']
    };
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
}
