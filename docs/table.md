### 1. Tokens and Interfaces (`table.tokens.ts`)

We define our tokens. We use two column tokens: one for the raw config, and one for the processed config that contains
the injected formatting functions.

```typescript
import { InjectionToken, TemplateRef, Signal } from '@angular/core';

export type FormatterType = 'currency' | 'percent' | 'decimal';

export interface ColumnDef {
  cellClass?: string;
  cellKind?: 'text' | 'interactive';
  key: string;
  header: string;
  formatter?: FormatterType;
  templateKey?: string;
  truncate?: boolean;
  // This will be dynamically attached by our DI provider
  formatFn?: (value: any) => any;
}

// Tokens
export const RAW_COLUMNS = new InjectionToken<ColumnDef[]>('RAW_COLUMNS');
export const COLUMNS = new InjectionToken<ColumnDef[]>('COLUMNS');
export const TABLE_DATA = new InjectionToken<Signal<any[]>>('TABLE_DATA');
export const TABLE_LOADING = new InjectionToken<Signal<boolean>>('TABLE_LOADING');

// Template Registry Token
export const TABLE_TEMPLATES = new InjectionToken<Map<string, TemplateRef<any>>>('TABLE_TEMPLATES', {
  providedIn: 'root',
  factory: () => new Map<string, TemplateRef<any>>()
});
```

### 2. Functional Providers (`table.providers.ts`)

This is where the magic happens. We construct the DI tree. `withDataFormatters` injects the Angular Pipes and maps the
`RAW_COLUMNS` to add closure-based formatting functions. `withTableData` uses the `rxResource` and formats the data
stream.

```typescript
import { inject, computed } from '@angular/core';
import { CurrencyPipe, PercentPipe, DecimalPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { RAW_COLUMNS, COLUMNS, TABLE_DATA, TABLE_LOADING, ColumnDef } from './table.tokens';

/** Base Provider to initialize table configuration */
export function withTableColumns(columns: ColumnDef[]) {
  return [
    { provide: RAW_COLUMNS, useValue: columns },
    {
      provide: COLUMNS,
      useFactory: () => inject(RAW_COLUMNS)
    }
  ];
}

/** Provider that maps columns and injects formatters via Pipes */
export function withDataFormatters() {
  return [
    // Provide pipes to the DI environment so they can be injected
    CurrencyPipe,
    PercentPipe,
    DecimalPipe,
    {
      provide: COLUMNS,
      useFactory: () => {
        const rawColumns = inject(RAW_COLUMNS);
        const currencyPipe = inject(CurrencyPipe);
        const percentPipe = inject(PercentPipe);
        const decimalPipe = inject(DecimalPipe);

        // Map over raw columns and attach formatting closures!
        return rawColumns.map(col => {
          if (!col.formatter) return col;

          return {
            ...col,
            formatFn: (value: any) => {
              if (value == null) return value;
              switch (col.formatter) {
                case 'currency':
                  return currencyPipe.transform(value);
                case 'percent':
                  return percentPipe.transform(value / 100, '1.0-2');
                case 'decimal':
                  return decimalPipe.transform(value, '1.0-2');
                default:
                  return value;
              }
            }
          };
        });
      }
    }
  ];
}

/** Provider that fetches data and reactively applies the mapped formatters */
export function withTableData(apiUrl: string) {
  return [
    {
      provide: TABLE_LOADING,
      useFactory: () => inject(TABLE_DATA_RESOURCE).isLoading // Hidden internal token could be used, or computed
    },
    {
      provide: TABLE_DATA,
      useFactory: () => {
        const columns = inject(COLUMNS);

        // Setup Angular v22 Resource
        const resource = rxResource({
          request: () => apiUrl,
          loader: () => {
            // Mocking HTTP response for demonstration
            return Promise.resolve([
              { id: 1, name: 'Laptop Pro', price: 1299.99, discount: 15, weight: 1.5, status: 'active' },
              { id: 2, name: 'Wireless Mouse', price: 49.5, discount: 5, weight: 0.2, status: 'active' },
              { id: 3, name: 'Mech Keyboard', price: 109.0, discount: 10, weight: 0.8, status: 'inactive' }
            ]);
          }
        });

        // Compute the final formatted data map!
        return computed(() => {
          const rawData = resource.value() ?? [];

          return rawData.map(row => {
            const mappedRow = { ...row };
            for (const col of columns) {
              if (col.formatFn) {
                // Apply the injected pipe formatter functions
                mappedRow[col.key] = col.formatFn(row[col.key]);
              }
            }
            return mappedRow;
          });
        });
      }
    }
  ];
}
```

### 3. Template Directive (`table-template.directive.ts`)

Unchanged pattern: it registers the user's template to the `Map`.

```typescript
import { Directive, TemplateRef, inject, input, OnInit, OnDestroy } from '@angular/core';
import { TABLE_TEMPLATES } from './table.tokens';

@Directive({
  selector: '[tableTemplate]',
  standalone: true
})
export class TableTemplateDirective implements OnInit, OnDestroy {
  readonly tableTemplate = input<string>();

  private templateRef = inject(TemplateRef);
  private templatesRegistry = inject(TABLE_TEMPLATES);

  ngOnInit() {
    const key = this.tableTemplate();
    if (key) this.templatesRegistry.set(key, this.templateRef);
  }

  ngOnDestroy() {
    const key = this.tableTemplate();
    if (key) this.templatesRegistry.delete(key);
  }
}
```

### 4. Fully DI-Driven Table Component (`data-table.component.ts`)

Notice this component doesn't even need `@Input()`. It reads directly from the reactive DI layer.

```typescript
import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { COLUMNS, TABLE_DATA, TABLE_TEMPLATES } from './table.tokens';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table class="min-w-full divide-y divide-gray-300">
        <thead class="bg-gray-50">
          <tr>
            @for (col of columns; track col.key) {
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                {{ col.header }}
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          @for (row of data(); track $index) {
            <tr>
              @for (col of columns; track col.key) {
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-700">
                  <!-- Resolve Custom Template from the injected registry Map -->
                  @if (col.templateKey && templatesRegistry.has(col.templateKey)) {
                    <ng-container
                      *ngTemplateOutlet="templatesRegistry.get(col.templateKey)!; context: { $implicit: row }"
                    ></ng-container>
                  } @else {
                    {{ row[col.key] }}
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class DataTableComponent {
  // Inject reactive streams and configs directly from DI!
  columns = inject(COLUMNS);
  data = inject(TABLE_DATA); // Returns Signal<any[]>
  templatesRegistry = inject(TABLE_TEMPLATES);
}
```

### 5. Parent App Component (`app.component.ts`)

This component establishes the DI context and provides the custom template. The data fetching and formatting happen
entirely behind the scenes in the `providers` array.

```typescript
import { Component, inject } from '@angular/core';
import { DataTableComponent } from './data-table.component';
import { TableTemplateDirective } from './table-template.directive';
import { withTableColumns, withDataFormatters, withTableData } from './table.providers';
import { TABLE_DATA } from './table.tokens';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DataTableComponent, TableTemplateDirective],
  // 🚀 The true V22 Functional DI Engine Architecture
  providers: [
    withTableColumns([
      { key: 'name', header: 'Product Name' },
      { key: 'price', header: 'Price', formatter: 'currency' },
      { key: 'discount', header: 'Discount', formatter: 'percent' },
      { key: 'weight', header: 'Weight (kg)', formatter: 'decimal' },
      { key: 'status', header: 'Status', templateKey: 'statusBadge' } // Defers to template
    ]),
    withDataFormatters(),
    withTableData('https://api.example.com/products')
  ],
  template: `
    <div class="max-w-7xl mx-auto p-6">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">Product Inventory</h1>

      <!-- Register the custom template via Directive -->
      <ng-template tableTemplate="statusBadge" let-row>
        <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
              [class.bg-green-50]="row.status === 'active'"
              [class.text-green-700]="row.status === 'active'"
              [class.ring-green-600/20]="row.status === 'active'"
              [class.bg-red-50]="row.status !== 'active'"
              [class.text-red-700]="row.status !== 'active'"
              [class.ring-red-600/20]="row.status !== 'active'">
          {{ row.status | uppercase }}
        </span>
      </ng-template>

      <!-- Render component, it pulls dependencies entirely from DI -->
      @if (dataSignal().length === 0) {
        <div class="text-gray-500 animate-pulse">Loading data...</div>
      } @else {
        <app-data-table />
      }
    </div>
  `
})
export class AppComponent {
  // Only injected here to check if we show the table or loader
  dataSignal = inject(TABLE_DATA);
}
```

### Why this Architecture is extremely powerful:

1. **Pipes in Providers**: By executing `inject(CurrencyPipe)` directly inside `withDataFormatters`, we extract pipe
   logic away from the template and process the values efficiently in TypeScript beforehand.
2. **True Reactive DI**: Dependencies like `TABLE_DATA` are exposed as `Signal<any[]>`. The table component doesn't even
   need `@Input()`; it relies completely on the reactive data flow configured by its parent's DI tree.
3. **Decoupled Architecture**: You can reuse `<app-data-table />` everywhere. Just attach the
   `providers: [withTableColumns(...), withDataFormatters(), withTableData(...)]` to whatever wrapper component needs a
   table.
