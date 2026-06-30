import { Directive, Input, OnInit, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { BehaviorSubject, combineLatest, tap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { MatSelectComponent } from '@ui';
import { DictionaryEntity } from 'core';
import { DictionariesModel } from './+state/dictionaries.model';
import { DictionariesState } from './+state/dictionaries.state';
import { loadIfDictionaryEmpty } from './dictionary.operator';

@UntilDestroy()
@Directive({
  selector: '[ldDictionaryEntity]',
  standalone: true,
  host: { '[class.dictionary-entity]': 'true' }
})
export class DictionaryEntityDirective implements OnInit {
  @Input() ldDictionaryEntity?: keyof DictionariesModel;
  @Input() alwaysUpdate = false;

  @Input() set includeOnly(values: (string | number)[] | null) {
    if (values?.length) {
      this.#includeOnly$.next([...new Set(values.filter(Boolean))]);
    }
  }

  #includeOnly$ = new BehaviorSubject<(string | number)[] | undefined>(undefined);
  readonly #store = inject(Store);
  readonly #selectComponent = inject(MatSelectComponent, { optional: true, host: true });

  ngOnInit() {
    if (!this.ldDictionaryEntity) {
      throw new Error('Dictionary entity key must be specified!');
    }

    const entities$ = this.#store
      .select(DictionariesState.entities<DictionaryEntity>(this.ldDictionaryEntity))
      .pipe(loadIfDictionaryEmpty(this.#store, this.ldDictionaryEntity!, this.alwaysUpdate));

    combineLatest([entities$, this.#includeOnly$])
      .pipe(
        tap(([entities, includeOnly]) => this.updateOptions(entities, includeOnly)),
        untilDestroyed(this)
      )
      .subscribe();
  }

  private updateOptions(entities: DictionaryEntity<string | number>[], includeOnly?: (string | number)[]) {
    if (!this.#selectComponent) {
      return;
    }

    const options = includeOnly ? entities.filter(e => includeOnly?.includes(e.id)) : entities;
    this.#selectComponent.options.set(options);
  }
}
