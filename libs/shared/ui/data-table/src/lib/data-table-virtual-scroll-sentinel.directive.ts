import { Directive, ElementRef, NgZone, OnDestroy, effect, inject } from '@angular/core';
import { DataTableVirtualScrollControllerDirective } from './data-table-virtual-scroll-controller.directive';

@Directive({
  selector: '[dataTableVirtualScrollSentinel]'
})
export class DataTableVirtualScrollSentinelDirective implements OnDestroy {
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #controller = inject(DataTableVirtualScrollControllerDirective);
  readonly #ngZone = inject(NgZone);
  #intersectionObserver?: IntersectionObserver;

  constructor() {
    effect(() => {
      this.#connectObserver(this.#controller.scrollRootElement(), this.#controller.rootMargin());
    });
  }

  ngOnDestroy(): void {
    this.#disconnectObserver();
  }

  #connectObserver(scrollRoot: HTMLElement | null, rootMargin: string): void {
    this.#disconnectObserver();

    if (!scrollRoot) {
      return;
    }

    const Observer = globalThis.IntersectionObserver;

    if (!Observer) {
      return;
    }

    this.#ngZone.runOutsideAngular(() => {
      this.#intersectionObserver = new Observer(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) {
            return;
          }

          this.#ngZone.run(() => {
            this.#controller.syncViewportFromRoot();
          });
        },
        {
          root: scrollRoot,
          rootMargin,
          threshold: 0
        }
      );

      this.#intersectionObserver.observe(this.#elementRef.nativeElement);
    });
  }

  #disconnectObserver(): void {
    this.#intersectionObserver?.disconnect();
    this.#intersectionObserver = undefined;
  }
}
