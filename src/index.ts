/**
 * docker-mongo - Reusable MongoDB Docker setup with TypeScript utilities
 *
 * @example
 * ```typescript
 * import { initDatabase, seedDatabase, withConnection } from 'docker-mongo';
 *
 * // Initialize database with collections
 * await initDatabase({
 *   uri: process.env.MONGODB_URI,
 *   dbName: 'myapp',
 *   collections: [
 *     { name: 'users', indexes: [{ keys: { email: 1 }, options: { unique: true } }] },
 *     { name: 'posts' },
 *   ]
 * });
 *
 * // Seed with data
 * await seedDatabase({
 *   uri: process.env.MONGODB_URI,
 *   dbName: 'myapp',
 *   data: {
 *     users: [{ name: 'Alice', email: 'alice@example.com' }],
 *   }
 * });
 *
 * // Run arbitrary queries
 * const users = await withConnection({ uri, dbName }, async (db) => {
 *   return db.collection('users').find().toArray();
 * });
 * ```
 */

// Types
export type {
  CollectionConfig,
  ConnectionCallback,
  ConnectionConfig,
  IndexConfig,
  InitConfig,
  InitResult,
  SeedConfig,
  SeedResult,
} from "./types.js";

// Connection utilities
export { withConnection, createConnection } from "./connect.js";

// Database initialization
export { initDatabase, initDatabaseWithLogging } from "./init.js";

// Database seeding
export { seedDatabase, seedDatabaseWithLogging } from "./seed.js";

// Settings, connection string, Compose file and plans (also at the entry "./pure", with no driver)
export type {
  ConnectionUriOptions,
  InitPlan,
  InitStep,
  MongoEnv,
  MongoSettingKey,
  MongoSettings,
  ResolvedMongoConfig,
  ResolvedSetting,
  SeedPlan,
  SeedStep,
  SettingSource,
} from "./pure.js";
export {
  composeFile,
  connectionConfig,
  connectionUri,
  MONGO_DEFAULTS,
  MONGO_ENV_VARS,
  mongoshCommand,
  planInit,
  planSeed,
  resolveMongoConfig,
} from "./pure.js";
