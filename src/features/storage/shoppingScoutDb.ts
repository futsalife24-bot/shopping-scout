import Dexie, { type EntityTable } from 'dexie';
import type { PriceObservation, Product } from '@/types/commerce';

export class ShoppingScoutDb extends Dexie {
  products!: EntityTable<Product, 'id'>;
  priceObservations!: EntityTable<PriceObservation, 'id'>;

  constructor(name = 'shopping-scout') {
    super(name);
    // Keep schema versions explicit: later versions must add a migration here.
    this.version(1).stores({
      products: 'id, canonicalName, janCode, manufacturer, category, createdAt, updatedAt',
      priceObservations: 'id, productId, capturedAt, storeProductCode, [storeName+storeProductCode]'
    });
  }
}

export const shoppingScoutDb = new ShoppingScoutDb();

export interface ExactProductLookup {
  janCode?: string;
  storeName?: string;
  storeProductCode?: string;
}

/**
 * Returns only exact identifiers. Similar names and packages are deliberately
 * excluded: ambiguous records must be confirmed by the user in a later flow.
 */
export async function findExactProductMatches(
  lookup: ExactProductLookup,
  db: ShoppingScoutDb = shoppingScoutDb
): Promise<Product[]> {
  if (lookup.janCode) {
    return db.products.where('janCode').equals(lookup.janCode).toArray();
  }

  if (lookup.storeName && lookup.storeProductCode) {
    const observations = await db.priceObservations
      .where('[storeName+storeProductCode]')
      .equals([lookup.storeName, lookup.storeProductCode])
      .toArray();
    const ids = [...new Set(observations.map((observation) => observation.productId))];
    return Promise.all(ids.map((id) => db.products.get(id))).then((records) =>
      records.filter((record): record is Product => record !== undefined)
    );
  }

  return [];
}

export interface SaveNewRecordInput {
  product: Product;
  observation: PriceObservation;
}

/** Save the confirmed observation locally in one transaction. */
export async function saveNewRecord(
  input: SaveNewRecordInput,
  db: ShoppingScoutDb = shoppingScoutDb
): Promise<void> {
  await db.transaction('rw', db.products, db.priceObservations, async () => {
    await db.products.add(input.product);
    await db.priceObservations.add(input.observation);
  });
}
