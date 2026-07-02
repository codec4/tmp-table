import { Signal, computed, inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
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

type HotToastState = {
  toasts: HotToast[];
};

const initialState: HotToastState = {
  toasts: []
};

export const HotToastStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(store => {
    const defaultOptions = inject(HOT_TOAST_DEFAULT_OPTIONS);
    const toasterRegistrations = new Map<string, HotToasterRegistration>();
    const pausedToasterIds = new Set<string>();
    const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const timerStartedAt = new Map<string, number>();
    const remainingDurations = new Map<string, number>();
    let idSequence = 0;

    function create(type: HotToastType, message: HotToastMessage, options: HotToastOptions = {}): string {
      const requestedToasterId = options.toasterId ?? HOT_TOAST_DEFAULT_TOASTER_ID;
      const mergedOptions = mergedToastOptions(type, requestedToasterId, options);
      const toasterId = mergedOptions.toasterId ?? requestedToasterId;
      const registeredToaster = toasterRegistrations.get(toasterId);
      const now = Date.now();
      const id = mergedOptions.id ?? nextId();
      const existingToast = toastById(id);
      const duration = Math.max(0, mergedOptions.duration ?? HOT_TOAST_DEFAULT_DURATIONS[type]);
      const toast: HotToast = {
        action: mergedOptions.action ?? null,
        ariaProps: ariaPropsFor(type, mergedOptions),
        className: mergedOptions.className ?? '',
        createdAt: existingToast?.createdAt ?? now,
        description: mergedOptions.description ?? null,
        dismissible: mergedOptions.dismissible ?? true,
        duration,
        icon: mergedOptions.icon ?? null,
        iconTheme: mergedOptions.iconTheme ?? null,
        id,
        message,
        paused: pausedToasterIds.has(toasterId),
        position: mergedOptions.position ?? registeredToaster?.position ?? HOT_TOAST_DEFAULT_POSITION,
        removeDelay: Math.max(0, mergedOptions.removeDelay ?? HOT_TOAST_DEFAULT_REMOVE_DELAY),
        style: mergedOptions.style ?? null,
        toasterId,
        type,
        updatedAt: now,
        visible: true
      };

      clearRemoveTimer(id);
      replaceToast(toast);
      trackDuration(toast);
      queueDismiss(toast);

      return id;
    }

    function dismiss(toastId?: string): void {
      if (toastId === undefined) {
        const toastIds = store.toasts().map(toast => toast.id);

        for (const id of toastIds) {
          dismiss(id);
        }

        return;
      }

      const toast = toastById(toastId);

      if (!toast) {
        return;
      }

      clearDismissTimer(toastId);
      remainingDurations.delete(toastId);

      const dismissedToast = {
        ...toast,
        paused: false,
        updatedAt: Date.now(),
        visible: false
      };

      replaceToast(dismissedToast);
      queueRemove(dismissedToast);
    }

    function remove(toastId?: string): void {
      if (toastId === undefined) {
        const toastIds = store.toasts().map(toast => toast.id);

        for (const id of toastIds) {
          remove(id);
        }

        return;
      }

      clearDismissTimer(toastId);
      clearRemoveTimer(toastId);
      remainingDurations.delete(toastId);

      patchState(store, state => ({
        toasts: state.toasts.filter(toast => toast.id !== toastId)
      }));
    }

    function startPause(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): void {
      if (pausedToasterIds.has(toasterId)) {
        return;
      }

      pausedToasterIds.add(toasterId);
      const now = Date.now();

      patchState(store, state => ({
        toasts: state.toasts.map(toast => {
          if (toast.toasterId !== toasterId || !toast.visible) {
            return toast;
          }

          if (isFiniteHotToastDuration(toast.duration)) {
            const startedAt = timerStartedAt.get(toast.id) ?? now;
            const remaining = remainingDurations.get(toast.id) ?? toast.duration;
            remainingDurations.set(toast.id, Math.max(0, remaining - (now - startedAt)));
            clearDismissTimer(toast.id);
          }

          return {
            ...toast,
            paused: true,
            updatedAt: now
          };
        })
      }));
    }

    function endPause(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): void {
      if (!pausedToasterIds.has(toasterId)) {
        return;
      }

      pausedToasterIds.delete(toasterId);
      const resumedToasts: HotToast[] = [];

      patchState(store, state => ({
        toasts: state.toasts.map(toast => {
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
      }));

      for (const toast of resumedToasts) {
        queueDismiss(toast);
      }
    }

    function registerToaster(toasterId: string, registration: HotToasterRegistration): () => void {
      toasterRegistrations.set(toasterId, registration);

      return () => unregisterToaster(toasterId);
    }

    function unregisterToaster(toasterId: string): void {
      toasterRegistrations.delete(toasterId);
      endPause(toasterId);
    }

    function toastsFor(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): Signal<HotToast[]> {
      return computed(() => store.toasts().filter(toast => toast.toasterId === toasterId));
    }

    function mergedToastOptions(type: HotToastType, toasterId: string, options: HotToastOptions): HotToastOptions {
      const toasterOptions = toasterRegistrations.get(toasterId)?.toastOptions;

      return {
        ...defaultOptions,
        ...(defaultOptions[type] ?? {}),
        ...(toasterOptions ?? {}),
        ...(toasterOptions?.[type] ?? {}),
        ...options
      };
    }

    function ariaPropsFor(type: HotToastType, options: HotToastOptions): HotToastAriaProps {
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

    function trackDuration(toast: HotToast): void {
      if (isFiniteHotToastDuration(toast.duration)) {
        remainingDurations.set(toast.id, toast.duration);
      } else {
        remainingDurations.delete(toast.id);
      }
    }

    function replaceToast(nextToast: HotToast): void {
      patchState(store, state => {
        const toastIndex = state.toasts.findIndex(toast => toast.id === nextToast.id);

        if (toastIndex < 0) {
          return {
            toasts: [...state.toasts, nextToast]
          };
        }

        const nextToasts = [...state.toasts];
        nextToasts[toastIndex] = nextToast;

        return {
          toasts: nextToasts
        };
      });
    }

    function queueDismiss(toast: HotToast): void {
      clearDismissTimer(toast.id);

      if (!toast.visible || toast.paused || !isFiniteHotToastDuration(toast.duration)) {
        return;
      }

      const remainingDuration = remainingDurations.get(toast.id) ?? toast.duration;

      if (remainingDuration <= 0) {
        dismiss(toast.id);
        return;
      }

      timerStartedAt.set(toast.id, Date.now());
      dismissTimers.set(
        toast.id,
        setTimeout(() => dismiss(toast.id), remainingDuration)
      );
    }

    function queueRemove(toast: HotToast): void {
      clearRemoveTimer(toast.id);

      if (toast.removeDelay <= 0) {
        remove(toast.id);
        return;
      }

      removeTimers.set(
        toast.id,
        setTimeout(() => remove(toast.id), toast.removeDelay)
      );
    }

    function clearDismissTimer(toastId: string): void {
      const timer = dismissTimers.get(toastId);

      if (timer) {
        clearTimeout(timer);
      }

      dismissTimers.delete(toastId);
      timerStartedAt.delete(toastId);
    }

    function clearRemoveTimer(toastId: string): void {
      const timer = removeTimers.get(toastId);

      if (timer) {
        clearTimeout(timer);
      }

      removeTimers.delete(toastId);
    }

    function toastById(toastId: string): HotToast | undefined {
      return store.toasts().find(toast => toast.id === toastId);
    }

    function nextId(): string {
      idSequence += 1;
      return `hot-toast-${idSequence}`;
    }

    return {
      create,
      dismiss,
      endPause,
      registerToaster,
      remove,
      startPause,
      toastsFor,
      unregisterToaster
    };
  })
);
