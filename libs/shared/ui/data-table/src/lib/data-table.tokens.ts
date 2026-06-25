import { InjectionToken, Signal, TemplateRef } from '@angular/core';

export type FormatterType = 'currency' | 'percent' | 'decimal';

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

export type TableColumnSource<T extends Record<string, unknown> = Record<string, unknown>> =
  | Signal<ColumnDef<T>[]>
  | ColumnDef<T>[]
  | (() => Signal<ColumnDef<T>[]> | ColumnDef<T>[]);

export type TableSignalSource<T> = Signal<T> | T | (() => Signal<T> | T);

export const RAW_COLUMNS = new InjectionToken<TableColumnSource>('DATA_TABLE_RAW_COLUMNS', {
  factory: () => []
});

export const COLUMNS = new InjectionToken<TableColumnSource>('DATA_TABLE_COLUMNS', {
  factory: () => []
});

export const TABLE_DATA = new InjectionToken<Signal<Record<string, unknown>[]>>('DATA_TABLE_DATA');

export const TABLE_LOADING = new InjectionToken<Signal<boolean>>('DATA_TABLE_LOADING');

export const TABLE_TEMPLATES = new InjectionToken<Map<string, TemplateRef<unknown>>>('DATA_TABLE_TEMPLATES', {
  providedIn: 'root',
  factory: () => new Map<string, TemplateRef<unknown>>()
});
