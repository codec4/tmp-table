import { Component, computed, inject, Injectable, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';
import { DataTableTemplateDirective } from './data-table-template.directive';
import {
  withTableColumns,
  withTableTemplates,
  withDataFormatters,
  withTableData,
  withTableRows,
  withTableSelection
} from './data-table.providers';
import { ColumnDef, DataTableKey, DataTableSelectionChange } from './data-table.tokens';

type TestRow = {
  id: number;
  name: string;
  price: number;
  discount: number;
  weight: number;
  status: string;
};

describe('data table components', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders DI-provided rows and columns from the table data resource', async () => {
    const fixture = await createFixture({
      columns: [
        { key: 'name', header: 'Product Name' },
        { key: 'price', header: 'Price' }
      ],
      apiUrl: '/api/products'
    });

    await render(fixture);

    expect(fixture.nativeElement.textContent).toContain('Product Name');
    expect(fixture.nativeElement.textContent).toContain('Price');
    expect(fixture.nativeElement.textContent).toContain('Laptop Pro');
  });

  it('applies pipe-backed formatter provider output to row data', async () => {
    const fixture = await createFixture({
      columns: [
        { key: 'price', header: 'Price', formatter: 'currency' },
        { key: 'discount', header: 'Discount', formatter: 'percent' },
        { key: 'weight', header: 'Weight', formatter: 'decimal' }
      ],
      apiUrl: '/api/products',
      formatters: true
    });

    await render(fixture);

    expect((fixture.componentInstance.rows()[0] as Record<string, unknown>)['price']).toBe('$1,299.99');
    expect((fixture.componentInstance.rows()[0] as Record<string, unknown>)['discount']).toBe('15%');
    expect(fixture.nativeElement.textContent).toContain('$1,299.99');
    expect(fixture.nativeElement.textContent).toContain('15%');
    expect(fixture.nativeElement.textContent).toContain('1.5');
  });

  it('renders an empty state', async () => {
    const fixture = await createFixture({
      columns: [{ key: 'name', header: 'Product Name' }],
      apiUrl: '/api/empty'
    });

    await render(fixture);

    expect(fixture.nativeElement.textContent).toContain('No results available');
  });

  it('renders a loading state', async () => {
    const fixture = await createFixture({
      columns: [{ key: 'name', header: 'Product Name' }],
      apiUrl: '/api/loading'
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('No results available');
    expect(fixture.nativeElement.querySelector('[aria-label="Loading rows"]')).toBeTruthy();
  });

  it('reserves virtual body height while initially loading rows', async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollInitialLoadingHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(VirtualScrollInitialLoadingHostComponent);
    fixture.detectChanges();

    const scrollRoot = scrollRootFor(fixture);

    expect(scrollRoot.style.maxHeight).toBe('10rem');
    expect(scrollRoot.style.minHeight).toBe('10rem');
    expect(fixture.nativeElement.querySelector('[aria-label="Loading rows"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('No results available');
  });

  it('fills the parent container when virtual scroll fill mode is enabled', async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollFillContainerHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(VirtualScrollFillContainerHostComponent);
    fixture.detectChanges();

    const tableHost = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('lib-data-table');
    const shell = virtualScrollShellFor(fixture);
    const scrollRoot = scrollRootFor(fixture);

    expect(tableHost?.style.height).toBe('100%');
    expect(shell.style.height).toBe('100%');
    expect(shell.classList.contains('flex')).toBe(true);
    expect(shell.classList.contains('flex-col')).toBe(true);
    expect(scrollRoot.classList.contains('flex-1')).toBe(true);
    expect(scrollRoot.classList.contains('min-h-0')).toBe(true);
    expect(scrollRoot.style.maxHeight).toBe('');
    expect(scrollRoot.style.minHeight).toBe('');
  });

  it('renders a custom template with row, value, and column context', async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableTemplateHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(DataTableTemplateHostComponent);
    await render(fixture);

    const cell = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testid="custom-cell"]');
    expect(cell?.textContent).toContain('Laptop Pro');
    expect(cell?.textContent).toContain('active');
    expect(cell?.textContent).toContain('Status');
  });

  it('renders interactive template cells without text truncation defaults', async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableInteractiveCellHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(DataTableInteractiveCellHostComponent);
    await render(fixture);

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testid="status-select"]');
    const interactiveCell = select?.closest('td');
    const textCell = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('tbody tr td:first-child');

    expect(interactiveCell?.classList.contains('truncate')).toBe(false);
    expect(interactiveCell?.classList.contains('align-middle')).toBe(true);
    expect(interactiveCell?.classList.contains('min-w-40')).toBe(true);
    expect(interactiveCell?.hasAttribute('title')).toBe(false);
    expect(textCell?.classList.contains('truncate')).toBe(true);
    expect(textCell?.getAttribute('title')).toBe('Row 01');
  });

  it('selects rows by key and emits selection changes', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectionInputHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectionInputHostComponent);
    await render(fixture);

    let rowCheckboxes = rowSelectionInputsFor(fixture);

    expect(rowCheckboxes).toHaveLength(3);
    expect(rowCheckboxes[0].checked).toBe(false);
    expect(rowCheckboxes[1].checked).toBe(true);
    expect(rowCheckboxes[2].disabled).toBe(true);

    rowCheckboxes[0].click();
    fixture.detectChanges();
    rowCheckboxes = rowSelectionInputsFor(fixture);

    expect(selectedKeysFor(fixture.componentInstance.selectedKeys)).toEqual([1, 2]);
    expect(selectedKeysFor(fixture.componentInstance.changes[0]?.addedKeys ?? new Set())).toEqual([1]);
    expect(rowCheckboxes[0].checked).toBe(true);
  });

  it('selects all enabled rows from the header checkbox', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectionInputHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectionInputHostComponent);
    fixture.componentInstance.selectedKeys = new Set();
    await render(fixture);

    const headerCheckbox = headerSelectionInputFor(fixture);

    expect(headerCheckbox.checked).toBe(false);
    expect(headerCheckbox.indeterminate).toBe(false);

    headerCheckbox.click();
    fixture.detectChanges();

    expect(selectedKeysFor(fixture.componentInstance.selectedKeys)).toEqual([1, 2]);
    expect(rowSelectionInputsFor(fixture)[2].checked).toBe(false);
  });

  it('uses provider-driven selection state', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectionProviderHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectionProviderHostComponent);
    await render(fixture);

    expect(rowSelectionInputsFor(fixture)[0].checked).toBe(true);

    rowSelectionInputsFor(fixture)[1].click();
    fixture.detectChanges();

    expect(selectedKeysFor(fixture.componentInstance.store.selectedKeys())).toEqual([1, 2]);
  });

  it('keeps the virtual header checkbox checked after scrolling when select-all targets the data set', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollSelectionDataHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollSelectionDataHostComponent);
      await render(fixture);

      headerSelectionInputFor(fixture).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedKeys.size).toBe(20);
      expect(headerSelectionInputFor(fixture).checked).toBe(true);

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.scrollTop = 320;
      scrollRoot.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(headerSelectionInputFor(fixture).checked).toBe(true);
      expect(headerSelectionInputFor(fixture).indeterminate).toBe(false);
    } finally {
      restoreIntersectionObserver();
    }
  });

  it('renders a bounded virtual-scroll window and moves it when the sentinel intersects', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollHostComponent);
      await render(fixture);

      expect(fixture.nativeElement.textContent).toContain('Row 01');
      expect(fixture.nativeElement.textContent).toContain('Row 04');
      expect(fixture.nativeElement.textContent).not.toContain('Row 05');
      expect(MockIntersectionObserver.latest()?.observe).toHaveBeenCalled();
      expect(virtualScrollSpaceFor(fixture).style.height).toBe('400px');

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.scrollTop = 160;
      MockIntersectionObserver.latest()?.trigger();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Row 01');
      expect(fixture.nativeElement.textContent).toContain('Row 08');
      expect(fixture.nativeElement.textContent).toContain('Row 12');
      expect(fixture.nativeElement.textContent).not.toContain('Row 20');
      expect(virtualScrollSpaceFor(fixture).style.height).toBe('400px');
      expect(virtualBodyFor(fixture).style.transform).toBe('translateY(140px)');
    } finally {
      restoreIntersectionObserver();
    }
  });

  it('updates the virtual window from direct scroll events for fast wheel and scrollbar-thumb jumps', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollHostComponent);
      await render(fixture);

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.scrollTop = 320;
      scrollRoot.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(scrollRoot.style.overflowAnchor).toBe('none');
      expect(fixture.nativeElement.textContent).not.toContain('Row 01');
      expect(fixture.nativeElement.textContent).toContain('Row 16');
      expect(fixture.nativeElement.textContent).toContain('Row 20');
      expect(virtualScrollSpaceFor(fixture).style.height).toBe('400px');
      expect(virtualBodyFor(fixture).style.transform).toBe('translateY(300px)');
      expect(fixture.componentInstance.ranges).toContainEqual({
        end: 20,
        start: 15
      });
    } finally {
      restoreIntersectionObserver();
    }
  });

  it('recalculates virtual scroll height from measured row heights', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

    getBoundingClientRect.mockImplementation(function (this: HTMLElement) {
      return this.dataset['virtualRowKey']?.startsWith('parent:') ? rectWithHeight(30) : rectWithHeight(0);
    });

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollHostComponent);
      await render(fixture);
      await flushVirtualMeasurements(fixture);

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('440px');
    } finally {
      getBoundingClientRect.mockRestore();
      restoreIntersectionObserver();
    }
  });

  it('defers measured height changes while scrolling so the scrollbar thumb mapping stays stable', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

    getBoundingClientRect.mockImplementation(function (this: HTMLElement) {
      return this.dataset['virtualRowKey']?.startsWith('parent:') ? rectWithHeight(30) : rectWithHeight(0);
    });

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollHostComponent);
      await render(fixture);

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.scrollTop = 160;
      scrollRoot.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('400px');

      await new Promise(resolve => setTimeout(resolve, 260));
      fixture.detectChanges();

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('450px');
      expect(scrollRoot.scrollTop).toBeCloseTo(182.22, 1);
    } finally {
      getBoundingClientRect.mockRestore();
      restoreIntersectionObserver();
    }
  });

  it('keeps measured height changes deferred while the scroll thumb pointer is held', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

    getBoundingClientRect.mockImplementation(function (this: HTMLElement) {
      return this.dataset['virtualRowKey']?.startsWith('parent:') ? rectWithHeight(30) : rectWithHeight(0);
    });

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollHostComponent);
      await render(fixture);

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      scrollRoot.scrollTop = 160;
      scrollRoot.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      await new Promise(resolve => setTimeout(resolve, 260));
      fixture.detectChanges();

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('400px');

      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      fixture.detectChanges();

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('450px');
    } finally {
      getBoundingClientRect.mockRestore();
      restoreIntersectionObserver();
    }
  });

  it('reapplies the preserved bottom scroll position after measured height increases on thumb release', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

    getBoundingClientRect.mockImplementation(function (this: HTMLElement) {
      return this.dataset['virtualRowKey']?.startsWith('parent:') ? rectWithHeight(30) : rectWithHeight(0);
    });

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollHostComponent);
      await render(fixture);

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);

      let maxScrollTop = 360;
      installClampedScrollTop(scrollRoot, () => maxScrollTop);

      scrollRoot.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      scrollRoot.scrollTop = maxScrollTop;
      scrollRoot.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      await new Promise(resolve => setTimeout(resolve, 260));
      fixture.detectChanges();

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('400px');
      expect(scrollRoot.scrollTop).toBe(360);

      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      fixture.detectChanges();

      maxScrollTop = Number.parseFloat(virtualScrollSpaceFor(fixture).style.height) - scrollRoot.clientHeight;
      expect(maxScrollTop).toBeGreaterThan(360);
      expect(scrollRoot.scrollTop).toBe(360);

      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(scrollRoot.scrollTop).toBeCloseTo(maxScrollTop, 1);
    } finally {
      getBoundingClientRect.mockRestore();
      restoreIntersectionObserver();
    }
  });

  it('bottom-aligns the final measured child-row window without changing scroll height while dragging', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

    getBoundingClientRect.mockImplementation(function (this: HTMLElement) {
      if (this.dataset['virtualRowKey']?.startsWith('parent:')) {
        return rectWithHeight(20);
      }

      return this.dataset['virtualRowKey']?.startsWith('child:') ? rectWithHeight(1) : rectWithHeight(0);
    });

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollChildRowHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollChildRowHostComponent);
      await render(fixture);

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      scrollRoot.scrollTop = 460;
      scrollRoot.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      const virtualBodyOffset = transformOffsetFor(virtualBodyFor(fixture));
      const renderedRowsHeight = renderedVirtualRowHeightFor(fixture);

      expect(virtualScrollSpaceFor(fixture).style.height).toBe('500px');
      expect(virtualBodyOffset + renderedRowsHeight).toBeGreaterThanOrEqual(500);
    } finally {
      getBoundingClientRect.mockRestore();
      restoreIntersectionObserver();
    }
  });

  it('keeps optional child rows with their parent rows while virtual scrolling', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollChildRowHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollChildRowHostComponent);
      await render(fixture);

      expect(fixture.nativeElement.textContent).toContain('Row 01 details 0');
      expect(fixture.nativeElement.textContent).toContain('Row 02');
      expect(fixture.nativeElement.textContent).not.toContain('Row 02 details 1');

      const scrollRoot = scrollRootFor(fixture);
      setClientHeight(scrollRoot, 40);
      scrollRoot.scrollTop = 100;
      MockIntersectionObserver.latest()?.trigger();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Row 01 details 0');
      expect(fixture.nativeElement.textContent).toContain('Row 04');
      expect(fixture.nativeElement.textContent).not.toContain('Row 04 details 3');
      expect(fixture.nativeElement.textContent).toContain('Row 05 details 4');
    } finally {
      restoreIntersectionObserver();
    }
  });

  it('includes the selection column in child row colspan', async () => {
    const restoreIntersectionObserver = installMockIntersectionObserver();

    try {
      await TestBed.configureTestingModule({
        imports: [VirtualScrollChildRowSelectionHostComponent]
      }).compileComponents();

      const fixture = TestBed.createComponent(VirtualScrollChildRowSelectionHostComponent);
      await render(fixture);

      const childCell = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
        '[data-testid="child-row"]'
      )?.parentElement;

      expect(childCell?.getAttribute('colspan')).toBe('2');
    } finally {
      restoreIntersectionObserver();
    }
  });
});

@Component({
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    withTableTemplates(),
    withTableColumns<TestRow>([{ key: 'status', header: 'Status', templateKey: 'statusBadge' }]),
    withTableData<TestRow>('/api/products')
  ],
  template: `
    <ng-template tableTemplate="statusBadge" let-row let-value="value" let-column="column">
      <span data-testid="custom-cell">{{ row.name }} {{ value }} {{ column.header }}</span>
    </ng-template>
    <lib-data-table />
  `
})
class DataTableTemplateHostComponent {}

@Component({
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    withTableTemplates(),
    withTableColumns<TestRow>([
      { key: 'name', header: 'Name' },
      {
        cellClass: 'min-w-40',
        cellKind: 'interactive',
        key: 'status',
        header: 'Status',
        templateKey: 'statusSelect'
      }
    ]),
    withTableRows<TestRow>(createRows(1))
  ],
  template: `
    <ng-template tableTemplate="statusSelect" let-value="value">
      <select data-testid="status-select" [value]="value">
        <option value="active">Active</option>
      </select>
    </ng-template>
    <lib-data-table />
  `
})
class DataTableInteractiveCellHostComponent {}

@Component({
  imports: [DataTableComponent],
  template: `
    <lib-data-table
      [columns]="columns"
      [data]="rows"
      [selection]="{
        rowKey: 'id',
        selectedKeys: selectedKeys,
        disabled: isSelectionDisabled
      }"
      (selectionChange)="applySelection($event)"
    />
  `
})
class SelectionInputHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
  readonly rows: TestRow[] = createRows(3).map(row => (row.id === 3 ? { ...row, status: 'inactive' } : row));
  readonly isSelectionDisabled = (row: TestRow): boolean => row.status === 'inactive';
  changes: DataTableSelectionChange<TestRow>[] = [];
  selectedKeys: ReadonlySet<DataTableKey> = new Set([2]);

  applySelection(change: DataTableSelectionChange<TestRow>): void {
    this.changes.push(change);
    this.selectedKeys = change.selectedKeys;
  }
}

@Injectable()
class SelectionProviderStore {
  readonly selectedKeys = signal<ReadonlySet<DataTableKey>>(new Set([1]));
}

@Component({
  imports: [DataTableComponent],
  providers: [
    SelectionProviderStore,
    withTableColumns<TestRow>([{ key: 'name', header: 'Name' }]),
    withTableRows<TestRow>(createRows(3)),
    withTableSelection<TestRow>(() => {
      const store = inject(SelectionProviderStore);

      return computed(() => ({
        rowKey: 'id',
        selectedKeys: store.selectedKeys()
      }));
    })
  ],
  template: `
    <lib-data-table (selectionChange)="store.selectedKeys.set($event.selectedKeys)" />
  `
})
class SelectionProviderHostComponent {
  readonly store = inject(SelectionProviderStore);
}

@Component({
  imports: [DataTableComponent],
  template: `
    <lib-data-table
      [columns]="columns"
      [data]="rows"
      [selection]="{
        rowKey: 'id',
        selectedKeys: selectedKeys,
        selectAll: 'data'
      }"
      [virtualScroll]="true"
      [initialRows]="2"
      [overscanRows]="1"
      [rowHeight]="20"
      height="10rem"
      (selectionChange)="selectedKeys = $event.selectedKeys"
    />
  `
})
class VirtualScrollSelectionDataHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
  readonly rows: TestRow[] = createRows(20);
  selectedKeys: ReadonlySet<DataTableKey> = new Set();
}

@Component({
  imports: [DataTableComponent],
  template: `
    <lib-data-table
      [columns]="columns"
      [data]="rows"
      [virtualScroll]="true"
      [initialRows]="2"
      [overscanRows]="1"
      [rowHeight]="20"
      height="10rem"
      (rangeChange)="ranges.push($event)"
    />
  `
})
class VirtualScrollHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
  readonly rows: TestRow[] = createRows(20);
  readonly ranges: Array<{ end: number; start: number }> = [];
}

@Component({
  imports: [DataTableComponent],
  template: `
    <lib-data-table
      [columns]="columns"
      [data]="[]"
      [loading]="true"
      [virtualScroll]="true"
      [rowHeight]="20"
      height="10rem"
    />
  `
})
class VirtualScrollInitialLoadingHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
}

@Component({
  imports: [DataTableComponent],
  template: `
    <div style="height: 30rem">
      <lib-data-table
        [columns]="columns"
        [data]="rows"
        [fillContainer]="true"
        [virtualScroll]="true"
        [rowHeight]="20"
      />
    </div>
  `
})
class VirtualScrollFillContainerHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
  readonly rows: TestRow[] = createRows(20);
}

@Component({
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [withTableTemplates()],
  template: `
    <ng-template tableTemplate="details" let-row let-rowIndex="rowIndex">
      <span data-testid="child-row">{{ row.name }} details {{ rowIndex }}</span>
    </ng-template>
    <lib-data-table
      [columns]="columns"
      [data]="rows"
      [virtualScroll]="true"
      [initialRows]="1"
      [overscanRows]="1"
      [rowHeight]="20"
      [childRowHeight]="10"
      [childRowWhen]="hasChildRow"
      childRowTemplateKey="details"
      height="10rem"
    />
  `
})
class VirtualScrollChildRowHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
  readonly rows: TestRow[] = createRows(20);
  readonly hasChildRow = (row: TestRow): boolean => row.id % 2 === 1;
}

@Component({
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [withTableTemplates()],
  template: `
    <ng-template tableTemplate="details" let-row let-rowIndex="rowIndex">
      <span data-testid="child-row">{{ row.name }} details {{ rowIndex }}</span>
    </ng-template>
    <lib-data-table
      [columns]="columns"
      [data]="rows"
      [selection]="true"
      [virtualScroll]="true"
      [initialRows]="1"
      [overscanRows]="1"
      [rowHeight]="20"
      [childRowHeight]="10"
      [childRowWhen]="hasChildRow"
      childRowTemplateKey="details"
      height="10rem"
    />
  `
})
class VirtualScrollChildRowSelectionHostComponent {
  readonly columns: ColumnDef<TestRow>[] = [{ key: 'name', header: 'Name' }];
  readonly rows: TestRow[] = createRows(20);
  readonly hasChildRow = (row: TestRow): boolean => row.id % 2 === 1;
}

const createFixture = async (config: {
  columns: Array<{
    key: keyof TestRow & string;
    header: string;
    formatter?: 'currency' | 'percent' | 'decimal';
    templateKey?: string;
  }>;
  apiUrl: string;
  formatters?: boolean;
}): Promise<ComponentFixture<DataTableComponent<TestRow>>> => {
  const providers = [withTableColumns<TestRow>(config.columns), ...withTableData<TestRow>(config.apiUrl)];

  if (config.formatters) {
    providers.push(...withDataFormatters());
  }

  await TestBed.configureTestingModule({
    imports: [DataTableComponent],
    providers
  }).compileComponents();

  return TestBed.createComponent(DataTableComponent<TestRow>);
};

const render = async (fixture: ComponentFixture<unknown>): Promise<void> => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const flushVirtualMeasurements = async (fixture: ComponentFixture<unknown>): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

function createRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Row ${String(index + 1).padStart(2, '0')}`,
    price: index + 1,
    discount: 0,
    weight: 1,
    status: 'active'
  }));
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }

  static latest(): MockIntersectionObserver | undefined {
    return MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
  }

  trigger(): void {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

const installMockIntersectionObserver = (): (() => void) => {
  const originalIntersectionObserver = globalThis.IntersectionObserver;
  MockIntersectionObserver.instances = [];

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver as unknown as typeof IntersectionObserver
  });

  return () => {
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: originalIntersectionObserver
    });
  };
};

const scrollRootFor = (fixture: ComponentFixture<unknown>): HTMLElement => {
  const scrollRoot = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '[data-testid="table-scroll-root"]'
  );

  if (!scrollRoot) {
    throw new Error('Expected table scroll root to be rendered.');
  }

  return scrollRoot;
};

const virtualScrollSpaceFor = (fixture: ComponentFixture<unknown>): HTMLElement => {
  const scrollSpace = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '[data-testid="virtual-scroll-space"]'
  );

  if (!scrollSpace) {
    throw new Error('Expected virtual scroll space to be rendered.');
  }

  return scrollSpace;
};

const virtualScrollShellFor = (fixture: ComponentFixture<unknown>): HTMLElement => {
  const shell = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '[data-testid="table-virtual-shell"]'
  );

  if (!shell) {
    throw new Error('Expected virtual table shell to be rendered.');
  }

  return shell;
};

const virtualBodyFor = (fixture: ComponentFixture<unknown>): HTMLElement => {
  const virtualBody = virtualScrollSpaceFor(fixture).querySelector<HTMLElement>('table');

  if (!virtualBody) {
    throw new Error('Expected virtual body table to be rendered.');
  }

  return virtualBody;
};

const setClientHeight = (element: HTMLElement, clientHeight: number): void => {
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: clientHeight
  });
};

const installClampedScrollTop = (element: HTMLElement, maxScrollTop: () => number): void => {
  let scrollTop = element.scrollTop;

  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: value => {
      scrollTop = Math.min(Math.max(value, 0), maxScrollTop());
    }
  });
};

const renderedVirtualRowHeightFor = (fixture: ComponentFixture<unknown>): number =>
  Array.from(virtualScrollSpaceFor(fixture).querySelectorAll<HTMLElement>('[data-virtual-row-key]')).reduce(
    (totalHeight, rowElement) => totalHeight + rowElement.getBoundingClientRect().height,
    0
  );

const transformOffsetFor = (element: HTMLElement): number => {
  const match = /translateY\(([-\d.]+)px\)/.exec(element.style.transform);

  return match ? Number(match[1]) : 0;
};

const headerSelectionInputFor = (fixture: ComponentFixture<unknown>): HTMLInputElement => {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    '[data-testid="table-header-selection"]'
  );

  if (!input) {
    throw new Error('Expected header selection checkbox to be rendered.');
  }

  return input;
};

const rowSelectionInputsFor = (fixture: ComponentFixture<unknown>): HTMLInputElement[] =>
  Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('[data-testid="table-row-selection"]')
  );

const selectedKeysFor = (keys: ReadonlySet<DataTableKey>): DataTableKey[] =>
  Array.from(keys).sort((left, right) => String(left).localeCompare(String(right)));

const rectWithHeight = (height: number): DOMRect => {
  const rect = {
    bottom: height,
    height,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({})
  };

  return rect as DOMRect;
};
