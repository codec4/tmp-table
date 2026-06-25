# data-table

A shared, DI-driven Angular data table library.

The component can also be driven directly with inputs:

```html
<lib-data-table [columns]="columns" [data]="rows" />
```

Use the virtualized table component when the row set is large:

```html
<lib-data-table-virtual-scroll
  [columns]="columns"
  [data]="rows"
  height="28rem"
  [initialRows]="25"
  [overscanRows]="25"
  [rowHeight]="48"
  [childRowHeight]="57"
  [childRowWhen]="hasDetailRow"
  childRowTemplateKey="details"
/>
```

`lib-data-table-virtual-scroll` uses `IntersectionObserver` sentinels inside the body scroll container, estimated row
heights, measured rendered row heights, and a fixed-height scroll space to keep only the active window plus overscan in
the DOM. The rendered row window is translated inside that stable scroll space so the scrollbar thumb keeps the same
cursor mapping while dragging. When `childRowTemplateKey` is provided, the detail child row is rendered directly after
its parent, so virtual scrolling keeps each parent and child row together. Use `childRowWhen` when only some parent rows
have child row content. `rowHeight` and `childRowHeight` are initial estimates for rows that have not been rendered yet;
the component measures visible parent and child rows and uses those measurements for subsequent scroll math.

Run `nx test data-table` to execute the unit tests.
