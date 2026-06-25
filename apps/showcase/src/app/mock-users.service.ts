import { Injectable } from '@angular/core';

export type UserStatus = 'Active' | 'Invited' | 'Suspended';

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  region: string;
  lastSeen: string;
  usage: string;
};

export type UsersPageQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: UserStatus | 'All';
};

export type PagedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

@Injectable()
export class MockUsersService {
  readonly #users = createUsers(1250);

  async getUsers(query: UsersPageQuery): Promise<PagedResponse<UserRow>> {
    await delay(MOCK_USERS_API_DELAY_MS);

    return this.#responseFor(query);
  }

  #responseFor(query: UsersPageQuery): PagedResponse<UserRow> {
    const pageSize = positiveInteger(query.pageSize, 50);
    const page = positiveInteger(query.page, 1);
    const search = query.search?.trim().toLowerCase() ?? '';
    const status = query.status ?? 'All';
    const filteredUsers = this.#users.filter(user => {
      const matchesStatus = status === 'All' || user.status === status;
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;

    return {
      items: filteredUsers.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }
}

const MOCK_USERS_API_DELAY_MS = 2450;
const firstNames = ['Jane', 'Theo', 'Maya', 'Noah', 'Iris', 'Lena', 'Owen', 'Nina', 'Amir', 'Sofia'];
const lastNames = ['Stone', 'Kim', 'Patel', 'Reed', 'Morris', 'Diaz', 'Chen', 'Baker', 'Singh', 'Hayes'];
const roles = ['Admin', 'Analyst', 'Designer', 'Engineer', 'Manager', 'Operator'];
const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
const statuses: UserStatus[] = ['Active', 'Invited', 'Suspended'];

const createUsers = (count: number): UserRow[] =>
  Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[(index * 3) % lastNames.length];
    const name = `${firstName} ${lastName}`;

    return {
      id,
      name,
      email: `${firstName}.${lastName}.${id}@example.test`.toLowerCase(),
      role: roles[(index * 5) % roles.length],
      status: statuses[index % statuses.length],
      region: regions[(index * 7) % regions.length],
      lastSeen: `${1 + (index % 28)} Jun 2026`,
      usage: `${12 + ((index * 13) % 88)}%`
    };
  });

const positiveInteger = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
};

const delay = (milliseconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, milliseconds));
