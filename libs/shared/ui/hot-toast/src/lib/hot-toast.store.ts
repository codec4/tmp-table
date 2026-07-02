import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HOT_TOAST_DEFAULT_OPTIONS } from './hot-toast.config';
import {
  HOT_TOAST_DEFAULT_DURATIONS,
  HOT_TOAST_DEFAULT_POSITION,
  HOT_TOAST_DEFAULT_REMOVE_DELAY,
  HOT_TOAST_DEFAULT_TOASTER_ID,
  HotToast,
  HotToastAriaProps,
  HotToastMessage,
  HotToastOptions,
  HotToasterRegistration,
  HotToastType,
  isFiniteHotToastDuration
} from './hot-toast.types';

@Injectable({ providedIn: 'root' })
export class HotToastStore {
  readonly #defaultOptions = inject(HOT_TOAST_DEFAULT_OPTIONS);
  readonly #toasts = signal<HotToast[]>([]);
  readonly #toasterRegistrations = new Map<string, HotToasterRegistration>();
  readonly #pausedToasterIds = new Set<string>();
  readonly #dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly #removeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly #timerStartedAt = new Map<string, number>();
  readonly #remainingDurations = new Map<string, number>();

  #idSequence = 0;

  readonly toasts = this.#toasts.asReadonly();

  create(type: HotToastType, message: HotToastMessage, options: HotToastOptions = {}): string {
    const requestedToasterId = options.toasterId ?? HOT_TOAST_DEFAULT_TOASTER_ID;
    const mergedOptions = this.#mergedOptions(type, requestedToasterId, options);
    const toasterId = mergedOptions.toasterId ?? requestedToasterId;
    const registeredToaster = this.#toasterRegistrations.get(toasterId);
    const now = Date.now();
    const id = mergedOptions.id ?? this.#nextId();
    const existingToast = this.#toastById(id);
    const duration = Math.max(0, mergedOptions.duration ?? HOT_TOAST_DEFAULT_DURATIONS[type]);
    const toast: HotToast = {
      action: mergedOptions.action ?? null,
      ariaProps: this.#ariaPropsFor(type, mergedOptions),
      className: mergedOptions.className ?? '',
      createdAt: existingToast?.createdAt ?? now,
      description: mergedOptions.description ?? null,
      dismissible: mergedOptions.dismissible ?? true,
      duration,
      icon: mergedOptions.icon ?? null,
      iconTheme: mergedOptions.iconTheme ?? null,
      id,
      message,
      paused: this.#pausedToasterIds.has(toasterId),
      position: mergedOptions.position ?? registeredToaster?.position ?? HOT_TOAST_DEFAULT_POSITION,
      removeDelay: Math.max(0, mergedOptions.removeDelay ?? HOT_TOAST_DEFAULT_REMOVE_DELAY),
      style: mergedOptions.style ?? null,
      toasterId,
      type,
      updatedAt: now,
      visible: true
    };

    this.#clearRemoveTimer(id);
    this.#replaceToast(toast);
    this.#trackDuration(toast);
    this.#queueDismiss(toast);

    return id;
  }

  dismiss(toastId?: string): void {
    if (toastId === undefined) {
      const toastIds = this.#toasts().map(toast => toast.id);

      for (const id of toastIds) {
        this.dismiss(id);
      }

      return;
    }

    const toast = this.#toastById(toastId);

    if (!toast) {
      return;
    }

    this.#clearDismissTimer(toastId);
    this.#remainingDurations.delete(toastId);

    const dismissedToast = {
      ...toast,
      paused: false,
      updatedAt: Date.now(),
      visible: false
    };

    this.#replaceToast(dismissedToast);
    this.#queueRemove(dismissedToast);
  }

  remove(toastId?: string): void {
    if (toastId === undefined) {
      const toastIds = this.#toasts().map(toast => toast.id);

      for (const id of toastIds) {
        this.remove(id);
      }

      return;
    }

    this.#clearDismissTimer(toastId);
    this.#clearRemoveTimer(toastId);
    this.#remainingDurations.delete(toastId);

    this.#toasts.update(toasts => toasts.filter(toast => toast.id !== toastId));
  }

  startPause(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): void {
    if (this.#pausedToasterIds.has(toasterId)) {
      return;
    }

    this.#pausedToasterIds.add(toasterId);
    const now = Date.now();

    this.#toasts.update(toasts =>
      toasts.map(toast => {
        if (toast.toasterId !== toasterId || !toast.visible) {
          return toast;
        }

        if (isFiniteHotToastDuration(toast.duration)) {
          const startedAt = this.#timerStartedAt.get(toast.id) ?? now;
          const remaining = this.#remainingDurations.get(toast.id) ?? toast.duration;
          this.#remainingDurations.set(toast.id, Math.max(0, remaining - (now - startedAt)));
          this.#clearDismissTimer(toast.id);
        }

        return {
          ...toast,
          paused: true,
          updatedAt: now
        };
      })
    );
  }

  endPause(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): void {
    if (!this.#pausedToasterIds.has(toasterId)) {
      return;
    }

    this.#pausedToasterIds.delete(toasterId);
    const resumedToasts: HotToast[] = [];

    this.#toasts.update(toasts =>
      toasts.map(toast => {
        if (toast.toasterId !== toasterId || !toast.paused) {
          return toast;
        }

        const resumedToast = {
          ...toast,
          paused: false,
          updatedAt: Date.now()
        };

        resumedToasts.push(resumedToast);
        return resumedToast;
      })
    );

    for (const toast of resumedToasts) {
      this.#queueDismiss(toast);
    }
  }

  registerToaster(toasterId: string, registration: HotToasterRegistration): () => void {
    this.#toasterRegistrations.set(toasterId, registration);

    return () => this.unregisterToaster(toasterId);
  }

  unregisterToaster(toasterId: string): void {
    this.#toasterRegistrations.delete(toasterId);
    this.endPause(toasterId);
  }

  toastsFor(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): Signal<HotToast[]> {
    return computed(() => this.#toasts().filter(toast => toast.toasterId === toasterId));
  }

  #mergedOptions(type: HotToastType, toasterId: string, options: HotToastOptions): HotToastOptions {
    const toasterOptions = this.#toasterRegistrations.get(toasterId)?.toastOptions;

    return {
      ...this.#defaultOptions,
      ...(this.#defaultOptions[type] ?? {}),
      ...(toasterOptions ?? {}),
      ...(toasterOptions?.[type] ?? {}),
      ...options
    };
  }

  #ariaPropsFor(type: HotToastType, options: HotToastOptions): HotToastAriaProps {
    const defaultAriaProps: HotToastAriaProps =
      type === 'error'
        ? {
            ariaLive: 'assertive',
            role: 'alert'
          }
        : {
            ariaLive: 'polite',
            role: 'status'
          };

    return {
      ...defaultAriaProps,
      ...(options.ariaProps ?? {})
    };
  }

  #trackDuration(toast: HotToast): void {
    if (isFiniteHotToastDuration(toast.duration)) {
      this.#remainingDurations.set(toast.id, toast.duration);
    } else {
      this.#remainingDurations.delete(toast.id);
    }
  }

  #replaceToast(nextToast: HotToast): void {
    this.#toasts.update(toasts => {
      const toastIndex = toasts.findIndex(toast => toast.id === nextToast.id);

      if (toastIndex < 0) {
        return [...toasts, nextToast];
      }

      const nextToasts = [...toasts];
      nextToasts[toastIndex] = nextToast;

      return nextToasts;
    });
  }

  #queueDismiss(toast: HotToast): void {
    this.#clearDismissTimer(toast.id);

    if (!toast.visible || toast.paused || !isFiniteHotToastDuration(toast.duration)) {
      return;
    }

    const remainingDuration = this.#remainingDurations.get(toast.id) ?? toast.duration;

    if (remainingDuration <= 0) {
      this.dismiss(toast.id);
      return;
    }

    this.#timerStartedAt.set(toast.id, Date.now());
    this.#dismissTimers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), remainingDuration)
    );
  }

  #queueRemove(toast: HotToast): void {
    this.#clearRemoveTimer(toast.id);

    if (toast.removeDelay <= 0) {
      this.remove(toast.id);
      return;
    }

    this.#removeTimers.set(
      toast.id,
      setTimeout(() => this.remove(toast.id), toast.removeDelay)
    );
  }

  #clearDismissTimer(toastId: string): void {
    const timer = this.#dismissTimers.get(toastId);

    if (timer) {
      clearTimeout(timer);
    }

    this.#dismissTimers.delete(toastId);
    this.#timerStartedAt.delete(toastId);
  }

  #clearRemoveTimer(toastId: string): void {
    const timer = this.#removeTimers.get(toastId);

    if (timer) {
      clearTimeout(timer);
    }

    this.#removeTimers.delete(toastId);
  }

  #toastById(toastId: string): HotToast | undefined {
    return this.#toasts().find(toast => toast.id === toastId);
  }

  #nextId(): string {
    this.#idSequence += 1;
    return `hot-toast-${this.#idSequence}`;
  }
}
