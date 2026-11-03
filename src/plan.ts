/**
 * The plans of `initDatabase` and `seedDatabase`: the steps that each function does, in sequence.
 *
 * This module has no driver and no I/O. `initDatabase` and `seedDatabase` do the steps of these
 * plans, so a plan is also a dry run of them.
 */

import type { CollectionConfig, IndexConfig } from "./types.js";

/** One step of `initDatabase`. */
export type InitStep =
  | { readonly op: "createCollection"; readonly collection: string }
  | { readonly op: "createIndex"; readonly collection: string; readonly index: IndexConfig };

/** The plan of `initDatabase`. */
export interface InitPlan {
  /** The steps, in sequence. */
  readonly steps: readonly InitStep[];
  /** The collections that the plan creates. */
  readonly created: readonly string[];
  /** The collections that exist already. */
  readonly existing: readonly string[];
  /** The number of indexes that the plan creates. */
  readonly indexes: number;
}

/**
 * This function gives the steps of `initDatabase` for the collections. A collection that exists, or
 * that comes two times in the list, is not created again. Its indexes are created.
 *
 * @example
 * ```typescript
 * planInit([{ name: "users", indexes: [{ keys: { email: 1 } }] }, { name: "posts" }], ["posts"]);
 * // created: ["users"], existing: ["posts"], indexes: 1
 * ```
 */
export function planInit(collections: readonly CollectionConfig[], existing: Iterable<string>): InitPlan {
  const known = new Set(existing);
  const steps: InitStep[] = [];
  const created: string[] = [];
  const found: string[] = [];
  let indexes = 0;
  for (const { name, indexes: specs } of collections) {
    if (known.has(name)) {
      found.push(name);
    } else {
      known.add(name);
      created.push(name);
      steps.push({ op: "createCollection", collection: name });
    }
    for (const index of specs ?? []) {
      steps.push({ op: "createIndex", collection: name, index });
      indexes++;
    }
  }
  return { steps, created, existing: found, indexes };
}

/** One step of `seedDatabase`. */
export type SeedStep =
  | { readonly op: "deleteMany"; readonly collection: string }
  | { readonly op: "insertMany"; readonly collection: string; readonly documents: readonly object[] };

/** The plan of `seedDatabase`. */
export interface SeedPlan {
  /** The steps, in sequence. */
  readonly steps: readonly SeedStep[];
  /** The collections that the plan clears. */
  readonly cleared: readonly string[];
  /** The number of documents that the plan inserts into each collection. */
  readonly inserted: Readonly<Record<string, number>>;
}

/**
 * This function gives the steps of `seedDatabase` for the data. With `clearFirst` (the default), each
 * collection is cleared before its insert. A collection with no documents gets no insert.
 *
 * @example
 * ```typescript
 * planSeed({ users: [{ name: "Ada" }], posts: [] }, true);
 * // cleared: ["users", "posts"], inserted: { users: 1, posts: 0 }
 * ```
 */
export function planSeed(data: Readonly<Record<string, readonly object[]>>, clearFirst = true): SeedPlan {
  const steps: SeedStep[] = [];
  const cleared: string[] = [];
  const inserted: Record<string, number> = {};
  for (const [collection, documents] of Object.entries(data)) {
    if (clearFirst) {
      steps.push({ op: "deleteMany", collection });
      cleared.push(collection);
    }
    if (documents.length > 0) steps.push({ op: "insertMany", collection, documents });
    inserted[collection] = documents.length;
  }
  return { steps, cleared, inserted };
}

/**
 * This function writes a step as a `mongosh` command, for a log or a review. The keys, the options
 * and the documents are in JSON.
 *
 * @example
 * ```typescript
 * mongoshCommand({ op: "deleteMany", collection: "users" });
 * // 'db.getCollection("users").deleteMany({})'
 * ```
 */
export function mongoshCommand(step: InitStep | SeedStep): string {
  const collection = `db.getCollection(${JSON.stringify(step.collection)})`;
  switch (step.op) {
    case "createCollection":
      return `db.createCollection(${JSON.stringify(step.collection)})`;
    case "createIndex": {
      const options = step.index.options === undefined ? "" : `, ${JSON.stringify(step.index.options)}`;
      return `${collection}.createIndex(${JSON.stringify(step.index.keys)}${options})`;
    }
    case "deleteMany":
      return `${collection}.deleteMany({})`;
    case "insertMany":
      return `${collection}.insertMany(${JSON.stringify(step.documents)})`;
  }
}
