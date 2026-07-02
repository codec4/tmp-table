import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HotToastContentComponent } from '../toast-content/hot-toast-content.component';
import { HotToastIconComponent } from '../toast-icon/hot-toast-icon.component';
import { HotToastProgressComponent } from '../toast-progress/hot-toast-progress.component';
import { injectHotToast } from '../../hot-toast.service';
import { HotToast } from '../../hot-toast.types';
import { HotToastItemClassPipe } from '../../pipes/hot-toast-item-class.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotToastContentComponent, HotToastIconComponent, HotToastItemClassPipe, HotToastProgressComponent, NgStyle],
  selector: 'lib-hot-toast-item',
  styleUrl: './hot-toast-item.component.css',
  templateUrl: './hot-toast-item.component.html'
})
export class HotToastItemComponent {
  readonly #toast = injectHotToast();

  readonly toast = input.required<HotToast>();

  dismiss(toast: HotToast): void {
    this.#toast.dismiss(toast.id);
  }

  runAction(toast: HotToast): void {
    const action = toast.action;

    if (!action) {
      return;
    }

    const dismissAfterAction = () => {
      if (action.dismiss !== false) {
        this.#toast.dismiss(toast.id);
      }
    };

    try {
      const result = action.onClick(toast);

      if (result instanceof Promise) {
        void result.finally(dismissAfterAction);
      } else {
        dismissAfterAction();
      }
    } catch {
      dismissAfterAction();
    }
  }
}
