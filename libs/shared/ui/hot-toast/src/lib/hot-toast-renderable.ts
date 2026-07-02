import { TemplateRef } from '@angular/core';
import { HotToast, HotToastMessage, HotToastTemplateContext, resolveHotToastValue } from './hot-toast.types';

export type HotToastRenderableView =
  | {
      template: TemplateRef<HotToastTemplateContext>;
      text: null;
    }
  | {
      template: null;
      text: string;
    };

export const createHotToastTemplateContext = (
  toast: HotToast,
  dismiss: (toastId?: string) => void
): HotToastTemplateContext => ({
  $implicit: toast,
  dismiss: toastId => dismiss(toastId ?? toast.id),
  toast
});

export const resolveHotToastRenderableView = (message: HotToastMessage, toast: HotToast): HotToastRenderableView => {
  const resolved = resolveHotToastValue(message, toast);

  return typeof resolved === 'string'
    ? {
        template: null,
        text: resolved
      }
    : {
        template: resolved,
        text: null
      };
};
