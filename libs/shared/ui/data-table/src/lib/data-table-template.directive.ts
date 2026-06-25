import { Directive, OnDestroy, OnInit, TemplateRef, inject, input } from '@angular/core';
import { TABLE_TEMPLATES } from './data-table.tokens';

@Directive({
  selector: '[libTableTemplate], [tableTemplate]',
  standalone: true
})
export class DataTableTemplateDirective implements OnInit, OnDestroy {
  readonly libTableTemplate = input<string>();
  readonly tableTemplate = input<string>();
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly templatesRegistry = inject(TABLE_TEMPLATES);

  ngOnInit(): void {
    const key = this.templateKey();
    if (key) {
      this.templatesRegistry.set(key, this.templateRef);
    }
  }

  ngOnDestroy(): void {
    const key = this.templateKey();
    if (key) {
      this.templatesRegistry.delete(key);
    }
  }

  private templateKey(): string {
    return this.libTableTemplate() ?? this.tableTemplate() ?? '';
  }
}
