import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import {
  InjectionToken,
  Provider,
  ResourceRef,
  Signal,
  TemplateRef,
  computed,
  inject,
  isSignal,
  signal
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NEVER, of } from 'rxjs';
import {
  COLUMNS,
  ColumnDef,
  DataTableSelectionSource,
  RAW_COLUMNS,
  TABLE_DATA,
  TABLE_LOADING,
  TABLE_SELECTION,
  TABLE_TEMPLATES,
  TableColumnSource,
  TableSignalSource
} from './data-table.tokens';

export type DataTableProviderConfig<T extends Record<string, unknown> = Record<string, unknown>> = {
  columns: TableColumnSource<T>;
  apiUrl: string;
  formatters?: boolean;
  scopedTemplates?: boolean;
};

export const withDataTable = <T extends Record<string, unknown>>(config: DataTableProviderConfig<T>): Provider[] => {
  const providers: Provider[] = [...withTableColumns(config.columns), ...withTableData(config.apiUrl)];

  if (config.formatters !== false) {
    providers.push(...withDataFormatters());
  }

  if (config.scopedTemplates) {
    providers.push(withTableTemplates());
  }

  return providers;
};

export const withTableColumns = <T extends Record<string, unknown>>(columns: TableColumnSource<T>): Provider[] => [
  {
    provide: RAW_COLUMNS,
    useValue: columns
  },
  {
    provide: COLUMNS,
    useFactory: () => resolveSignal(inject(RAW_COLUMNS))
  }
];

export const withTableTemplates = (): Provider => ({
  provide: TABLE_TEMPLATES,
  useFactory: () => new Map<string, TemplateRef<unknown>>()
});

/**
 * @deprecated Use `withDataTable`.
 */
export const provideDataTable = <T extends Record<string, unknown>>(config: DataTableProviderConfig<T>): Provider[] =>
  withDataTable(config);

/**
 * @deprecated Use `withTableColumns`.
 */
export const provideTableColumns = <T extends Record<string, unknown>>(columns: TableColumnSource<T>): Provider[] =>
  withTableColumns(columns);

/**
 * @deprecated Use `withTableTemplates`.
 */
export const provideTableTemplates = (): Provider => withTableTemplates();

export const withTableRows = <T extends Record<string, unknown>>(rows: TableSignalSource<T[]>): Provider => ({
  provide: TABLE_DATA,
  useFactory: () => resolveSignal(rows) as Signal<Record<string, unknown>[]>
});

export const withTableSelection = <T extends Record<string, unknown>>(
  selection: TableSignalSource<DataTableSelectionSource<T>>
): Provider => ({
  provide: TABLE_SELECTION,
  useFactory: () => resolveSignal(selection) as Signal<DataTableSelectionSource>
});

export const withDataFormatters = (): Provider[] => [
  CurrencyPipe,
  PercentPipe,
  DecimalPipe,
  {
    provide: COLUMNS,
    useFactory: () => {
      const rawColumns = resolveSignal(inject(RAW_COLUMNS));
      const currencyPipe = inject(CurrencyPipe);
      const percentPipe = inject(PercentPipe);
      const decimalPipe = inject(DecimalPipe);

      return computed(() =>
        rawColumns().map(column => {
          if (!column.formatter) {
            return column;
          }

          return {
            ...column,
            formatFn: (value: unknown) => {
              if (value === undefined || value === null) {
                return value;
              }

              const pipeValue = value as string | number;

              switch (column.formatter) {
                case 'currency':
                  return currencyPipe.transform(pipeValue);
                case 'percent':
                  return percentPipe.transform(Number(value) / 100, '1.0-2');
                case 'decimal':
                  return decimalPipe.transform(pipeValue, '1.0-2');
                default:
                  return value;
              }
            }
          };
        })
      );
    }
  }
];

export const withTableData = <T extends Record<string, unknown>>(apiUrl: string): Provider[] => [
  {
    provide: TABLE_DATA_RESOURCE,
    useFactory: () =>
      rxResource<Record<string, unknown>[], string>({
        params: () => apiUrl,
        defaultValue: [],
        stream: ({ params }) => mockTableDataStream(params)
      })
  },
  {
    provide: TABLE_LOADING,
    useFactory: () => inject(TABLE_DATA_RESOURCE).isLoading
  },
  {
    provide: TABLE_DATA,
    useFactory: () => {
      const resource = inject(TABLE_DATA_RESOURCE);
      const columns = resolveSignal(inject(COLUMNS) as TableColumnSource<T>);

      return computed(() => formatTableData(resource.value() as T[], columns()));
    }
  }
];

const TABLE_DATA_RESOURCE = new InjectionToken<ResourceRef<Record<string, unknown>[]>>('DATA_TABLE_RESOURCE');

const resolveSignal = <T>(source: TableSignalSource<T>): Signal<T> => {
  if (isSignal(source)) {
    return source;
  }

  if (typeof source === 'function') {
    const resolved = (source as () => Signal<T> | T)();
    return isSignal(resolved) ? (resolved as Signal<T>) : signal(resolved);
  }

  return signal(source);
};

const formatTableData = <T extends Record<string, unknown>>(rows: T[], columns: ColumnDef<T>[]): T[] => {
  const formattedColumns = columns.filter(column => column.formatFn);
  if (!formattedColumns.length) {
    return rows;
  }

  return rows.map(row => {
    const mappedRow: Record<string, unknown> = { ...row };

    for (const column of formattedColumns) {
      mappedRow[column.key] = column.formatFn?.(row[column.key]);
    }

    return mappedRow as T;
  });
};

const mockTableDataStream = (apiUrl: string) => {
  if (apiUrl.includes('loading')) {
    return NEVER;
  }

  return of(mockRowsForApiUrl(apiUrl));
};

const mockRowsForApiUrl = (apiUrl: string): Record<string, unknown>[] => {
  if (apiUrl.includes('empty')) {
    return [];
  }

  return [
    { id: 1, name: 'Laptop Pro', price: 1299.99, discount: 15, weight: 1.5, status: 'active' },
    { id: 2, name: 'Wireless Mouse', price: 49.5, discount: 5, weight: 0.2, status: 'active' },
    { id: 3, name: 'Mech Keyboard', price: 109, discount: 10, weight: 0.8, status: 'inactive' }
  ];
};
