import { InjectionToken, Signal, TemplateRef } from '@angular/core';

export type FormatterType = 'currency' | 'percent' | 'decimal';

export type TableSignalSource<T> = Signal<T> | T | (() => Signal<T> | T);

export type ColumnDef<T extends Record<string, unknown> = Record<string, unknown>> = {
  key: keyof T & string;
  header: string;
  formatter?: FormatterType;
  templateKey?: string;
  formatFn?: (value: unknown) => unknown;
};

export type DataTableChildRowPredicate<T extends Record<string, unknown> = Record<string, unknown>> = (
  row: T,
  rowIndex: number
) => boolean;

export type DataTableKey = string | number;

export type DataTableRowKey<T extends Record<string, unknown> = Record<string, unknown>> =
  | (keyof T & string)
  | ((row: T, rowIndex: number) => DataTableKey);

export type DataTableSelectionMode = 'single' | 'multiple';

export type DataTableSelectAllScope = false | 'data' | 'visible';

export type DataTableSelectionChange<T extends Record<string, unknown> = Record<string, unknown>> = {
  addedKeys: ReadonlySet<DataTableKey>;
  removedKeys: ReadonlySet<DataTableKey>;
  row?: T;
  rowIndex?: number;
  selectedKeys: ReadonlySet<DataTableKey>;
  source: 'header' | 'row';
};

export type DataTableSelectionOptions<T extends Record<string, unknown> = Record<string, unknown>> = {
  columnWidth?: string;
  disabled?: (row: T, rowIndex: number) => boolean;
  mode?: DataTableSelectionMode;
  onChange?: (change: DataTableSelectionChange<T>) => void;
  rowKey?: DataTableRowKey<T>;
  selectAll?: boolean | DataTableSelectAllScope;
  selectedKeys?: TableSignalSource<ReadonlySet<DataTableKey>>;
};

export type DataTableSelectionSource<T extends Record<string, unknown> = Record<string, unknown>> =
  | boolean
  | DataTableSelectionOptions<T>
  | null;

export type TableColumnSource<T extends Record<string, unknown> = Record<string, unknown>> =
  | Signal<ColumnDef<T>[]>
  | ColumnDef<T>[]
  | (() => Signal<ColumnDef<T>[]> | ColumnDef<T>[]);

export const RAW_COLUMNS = new InjectionToken<TableColumnSource>('DATA_TABLE_RAW_COLUMNS', {
  factory: () => []
});

export const COLUMNS = new InjectionToken<TableColumnSource>('DATA_TABLE_COLUMNS', {
  factory: () => []
});

export const TABLE_DATA = new InjectionToken<Signal<Record<string, unknown>[]>>('DATA_TABLE_DATA');

export const TABLE_LOADING = new InjectionToken<Signal<boolean>>('DATA_TABLE_LOADING');

export const TABLE_SELECTION = new InjectionToken<Signal<DataTableSelectionSource>>('DATA_TABLE_SELECTION');

export const TABLE_TEMPLATES = new InjectionToken<Map<string, TemplateRef<unknown>>>('DATA_TABLE_TEMPLATES', {
  providedIn: 'root',
  factory: () => new Map<string, TemplateRef<unknown>>()
});
