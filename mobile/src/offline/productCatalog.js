import { getDb } from './db';

// The catalog is intentionally a small snapshot rather than a sync queue:
// products are managed centrally, and the latest successful fetch replaces
// the locally usable list for an offline sale entry.
export function cacheProducts(products) {
  const db = getDb();
  const cachedAt = new Date().toISOString();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM product_catalog;');
    for (const product of products) {
      db.runSync(
        'INSERT INTO product_catalog (id, payload, cachedAt) VALUES (?, ?, ?);',
        [product.id, JSON.stringify(product), cachedAt],
      );
    }
  });
}

export function getCachedProducts() {
  return getDb()
    .getAllSync('SELECT payload FROM product_catalog ORDER BY id ASC;')
    .map((row) => JSON.parse(row.payload));
}
