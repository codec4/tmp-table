import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HotToastShowcaseComponent } from './hot-toast-showcase.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotToastShowcaseComponent],
  selector: 'app-toast-page',
  template: `
    <header class="mb-10 border-b border-slate-300 pb-6">
      <p class="text-sm font-semibold uppercase text-slate-500">Table Provider</p>
      <h1 class="mt-2 text-2xl font-semibold text-slate-950">Toast Showcase</h1>
    </header>

    <app-hot-toast-showcase />
  `
})
export class ToastPageComponent {}
