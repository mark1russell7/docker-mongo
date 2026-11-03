/**
 * Database initialization utilities
 */

import type { InitConfig, InitResult } from "./types.js";
import { withConnection } from "./connect.js";
import { planInit } from "./plan.js";

/**
 * Initialize a MongoDB database with collections and indexes.
 *
 * @example
 * ```typescript
 * const result = await initDatabase({
 *   uri: 'mongodb://localhost:27017',
 *   dbName: 'myapp',
 *   collections: [
 *     { name: 'users', indexes: [{ keys: { email: 1 }, options: { unique: true } }] },
 *     { name: 'posts' },
 *   ]
 * });
 * console.log(`Created: ${result.created.join(', ')}`);
 * ```
 */
export async function initDatabase(config: InitConfig): Promise<InitResult> {
  return withConnection(config, async (db) => {
    // Get existing collections
    const existingCollections = await db.listCollections().toArray();
    const plan = planInit(
      config.collections,
      existingCollections.map((c) => c.name)
    );

    // Do the steps of the plan, in sequence: each collection, then its indexes
    let indexesCreated = 0;
    for (const step of plan.steps) {
      if (step.op === "createCollection") {
        await db.createCollection(step.collection);
      } else {
        await db
          .collection(step.collection)
          .createIndex(step.index.keys, step.index.options);
        indexesCreated++;
      }
    }

    return {
      created: [...plan.created],
      existing: [...plan.existing],
      indexesCreated,
    };
  });
}

/**
 * Initialize database with console logging for CLI usage.
 */
export async function initDatabaseWithLogging(
  config: InitConfig
): Promise<InitResult> {
  console.log(`Connecting to MongoDB...`);

  const result = await initDatabase(config);

  console.log(`✓ Connected to database: ${config.dbName}`);

  if (result.existing.length > 0) {
    console.log(`  Existing collections: ${result.existing.join(", ")}`);
  }

  if (result.created.length > 0) {
    console.log(`  Created collections: ${result.created.join(", ")}`);
  }

  if (result.indexesCreated > 0) {
    console.log(`  Created ${result.indexesCreated} index(es)`);
  }

  console.log(`✓ Database initialization complete`);

  return result;
}
