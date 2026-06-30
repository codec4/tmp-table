import { HttpClient } from '@angular/common/http';
import { DictionaryEntity } from 'core';

export class DictionaryEntitiesService {
  constructor(
    protected http: HttpClient,
    protected url: string
  ) {}

  getAll() {
    return this.http.get<DictionaryEntity[]>(this.url);
  }
}
