import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)]
    }).compileComponents();
  });

  it('renders the home page without the showcase content', async () => {
    const fixture = await createRoutedFixture('/');

    expect(fixture.nativeElement.textContent).toContain('Open showcases');
    expect(fixture.nativeElement.textContent).not.toContain('Pagination');
    expect(fixture.nativeElement.textContent).not.toContain('Hot Toast');
  });

  it('renders the showcase title, table data, and virtual scroll examples', async () => {
    const fixture = await createRoutedFixture('/showcases');

    expect(fixture.nativeElement.textContent).toContain('Product Inventory Showcases');
    expect(fixture.nativeElement.textContent).toContain('Hot Toast');
    expect(fixture.nativeElement.textContent).toContain('signal service API');
    expect(fixture.nativeElement.textContent).toContain('Placement');
    expect(fixture.nativeElement.textContent).toContain('top-left');
    expect(fixture.nativeElement.textContent).toContain('bottom-right');
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
    const fixture = await createRoutedFixture('/showcases');

    const select = fixture.nativeElement.querySelector('[data-testid="product-status-select"]') as HTMLSelectElement;

    select.value = 'review';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 edited across 1250 rows');
    expect(fixture.nativeElement.textContent).toContain('PRD-0001 Laptop Pro changed to review');
  });

  it('creates a notification from the hot toast showcase controls', async () => {
    const fixture = await createRoutedFixture('/showcases');

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const successButton = buttons.find(button => button.textContent?.trim() === 'Success');

    expect(successButton).toBeTruthy();

    successButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inventory saved');
    expect(fixture.nativeElement.textContent).toContain('The success shorthand uses a shorter default duration.');
    expect(fixture.nativeElement.textContent).toContain('Success toast shown');
  });

  it('creates a signal-driven notification from the hot toast showcase controls', async () => {
    const fixture = await createRoutedFixture('/showcases');

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const signalButton = buttons.find(button => button.textContent?.trim() === 'Signal task');

    expect(signalButton).toBeTruthy();

    signalButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Signal task running');
    expect(fixture.nativeElement.textContent).toContain('Signal toast started');
  });

  it('creates a notification with the selected hot toast placement', async () => {
    const fixture = await createRoutedFixture('/showcases');

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const bottomRightButton = buttons.find(button => button.textContent?.trim() === 'bottom-right');
    const showPlacementButton = buttons.find(button => button.textContent?.trim() === 'Show placement');

    expect(bottomRightButton).toBeTruthy();
    expect(showPlacementButton).toBeTruthy();

    bottomRightButton?.click();
    fixture.detectChanges();
    showPlacementButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Toast placed bottom-right');
    expect(fixture.nativeElement.textContent).toContain('Placement toast shown: bottom-right');
  });
});

const createRoutedFixture = async (path: string) => {
  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(App);

  await router.navigateByUrl(path);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
};
