import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App]
    }).compileComponents();
  });

  it('renders the showcase title, table data, and virtual scroll examples', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Product Inventory');
    expect(fixture.nativeElement.textContent).toContain('Pagination');
    expect(fixture.nativeElement.textContent).toContain('Checkbox Selection');
    expect(fixture.nativeElement.textContent).toContain('Paged API + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Paged API + Checkbox Selection + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Paged API + Child Row + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Table + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Checkbox Selection + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Editable Form Cells + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Virtual List + 10,000 Elements');
    expect(fixture.nativeElement.textContent).toContain('Table + Row + Child Row + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('1250 rows');
    expect(fixture.nativeElement.textContent).toContain('10000 elements');
    expect(fixture.nativeElement.textContent).toContain('0 edited across 1250 rows');
    expect(fixture.nativeElement.textContent).toContain('fetching 1 page');
    expect(fixture.nativeElement.textContent).toContain('1100 parent rows, 734 with child rows');
    expect(fixture.nativeElement.textContent).toContain('Laptop Pro');
    expect(fixture.nativeElement.textContent).toContain('$1,299.99');
  });

  it('renders form-cell value changes from the editable virtual table', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('[data-testid="product-status-select"]') as HTMLSelectElement;

    select.value = 'review';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 edited across 1250 rows');
    expect(fixture.nativeElement.textContent).toContain('PRD-0001 Laptop Pro changed to review');
  });
});
