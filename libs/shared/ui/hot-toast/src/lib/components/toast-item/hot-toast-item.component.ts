import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, input } from '@angular/core';
import { HotToastIconComponent } from '../toast-icon/hot-toast-icon.component';
import { HotToastProgressComponent } from '../toast-progress/hot-toast-progress.component';
import { injectHotToast } from '../../hot-toast.service';
import {
  HotToast,
  HotToastMessage,
  HotToastRenderable,
  HotToastTemplateContext,
  resolveHotToastValue
} from '../../hot-toast.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotToastIconComponent, HotToastProgressComponent, NgStyle, NgTemplateOutlet],
  selector: 'lib-hot-toast-item',
  styleUrl: './hot-toast-item.component.css',
  templateUrl: './hot-toast-item.component.html'
})
export class HotToastItemComponent {
  readonly #toast = injectHotToast();

  readonly toast = input.required<HotToast>();

  toastClass(toast: HotToast): string {
    const classes = [
      'pointer-events-auto',
      'w-full',
      'overflow-hidden',
      'rounded-lg',
      'border',
      'border-slate-200',
      'bg-white',
      'shadow-lg',
      'transition-all',
      'duration-200',
      'ease-out'
    ];

    if (toast.visible) {
      classes.push('translate-y-0', 'opacity-100');
    } else {
      classes.push(toast.position.startsWith('top') ? '-translate-y-2' : 'translate-y-2', 'opacity-0');
    }

    if (toast.className) {
      classes.push(toast.className);
    }

    return classes.join(' ');
  }

  messageText(toast: HotToast): string {
    const message = this.#resolvedMessage(toast.message, toast);

    return typeof message === 'string' ? message : '';
  }

  messageTemplate(toast: HotToast): TemplateRef<HotToastTemplateContext> | null {
    const message = this.#resolvedMessage(toast.message, toast);

    return this.#isTemplate(message) ? message : null;
  }

  descriptionText(toast: HotToast): string {
    if (!toast.description) {
      return '';
    }

    const description = this.#resolvedMessage(toast.description, toast);

    return typeof description === 'string' ? description : '';
  }

  descriptionTemplate(toast: HotToast): TemplateRef<HotToastTemplateContext> | null {
    if (!toast.description) {
      return null;
    }

    const description = this.#resolvedMessage(toast.description, toast);

    return this.#isTemplate(description) ? description : null;
  }

  templateContext(toast: HotToast): HotToastTemplateContext {
    return {
      $implicit: toast,
      dismiss: (toastId?: string) => this.#toast.dismiss(toastId ?? toast.id),
      toast
    };
  }

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

  #resolvedMessage(message: HotToastMessage, toast: HotToast): HotToastRenderable {
    return resolveHotToastValue(message, toast);
  }

  #isTemplate(value: HotToastRenderable | null): value is TemplateRef<HotToastTemplateContext> {
    return value !== null && typeof value !== 'string';
  }
}
