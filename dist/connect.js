/**
 * Connection utilities for MongoDB
 */
import { MongoClient } from "mongodb";
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
export async function withConnection(config, fn) {
    const client = new MongoClient(config.uri);
    try {
        await client.connect();
        const db = client.db(config.dbName);
        return await fn(db);
    }
    finally {
        await client.close();
    }
}
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
export async function createConnection(config) {
    const client = new MongoClient(config.uri);
    await client.connect();
    const db = client.db(config.dbName);
    return { client, db };
}
//# sourceMappingURL=connect.js.map