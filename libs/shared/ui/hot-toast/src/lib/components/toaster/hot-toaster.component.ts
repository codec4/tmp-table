import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input } from '@angular/core';
import { HotToastItemComponent } from '../toast-item/hot-toast-item.component';
import {
  HotToastGroupsByPosition,
  HotToastPlacementClassPipe,
  HotToastPositionedToastsPipe,
  createHotToastGroupsByPosition
} from '../../pipes/hot-toast-placement.pipe';
import { HotToastService } from '../../hot-toast.service';
import {
  HOT_TOAST_DEFAULT_POSITION,
  HOT_TOAST_DEFAULT_TOASTER_ID,
  HOT_TOAST_POSITIONS,
  HotToastDefaultOptions,
  HotToastPosition,
  HotToastStyle
} from '../../hot-toast.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': '"contents"'
  },
  imports: [HotToastItemComponent, HotToastPlacementClassPipe, HotToastPositionedToastsPipe, NgStyle],
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
  readonly toastGroups = computed<HotToastGroupsByPosition>(() => {
    const groups = createHotToastGroupsByPosition();

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

  startPause(): void {
    this.#toasts.startPause(this.toasterId());
  }

  endPause(): void {
    this.#toasts.endPause(this.toasterId());
  }
}
