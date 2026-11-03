import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  composeFile,
  connectionConfig,
  connectionUri,
  MONGO_ENV_VARS,
  mongoshCommand,
  planInit,
  planSeed,
  resolveMongoConfig,
} from "../src/pure.js";

const shipped = readFileSync(new URL("../docker-compose.yml", import.meta.url), "utf8");

/** The shipped Compose file as `docker compose config` resolves it with no variables: no comments, each default applied. */
function resolvedShipped(): string {
  return `${shipped
    .replaceAll("\r\n", "\n")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")
    .replace(/\$\{[A-Z_]+:-([^}]*)\}/g, "$1")
    .trim()}\n`;
}

describe("resolveMongoConfig", () => {
  it("gives the defaults of docker-compose.yml for an empty environment", () => {
    const { settings, entries, problems } = resolveMongoConfig({});
    expect(settings).toEqual({ host: "localhost", port: 27017, dbName: "app", containerName: "mongo-db" });
    expect(problems).toEqual([]);
    expect(entries.map((e) => `${e.variable}=${e.value ?? ""}:${e.source}`)).toEqual([
      "MONGO_HOST=localhost:default",
      "MONGO_PORT=27017:default",
      "MONGO_DB_NAME=app:default",
      "MONGO_USER=:unset",
      "MONGO_PASSWORD=:unset",
      "MONGO_AUTH_SOURCE=:unset",
      "MONGO_REPLICA_SET=:unset",
      "MONGO_CONTAINER_NAME=mongo-db:default",
    ]);
  });

  it("names the variable of each value", () => {
    const { settings, entries } = resolveMongoConfig({ MONGO_PORT: "27018", MONGO_DB_NAME: "shop", MONGO_USER: "app" });
    expect(settings.port).toBe(27018);
    expect(settings.dbName).toBe("shop");
    expect(settings.authSource).toBe("admin");
    const source = Object.fromEntries(entries.map((e) => [e.key, e.source]));
    expect(source).toMatchObject({ port: "env", dbName: "env", user: "env", authSource: "default", host: "default" });
  });

  it("reads an empty variable as not set, as ${VAR:-default} of Compose does", () => {
    expect(resolveMongoConfig({ MONGO_PORT: "", MONGO_HOST: "" }).settings).toMatchObject({ port: 27017, host: "localhost" });
  });

  it("keeps the default and reports a problem for a bad value", () => {
    for (const [variable, value] of [
      [MONGO_ENV_VARS.port, "abc"],
      [MONGO_ENV_VARS.port, "70000"],
      [MONGO_ENV_VARS.port, "0"],
      [MONGO_ENV_VARS.host, "local host"],
      [MONGO_ENV_VARS.dbName, "my.db"],
      [MONGO_ENV_VARS.containerName, "-bad"],
      [MONGO_ENV_VARS.replicaSet, "rs 0"],
    ] as const) {
      const result = resolveMongoConfig({ [variable]: value });
      expect(result.problems, `${variable}=${value}`).toHaveLength(1);
      expect(result.entries.find((e) => e.variable === variable)?.source).toBe("invalid");
      expect(result.settings).toEqual(resolveMongoConfig({}).settings);
    }
  });

  it("reports a password with no user, and ignores it", () => {
    const result = resolveMongoConfig({ MONGO_PASSWORD: "change-me" });
    expect(result.problems).toEqual(["MONGO_PASSWORD has no effect without MONGO_USER."]);
    expect(result.settings.password).toBeUndefined();
  });
});

describe("connectionUri", () => {
  it("gives the URI of the README for the defaults", () => {
    expect(connectionUri(resolveMongoConfig({}).settings)).toBe("mongodb://localhost:27017");
  });

  it("encodes the user and the password, and adds authSource and replicaSet", () => {
    const { settings } = resolveMongoConfig({ MONGO_USER: "dev@team", MONGO_PASSWORD: "p@ss:w/rd", MONGO_REPLICA_SET: "rs0", MONGO_HOST: "db.local" });
    expect(connectionUri(settings)).toBe("mongodb://dev%40team:p%40ss%3Aw%2Frd@db.local:27017/?authSource=admin&replicaSet=rs0");
    expect(connectionUri(settings, { redact: true })).toBe("mongodb://dev%40team:****@db.local:27017/?authSource=admin&replicaSet=rs0");
  });

  it("changes when a setting changes", () => {
    const a = connectionUri(resolveMongoConfig({ MONGO_PORT: "27017" }).settings);
    const b = connectionUri(resolveMongoConfig({ MONGO_PORT: "27018" }).settings);
    expect(a).not.toBe(b);
    expect(b).toBe("mongodb://localhost:27018");
  });

  it("gives the ConnectionConfig of withConnection", () => {
    expect(connectionConfig(resolveMongoConfig({ MONGO_DB_NAME: "shop" }).settings)).toEqual({ uri: "mongodb://localhost:27017", dbName: "shop" });
  });
});

describe("composeFile", () => {
  it("is the shipped docker-compose.yml for the defaults", () => {
    expect(composeFile(resolveMongoConfig({}).settings)).toBe(resolvedShipped());
  });

  it("puts the settings in the file, but not the password", () => {
    const { settings } = resolveMongoConfig({ MONGO_PORT: "27018", MONGO_CONTAINER_NAME: "shop-db", MONGO_USER: "app", MONGO_PASSWORD: "change-me", MONGO_REPLICA_SET: "rs0" });
    const text = composeFile(settings);
    expect(text).toContain('- "127.0.0.1:27018:27017"');
    expect(text).toContain("container_name: shop-db");
    expect(text).toContain("- MONGO_INITDB_ROOT_USERNAME=app");
    expect(text).toContain('- "MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}"');
    expect(text).toContain('command: ["--replSet", "rs0"]');
    expect(text).not.toContain("change-me");
  });

  it("escapes a dollar sign of a value for Compose", () => {
    const { settings } = resolveMongoConfig({ MONGO_USER: "a$b", MONGO_PASSWORD: "x" });
    expect(composeFile(settings)).toContain('- "MONGO_INITDB_ROOT_USERNAME=a$$b"');
  });
});

describe("planInit", () => {
  it("creates each new collection, then its indexes, in sequence", () => {
    const plan = planInit(
      [{ name: "users", indexes: [{ keys: { email: 1 }, options: { unique: true } }] }, { name: "posts", indexes: [{ keys: { userId: 1 } }] }, { name: "sessions" }],
      ["posts"],
    );
    expect(plan.created).toEqual(["users", "sessions"]);
    expect(plan.existing).toEqual(["posts"]);
    expect(plan.indexes).toBe(2);
    expect(plan.steps.map(mongoshCommand)).toEqual([
      'db.createCollection("users")',
      'db.getCollection("users").createIndex({"email":1}, {"unique":true})',
      'db.getCollection("posts").createIndex({"userId":1})',
      'db.createCollection("sessions")',
    ]);
  });

  it("creates a collection that comes two times only one time", () => {
    const plan = planInit([{ name: "users" }, { name: "users" }], []);
    expect(plan.created).toEqual(["users"]);
    expect(plan.existing).toEqual(["users"]);
    expect(plan.steps).toHaveLength(1);
  });
});

describe("planSeed", () => {
  it("clears each collection before its insert, and skips an empty insert", () => {
    const plan = planSeed({ users: [{ name: "Ada" }, { name: "Alan" }], posts: [] });
    expect(plan.cleared).toEqual(["users", "posts"]);
    expect(plan.inserted).toEqual({ users: 2, posts: 0 });
    expect(plan.steps.map(mongoshCommand)).toEqual([
      'db.getCollection("users").deleteMany({})',
      'db.getCollection("users").insertMany([{"name":"Ada"},{"name":"Alan"}])',
      'db.getCollection("posts").deleteMany({})',
    ]);
  });

  it("does not clear with clearFirst false", () => {
    const plan = planSeed({ users: [{ name: "Ada" }] }, false);
    expect(plan.cleared).toEqual([]);
    expect(plan.steps.map((s) => s.op)).toEqual(["insertMany"]);
  });
});
