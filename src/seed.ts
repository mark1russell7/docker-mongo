/**
 * Database seeding utilities
 */

import type { SeedConfig, SeedResult } from "./types.js";
import { withConnection } from "./connect.js";

/**
 * Seed a MongoDB database with data.
 *
 * @example
 * ```typescript
 * const result = await seedDatabase({
 *   uri: 'mongodb://localhost:27017',
 *   dbName: 'myapp',
 *   data: {
 *     users: [
 *       { name: 'Alice', email: 'alice@example.com' },
 *       { name: 'Bob', email: 'bob@example.com' },
 *     ],
 *     posts: [
 *       { title: 'Hello World', author: 'Alice' },
 *     ]
 *   },
 *   clearFirst: true
 * });
 * console.log(`Inserted: ${JSON.stringify(result.inserted)}`);
 * ```
 */
export async function seedDatabase(config: SeedConfig): Promise<SeedResult> {
  const clearFirst = config.clearFirst ?? true;

  return withConnection(config, async (db) => {
    const result: SeedResult = {
      inserted: {},
      cleared: [],
    };

    for (const [collectionName, documents] of Object.entries(config.data)) {
      const collection = db.collection(collectionName);

      // Clear existing data if requested
      if (clearFirst) {
        await collection.deleteMany({});
        result.cleared.push(collectionName);
      }

      // Insert new data
      if (documents.length > 0) {
        const insertResult = await collection.insertMany(documents);
        result.inserted[collectionName] = insertResult.insertedCount;
      } else {
        result.inserted[collectionName] = 0;
      }
    }

    return result;
  });
}

/**
 * Seed database with console logging for CLI usage.
 */
export async function seedDatabaseWithLogging(
  config: SeedConfig
): Promise<SeedResult> {
  console.log(`Connecting to MongoDB...`);

  const result = await seedDatabase(config);

  console.log(`✓ Connected to database: ${config.dbName}`);

  if (result.cleared.length > 0) {
    console.log(`  Cleared collections: ${result.cleared.join(", ")}`);
  }

  for (const [collection, count] of Object.entries(result.inserted)) {
    console.log(`  Inserted ${count} document(s) into ${collection}`);
  }

  console.log(`✓ Database seeding complete`);

  return result;
}
