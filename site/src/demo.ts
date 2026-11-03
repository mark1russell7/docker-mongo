// The data of the page and its small helpers, with no DOM. The settings, the URI, the Compose file and the plans come
// from the package (`@mark1russell7/docker-mongo/pure`). This file only parses the text of the inputs and formats it.
import { MONGO_ENV_VARS, type CollectionConfig, type MongoEnv, type MongoSettingKey } from "@mark1russell7/docker-mongo/pure";

/** One input of the settings form. */
export interface Field {
  readonly key: MongoSettingKey;
  readonly label: string;
  readonly placeholder: string;
  readonly hint: string;
}

/** The inputs of the form, in the sequence of `MONGO_ENV_VARS`. */
export const FIELDS: readonly Field[] = [
  { key: "host", label: "Host", placeholder: "localhost", hint: "The host of the connection string." },
  { key: "port", label: "Port", placeholder: "27017", hint: "The port on the host. The container listens on 27017." },
  { key: "dbName", label: "Database", placeholder: "app", hint: "The database of the connection and of the container." },
  { key: "user", label: "User", placeholder: "no user", hint: "The user of the connection, and the root user of the container." },
  { key: "password", label: "Password", placeholder: "no password", hint: "Type a placeholder only. Do not type a real secret here." },
  { key: "authSource", label: "Auth source", placeholder: "admin with a user", hint: "The database that has the user." },
  { key: "replicaSet", label: "Replica set", placeholder: "no replica set", hint: "The name of the replica set, for example rs0." },
  { key: "containerName", label: "Container name", placeholder: "mongo-db", hint: "The name of the Docker container." },
];

/** A set of example settings. */
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly env: MongoEnv;
}

/** The example settings. The password is an obvious placeholder. */
export const PRESETS: readonly Preset[] = [
  { id: "defaults", label: "Defaults", env: {} },
  { id: "port", label: "Other port", env: { MONGO_PORT: "27018", MONGO_DB_NAME: "shop", MONGO_CONTAINER_NAME: "shop-db" } },
  { id: "auth", label: "With a user", env: { MONGO_DB_NAME: "shop", MONGO_USER: "app", MONGO_PASSWORD: "change-me" } },
  { id: "replica", label: "Replica set", env: { MONGO_REPLICA_SET: "rs0" } },
  { id: "bad", label: "Bad values", env: { MONGO_PORT: "70000", MONGO_DB_NAME: "my.db" } },
];

/** The variables that the shipped `docker-compose.yml` reads. */
export const COMPOSE_VARS: readonly string[] = [MONGO_ENV_VARS.containerName, MONGO_ENV_VARS.port, MONGO_ENV_VARS.dbName];

/** This function gives the lines of a `.env` file: each variable that has a value, in the sequence of the form. */
export function envFile(env: MongoEnv): string {
  const lines = FIELDS.map((field) => MONGO_ENV_VARS[field.key])
    .filter((name) => (env[name] ?? "") !== "")
    .map((name) => `${name}=${env[name] ?? ""}`);
  return lines.length === 0 ? "# No variables: each setting has its default.\n" : `${lines.join("\n")}\n`;
}

/** This function gives the command that starts the shipped Compose file with the variables that it reads. */
export function upCommand(env: MongoEnv): string {
  const vars = COMPOSE_VARS.filter((name) => (env[name] ?? "") !== "").map((name) => `${name}=${shellWord(env[name] ?? "")}`);
  return [...vars, "docker compose up -d"].join(" ");
}

/** This function quotes a word for a POSIX shell when it has a character other than letters, digits and `._-`. */
export function shellWord(word: string): string {
  return /^[A-Za-z0-9._-]+$/.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`;
}

/** This function gives the line numbers (from 0) of `text` that `base` does not have. */
export function changedLines(text: string, base: string): ReadonlySet<number> {
  const known = new Set(base.split("\n"));
  const changed = new Set<number>();
  text.split("\n").forEach((line, index) => {
    if (!known.has(line)) changed.add(index);
  });
  return changed;
}

/** A parse result: a value, or the message of the error. */
export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(text: string): Parsed<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, error: `This is not JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** This function parses the collections of `initDatabase` from JSON: a list of `{ name, indexes? }`. */
export function parseCollections(text: string): Parsed<CollectionConfig[]> {
  const parsed = json(text);
  if (!parsed.ok) return parsed;
  if (!Array.isArray(parsed.value)) return { ok: false, error: "The collections must be a JSON list." };
  const out: CollectionConfig[] = [];
  for (const [i, item] of parsed.value.entries()) {
    if (!isRecord(item) || typeof item["name"] !== "string" || item["name"] === "") return { ok: false, error: `Item ${i + 1} must have a "name" text.` };
    const indexes = item["indexes"];
    if (indexes === undefined) {
      out.push({ name: item["name"] });
      continue;
    }
    if (!Array.isArray(indexes) || !indexes.every((index) => isRecord(index) && isRecord(index["keys"]) && (index["options"] === undefined || isRecord(index["options"])))) {
      return { ok: false, error: `The "indexes" of item ${i + 1} must be a list of { "keys": {...}, "options"?: {...} }.` };
    }
    out.push({ name: item["name"], indexes: indexes as NonNullable<CollectionConfig["indexes"]> });
  }
  return { ok: true, value: out };
}

/** This function parses the data of `seedDatabase` from JSON: an object from each collection name to a list of documents. */
export function parseSeed(text: string): Parsed<Record<string, object[]>> {
  const parsed = json(text);
  if (!parsed.ok) return parsed;
  if (!isRecord(parsed.value)) return { ok: false, error: "The data must be a JSON object: a collection name to a list of documents." };
  for (const [name, docs] of Object.entries(parsed.value)) {
    if (!Array.isArray(docs) || !docs.every(isRecord)) return { ok: false, error: `The value of "${name}" must be a list of objects.` };
  }
  return { ok: true, value: parsed.value as Record<string, object[]> };
}

/** This function splits a list of names at the commas and the spaces. */
export function parseNames(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/** The first collections of the dry run. */
export const SAMPLE_COLLECTIONS: string = `[
  { "name": "users", "indexes": [
    { "keys": { "email": 1 }, "options": { "unique": true } },
    { "keys": { "createdAt": -1 } }
  ] },
  { "name": "posts", "indexes": [{ "keys": { "userId": 1, "createdAt": -1 } }] },
  { "name": "sessions" }
]`;

/** The first data of the dry run. */
export const SAMPLE_SEED: string = `{
  "users": [
    { "name": "Ada", "email": "ada@example.com" },
    { "name": "Alan", "email": "alan@example.com" }
  ],
  "posts": [{ "title": "Hello", "userId": 1 }],
  "sessions": []
}`;
