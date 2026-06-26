import { computed, signal } from '@angular/core';
import { ColumnDef } from '@table-provider/data-table';
import { MockUsersService, PagedResponse, UserRow } from './mock-users.service';

export type PagedUserRow = UserRow & {
  isPlaceholder?: boolean;
};

type PaginationState = PagedResponse<UserRow>['pagination'];

export const userColumns: ColumnDef<PagedUserRow>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'region', header: 'Region' },
  { key: 'status', header: 'Status', templateKey: 'pagedStatusBadge' },
  { key: 'lastSeen', header: 'Last Seen' },
  { key: 'usage', header: 'Usage' }
];

export class MockUsersVirtualTableStore {
  readonly #usersService: MockUsersService;
  readonly #requestedPages = new Set<number>();

  readonly pageSize = 50;
  readonly pagination = signal<PaginationState>({
    page: 1,
    pageSize: this.pageSize,
    totalItems: 0,
    totalPages: 0
  });
  readonly pages = signal<Record<number, UserRow[]>>({});
  readonly pendingPages = signal<ReadonlySet<number>>(new Set());
  readonly rows = computed<PagedUserRow[]>(() => {
    const pages = this.pages();

    return Array.from({ length: this.pagination().totalItems }, (_, index) => {
      const page = this.#pageForIndex(index);

      return pages[page]?.[index % this.pageSize] ?? placeholderUser(index);
    });
  });
  readonly loadedCount = computed(() => Object.values(this.pages()).reduce((total, page) => total + page.length, 0));
  readonly loadedPageCount = computed(() => Object.keys(this.pages()).length);
  readonly loadingPageCount = computed(() => this.pendingPages().size);
  readonly isInitialLoading = computed(() => this.loadedCount() === 0 && this.loadingPageCount() > 0);

  constructor(usersService: MockUsersService) {
    this.#usersService = usersService;
    this.#loadPage(1);
  }

  loadVisibleRange(range: { start: number; end: number }): void {
    const totalItems = this.pagination().totalItems;
    const start = Math.max(range.start - this.pageSize, 0);
    const end = totalItems ? Math.min(range.end + this.pageSize, totalItems) : range.end;

    this.#loadRange(start, end);
  }

  #loadRange(start: number, end: number): void {
    if (end <= start) {
      return;
    }

    const firstPage = this.#pageForIndex(start);
    const lastPage = this.#pageForIndex(end - 1);

    for (let page = firstPage; page <= lastPage; page += 1) {
      this.#loadPage(page);
    }
  }

  #loadPage(page: number): void {
    if (this.#requestedPages.has(page)) {
      return;
    }

    this.#requestedPages.add(page);
    this.pendingPages.update(pendingPages => new Set(pendingPages).add(page));

    void this.#usersService
      .getUsers({
        page,
        pageSize: this.pageSize,
        search: '',
        status: 'All'
      })
      .then(response => {
        this.pagination.set(response.pagination);
        this.pages.update(pages => ({
          ...pages,
          [page]: response.items
        }));
      })
      .finally(() => {
        this.pendingPages.update(pendingPages => {
          const nextPendingPages = new Set(pendingPages);
          nextPendingPages.delete(page);

          return nextPendingPages;
        });
      });
  }

  #pageForIndex(index: number): number {
    return Math.floor(index / this.pageSize) + 1;
  }
}

const placeholderUser = (index: number): PagedUserRow => {
  const id = index + 1;

  return {
    id,
    name: `Loading user ${String(id).padStart(4, '0')}`,
    email: 'Waiting for page',
    role: 'Pending',
    status: 'Invited',
    region: 'Pending',
    lastSeen: 'Pending',
    usage: '-',
    isPlaceholder: true
  };
};
