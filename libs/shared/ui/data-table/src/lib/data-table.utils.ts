import { isSignal } from '@angular/core';
import { ColumnDef, TableColumnSource } from './data-table.tokens';

export const EMPTY_ROWS: Record<string, unknown>[] = [];

export const resolveColumnSource = <T extends Record<string, unknown>>(
  source: TableColumnSource<T> | null | undefined
): ColumnDef<T>[] => {
  if (!source) {
    return [];
  }

  if (isSignal(source)) {
    return source();
  }

  if (typeof source === 'function') {
    const resolved = source();
    return isSignal(resolved) ? resolved() : resolved;
  }

  return source;
};
