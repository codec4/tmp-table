import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, input } from '@angular/core';
import { HotToast, HotToastRenderable, HotToastTemplateContext, HotToastType } from '../../hot-toast.types';

type HotToastIconPath = {
  className?: string;
  clipRule?: string;
  d: string;
  fillRule?: string;
  stroke?: string;
  strokeLinecap?: string;
  strokeWidth?: number;
};

type HotToastIconCircle = {
  className?: string;
  cx: number;
  cy: number;
  r: number;
  stroke?: string;
  strokeWidth?: number;
};

type HotToastIconGraphic = {
  circles: readonly HotToastIconCircle[];
  className: string;
  fill: string;
  paths: readonly HotToastIconPath[];
  viewBox: string;
};

const HOT_TOAST_ICON_COLOR: Record<HotToastType, string> = {
  blank: '#475569',
  custom: '#475569',
  error: '#ef4444',
  loading: '#2563eb',
  success: '#14b8a6'
};

const HOT_TOAST_TYPE_ICON: Partial<Record<HotToastType, HotToastIconGraphic>> = {
  error: {
    circles: [],
    className: 'size-5',
    fill: 'currentColor',
    paths: [
      {
        clipRule: 'evenodd',
        d: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z',
        fillRule: 'evenodd'
      }
    ],
    viewBox: '0 0 20 20'
  },
  loading: {
    circles: [
      {
        className: 'opacity-25',
        cx: 12,
        cy: 12,
        r: 10,
        stroke: 'currentColor',
        strokeWidth: 4
      }
    ],
    className: 'size-5 animate-spin',
    fill: 'none',
    paths: [
      {
        className: 'opacity-80',
        d: 'M22 12a10 10 0 0 1-10 10',
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeWidth: 4
      }
    ],
    viewBox: '0 0 24 24'
  },
  success: {
    circles: [],
    className: 'size-5',
    fill: 'currentColor',
    paths: [
      {
        clipRule: 'evenodd',
        d: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.98a.75.75 0 0 0-1.22-.88l-3.33 4.63-1.98-1.98a.75.75 0 0 0-1.06 1.06l2.6 2.6a.75.75 0 0 0 1.14-.1l3.85-5.33Z',
        fillRule: 'evenodd'
      }
    ],
    viewBox: '0 0 20 20'
  }
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': '"contents"'
  },
  imports: [NgTemplateOutlet],
  selector: 'lib-hot-toast-icon',
  templateUrl: './hot-toast-icon.component.html'
})
export class HotToastIconComponent {
  readonly toast = input.required<HotToast>();
  readonly templateContext = input.required<HotToastTemplateContext>();

  readonly color = computed(() => this.toast().iconTheme?.primary ?? HOT_TOAST_ICON_COLOR[this.toast().type]);
  readonly iconText = computed(() => {
    const icon = this.toast().icon;

    return typeof icon === 'string' && icon ? icon : null;
  });
  readonly iconTemplate = computed(() => this.#templateOrNull(this.toast().icon));
  readonly typeIcon = computed(() => HOT_TOAST_TYPE_ICON[this.toast().type] ?? null);
  readonly visible = computed(
    () => this.iconTemplate() !== null || this.iconText() !== null || this.typeIcon() !== null
  );

  #templateOrNull(value: HotToastRenderable | null): TemplateRef<HotToastTemplateContext> | null {
    return value !== null && typeof value !== 'string' ? value : null;
  }
}
