import { getInitialSeedData } from "./seedData.js";

type DataCollections = ReturnType<typeof getInitialSeedData>;
type CollectionName = keyof DataCollections;

/**
 * @deprecated
 * JSON FILE DATABASE HAS BEEN DEPRECATED AND DISABLED.
 * All data storage and queries run exclusively against PostgreSQL (federation-db).
 * File writing is disabled to guarantee zero data is written to federation_db.json.
 */
class JsonDatabase {
  private data: DataCollections;

  constructor() {
    this.data = getInitialSeedData();
  }

  public save() {
    // Disabled: All persistence is managed strictly in PostgreSQL (federation-db).
  }

  public getCollection<K extends CollectionName>(name: K): DataCollections[K] {
    if (!this.data[name]) {
      (this.data as any)[name] = [];
    }
    return this.data[name];
  }

  public findById<K extends CollectionName>(
    collectionName: K,
    id: string
  ): any | undefined {
    const list = this.getCollection(collectionName) as any[];
    return list.find((item) => item.id === id);
  }

  public findOne<K extends CollectionName>(
    collectionName: K,
    predicate: (item: any) => boolean
  ): any | undefined {
    const list = this.getCollection(collectionName) as any[];
    return list.find(predicate);
  }

  public find<K extends CollectionName>(
    collectionName: K,
    predicate?: (item: any) => boolean,
    sortFn?: (a: any, b: any) => number,
    pagination?: { limit?: number; offset?: number }
  ): { items: any[]; total: number; offset: number; limit: number } {
    let list = this.getCollection(collectionName) as any[];

    if (predicate) {
      list = list.filter(predicate);
    }

    if (sortFn) {
      list = [...list].sort(sortFn);
    }

    const total = list.length;
    const offset = pagination?.offset || 0;
    const limit = pagination?.limit || total;
    const items = list.slice(offset, offset + limit);

    return { items, total, offset, limit };
  }

  public insert<K extends CollectionName>(collectionName: K, record: any): any {
    const list = this.getCollection(collectionName) as any[];
    const item = {
      ...record,
      id: record.id || `${String(collectionName).substring(0, 3)}-${Date.now()}`,
    };
    list.push(item);
    return item;
  }

  public update<K extends CollectionName>(
    collectionName: K,
    id: string,
    updates: any
  ): any | undefined {
    const list = this.getCollection(collectionName) as any[];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    list[index] = { ...list[index], ...updates, updatedAt: Date.now() };
    return list[index];
  }

  public delete<K extends CollectionName>(
    collectionName: K,
    id: string
  ): boolean {
    const list = this.getCollection(collectionName) as any[];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return false;

    list.splice(index, 1);
    return true;
  }

  public count<K extends CollectionName>(
    collectionName: K,
    predicate?: (item: any) => boolean
  ): number {
    const list = this.getCollection(collectionName) as any[];
    if (!predicate) return list.length;
    return list.filter(predicate).length;
  }

  public resetToSeed(): DataCollections {
    this.data = getInitialSeedData();
    return this.data;
  }
}

export const db = new JsonDatabase();
