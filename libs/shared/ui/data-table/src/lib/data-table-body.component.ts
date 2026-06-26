import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, inject, input, output } from '@angular/core';
import { virtualRowMeasurementKey } from './data-table-virtual-scroll.math';
import type { VirtualRowPart } from './data-table-virtual-scroll.math';
import { ColumnDef, DataTableChildRowPredicate, TABLE_TEMPLATES } from './data-table.tokens';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  selector: 'tbody[libDataTableBody]',
  template: `
    @if (!loading() && !rows().length) {
      <tr>
        <td class="px-4 py-8 text-center text-sm text-slate-500" [attr.colspan]="colspan()">No results available</td>
      </tr>
    }

    @for (row of rows(); track rowTrackKey(row, $index); let rowIndex = $index) {
      <tr class="hover:bg-slate-50" [attr.data-virtual-row-key]="rowMeasurementKey(row, rowIndex, 'parent')">
        @if (selectionEnabled()) {
          <td class="px-4 py-3 align-middle" [style.width]="selectionColumnWidth()">
            <input
              class="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              data-testid="table-row-selection"
              type="checkbox"
              [attr.aria-label]="rowSelectionLabel(row, rowIndex)"
              [checked]="isRowSelected()(row, absoluteRowIndex(rowIndex))"
              [disabled]="isRowSelectionDisabled()(row, absoluteRowIndex(rowIndex))"
              (change)="toggleRowSelection(row, rowIndex)"
            />
          </td>
        }

        @for (column of columns(); track column.key) {
          <td [class]="cellClass(column)" [attr.title]="cellTitle(row, column)">
            @if (templateFor(column); as template) {
              <ng-container
                *ngTemplateOutlet="
                  template;
                  context: {
                    $implicit: row,
                    row: row,
                    value: row[column.key],
                    column: column
                  }
                "
              />
            } @else {
              {{ row[column.key] }}
            }
          </td>
        }
      </tr>

      @if (childRowTemplateFor(row, rowIndex); as childTemplate) {
        <tr class="bg-slate-200/80" [attr.data-virtual-row-key]="rowMeasurementKey(row, rowIndex, 'child')">
          <td class="border-t border-slate-100 px-4 py-3 text-slate-600" [attr.colspan]="colspan()">
            <ng-container
              *ngTemplateOutlet="
                childTemplate;
                context: {
                  $implicit: row,
                  row: row,
                  rowIndex: absoluteRowIndex(rowIndex)
                }
              "
            />
          </td>
        </tr>
      }
    }
  `
})
export class DataTableBodyComponent<T extends Record<string, unknown>> {
  readonly #templatesRegistry = inject(TABLE_TEMPLATES);

  readonly rows = input<T[]>([]);
  readonly columns = input<ColumnDef<T>[]>([]);
  readonly loading = input(false);
  readonly rowIndexOffset = input(0);
  readonly childRowTemplateKey = input<string | null>(null);
  readonly childRowWhen = input<DataTableChildRowPredicate<T> | null>(null);
  readonly isRowSelected = input<(row: T, rowIndex: number) => boolean>(() => false);
  readonly isRowSelectionDisabled = input<(row: T, rowIndex: number) => boolean>(() => false);
  readonly selectionColumnWidth = input('3rem');
  readonly selectionEnabled = input(false);
  readonly virtualMeasurement = input(false);
  readonly rowSelectionChange = output<{ row: T; rowIndex: number }>();

  colspan(): number {
    return Math.max(this.columns().length + (this.selectionEnabled() ? 1 : 0), 1);
  }

  absoluteRowIndex(rowIndex: number): number {
    return this.rowIndexOffset() + rowIndex;
  }

  templateFor(column: { key: string; templateKey?: string }): TemplateRef<unknown> | undefined {
    return (
      (column.templateKey ? this.#templatesRegistry.get(column.templateKey) : undefined) ??
      this.#templatesRegistry.get(column.key)
    );
  }

  cellClass(column: ColumnDef<T>): string {
    const classes = ['px-4', 'text-slate-700'];

    if (this.#shouldTruncateCell(column)) {
      classes.push('max-w-80', 'truncate');
    }

    if (column.cellKind === 'interactive') {
      classes.push('py-2', 'align-middle');
    } else {
      classes.push('py-3');
    }

    if (column.cellClass) {
      classes.push(column.cellClass);
    }

    return classes.join(' ');
  }

  cellTitle(row: T, column: ColumnDef<T>): string | null {
    if (!this.#shouldTruncateCell(column)) {
      return null;
    }

    const value = row[column.key];

    return value === undefined || value === null ? null : String(value);
  }

  childRowTemplateFor(row: T, rowIndex: number): TemplateRef<unknown> | undefined {
    const templateKey = this.childRowTemplateKey();

    if (!templateKey) {
      return undefined;
    }

    const absoluteRowIndex = this.absoluteRowIndex(rowIndex);
    const predicate = this.childRowWhen();

    if (predicate && !predicate(row, absoluteRowIndex)) {
      return undefined;
    }

    return this.#templatesRegistry.get(templateKey);
  }

  #shouldTruncateCell(column: ColumnDef<T>): boolean {
    return column.truncate ?? column.cellKind !== 'interactive';
  }

  rowMeasurementKey(row: T, rowIndex: number, part: VirtualRowPart): string | null {
    if (!this.virtualMeasurement()) {
      return null;
    }

    return virtualRowMeasurementKey(this.rowKey(row, this.absoluteRowIndex(rowIndex)), part);
  }

  rowTrackKey(row: T, rowIndex: number): unknown {
    const id = row['id'];

    return id === undefined || id === null ? row : String(id);
  }

  rowKey(row: T, index: number): string {
    const id = row['id'];

    return id === undefined || id === null ? `${index}` : String(id);
  }

  rowSelectionLabel(row: T, rowIndex: number): string {
    const absoluteIndex = this.absoluteRowIndex(rowIndex);
    const name = row['name'];

    return typeof name === 'string' && name ? `Select row ${name}` : `Select row ${absoluteIndex + 1}`;
  }

  toggleRowSelection(row: T, rowIndex: number): void {
    const absoluteIndex = this.absoluteRowIndex(rowIndex);

    if (this.isRowSelectionDisabled()(row, absoluteIndex)) {
      return;
    }

    this.rowSelectionChange.emit({
      row,
      rowIndex: absoluteIndex
    });
  }
}
