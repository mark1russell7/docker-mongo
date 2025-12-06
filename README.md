# docker-mongo

Reusable MongoDB Docker setup with TypeScript utilities for database initialization and seeding.

## Installation

```bash
npm install github:mark1russell7/docker-mongo#main
```

## Quick Start

### 1. Copy docker-compose.yml to your project

Copy or symlink the `docker-compose.yml` from this package to your project's db folder.

### 2. Configure environment variables

Create a `.env` file:

```env
MONGO_CONTAINER_NAME=myapp-db
MONGO_DB_NAME=myapp
MONGO_PORT=27017
MONGODB_URI=mongodb://localhost:27017
```

### 3. Start MongoDB

```bash
docker compose up -d
```

### 4. Initialize and seed

```typescript
import { initDatabaseWithLogging, seedDatabaseWithLogging } from 'docker-mongo';

// Initialize collections
await initDatabaseWithLogging({
  uri: process.env.MONGODB_URI!,
  dbName: process.env.MONGO_DB_NAME!,
  collections: [
    { name: 'users', indexes: [{ keys: { email: 1 }, options: { unique: true } }] },
    { name: 'posts' },
  ]
});

// Seed data
await seedDatabaseWithLogging({
  uri: process.env.MONGODB_URI!,
  dbName: process.env.MONGO_DB_NAME!,
  data: {
    users: [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ]
  }
});
```

## API

### `initDatabase(config: InitConfig): Promise<InitResult>`

Initialize database with collections and indexes.

### `seedDatabase(config: SeedConfig): Promise<SeedResult>`

Seed database with data. Clears existing data by default.

### `withConnection<T>(config, callback): Promise<T>`

Execute a callback with a managed MongoDB connection.

```typescript
const users = await withConnection(
  { uri: 'mongodb://localhost:27017', dbName: 'myapp' },
  async (db) => db.collection('users').find().toArray()
);
```

### `createConnection(config): Promise<{ client, db }>`

Create a manually-managed connection. Caller must call `client.close()`.

## Types

```typescript
interface InitConfig {
  uri: string;
  dbName: string;
  collections: CollectionConfig[];
}

interface SeedConfig {
  uri: string;
  dbName: string;
  data: Record<string, object[]>;
  clearFirst?: boolean;  // default: true
}

interface CollectionConfig {
  name: string;
  indexes?: IndexConfig[];
}
```

## Docker Compose Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_CONTAINER_NAME` | `mongo-db` | Docker container name |
| `MONGO_PORT` | `27017` | Host port to expose |
| `MONGO_DB_NAME` | `app` | Initial database name |

## License

MIT
