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
        Table demos and toast notifications are split into focused routes so each showcase can be reviewed without
        unrelated UI on the page.
      </p>
      <div class="mt-5 flex flex-wrap gap-3">
        <a
          class="inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          routerLink="/tables"
        >
          Open tables
        </a>
        <a
          class="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          routerLink="/toast"
        >
          Open toast
        </a>
      </div>
    </section>
  `
})
export class HomePageComponent {}
