import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HotToast, HotToastType, isFiniteHotToastDuration } from '../../hot-toast.types';

const HOT_TOAST_PROGRESS_CLASS: Record<HotToastType, string> = {
  blank: 'bg-slate-500',
  custom: 'bg-violet-500',
  error: 'bg-red-500',
  loading: 'bg-blue-600',
  success: 'bg-teal-500'
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': '"contents"'
  },
  selector: 'lib-hot-toast-progress',
  styleUrl: './hot-toast-progress.component.css',
  templateUrl: './hot-toast-progress.component.html'
})
export class HotToastProgressComponent {
  readonly toast = input.required<HotToast>();

  readonly visible = computed(() => this.toast().visible && isFiniteHotToastDuration(this.toast().duration));
  readonly progressClass = computed(() =>
    ['hot-toast-progress', 'h-full', 'w-full', HOT_TOAST_PROGRESS_CLASS[this.toast().type]].join(' ')
  );
}
