import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { createHotToastTemplateContext, resolveHotToastRenderableView } from '../../hot-toast-renderable';
import { injectHotToast } from '../../hot-toast.service';
import { HotToast } from '../../hot-toast.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': '"contents"'
  },
  imports: [NgTemplateOutlet],
  selector: 'lib-hot-toast-content',
  templateUrl: './hot-toast-content.component.html'
})
export class HotToastContentComponent {
  readonly #toastService = injectHotToast();

  readonly toast = input.required<HotToast>();

  readonly templateContext = computed(() =>
    createHotToastTemplateContext(this.toast(), toastId => this.#toastService.dismiss(toastId))
  );
  readonly message = computed(() => {
    const toast = this.toast();

    return resolveHotToastRenderableView(toast.message, toast);
  });
  readonly description = computed(() => {
    const toast = this.toast();

    return toast.description ? resolveHotToastRenderableView(toast.description, toast) : null;
  });
}
