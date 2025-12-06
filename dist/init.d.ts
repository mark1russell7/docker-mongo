/**
 * Database initialization utilities
 */
import type { InitConfig, InitResult } from "./types.js";
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
export declare function initDatabase(config: InitConfig): Promise<InitResult>;
/**
 * Initialize database with console logging for CLI usage.
 */
export declare function initDatabaseWithLogging(config: InitConfig): Promise<InitResult>;
//# sourceMappingURL=init.d.ts.map