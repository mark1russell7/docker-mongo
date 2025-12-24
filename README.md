# @mark1russell7/docker-mongo

[![npm version](https://img.shields.io/npm/v/@mark1russell7/docker-mongo.svg)](https://www.npmjs.com/package/@mark1russell7/docker-mongo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)

> Reusable MongoDB Docker setup with TypeScript utilities for initialization, seeding, and connection management.

## Overview

`@mark1russell7/docker-mongo` provides a complete MongoDB development environment with:

- **Production-ready Docker Compose configuration** - MongoDB 8.0 with health checks, persistent volumes, and environment-based configuration
- **TypeScript utilities** - Type-safe connection management, database initialization, and seeding operations
- **Zero configuration** - Works out of the box with sensible defaults
- **Developer-friendly** - Clean API with both programmatic and CLI-friendly variants

## Table of Contents

- [Architecture](#architecture)
- [Installation](#installation)
- [Docker Setup](#docker-setup)
- [TypeScript API](#typescript-api)
- [Configuration](#configuration)
- [Integration](#integration)
- [Examples](#examples)
- [API Reference](#api-reference)

## Architecture

```mermaid
graph TB
    subgraph "Docker Environment"
        A[MongoDB Container<br/>mongo:8.0]
        B[(Volume: mongodb_data<br/>/data/db)]
        C[(Volume: mongodb_config<br/>/data/configdb)]

        A --> B
        A --> C
    end

    subgraph "TypeScript Application"
        D[Your Application]
        E[docker-mongo Library]
        F[Connection Pool]

        D --> E
        E --> F
    end

    F -->|Port 27017| A

    subgraph "Core Functions"
        G[withConnection<br/>Auto-cleanup]
        H[initDatabase<br/>Schema Setup]
        I[seedDatabase<br/>Test Data]

        E --> G
        E --> H
        E --> I
    end

    style A fill:#00684a,color:#fff
    style D fill:#3178c6,color:#fff
    style E fill:#3178c6,color:#fff
```

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MongoDB Container (mongo:8.0)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  MongoDB Server                                       │  │
│  │  - Port: 27017                                        │  │
│  │  - Database: ${MONGO_DB_NAME}                         │  │
│  │  - Health Check: mongosh ping (10s interval)         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Volumes:                                                   │
│  ┌─────────────────┐    ┌──────────────────┐              │
│  │ mongodb_data    │    │ mongodb_config   │              │
│  │ /data/db        │    │ /data/configdb   │              │
│  │ (Database files)│    │ (Config files)   │              │
│  └─────────────────┘    └──────────────────┘              │
└─────────────────────────────────────────────────────────────┘
         ↑
         │ Port 27017
         │
┌────────┴────────────────────────────────────────────────────┐
│  TypeScript Application                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Connection Manager                                  │   │
│  │  - Auto-connect/disconnect                           │   │
│  │  - Connection pooling (MongoClient)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Operations:                                                │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐         │
│  │ Initialize │  │    Seed    │  │   Query      │         │
│  │ Collections│  │    Data    │  │   Execute    │         │
│  │  & Indexes │  │            │  │              │         │
│  └────────────┘  └────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant Lib as docker-mongo
    participant Client as MongoClient
    participant Container as MongoDB Container
    participant Volume as Persistent Volume

    App->>Lib: initDatabase(config)
    Lib->>Client: new MongoClient(uri)
    Client->>Container: Connect
    Container-->>Client: Connected

    Lib->>Container: listCollections()
    Container-->>Lib: Existing collections

    loop For each collection
        Lib->>Container: createCollection()
        Lib->>Container: createIndex()
    end

    Container->>Volume: Persist data

    Client->>Container: Close connection
    Lib-->>App: InitResult
```

## Installation

```bash
npm install @mark1russell7/docker-mongo
```

### Requirements

- **Node.js**: >= 20
- **Docker**: For running MongoDB container
- **Docker Compose**: For orchestration

## Docker Setup

### Quick Start

```bash
# Start MongoDB container
docker compose up -d

# View logs
docker compose logs -f mongodb

# Stop container
docker compose down

# Stop and remove volumes (CAUTION: deletes all data)
docker compose down -v
```

### Environment Variables

Configure the MongoDB container using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_CONTAINER_NAME` | `mongo-db` | Name of the Docker container |
| `MONGO_PORT` | `27017` | Host port to expose MongoDB on |
| `MONGO_DB_NAME` | `app` | Initial database name |

#### Example: Custom Configuration

Create a `.env` file:

```env
MONGO_CONTAINER_NAME=myapp-mongo
MONGO_PORT=27018
MONGO_DB_NAME=myapp_dev
```

Then run:

```bash
docker compose up -d
```

### Container Features

- **Auto-restart**: Container restarts unless explicitly stopped
- **Health checks**: Monitors MongoDB availability every 10s
- **Persistent storage**: Data survives container restarts
- **Isolated networking**: Uses Docker's default bridge network

### Volume Management

The setup creates two named volumes:

1. **mongodb_data**: Database files (`/data/db`)
2. **mongodb_config**: Configuration files (`/data/configdb`)

```bash
# List volumes
docker volume ls | grep mongo

# Inspect volume
docker volume inspect docker-mongo_mongodb_data

# Backup volume
docker run --rm -v docker-mongo_mongodb_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mongo-backup.tar.gz /data

# Restore volume
docker run --rm -v docker-mongo_mongodb_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/mongo-backup.tar.gz -C /
```

## TypeScript API

### Connection Management

#### `withConnection<T>(config, callback): Promise<T>`

Execute a callback with an auto-managed MongoDB connection. The connection is automatically opened and closed.

```typescript
import { withConnection } from '@mark1russell7/docker-mongo';

const users = await withConnection(
  { uri: 'mongodb://localhost:27017', dbName: 'myapp' },
  async (db) => {
    return await db.collection('users').find().toArray();
  }
);
```

**Parameters:**
- `config.uri`: MongoDB connection string
- `config.dbName`: Database name
- `callback`: Async function receiving `Db` instance

**Returns:** Result of the callback function

---

#### `createConnection(config): Promise<{client, db}>`

Create a manually-managed connection. Caller must close the client.

```typescript
import { createConnection } from '@mark1russell7/docker-mongo';

const { client, db } = await createConnection({
  uri: 'mongodb://localhost:27017',
  dbName: 'myapp'
});

try {
  await db.collection('users').insertOne({ name: 'Alice' });
} finally {
  await client.close();
}
```

### Database Initialization

#### `initDatabase(config): Promise<InitResult>`

Initialize database with collections and indexes.

```typescript
import { initDatabase } from '@mark1russell7/docker-mongo';

const result = await initDatabase({
  uri: 'mongodb://localhost:27017',
  dbName: 'myapp',
  collections: [
    {
      name: 'users',
      indexes: [
        { keys: { email: 1 }, options: { unique: true } },
        { keys: { createdAt: -1 } }
      ]
    },
    {
      name: 'posts',
      indexes: [
        { keys: { userId: 1, createdAt: -1 } }
      ]
    },
    { name: 'sessions' } // No indexes
  ]
});

console.log(`Created: ${result.created.join(', ')}`);
console.log(`Already existed: ${result.existing.join(', ')}`);
console.log(`Indexes created: ${result.indexesCreated}`);
```

**Configuration:**
- `uri`: MongoDB connection string
- `dbName`: Database name
- `collections`: Array of collection configurations
  - `name`: Collection name
  - `indexes?`: Optional array of index specifications

**Returns:**
```typescript
{
  created: string[];        // Collections created
  existing: string[];       // Collections that already existed
  indexesCreated: number;   // Total indexes created
}
```

---

#### `initDatabaseWithLogging(config): Promise<InitResult>`

Same as `initDatabase` but with console output for CLI usage.

```typescript
import { initDatabaseWithLogging } from '@mark1russell7/docker-mongo';

await initDatabaseWithLogging({
  uri: process.env.MONGODB_URI!,
  dbName: 'myapp',
  collections: [/* ... */]
});

// Output:
// Connecting to MongoDB...
// ✓ Connected to database: myapp
//   Created collections: users, posts
//   Existing collections: sessions
//   Created 3 index(es)
// ✓ Database initialization complete
```

### Database Seeding

#### `seedDatabase(config): Promise<SeedResult>`

Seed database with test or initial data.

```typescript
import { seedDatabase } from '@mark1russell7/docker-mongo';

const result = await seedDatabase({
  uri: 'mongodb://localhost:27017',
  dbName: 'myapp',
  data: {
    users: [
      { name: 'Alice', email: 'alice@example.com', age: 30 },
      { name: 'Bob', email: 'bob@example.com', age: 25 }
    ],
    posts: [
      { title: 'Hello World', authorId: 1, content: '...' }
    ]
  },
  clearFirst: true  // Default: true
});

console.log(result.inserted);  // { users: 2, posts: 1 }
console.log(result.cleared);   // ['users', 'posts']
```

**Configuration:**
- `uri`: MongoDB connection string
- `dbName`: Database name
- `data`: Object mapping collection names to document arrays
- `clearFirst?`: Whether to clear existing data (default: `true`)

**Returns:**
```typescript
{
  inserted: Record<string, number>;  // Documents inserted per collection
  cleared: string[];                 // Collections that were cleared
}
```

---

#### `seedDatabaseWithLogging(config): Promise<SeedResult>`

Same as `seedDatabase` but with console output.

```typescript
import { seedDatabaseWithLogging } from '@mark1russell7/docker-mongo';

await seedDatabaseWithLogging({
  uri: process.env.MONGODB_URI!,
  dbName: 'myapp',
  data: { /* ... */ }
});

// Output:
// Connecting to MongoDB...
// ✓ Connected to database: myapp
//   Cleared collections: users, posts
//   Inserted 2 document(s) into users
//   Inserted 1 document(s) into posts
// ✓ Database seeding complete
```

## Configuration

### Connection Strings

The library uses MongoDB's standard connection string format:

```typescript
// Local development
const uri = 'mongodb://localhost:27017';

// With authentication
const uri = 'mongodb://user:password@localhost:27017?authSource=admin';

// Replica set
const uri = 'mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0';

// MongoDB Atlas
const uri = 'mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority';
```

### Common Patterns

#### Development Setup Script

```typescript
import { initDatabase, seedDatabase } from '@mark1russell7/docker-mongo';

async function setupDevEnvironment() {
  const config = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGO_DB_NAME || 'app'
  };

  // Initialize schema
  await initDatabase({
    ...config,
    collections: [
      {
        name: 'users',
        indexes: [
          { keys: { email: 1 }, options: { unique: true } }
        ]
      },
      { name: 'posts' },
      { name: 'comments' }
    ]
  });

  // Seed with test data
  await seedDatabase({
    ...config,
    data: {
      users: [
        { name: 'Test User', email: 'test@example.com' }
      ]
    }
  });

  console.log('Development environment ready!');
}

setupDevEnvironment().catch(console.error);
```

#### Integration Testing

```typescript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { initDatabase, seedDatabase, withConnection } from '@mark1russell7/docker-mongo';

describe('User API', () => {
  const config = {
    uri: 'mongodb://localhost:27017',
    dbName: 'test_db'
  };

  before(async () => {
    await initDatabase({
      ...config,
      collections: [{ name: 'users' }]
    });
  });

  it('should create user', async () => {
    const user = await withConnection(config, async (db) => {
      const result = await db.collection('users').insertOne({
        name: 'Alice',
        email: 'alice@example.com'
      });
      return db.collection('users').findOne({ _id: result.insertedId });
    });

    assert.strictEqual(user?.name, 'Alice');
  });
});
```

#### Database Migration

```typescript
import { withConnection } from '@mark1russell7/docker-mongo';

async function migrate() {
  await withConnection(
    { uri: 'mongodb://localhost:27017', dbName: 'myapp' },
    async (db) => {
      // Add new field to existing documents
      await db.collection('users').updateMany(
        { role: { $exists: false } },
        { $set: { role: 'user' } }
      );

      // Create new index
      await db.collection('users').createIndex({ role: 1 });

      console.log('Migration complete!');
    }
  );
}

migrate().catch(console.error);
```

## Integration

### Environment Configuration

Create a `.env` file for your application:

```env
# MongoDB Docker container settings
MONGO_CONTAINER_NAME=myapp-mongo
MONGO_PORT=27017
MONGO_DB_NAME=myapp_dev

# Application connection string
MONGODB_URI=mongodb://localhost:27017
```

Load in your application:

```typescript
import 'dotenv/config';
import { initDatabase } from '@mark1russell7/docker-mongo';

const config = {
  uri: process.env.MONGODB_URI!,
  dbName: process.env.MONGO_DB_NAME!
};
```

### npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "db:up": "docker compose -f node_modules/@mark1russell7/docker-mongo/docker-compose.yml up -d",
    "db:down": "docker compose -f node_modules/@mark1russell7/docker-mongo/docker-compose.yml down",
    "db:logs": "docker compose -f node_modules/@mark1russell7/docker-mongo/docker-compose.yml logs -f",
    "db:init": "tsx scripts/init-db.ts",
    "db:seed": "tsx scripts/seed-db.ts"
  }
}
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:8.0
        env:
          MONGO_INITDB_DATABASE: test_db
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017
          MONGO_DB_NAME: test_db
```

### Ecosystem Integration

This package integrates with the broader Mark Russell ecosystem:

- **@mark1russell7/cue**: TypeScript configuration inheritance
- **client-mongo**: MCP client procedures for MongoDB operations
- **bundle-dev**: Development bundle including database tooling

## Examples

### Complete Application Setup

```typescript
import { initDatabaseWithLogging, seedDatabaseWithLogging } from '@mark1russell7/docker-mongo';

const config = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGO_DB_NAME || 'app'
};

// 1. Initialize schema
await initDatabaseWithLogging({
  ...config,
  collections: [
    {
      name: 'users',
      indexes: [
        { keys: { email: 1 }, options: { unique: true } },
        { keys: { username: 1 }, options: { unique: true } },
        { keys: { createdAt: -1 } }
      ]
    },
    {
      name: 'posts',
      indexes: [
        { keys: { authorId: 1, createdAt: -1 } },
        { keys: { slug: 1 }, options: { unique: true } }
      ]
    },
    {
      name: 'comments',
      indexes: [
        { keys: { postId: 1, createdAt: -1 } }
      ]
    }
  ]
});

// 2. Seed with initial data
await seedDatabaseWithLogging({
  ...config,
  data: {
    users: [
      {
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: new Date()
      }
    ]
  },
  clearFirst: true
});
```

### Advanced Queries

```typescript
import { withConnection } from '@mark1russell7/docker-mongo';

// Aggregation pipeline
const topAuthors = await withConnection(config, async (db) => {
  return db.collection('posts').aggregate([
    { $group: { _id: '$authorId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray();
});

// Transactions
await withConnection(config, async (db) => {
  const session = db.client.startSession();

  try {
    await session.withTransaction(async () => {
      await db.collection('users').updateOne(
        { _id: userId },
        { $inc: { postCount: 1 } },
        { session }
      );

      await db.collection('posts').insertOne(
        { authorId: userId, title: 'New Post', content: '...' },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
});
```

## API Reference

### Types

```typescript
interface ConnectionConfig {
  uri: string;      // MongoDB connection URI
  dbName: string;   // Database name
}

interface CollectionConfig {
  name: string;                    // Collection name
  indexes?: IndexConfig[];         // Optional indexes
}

interface IndexConfig {
  keys: IndexSpecification;        // Index keys (e.g., { email: 1 })
  options?: CreateIndexesOptions;  // Index options (e.g., { unique: true })
}

interface InitConfig {
  uri: string;
  dbName: string;
  collections: CollectionConfig[];
}

interface InitResult {
  created: string[];         // Collections created
  existing: string[];        // Collections that already existed
  indexesCreated: number;    // Total indexes created
}

interface SeedConfig {
  uri: string;
  dbName: string;
  data: Record<string, object[]>;  // Collection name -> documents
  clearFirst?: boolean;            // Default: true
}

interface SeedResult {
  inserted: Record<string, number>;  // Collection -> document count
  cleared: string[];                 // Collections cleared
}

type ConnectionCallback<T> = (db: Db) => Promise<T>;
```

### Functions

All functions are fully documented with JSDoc and include TypeScript type definitions. Import from the package root:

```typescript
import {
  // Connection
  withConnection,
  createConnection,

  // Initialization
  initDatabase,
  initDatabaseWithLogging,

  // Seeding
  seedDatabase,
  seedDatabaseWithLogging,

  // Types
  type ConnectionConfig,
  type InitConfig,
  type SeedConfig,
  // ... etc
} from '@mark1russell7/docker-mongo';
```

## License

MIT

## Contributing

Issues and pull requests are welcome at the package repository.

## Related Packages

- [@mark1russell7/docker-sqlite](../sqlite) - SQLite Docker setup with similar API
- [@mark1russell7/cue](https://github.com/mark1russell7/cue) - Shared TypeScript configuration
