import type { Signal, TemplateRef } from '@angular/core';

export const HOT_TOAST_DEFAULT_TOASTER_ID = 'default';
export const HOT_TOAST_DEFAULT_POSITION: HotToastPosition = 'top-center';
export const HOT_TOAST_DEFAULT_REMOVE_DELAY = 1000;

export type HotToastType = 'blank' | 'success' | 'error' | 'loading' | 'custom';

export type HotToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const HOT_TOAST_POSITIONS: readonly HotToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right'
];

export const HOT_TOAST_DEFAULT_DURATIONS: Record<HotToastType, number> = {
  blank: 4000,
  success: 2000,
  error: 4000,
  custom: 4000,
  loading: Number.POSITIVE_INFINITY
};

export type HotToastAriaLive = 'assertive' | 'off' | 'polite';
export type HotToastAriaRole = 'alert' | 'status';

export type HotToastAriaProps = {
  ariaAtomic?: 'false' | 'true';
  ariaLive: HotToastAriaLive;
  role: HotToastAriaRole;
};

export type HotToastStyle = Record<string, string | number | null | undefined>;

export type HotToastTemplateContext = {
  $implicit: HotToast;
  dismiss: (toastId?: string) => void;
  toast: HotToast;
};

export type HotToastRenderable = string | TemplateRef<HotToastTemplateContext>;
export type HotToastMessage = HotToastRenderable | ((toast: HotToast) => HotToastRenderable);

export type HotToastAction = {
  dismiss?: boolean;
  label: string;
  onClick: (toast: HotToast) => Promise<void> | void;
};

export type HotToastIconTheme = {
  primary: string;
  secondary: string;
};

export type HotToastOptions = {
  action?: HotToastAction | null;
  ariaProps?: Partial<HotToastAriaProps>;
  className?: string;
  description?: HotToastMessage | null;
  dismissible?: boolean;
  duration?: number;
  icon?: HotToastRenderable | null;
  iconTheme?: HotToastIconTheme;
  id?: string;
  position?: HotToastPosition;
  removeDelay?: number;
  style?: HotToastStyle | null;
  toasterId?: string;
};

export type HotToastDefaultOptions = HotToastOptions & {
  blank?: HotToastOptions;
  custom?: HotToastOptions;
  error?: HotToastOptions;
  loading?: HotToastOptions;
  success?: HotToastOptions;
};

export type HotToastPromiseMessage<T> = HotToastRenderable | ((value: T) => HotToastRenderable);
export type HotToastPromiseErrorMessage = HotToastRenderable | ((error: unknown) => HotToastRenderable);

export type HotToastPromiseMessages<T> = {
  error: HotToastPromiseErrorMessage;
  loading: HotToastRenderable;
  success: HotToastPromiseMessage<T>;
};

export type HotToastPromiseOptions = HotToastOptions & {
  error?: HotToastOptions;
  loading?: HotToastOptions;
  success?: HotToastOptions;
};

export type HotToastSignalState<T> =
  | {
      status: 'idle';
    }
  | {
      status: 'loading';
    }
  | {
      status: 'success';
      value: T;
    }
  | {
      error: unknown;
      status: 'error';
    };

export type HotToastSignalLoadingMessage<T> =
  | HotToastRenderable
  | ((state: HotToastSignalState<T>) => HotToastRenderable);

export type HotToastSignalMessages<T> = {
  error: HotToastPromiseErrorMessage;
  loading: HotToastSignalLoadingMessage<T>;
  success: HotToastPromiseMessage<T>;
};

export type HotToastSignalOptions = HotToastOptions & {
  error?: HotToastOptions;
  loading?: HotToastOptions;
  success?: HotToastOptions;
};

export type HotToastSignalController = {
  destroy: () => void;
  id: string;
};

export type HotToastApi = {
  (message: HotToastMessage, options?: HotToastOptions): string;
  blank: (message: HotToastMessage, options?: HotToastOptions) => string;
  custom: (message: HotToastMessage, options?: HotToastOptions) => string;
  dismiss: (toastId?: string) => void;
  error: (message: HotToastMessage, options?: HotToastOptions) => string;
  loading: (message: HotToastMessage, options?: HotToastOptions) => string;
  promise: <T>(
    value: Promise<T> | (() => Promise<T>),
    messages: HotToastPromiseMessages<T>,
    options?: HotToastPromiseOptions
  ) => Promise<T>;
  remove: (toastId?: string) => void;
  signal: <T>(
    source: Signal<HotToastSignalState<T>>,
    messages: HotToastSignalMessages<T>,
    options?: HotToastSignalOptions
  ) => HotToastSignalController;
  success: (message: HotToastMessage, options?: HotToastOptions) => string;
};

export type HotToasterRegistration = {
  position?: HotToastPosition;
  toastOptions?: HotToastDefaultOptions;
};

export type HotToast = {
  action: HotToastAction | null;
  ariaProps: HotToastAriaProps;
  className: string;
  createdAt: number;
  description: HotToastMessage | null;
  dismissible: boolean;
  duration: number;
  icon: HotToastRenderable | null;
  iconTheme: HotToastIconTheme | null;
  id: string;
  message: HotToastMessage;
  paused: boolean;
  position: HotToastPosition;
  removeDelay: number;
  style: HotToastStyle | null;
  toasterId: string;
  type: HotToastType;
  updatedAt: number;
  visible: boolean;
};

export const resolveHotToastValue = (value: HotToastMessage, toast: HotToast): HotToastRenderable =>
  typeof value === 'function' ? value(toast) : value;

export const isFiniteHotToastDuration = (duration: number): boolean => Number.isFinite(duration) && duration > 0;
