import { InjectionToken, Provider } from '@angular/core';
import { HotToastDefaultOptions } from './hot-toast.types';

export const HOT_TOAST_DEFAULT_OPTIONS = new InjectionToken<HotToastDefaultOptions>('HOT_TOAST_DEFAULT_OPTIONS', {
  providedIn: 'root',
  factory: () => ({})
});

export const withHotToast = (toastOptions: HotToastDefaultOptions = {}): Provider => ({
  provide: HOT_TOAST_DEFAULT_OPTIONS,
  useValue: toastOptions
});
