export type VirtualRowPart = 'parent' | 'child';

export type VirtualScrollRow = {
  hasChildRow: boolean;
  key: string;
};

export type VirtualRowsLayout = {
  offsets: number[];
  rowCount: number;
  totalHeight: number;
};

export type VirtualRowsRange = {
  end: number;
  start: number;
};

export type VirtualRowMeasurement = {
  height: number | null;
  key: string | undefined;
};

export const DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS = 25;
export const DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS = 25;
export const DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT = 48;
export const DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT = 57;
export const SCROLL_IDLE_MEASUREMENT_DELAY_MS = 240;

export const virtualRowMeasurementKey = (rowKey: string, part: VirtualRowPart): string => `${part}:${rowKey}`;

export const calculateVirtualRowsLayout = (options: {
  childRowHeight: number;
  measuredHeights: Record<string, number>;
  rowHeight: number;
  rows: VirtualScrollRow[];
}): VirtualRowsLayout => {
  const offsets = [0];
  let totalHeight = 0;

  for (const row of options.rows) {
    totalHeight += virtualItemHeight(row, options);
    offsets.push(totalHeight);
  }

  return {
    offsets,
    rowCount: options.rows.length,
    totalHeight
  };
};

export const calculateVirtualRange = (options: {
  initialRows: number;
  layout: VirtualRowsLayout;
  overscanRows: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
}): VirtualRowsRange => {
  const rowCount = options.layout.rowCount;

  if (!rowCount) {
    return {
      end: 0,
      start: 0
    };
  }

  const rowHeight = positiveNumber(options.rowHeight, DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT);
  const minRows = Math.min(positiveInteger(options.initialRows, DEFAULT_VIRTUAL_SCROLL_INITIAL_ROWS), rowCount);
  const overscanPixels = positiveInteger(options.overscanRows, DEFAULT_VIRTUAL_SCROLL_OVERSCAN_ROWS) * rowHeight;
  const fallbackViewportHeight = minRows * rowHeight;
  const viewportHeight = positiveNumber(options.viewportHeight, fallbackViewportHeight);
  const scrollTop = clamp(options.scrollTop, 0, options.layout.totalHeight);
  const start = rowIndexAtOffset(options.layout.offsets, Math.max(scrollTop - overscanPixels, 0));
  let end = rowIndexAfterOffset(
    options.layout.offsets,
    Math.min(scrollTop + viewportHeight + overscanPixels, options.layout.totalHeight)
  );

  end = Math.max(end, start + minRows);
  end = Math.min(end, rowCount);

  return {
    end,
    start: Math.max(Math.min(start, end - minRows), 0)
  };
};

export const calculateVirtualTopOffset = (options: {
  layout: VirtualRowsLayout;
  range: VirtualRowsRange;
  renderedRowsHeight: number;
  scrollTop: number;
  viewportHeight: number;
}): number => {
  const startOffset = options.layout.offsets[options.range.start] ?? 0;

  if (!options.renderedRowsHeight || options.range.end !== options.layout.rowCount) {
    return startOffset;
  }

  const viewportBottom = options.scrollTop + options.viewportHeight;
  const renderedRowsBottom = startOffset + options.renderedRowsHeight;

  if (viewportBottom <= renderedRowsBottom) {
    return startOffset;
  }

  return Math.max(startOffset, viewportBottom - options.renderedRowsHeight);
};

export const calculatePreservedScrollTop = (options: {
  previousScrollTop: number;
  previousTotalHeight: number;
  nextTotalHeight: number;
  viewportHeight: number;
}): number => {
  if (options.previousScrollTop <= 0) {
    return options.previousScrollTop;
  }

  const previousMaxScrollTop = Math.max(options.previousTotalHeight - options.viewportHeight, 0);
  const nextMaxScrollTop = Math.max(options.nextTotalHeight - options.viewportHeight, 0);

  if (previousMaxScrollTop <= 0 || nextMaxScrollTop <= 0) {
    return options.previousScrollTop;
  }

  return (options.previousScrollTop / previousMaxScrollTop) * nextMaxScrollTop;
};

export const calculateRenderedRowsHeight = (measurements: VirtualRowMeasurement[]): number =>
  measurements.reduce((totalHeight, measurement) => totalHeight + (measurement.height ?? 0), 0);

const virtualItemHeight = (
  row: VirtualScrollRow,
  options: {
    childRowHeight: number;
    measuredHeights: Record<string, number>;
    rowHeight: number;
  }
): number => {
  const parentHeight =
    measuredHeight(options.measuredHeights, virtualRowMeasurementKey(row.key, 'parent')) ??
    positiveNumber(options.rowHeight, DEFAULT_VIRTUAL_SCROLL_ROW_HEIGHT);
  const childHeight = row.hasChildRow
    ? (measuredHeight(options.measuredHeights, virtualRowMeasurementKey(row.key, 'child')) ??
      positiveNumber(options.childRowHeight, DEFAULT_VIRTUAL_SCROLL_CHILD_ROW_HEIGHT))
    : 0;

  return parentHeight + childHeight;
};

const measuredHeight = (measuredHeights: Record<string, number>, key: string): number | null => {
  const height = measuredHeights[key];

  return Number.isFinite(height) && height > 0 ? height : null;
};

const positiveInteger = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
};

const positiveNumber = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const rowIndexAtOffset = (offsets: number[], offset: number): number => {
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

const rowIndexAfterOffset = (offsets: number[], offset: number): number => {
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
