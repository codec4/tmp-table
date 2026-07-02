import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChildRowVirtualScrollTableShowcaseComponent } from './child-row-virtual-scroll-table-showcase.component';
import { ContractChildRowVirtualScrollTableShowcaseComponent } from './contract-child-row-virtual-scroll-table-showcase.component';
import { ContractSelectionVirtualScrollTableShowcaseComponent } from './contract-selection-virtual-scroll-table-showcase.component';
import { ContractVirtualScrollTableShowcaseComponent } from './contract-virtual-scroll-table-showcase.component';
import { FormVirtualScrollTableShowcaseComponent } from './form-virtual-scroll-table-showcase.component';
import { HotToastShowcaseComponent } from './hot-toast-showcase.component';
import { LargeVirtualScrollTableShowcaseComponent } from './large-virtual-scroll-table-showcase.component';
import { PaginationTableShowcaseComponent } from './pagination-table-showcase.component';
import { SelectionTableShowcaseComponent } from './selection-table-showcase.component';
import { SelectionVirtualScrollTableShowcaseComponent } from './selection-virtual-scroll-table-showcase.component';
import { VirtualScrollTableShowcaseComponent } from './virtual-scroll-table-showcase.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PaginationTableShowcaseComponent,
    SelectionTableShowcaseComponent,
    HotToastShowcaseComponent,
    ContractVirtualScrollTableShowcaseComponent,
    ContractSelectionVirtualScrollTableShowcaseComponent,
    ContractChildRowVirtualScrollTableShowcaseComponent,
    VirtualScrollTableShowcaseComponent,
    SelectionVirtualScrollTableShowcaseComponent,
    FormVirtualScrollTableShowcaseComponent,
    LargeVirtualScrollTableShowcaseComponent,
    ChildRowVirtualScrollTableShowcaseComponent
  ],
  selector: 'app-showcases-page',
  template: `
    <header class="mb-10 border-b border-slate-300 pb-6">
      <p class="text-sm font-semibold uppercase text-slate-500">Table Provider</p>
      <h1 class="mt-2 text-2xl font-semibold text-slate-950">Product Inventory Showcases</h1>
    </header>

    <app-hot-toast-showcase />
    <app-pagination-table-showcase />
    <app-selection-table-showcase />
    <app-contract-virtual-scroll-table-showcase />
    <app-contract-selection-virtual-scroll-table-showcase />
    <app-contract-child-row-virtual-scroll-table-showcase />
    <app-virtual-scroll-table-showcase />
    <app-selection-virtual-scroll-table-showcase />
    <app-form-virtual-scroll-table-showcase />
    <app-large-virtual-scroll-table-showcase />
    <app-child-row-virtual-scroll-table-showcase />
  `
})
export class ShowcasesPageComponent {}
