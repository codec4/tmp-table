import { ColumnDef } from '@table-provider/data-table';

export type ProductStatus = 'active' | 'review' | 'paused';

export type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: string;
  discount: string;
  weight: string;
  status: ProductStatus;
  warehouse: string;
  owner: string;
  stock: number;
  leadTime: string;
  detail: string;
  nextAudit: string;
};

export const productColumns: ColumnDef<ProductRow>[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Product Name' },
  { key: 'category', header: 'Category' },
  { key: 'price', header: 'Price' },
  { key: 'discount', header: 'Discount' },
  { key: 'weight', header: 'Weight' },
  { key: 'status', header: 'Status', templateKey: 'statusBadge' }
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency'
});

const productNames = [
  'Laptop Pro',
  'Wireless Mouse',
  'Mech Keyboard',
  'Docking Station',
  'USB-C Hub',
  'Studio Display',
  'Noise Canceling Headset',
  'Ergo Chair',
  'Portable SSD',
  'Webcam 4K'
];

const categories = ['Computing', 'Accessories', 'Workspace', 'Storage'];
const warehouses = ['Cleveland', 'Phoenix', 'Raleigh', 'Portland'];
const owners = ['North Ops', 'Channel Team', 'Retail Desk', 'Enterprise'];
const statuses: ProductStatus[] = ['active', 'review', 'paused'];

export const productRows = createProducts(1250);

function createProducts(count: number): ProductRow[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const name = productNames[index % productNames.length];
    const price = index === 0 ? 1299.99 : 39 + ((index * 47) % 950) + 0.99;
    const discount = 5 + ((index * 3) % 28);
    const weight = 0.2 + ((index * 7) % 34) / 10;
    const status = statuses[index % statuses.length];

    return {
      id,
      sku: `PRD-${String(id).padStart(4, '0')}`,
      name,
      category: categories[index % categories.length],
      price: currencyFormatter.format(price),
      discount: `${discount}%`,
      weight: `${weight.toFixed(1)} kg`,
      status,
      warehouse: warehouses[index % warehouses.length],
      owner: owners[index % owners.length],
      stock: 20 + ((index * 11) % 180),
      leadTime: `${2 + (index % 9)} days`,
      detail: `${name} has ${20 + ((index * 11) % 180)} units with a ${2 + (index % 9)} day lead time.`,
      nextAudit: `2026-Q${(index % 4) + 1}`
    };
  });
}
