import { Injectable, Injector, Signal, inject } from '@angular/core';
import { createHotToastApi } from './hot-toast.api';
import { HOT_TOAST_DEFAULT_TOASTER_ID, HotToast, HotToastApi, HotToasterRegistration } from './hot-toast.types';
import { HotToastStore } from './hot-toast.store';

export const injectHotToast = (): HotToastApi => inject(HotToastService).toast;

@Injectable({ providedIn: 'root' })
export class HotToastService {
  readonly #store = inject(HotToastStore);
  readonly #injector = inject(Injector);

  readonly toast = createHotToastApi(this.#store, this.#injector);
  readonly toasts = this.#store.toasts;

  startPause(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): void {
    this.#store.startPause(toasterId);
  }

  endPause(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): void {
    this.#store.endPause(toasterId);
  }

  registerToaster(toasterId: string, registration: HotToasterRegistration): () => void {
    return this.#store.registerToaster(toasterId, registration);
  }

  toastsFor(toasterId = HOT_TOAST_DEFAULT_TOASTER_ID): Signal<HotToast[]> {
    return this.#store.toastsFor(toasterId);
  }
}
