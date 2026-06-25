import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';
import { DataTableVirtualScrollComponent } from './data-table-virtual-scroll.component';
import { DataTableTemplateDirective } from './data-table-template.directive';
import { provideTableColumns, provideTableTemplates, withDataFormatters, withTableData } from './data-table.providers';
import { ColumnDef } from './data-table.tokens';

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
});

@Component({
  imports: [DataTableComponent, DataTableTemplateDirective],
  providers: [
    provideTableTemplates(),
    provideTableColumns<TestRow>([{ key: 'status', header: 'Status', templateKey: 'statusBadge' }]),
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
  imports: [DataTableVirtualScrollComponent],
  template: `
    <lib-data-table-virtual-scroll
      [columns]="columns"
      [data]="rows"
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
  imports: [DataTableVirtualScrollComponent, DataTableTemplateDirective],
  providers: [provideTableTemplates()],
  template: `
    <ng-template tableTemplate="details" let-row let-rowIndex="rowIndex">
      <span data-testid="child-row">{{ row.name }} details {{ rowIndex }}</span>
    </ng-template>
    <lib-data-table-virtual-scroll
      [columns]="columns"
      [data]="rows"
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
  const providers = [...provideTableColumns<TestRow>(config.columns), ...withTableData<TestRow>(config.apiUrl)];

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

const createRows = (count: number): TestRow[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Row ${String(index + 1).padStart(2, '0')}`,
    price: index + 1,
    discount: 0,
    weight: 1,
    status: 'active'
  }));

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

const renderedVirtualRowHeightFor = (fixture: ComponentFixture<unknown>): number =>
  Array.from(virtualScrollSpaceFor(fixture).querySelectorAll<HTMLElement>('[data-virtual-row-key]')).reduce(
    (totalHeight, rowElement) => totalHeight + rowElement.getBoundingClientRect().height,
    0
  );

const transformOffsetFor = (element: HTMLElement): number => {
  const match = /translateY\(([-\d.]+)px\)/.exec(element.style.transform);

  return match ? Number(match[1]) : 0;
};

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
