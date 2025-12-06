/**
 * Database seeding utilities
 */
import type { SeedConfig, SeedResult } from "./types.js";
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
export declare function seedDatabase(config: SeedConfig): Promise<SeedResult>;
/**
 * Seed database with console logging for CLI usage.
 */
export declare function seedDatabaseWithLogging(config: SeedConfig): Promise<SeedResult>;
//# sourceMappingURL=seed.d.ts.map