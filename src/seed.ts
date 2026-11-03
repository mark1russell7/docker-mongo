/**
 * Database seeding utilities
 */

import type { SeedConfig, SeedResult } from "./types.js";
import { withConnection } from "./connect.js";
import { planSeed } from "./plan.js";

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
  const plan = planSeed(config.data, config.clearFirst ?? true);

  return withConnection(config, async (db) => {
    const result: SeedResult = {
      inserted: { ...plan.inserted },
      cleared: [...plan.cleared],
    };

    // Do the steps of the plan, in sequence: the clear of a collection, then its insert
    for (const step of plan.steps) {
      const collection = db.collection(step.collection);
      if (step.op === "deleteMany") {
        await collection.deleteMany({});
      } else {
        const insertResult = await collection.insertMany([...step.documents]);
        result.inserted[step.collection] = insertResult.insertedCount;
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
