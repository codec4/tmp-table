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
    await new Promise(resolve => setTimeout(resolve, 500));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Product Inventory');
    expect(fixture.nativeElement.textContent).toContain('Pagination');
    expect(fixture.nativeElement.textContent).toContain('Paged API + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Table + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('Table + Row + Child Row + Virtual Scroll');
    expect(fixture.nativeElement.textContent).toContain('1250 rows');
    expect(fixture.nativeElement.textContent).toContain('of 1250 users');
    expect(fixture.nativeElement.textContent).toContain('1100 parent rows, 734 with child rows');
    expect(fixture.nativeElement.textContent).toContain('Laptop Pro');
    expect(fixture.nativeElement.textContent).toContain('$1,299.99');
  });
});
