import { Pipe, PipeTransform } from '@angular/core';
import { Store } from '@ngxs/store';
import { map } from 'rxjs';
import { DictionaryEntity } from 'core';
import { DictionariesModel } from './+state/dictionaries.model';
import { DictionariesState } from './+state/dictionaries.state';
import { loadIfDictionaryEmpty } from './dictionary.operator';

type ID = DictionaryEntity['id'];

@Pipe({ name: 'lpDictionaryToOptions', standalone: true })
export class DictionaryToOptionsPipe implements PipeTransform {
  constructor(private store: Store) {}

  transform(id: ID, key: keyof DictionariesModel) {
    const entities$ = this.store.select(DictionariesState.entities<DictionaryEntity>(key));
    return entities$.pipe(
      loadIfDictionaryEmpty(this.store, key),
      map(entities => this.findEntity(id, entities))
    );
  }

  findEntity(id: ID, entities: DictionaryEntity[]) {
    return `${entities.find((o: any) => o.id === id)?.name ?? id ?? ''}`;
  }
}
