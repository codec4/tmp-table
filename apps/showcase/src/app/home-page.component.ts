import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-home-page',
  template: `
    <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold uppercase text-slate-500">Table Provider</p>
      <h1 class="mt-2 text-2xl font-semibold text-slate-950">Product Inventory</h1>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        The component showcases now live on their own page, including data tables, virtual scrolling, editable cells,
        child rows, and signal-first toast notifications.
      </p>
      <a
        class="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        routerLink="/showcases"
      >
        Open showcases
      </a>
    </section>
  `
})
export class HomePageComponent {}
