import {
  calculatePreservedScrollTop,
  calculateRenderedRowsHeight,
  calculateVirtualRange,
  calculateVirtualRowsLayout,
  calculateVirtualTopOffset,
  virtualRowMeasurementKey
} from './data-table-virtual-scroll.math';

describe('data table virtual scroll math', () => {
  it('builds layout offsets from estimates and measured parent or child row heights', () => {
    const layout = calculateVirtualRowsLayout({
      childRowHeight: 10,
      measuredHeights: {
        [virtualRowMeasurementKey('1', 'parent')]: 30,
        [virtualRowMeasurementKey('1', 'child')]: 7
      },
      rowHeight: 20,
      rows: [
        { key: '1', hasChildRow: true },
        { key: '2', hasChildRow: false },
        { key: '3', hasChildRow: true }
      ]
    });

    expect(layout).toEqual({
      offsets: [0, 37, 57, 87],
      rowCount: 3,
      totalHeight: 87
    });
  });

  it('calculates the visible range from scroll position, viewport, minimum rows, and overscan', () => {
    const layout = calculateVirtualRowsLayout({
      childRowHeight: 10,
      measuredHeights: {},
      rowHeight: 20,
      rows: Array.from({ length: 20 }, (_, index) => ({
        hasChildRow: false,
        key: `${index + 1}`
      }))
    });

    expect(
      calculateVirtualRange({
        initialRows: 2,
        layout,
        overscanRows: 1,
        rowHeight: 20,
        scrollTop: 160,
        viewportHeight: 40
      })
    ).toEqual({
      end: 12,
      start: 7
    });
  });

  it('bottom-aligns the final rendered window when a frozen spacer would leave blank space', () => {
    const layout = {
      offsets: [0, 300, 420, 500],
      rowCount: 3,
      totalHeight: 500
    };

    expect(
      calculateVirtualTopOffset({
        layout,
        range: { start: 2, end: 3 },
        renderedRowsHeight: 40,
        scrollTop: 460,
        viewportHeight: 40
      })
    ).toBe(460);
  });

  it('keeps the normal row offset when the final rendered window already fills the viewport bottom', () => {
    const layout = {
      offsets: [0, 300, 420, 500],
      rowCount: 3,
      totalHeight: 500
    };

    expect(
      calculateVirtualTopOffset({
        layout,
        range: { start: 2, end: 3 },
        renderedRowsHeight: 120,
        scrollTop: 420,
        viewportHeight: 40
      })
    ).toBe(420);
  });

  it('preserves scroll ratio when measured heights change total height', () => {
    expect(
      calculatePreservedScrollTop({
        nextTotalHeight: 93438,
        previousScrollTop: 32000,
        previousTotalHeight: 94478,
        viewportHeight: 448
      })
    ).toBeCloseTo(31646.07, 2);
  });

  it('sums rendered row measurements and ignores unknown heights', () => {
    expect(
      calculateRenderedRowsHeight([
        { key: 'parent:1', height: 48 },
        { key: 'child:1', height: null },
        { key: 'parent:2', height: 41 }
      ])
    ).toBe(89);
  });
});
