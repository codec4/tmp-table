import { Directive, ElementRef, HostListener, OnDestroy, afterNextRender, inject } from '@angular/core';
import { SCROLL_IDLE_MEASUREMENT_DELAY_MS } from './data-table-virtual-scroll.math';
import { DataTableVirtualScrollControllerDirective } from './data-table-virtual-scroll-controller.directive';

@Directive({
  selector: '[dataTableVirtualScrollViewport]'
})
export class DataTableVirtualScrollViewportDirective implements OnDestroy {
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #controller = inject(DataTableVirtualScrollControllerDirective);
  #scrollIdleTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      this.#controller.setScrollRoot(this.#elementRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    if (this.#scrollIdleTimer !== undefined) {
      clearTimeout(this.#scrollIdleTimer);
      this.#scrollIdleTimer = undefined;
    }

    this.#controller.endScroll();
    this.#controller.clearScrollRoot(this.#elementRef.nativeElement);
  }

  @HostListener('scroll')
  onScroll(): void {
    this.#controller.beginScroll();
    this.#controller.syncViewportFromRoot();

    if (this.#scrollIdleTimer !== undefined) {
      clearTimeout(this.#scrollIdleTimer);
    }

    this.#scrollIdleTimer = setTimeout(() => {
      this.#scrollIdleTimer = undefined;
      this.#controller.endScroll();
    }, SCROLL_IDLE_MEASUREMENT_DELAY_MS);
  }

  @HostListener('mousedown')
  @HostListener('pointerdown')
  @HostListener('document:mousedown')
  @HostListener('document:pointerdown')
  onPointerDown(): void {
    this.#controller.beginPointer();
  }

  @HostListener('document:pointercancel')
  @HostListener('document:pointerup')
  @HostListener('document:mouseup')
  onPointerRelease(): void {
    this.#controller.endPointer();
  }
}
