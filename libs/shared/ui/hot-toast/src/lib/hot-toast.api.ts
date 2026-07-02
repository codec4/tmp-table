import { Injector, effect, untracked } from '@angular/core';
import { HotToastStore } from './hot-toast.store';
import {
  HotToastApi,
  HotToastPromiseErrorMessage,
  HotToastPromiseMessage,
  HotToastPromiseMessages,
  HotToastPromiseOptions,
  HotToastRenderable,
  HotToastSignalController,
  HotToastSignalMessages,
  HotToastSignalOptions,
  HotToastSignalState
} from './hot-toast.types';

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
  const toastId = toast.loading(messages.loading, promiseOptionsFor('loading', options));

  try {
    const result = await (typeof value === 'function' ? value() : value);
    toast.success(resolvePromiseMessage(messages.success, result), promiseOptionsFor('success', options, toastId));
    return result;
  } catch (error) {
    toast.error(resolvePromiseErrorMessage(messages.error, error), promiseOptionsFor('error', options, toastId));
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
  const toastId = toast.loading(resolveSignalLoadingMessage(messages.loading, initialState), {
    ...options,
    ...(options.loading ?? {})
  });
  const effectRef = effect(
    () => {
      const state = source();

      switch (state.status) {
        case 'idle':
          return;
        case 'loading':
          untracked(() =>
            toast.loading(resolveSignalLoadingMessage(messages.loading, state), {
              ...options,
              ...(options.loading ?? {}),
              id: toastId
            })
          );
          return;
        case 'success':
          untracked(() =>
            toast.success(resolvePromiseMessage(messages.success, state.value), {
              ...options,
              ...(options.success ?? {}),
              id: toastId
            })
          );
          return;
        case 'error':
          untracked(() =>
            toast.error(resolvePromiseErrorMessage(messages.error, state.error), {
              ...options,
              ...(options.error ?? {}),
              id: toastId
            })
          );
          return;
      }
    },
    { injector }
  );

  return {
    destroy: () => effectRef.destroy(),
    id: toastId
  };
};

const promiseOptionsFor = (
  type: 'error' | 'loading' | 'success',
  options: HotToastPromiseOptions,
  toastId?: string
): HotToastPromiseOptions => ({
  ...options,
  ...(options[type] ?? {}),
  id: toastId ?? options.id
});

const resolvePromiseMessage = <T>(message: HotToastPromiseMessage<T>, value: T): HotToastRenderable =>
  typeof message === 'function' ? message(value) : message;

const resolvePromiseErrorMessage = (message: HotToastPromiseErrorMessage, error: unknown): HotToastRenderable =>
  typeof message === 'function' ? message(error) : message;

const resolveSignalLoadingMessage = <T>(
  message: HotToastSignalMessages<T>['loading'],
  state: HotToastSignalState<T>
): HotToastRenderable => (typeof message === 'function' ? message(state) : message);
