import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChildRowVirtualScrollTableShowcaseComponent } from './child-row-virtual-scroll-table-showcase.component';
import { ContractChildRowVirtualScrollTableShowcaseComponent } from './contract-child-row-virtual-scroll-table-showcase.component';
import { ContractSelectionVirtualScrollTableShowcaseComponent } from './contract-selection-virtual-scroll-table-showcase.component';
import { ContractVirtualScrollTableShowcaseComponent } from './contract-virtual-scroll-table-showcase.component';
import { LargeVirtualScrollTableShowcaseComponent } from './large-virtual-scroll-table-showcase.component';
import { PaginationTableShowcaseComponent } from './pagination-table-showcase.component';
import { SelectionTableShowcaseComponent } from './selection-table-showcase.component';
import { SelectionVirtualScrollTableShowcaseComponent } from './selection-virtual-scroll-table-showcase.component';
import { VirtualScrollTableShowcaseComponent } from './virtual-scroll-table-showcase.component';

@Component({
  imports: [
    PaginationTableShowcaseComponent,
    SelectionTableShowcaseComponent,
    ContractVirtualScrollTableShowcaseComponent,
    ContractSelectionVirtualScrollTableShowcaseComponent,
    ContractChildRowVirtualScrollTableShowcaseComponent,
    VirtualScrollTableShowcaseComponent,
    SelectionVirtualScrollTableShowcaseComponent,
    LargeVirtualScrollTableShowcaseComponent,
    ChildRowVirtualScrollTableShowcaseComponent
  ],
  selector: 'app-root',
  template: `
    <main class="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 lg:px-10">
      <section class="mx-auto max-w-7xl">
        <header class="mb-10 border-b border-slate-300 pb-6">
          <p class="text-sm font-semibold uppercase text-slate-500">Table Provider</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-950">Product Inventory</h1>
        </header>

        <app-pagination-table-showcase />
        <app-selection-table-showcase />
        <app-contract-virtual-scroll-table-showcase />
        <app-contract-selection-virtual-scroll-table-showcase />
        <app-contract-child-row-virtual-scroll-table-showcase />
        <app-virtual-scroll-table-showcase />
        <app-selection-virtual-scroll-table-showcase />
        <app-large-virtual-scroll-table-showcase />
        <app-child-row-virtual-scroll-table-showcase />
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
