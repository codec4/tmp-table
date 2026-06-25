import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, TemplateRef, inject, input } from '@angular/core';
import {
  COLUMNS,
  ColumnDef,
  DataTableChildRowPredicate,
  TABLE_DATA,
  TABLE_LOADING,
  TABLE_TEMPLATES,
  TableColumnSource
} from './data-table.tokens';
import { EMPTY_ROWS, resolveColumnSource } from './data-table.utils';

export type DataTableCellContext<T extends Record<string, unknown> = Record<string, unknown>> = {
  $implicit: T;
  row: T;
  value: unknown;
  column: ColumnDef<T>;
};

export type DataTableChildRowContext<T extends Record<string, unknown> = Record<string, unknown>> = {
  $implicit: T;
  row: T;
  rowIndex: number;
};

@Component({
  selector: 'lib-data-table',
  imports: [NgTemplateOutlet],
  template: `
    <div class="relative overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full border-separate border-spacing-0 text-sm">
        <thead class="bg-slate-50">
          <tr>
            @for (column of tableColumns(); track column.key) {
              <th
                class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
              >
                {{ column.header }}
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @if (!isLoading() && !rows().length) {
            <tr>
              <td class="px-4 py-8 text-center text-sm text-slate-500" [attr.colspan]="colspan()">
                No results available
              </td>
            </tr>
          }
          @for (row of rows(); track rowKey(row, $index); let rowIndex = $index) {
            <tr class="hover:bg-slate-50">
              @for (column of tableColumns(); track column.key) {
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
              <tr class="bg-slate-200/80">
                <td class="border-t border-slate-100 px-4 py-3 text-slate-600" [attr.colspan]="colspan()">
                  <ng-container
                    *ngTemplateOutlet="
                      childTemplate;
                      context: {
                        $implicit: row,
                        row: row,
                        rowIndex: rowIndex
                      }
                    "
                  />
                </td>
              </tr>
            }
          }
        </tbody>
      </table>

      @if (isLoading()) {
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/65">
          <div
            class="size-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700"
            role="status"
            aria-label="Loading rows"
          ></div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T extends Record<string, unknown>> {
  private readonly injectedRows = inject<Signal<T[]> | null>(TABLE_DATA, {
    optional: true
  });
  private readonly injectedColumns = inject<TableColumnSource<T>>(COLUMNS);
  private readonly injectedLoading = inject<Signal<boolean> | null>(TABLE_LOADING, {
    optional: true
  });
  private readonly templatesRegistry = inject(TABLE_TEMPLATES);

  readonly data = input<T[] | null>(null);
  readonly columns = input<ColumnDef<T>[] | null>(null);
  readonly loading = input<boolean | null>(null);
  readonly childRowTemplateKey = input<string | null>(null);
  readonly childRowWhen = input<DataTableChildRowPredicate<T> | null>(null);

  rows(): T[] {
    return this.data() ?? this.injectedRows?.() ?? (EMPTY_ROWS as T[]);
  }

  tableColumns(): ColumnDef<T>[] {
    const columns = this.columns();

    if (columns) {
      return columns;
    }

    return resolveColumnSource(this.injectedColumns);
  }

  isLoading(): boolean {
    return this.loading() ?? this.injectedLoading?.() ?? false;
  }

  templateFor(column: { key: string; templateKey?: string }): TemplateRef<unknown> | undefined {
    return (
      (column.templateKey ? this.templatesRegistry.get(column.templateKey) : undefined) ??
      this.templatesRegistry.get(column.key)
    );
  }

  colspan(): number {
    return Math.max(this.tableColumns().length, 1);
  }

  childRowTemplateFor(row: T, rowIndex: number): TemplateRef<unknown> | undefined {
    const templateKey = this.childRowTemplateKey();

    if (!templateKey) {
      return undefined;
    }

    const predicate = this.childRowWhen();

    if (predicate && !predicate(row, rowIndex)) {
      return undefined;
    }

    return this.templatesRegistry.get(templateKey);
  }

  rowKey(row: T, index: number): string {
    const id = row['id'];

    return id === undefined || id === null ? `${index}` : String(id);
  }
}
