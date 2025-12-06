/**
 * Database initialization utilities
 */

import type { InitConfig, InitResult } from "./types.js";
import { withConnection } from "./connect.js";

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
    const result: InitResult = {
      created: [],
      existing: [],
      indexesCreated: 0,
    };

    // Get existing collections
    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(existingCollections.map((c) => c.name));

    // Create collections and indexes
    for (const collectionConfig of config.collections) {
      const { name, indexes } = collectionConfig;

      if (existingNames.has(name)) {
        result.existing.push(name);
      } else {
        await db.createCollection(name);
        result.created.push(name);
      }

      // Create indexes if specified
      if (indexes && indexes.length > 0) {
        const collection = db.collection(name);
        for (const indexConfig of indexes) {
          await collection.createIndex(indexConfig.keys, indexConfig.options);
          result.indexesCreated++;
        }
      }
    }

    return result;
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
