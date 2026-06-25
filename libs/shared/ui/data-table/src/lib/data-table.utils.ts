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

export const positiveInteger = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
};

export const positiveNumber = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const rowIndexAtOffset = (offsets: number[], offset: number): number => {
  let low = 0;
  let high = Math.max(offsets.length - 2, 0);
  let result = 0;

  while (low <= high) {
    const midpoint = Math.floor((low + high) / 2);

    if ((offsets[midpoint] ?? 0) <= offset) {
      result = midpoint;
      low = midpoint + 1;
    } else {
      high = midpoint - 1;
    }
  }

  return result;
};

export const rowIndexAfterOffset = (offsets: number[], offset: number): number => {
  let low = 0;
  let high = offsets.length - 1;
  let result = offsets.length - 1;

  while (low <= high) {
    const midpoint = Math.floor((low + high) / 2);

    if ((offsets[midpoint] ?? 0) > offset) {
      result = midpoint;
      high = midpoint - 1;
    } else {
      low = midpoint + 1;
    }
  }

  return result;
};
