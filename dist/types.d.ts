/**
 * Type definitions for docker-mongo utilities
 */
import type { Db, IndexSpecification, CreateIndexesOptions } from "mongodb";
/**
 * Index configuration for a collection
 */
export interface IndexConfig {
    keys: IndexSpecification;
    options?: CreateIndexesOptions;
}
/**
 * Collection configuration for database initialization
 */
export interface CollectionConfig {
    /** Collection name */
    name: string;
    /** Optional indexes to create */
    indexes?: IndexConfig[];
}
/**
 * Configuration for database initialization
 */
export interface InitConfig {
    /** MongoDB connection URI */
    uri: string;
    /** Database name */
    dbName: string;
    /** Collections to create */
    collections: CollectionConfig[];
}
/**
 * Configuration for database seeding
 */
export interface SeedConfig {
    /** MongoDB connection URI */
    uri: string;
    /** Database name */
    dbName: string;
    /** Data to seed, keyed by collection name */
    data: Record<string, object[]>;
    /** Whether to clear existing data before seeding (default: true) */
    clearFirst?: boolean;
}
/**
 * Configuration for database connection
 */
export interface ConnectionConfig {
    /** MongoDB connection URI */
    uri: string;
    /** Database name */
    dbName: string;
}
/**
 * Result of database initialization
 */
export interface InitResult {
    /** Collections that were created */
    created: string[];
    /** Collections that already existed */
    existing: string[];
    /** Indexes that were created */
    indexesCreated: number;
}
/**
 * Result of database seeding
 */
export interface SeedResult {
    /** Number of documents inserted per collection */
    inserted: Record<string, number>;
    /** Collections that were cleared */
    cleared: string[];
}
/**
 * Callback function type for withConnection
 */
export type ConnectionCallback<T> = (db: Db) => Promise<T>;
//# sourceMappingURL=types.d.ts.map