import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, input } from '@angular/core';
import { injectHotToast } from './hot-toast.service';
import {
  HotToast,
  HotToastMessage,
  HotToastRenderable,
  HotToastTemplateContext,
  isFiniteHotToastDuration,
  resolveHotToastValue
} from './hot-toast.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, NgTemplateOutlet],
  selector: 'lib-hot-toast-bar',
  styleUrl: './hot-toast-bar.component.css',
  templateUrl: './hot-toast-bar.component.html'
})
export class HotToastBarComponent {
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

  showsIcon(toast: HotToast): boolean {
    return this.#hasCustomIcon(toast) || toast.type === 'success' || toast.type === 'error' || toast.type === 'loading';
  }

  iconText(toast: HotToast): string | null {
    return typeof toast.icon === 'string' && toast.icon ? toast.icon : null;
  }

  iconTemplate(toast: HotToast): TemplateRef<HotToastTemplateContext> | null {
    return this.#isTemplate(toast.icon) ? toast.icon : null;
  }

  iconColor(toast: HotToast): string {
    if (toast.iconTheme?.primary) {
      return toast.iconTheme.primary;
    }

    switch (toast.type) {
      case 'success':
        return '#14b8a6';
      case 'error':
        return '#ef4444';
      case 'loading':
        return '#2563eb';
      case 'blank':
      case 'custom':
        return '#475569';
    }
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

  showsProgress(toast: HotToast): boolean {
    return toast.visible && isFiniteHotToastDuration(toast.duration);
  }

  progressClass(toast: HotToast): string {
    const classes = ['hot-toast-progress', 'h-full', 'w-full'];

    switch (toast.type) {
      case 'success':
        classes.push('bg-teal-500');
        break;
      case 'error':
        classes.push('bg-red-500');
        break;
      case 'loading':
        classes.push('bg-blue-600');
        break;
      case 'blank':
        classes.push('bg-slate-500');
        break;
      case 'custom':
        classes.push('bg-violet-500');
        break;
    }

    return classes.join(' ');
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

  #hasCustomIcon(toast: HotToast): boolean {
    return toast.icon !== null && !(typeof toast.icon === 'string' && !toast.icon);
  }

  #isTemplate(value: HotToastRenderable | null): value is TemplateRef<HotToastTemplateContext> {
    return value !== null && typeof value !== 'string';
  }
}
