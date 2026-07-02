import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input } from '@angular/core';
import { HotToastBarComponent } from './hot-toast-bar.component';
import { HotToastService } from './hot-toast.service';
import {
  HOT_TOAST_DEFAULT_POSITION,
  HOT_TOAST_DEFAULT_TOASTER_ID,
  HOT_TOAST_POSITIONS,
  HotToast,
  HotToastDefaultOptions,
  HotToastPosition,
  HotToastStyle
} from './hot-toast.types';

type ToastGroupsByPosition = Record<HotToastPosition, HotToast[]>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': '"contents"'
  },
  imports: [HotToastBarComponent, NgStyle],
  selector: 'lib-hot-toaster',
  styleUrl: './hot-toaster.component.css',
  templateUrl: './hot-toaster.component.html'
})
export class HotToasterComponent implements OnDestroy {
  readonly #toasts = inject(HotToastService);

  readonly containerClassName = input('');
  readonly containerStyle = input<HotToastStyle | null>(null);
  readonly gutter = input(8);
  readonly position = input<HotToastPosition>(HOT_TOAST_DEFAULT_POSITION);
  readonly reverseOrder = input(false);
  readonly toasterId = input(HOT_TOAST_DEFAULT_TOASTER_ID);
  readonly toastOptions = input<HotToastDefaultOptions>({});

  readonly positions = HOT_TOAST_POSITIONS;
  readonly toastGroups = computed(() => {
    const groups = this.#emptyGroups();

    for (const toast of this.#toasts.toasts()) {
      if (toast.toasterId === this.toasterId()) {
        groups[toast.position].push(toast);
      }
    }

    return groups;
  });

  constructor() {
    effect(onCleanup => {
      const unregister = this.#toasts.registerToaster(this.toasterId(), {
        position: this.position(),
        toastOptions: this.toastOptions()
      });

      onCleanup(unregister);
    });
  }

  ngOnDestroy(): void {
    this.endPause();
  }

  toastsForPosition(position: HotToastPosition): HotToast[] {
    const toasts = this.toastGroups()[position];
    const shouldReverse = position.startsWith('top') ? !this.reverseOrder() : this.reverseOrder();

    return shouldReverse ? [...toasts].reverse() : toasts;
  }

  containerClass(position: HotToastPosition): string {
    const classes = ['pointer-events-none', 'fixed', 'z-50', 'flex', 'w-[calc(100%-2rem)]', 'max-w-sm', 'flex-col'];

    switch (position) {
      case 'top-left':
        classes.push('left-4', 'top-4', 'items-start');
        break;
      case 'top-center':
        classes.push('left-1/2', 'top-4', '-translate-x-1/2', 'items-center');
        break;
      case 'top-right':
        classes.push('right-4', 'top-4', 'items-end');
        break;
      case 'bottom-left':
        classes.push('bottom-4', 'left-4', 'items-start');
        break;
      case 'bottom-center':
        classes.push('bottom-4', 'left-1/2', '-translate-x-1/2', 'items-center');
        break;
      case 'bottom-right':
        classes.push('bottom-4', 'right-4', 'items-end');
        break;
    }

    if (this.containerClassName()) {
      classes.push(this.containerClassName());
    }

    return classes.join(' ');
  }

  startPause(): void {
    this.#toasts.startPause(this.toasterId());
  }

  endPause(): void {
    this.#toasts.endPause(this.toasterId());
  }

  #emptyGroups(): ToastGroupsByPosition {
    return {
      'top-left': [],
      'top-center': [],
      'top-right': [],
      'bottom-left': [],
      'bottom-center': [],
      'bottom-right': []
    };
  }
}
