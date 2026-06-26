import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, inject, input } from '@angular/core';
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
        @for (column of columns(); track column.key) {
          <td class="max-w-80 truncate px-4 py-3 text-slate-700" title="{{ row[column.key] ?? '' }}">
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
  readonly virtualMeasurement = input(false);

  colspan(): number {
    return Math.max(this.columns().length, 1);
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
}
