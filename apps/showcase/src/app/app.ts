import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  template: `
    <main class="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 lg:px-10">
      <section class="mx-auto max-w-7xl">
        <nav class="mb-8 flex items-center gap-2 border-b border-slate-300 pb-4 text-sm font-semibold">
          <a
            class="rounded-md px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-950"
            routerLink="/"
            routerLinkActive="bg-white text-slate-950 shadow-sm"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            Home
          </a>
          <a
            class="rounded-md px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-950"
            routerLink="/tables"
            routerLinkActive="bg-white text-slate-950 shadow-sm"
          >
            Tables
          </a>
          <a
            class="rounded-md px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-950"
            routerLink="/toast"
            routerLinkActive="bg-white text-slate-950 shadow-sm"
          >
            Toast
          </a>
        </nav>

        <router-outlet />
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
