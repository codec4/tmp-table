import { Injector, effect, untracked } from '@angular/core';
import { HotToastStore } from './hot-toast.store';
import {
  HotToastApi,
  HotToastPromiseErrorMessage,
  HotToastPromiseMessage,
  HotToastPromiseMessages,
  HotToastPromiseOptions,
  HotToastOptions,
  HotToastRenderable,
  HotToastSignalController,
  HotToastSignalMessages,
  HotToastSignalOptions,
  HotToastSignalState
} from './hot-toast.types';

type HotToastAsyncStateType = 'error' | 'loading' | 'success';
type HotToastAsyncOptions = HotToastOptions & Partial<Record<HotToastAsyncStateType, HotToastOptions>>;

let signalToastIdSequence = 0;

export const createHotToastApi = (store: InstanceType<typeof HotToastStore>, injector: Injector): HotToastApi => {
  const toast = ((message, options = {}) => store.create('blank', message, options)) as HotToastApi;

  toast.blank = (message, options = {}) => store.create('blank', message, options);
  toast.success = (message, options = {}) => store.create('success', message, options);
  toast.error = (message, options = {}) => store.create('error', message, options);
  toast.loading = (message, options = {}) => store.create('loading', message, options);
  toast.custom = (message, options = {}) => store.create('custom', message, options);
  toast.dismiss = toastId => store.dismiss(toastId);
  toast.remove = toastId => store.remove(toastId);
  toast.promise = (value, messages, options = {}) => toastPromise(toast, value, messages, options);
  toast.signal = (source, messages, options = {}) => toastSignal(toast, injector, source, messages, options);

  return toast;
};

const toastPromise = async <T>(
  toast: HotToastApi,
  value: Promise<T> | (() => Promise<T>),
  messages: HotToastPromiseMessages<T>,
  options: HotToastPromiseOptions
): Promise<T> => {
  const toastId = toast.loading(messages.loading, toastOptionsFor('loading', options));

  try {
    const result = await (typeof value === 'function' ? value() : value);
    toast.success(resolvePromiseMessage(messages.success, result), toastOptionsFor('success', options, toastId));
    return result;
  } catch (error) {
    toast.error(resolvePromiseErrorMessage(messages.error, error), toastOptionsFor('error', options, toastId));
    throw error;
  }
};

const toastSignal = <T>(
  toast: HotToastApi,
  injector: Injector,
  source: () => HotToastSignalState<T>,
  messages: HotToastSignalMessages<T>,
  options: HotToastSignalOptions
): HotToastSignalController => {
  const initialState = source();
  const toastId = options.id ?? nextSignalToastId();
  syncSignalToast(toast, messages, options, toastId, initialState);

  const effectRef = effect(
    () => {
      const state = source();

      if (state === initialState) {
        return;
      }

      untracked(() => syncSignalToast(toast, messages, options, toastId, state));
    },
    { injector }
  );

  return {
    destroy: () => effectRef.destroy(),
    id: toastId
  };
};

const syncSignalToast = <T>(
  toast: HotToastApi,
  messages: HotToastSignalMessages<T>,
  options: HotToastSignalOptions,
  toastId: string,
  state: HotToastSignalState<T>
): void => {
  switch (state.status) {
    case 'idle':
      return;
    case 'loading':
      toast.loading(resolveSignalLoadingMessage(messages.loading, state), toastOptionsFor('loading', options, toastId));
      return;
    case 'success':
      toast.success(resolvePromiseMessage(messages.success, state.value), toastOptionsFor('success', options, toastId));
      return;
    case 'error':
      toast.error(resolvePromiseErrorMessage(messages.error, state.error), toastOptionsFor('error', options, toastId));
      return;
  }
};

const toastOptionsFor = (
  type: HotToastAsyncStateType,
  options: HotToastAsyncOptions,
  toastId?: string
): HotToastOptions => {
  const { error, loading, success, ...baseOptions } = options;

  return {
    ...baseOptions,
    ...((type === 'error' ? error : type === 'loading' ? loading : success) ?? {}),
    id: toastId ?? options.id
  };
};

const nextSignalToastId = (): string => {
  signalToastIdSequence += 1;
  return `hot-toast-signal-${signalToastIdSequence}`;
};

const resolvePromiseMessage = <T>(message: HotToastPromiseMessage<T>, value: T): HotToastRenderable =>
  typeof message === 'function' ? message(value) : message;

const resolvePromiseErrorMessage = (message: HotToastPromiseErrorMessage, error: unknown): HotToastRenderable =>
  typeof message === 'function' ? message(error) : message;

const resolveSignalLoadingMessage = <T>(
  message: HotToastSignalMessages<T>['loading'],
  state: HotToastSignalState<T>
): HotToastRenderable => (typeof message === 'function' ? message(state) : message);
