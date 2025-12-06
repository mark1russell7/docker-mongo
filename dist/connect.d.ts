/**
 * Connection utilities for MongoDB
 */
import { MongoClient, type Db } from "mongodb";
import type { ConnectionConfig, ConnectionCallback } from "./types.js";
/**
 * Execute a callback with a MongoDB connection, ensuring proper cleanup.
 *
 * @example
 * ```typescript
 * const result = await withConnection(
 *   { uri: 'mongodb://localhost:27017', dbName: 'mydb' },
 *   async (db) => {
 *     return await db.collection('users').find().toArray();
 *   }
 * );
 * ```
 */
export declare function withConnection<T>(config: ConnectionConfig, fn: ConnectionCallback<T>): Promise<T>;
/**
 * Create a MongoDB client that can be manually managed.
 * Caller is responsible for calling client.close().
 *
 * @example
 * ```typescript
 * const { client, db } = await createConnection({
 *   uri: 'mongodb://localhost:27017',
 *   dbName: 'mydb'
 * });
 * try {
 *   // use db...
 * } finally {
 *   await client.close();
 * }
 * ```
 */
export declare function createConnection(config: ConnectionConfig): Promise<{
    client: MongoClient;
    db: Db;
}>;
//# sourceMappingURL=connect.d.ts.map