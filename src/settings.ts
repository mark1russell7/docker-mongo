/**
 * The settings of the MongoDB container and of its connection, from environment variables.
 *
 * This module has no driver and no I/O, so a browser can also use it. The function
 * `resolveMongoConfig` reads the variables, `connectionUri` builds the connection string, and
 * `composeFile` writes the `docker-compose.yml` that the settings give.
 */

import type { ConnectionConfig } from "./types.js";

/** The name of each setting. */
export type MongoSettingKey = "host" | "port" | "dbName" | "user" | "password" | "authSource" | "replicaSet" | "containerName";

/** The settings of the container and of the connection, after the defaults apply. */
export interface MongoSettings {
  /** The host of the connection string. */
  readonly host: string;
  /** The port on the host. The container listens on 27017. */
  readonly port: number;
  /** The database of the connection, and the first database of the container. */
  readonly dbName: string;
  /** The user of the connection, and the root user of the container. */
  readonly user?: string;
  /** The password of the user. */
  readonly password?: string;
  /** The database that has the user. It applies only with a user. */
  readonly authSource?: string;
  /** The name of the replica set. */
  readonly replicaSet?: string;
  /** The name of the Docker container. */
  readonly containerName: string;
}

/** The environment variable of each setting. */
export const MONGO_ENV_VARS: Readonly<Record<MongoSettingKey, string>> = {
  host: "MONGO_HOST",
  port: "MONGO_PORT",
  dbName: "MONGO_DB_NAME",
  user: "MONGO_USER",
  password: "MONGO_PASSWORD",
  authSource: "MONGO_AUTH_SOURCE",
  replicaSet: "MONGO_REPLICA_SET",
  containerName: "MONGO_CONTAINER_NAME",
};

/** The defaults. The port, the database and the container name are the defaults of `docker-compose.yml`. */
export const MONGO_DEFAULTS: {
  readonly host: string;
  readonly port: number;
  readonly dbName: string;
  readonly authSource: string;
  readonly containerName: string;
} = {
  host: "localhost",
  port: 27017,
  dbName: "app",
  authSource: "admin",
  containerName: "mongo-db",
};

/**
 * The origin of a value: `env` is a variable, `default` is a default, `unset` has no value, and
 * `invalid` is a variable with a bad value, so the default applies.
 */
export type SettingSource = "env" | "default" | "unset" | "invalid";

/** One setting after the resolution. */
export interface ResolvedSetting {
  /** The name of the setting. */
  readonly key: MongoSettingKey;
  /** The name of its environment variable. */
  readonly variable: string;
  /** The value that applies, as text. It is undefined when the setting has no value. */
  readonly value: string | undefined;
  /** The origin of the value. */
  readonly source: SettingSource;
  /** The problem of the value, if it has one. */
  readonly problem?: string;
}

/** The result of `resolveMongoConfig`. */
export interface ResolvedMongoConfig {
  /** The settings that apply. */
  readonly settings: MongoSettings;
  /** Each setting, with its value and its origin, in the sequence of `MONGO_ENV_VARS`. */
  readonly entries: readonly ResolvedSetting[];
  /** The problems of the variables. An empty list shows that each value is correct. */
  readonly problems: readonly string[];
}

/** The environment variables, for example `process.env`. */
export type MongoEnv = Readonly<Record<string, string | undefined>>;

const KEYS: readonly MongoSettingKey[] = ["host", "port", "dbName", "user", "password", "authSource", "replicaSet", "containerName"];

/** This function returns the problem of a value, or undefined when the value is correct. */
function problemOf(key: MongoSettingKey, value: string): string | undefined {
  const name = MONGO_ENV_VARS[key];
  switch (key) {
    case "host":
      return /^(?:[A-Za-z0-9._-]+|\[[0-9A-Fa-f:.]+\])$/.test(value) ? undefined : `${name} is not a host name or an IP address.`;
    case "port": {
      const port = /^\d{1,5}$/.test(value) ? Number(value) : Number.NaN;
      return port >= 1 && port <= 65535 ? undefined : `${name} is not a port from 1 to 65535.`;
    }
    case "dbName":
      if (value.length > 63) return `${name} has more than 63 characters.`;
      return /[/\\. "$*<>:|?]/.test(value) ? `${name} has a character that MongoDB refuses in a database name.` : undefined;
    case "containerName":
      return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value) ? undefined : `${name} is not a Docker container name.`;
    case "replicaSet":
      return /\s/.test(value) ? `${name} has a space.` : undefined;
    default:
      return undefined;
  }
}

/** The default of each setting, as text. A setting with no default is not in the map. */
const DEFAULT_TEXT: Partial<Record<MongoSettingKey, string>> = {
  host: MONGO_DEFAULTS.host,
  port: String(MONGO_DEFAULTS.port),
  dbName: MONGO_DEFAULTS.dbName,
  containerName: MONGO_DEFAULTS.containerName,
};

/**
 * This function reads the settings from environment variables. An empty variable is not set, as
 * in `${VAR:-default}` of Docker Compose. A bad value gives a problem, and the default applies.
 *
 * @example
 * ```typescript
 * const { settings, problems } = resolveMongoConfig(process.env);
 * if (problems.length > 0) throw new Error(problems.join("\n"));
 * await withConnection(connectionConfig(settings), async (db) => db.command({ ping: 1 }));
 * ```
 */
export function resolveMongoConfig(env: MongoEnv): ResolvedMongoConfig {
  const given = new Map<MongoSettingKey, string>();
  const problemOfKey = new Map<MongoSettingKey, string>();
  for (const key of KEYS) {
    const raw = env[MONGO_ENV_VARS[key]];
    if (raw === undefined || raw === "") continue;
    const problem = problemOf(key, raw);
    if (problem === undefined) given.set(key, raw);
    else problemOfKey.set(key, problem);
  }

  const user = given.get("user");
  const password = given.get("password");
  const problems = [...problemOfKey.values()];
  if (password !== undefined && user === undefined) {
    problems.push(`${MONGO_ENV_VARS.password} has no effect without ${MONGO_ENV_VARS.user}.`);
  }
  if (user !== undefined && password === undefined) {
    // The container makes its root user only with both, so the server has no such user.
    problems.push(`${MONGO_ENV_VARS.user} needs ${MONGO_ENV_VARS.password}: without it, the container makes no user.`);
  }

  // The default of authSource applies only with a user.
  const defaults: Partial<Record<MongoSettingKey, string>> = user === undefined ? DEFAULT_TEXT : { ...DEFAULT_TEXT, authSource: MONGO_DEFAULTS.authSource };
  const entries = KEYS.map((key): ResolvedSetting => {
    const variable = MONGO_ENV_VARS[key];
    const value = given.get(key);
    if (value !== undefined) return { key, variable, value, source: "env" };
    const problem = problemOfKey.get(key);
    const fallback = defaults[key];
    if (problem !== undefined) return { key, variable, value: fallback, source: "invalid", problem };
    return { key, variable, value: fallback, source: fallback === undefined ? "unset" : "default" };
  });

  const authSource = given.get("authSource") ?? defaults.authSource;
  const replicaSet = given.get("replicaSet");
  const settings: MongoSettings = {
    host: given.get("host") ?? MONGO_DEFAULTS.host,
    port: Number(given.get("port") ?? MONGO_DEFAULTS.port),
    dbName: given.get("dbName") ?? MONGO_DEFAULTS.dbName,
    containerName: given.get("containerName") ?? MONGO_DEFAULTS.containerName,
    ...(user === undefined ? {} : { user }),
    ...(user === undefined || password === undefined ? {} : { password }),
    ...(authSource === undefined ? {} : { authSource }),
    ...(replicaSet === undefined ? {} : { replicaSet }),
  };
  return { settings, entries, problems };
}

/** The options of `connectionUri`. */
export interface ConnectionUriOptions {
  /** When true, the password is `****`, for a log or a screen. The default is false. */
  readonly redact?: boolean;
}

/**
 * This function builds the MongoDB connection string of the settings. It encodes the user and the
 * password. The database is not in the string: `connectionConfig` gives it separately.
 *
 * With a replica set, the string has `directConnection=true`. The container is the one member of
 * the set, and the set records it by a host name of the container (`rs.initiate()` with no
 * configuration). That name and its port do not resolve from the host, so the driver must not
 * change to the hosts of the set.
 *
 * @example
 * ```typescript
 * connectionUri({ host: "localhost", port: 27018, dbName: "app", containerName: "mongo-db" });
 * // "mongodb://localhost:27018"
 * ```
 */
export function connectionUri(settings: MongoSettings, options: ConnectionUriOptions = {}): string {
  let auth = "";
  if (settings.user !== undefined) {
    const password = settings.password === undefined ? "" : `:${options.redact === true ? "****" : encodeURIComponent(settings.password)}`;
    auth = `${encodeURIComponent(settings.user)}${password}@`;
  }
  const params: string[] = [];
  if (settings.user !== undefined) params.push(`authSource=${encodeURIComponent(settings.authSource ?? MONGO_DEFAULTS.authSource)}`);
  if (settings.replicaSet !== undefined) params.push(`replicaSet=${encodeURIComponent(settings.replicaSet)}`, "directConnection=true");
  const query = params.length === 0 ? "" : `/?${params.join("&")}`;
  return `mongodb://${auth}${settings.host}:${settings.port}${query}`;
}

/** This function gives the `ConnectionConfig` of the settings, for `withConnection`, `initDatabase` and `seedDatabase`. */
export function connectionConfig(settings: MongoSettings): ConnectionConfig {
  return { uri: connectionUri(settings), dbName: settings.dbName };
}

/** This function writes a string as a YAML scalar: plain when that is safe, else in double quotes. */
function yaml(value: string): string {
  return /^[A-Za-z0-9_][A-Za-z0-9_.\/:=@-]*$/.test(value) ? value : JSON.stringify(value);
}

/** This function escapes `$` for Docker Compose, so that Compose does not read it as a variable. */
function literal(value: string): string {
  return value.replaceAll("$", "$$$$");
}

/** This function writes a string as one word of a POSIX shell, in single quotes. */
function shellWord(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** The key file of the members of a replica set with authorization. It is on the volume of the configuration, so a restart keeps it. */
const MONGO_KEY_FILE = "/data/configdb/keyfile";

/**
 * This function gives the entrypoint of a replica set with authorization. A root user turns on
 * authorization, and `mongod` then refuses `--replSet` without `--keyFile`. The entrypoint makes the
 * key file one time (756 random bytes in base64, as the MongoDB manual tells), gives it to the user
 * `mongodb` with mode 400, and then starts the entrypoint of the image.
 */
function keyFileEntrypoint(replicaSet: string): string[] {
  const script = [
    "set -e",
    `[ -f ${MONGO_KEY_FILE} ] || head -c 756 /dev/urandom | base64 > ${MONGO_KEY_FILE}`,
    `chmod 400 ${MONGO_KEY_FILE}`,
    `chown mongodb:mongodb ${MONGO_KEY_FILE}`,
    `exec docker-entrypoint.sh mongod --replSet ${shellWord(literal(replicaSet))} --keyFile ${MONGO_KEY_FILE}`,
  ].join("; ");
  return ["bash", "-c", script];
}

/**
 * This function writes the `docker-compose.yml` of the settings, with each value resolved. With the
 * defaults, it is the `docker-compose.yml` of this package.
 *
 * - The port is open only on `127.0.0.1` of the host.
 * - `GLIBC_TUNABLES=glibc.pthread.rseq=1` lets `mongod` 8.0 start on Linux 6.19 and newer (SERVER-121912).
 * - With a user and a password, the container makes a root user. The file does not hold the password:
 *   Compose reads `${MONGO_PASSWORD}` from the environment.
 * - With a replica set, `mongod` starts with `--replSet`. Start `rs.initiate()` one time after the first start.
 * - With a replica set and a user, the container also makes a key file, because `mongod` refuses a
 *   replica set with authorization and no key file. Start `rs.initiate()` as the user.
 */
export function composeFile(settings: MongoSettings): string {
  // mongod 8.0 refuses to start on Linux 6.19 to 7.0.13 (SERVER-121912). With rseq kept by glibc,
  // TCMalloc uses per-thread caches and mongod starts. Remove it when a mongo:8.0 image starts without it.
  const environment = [`MONGO_INITDB_DATABASE=${settings.dbName}`, "GLIBC_TUNABLES=glibc.pthread.rseq=1"];
  const auth = settings.user !== undefined && settings.password !== undefined;
  if (auth) {
    environment.push(`MONGO_INITDB_ROOT_USERNAME=${literal(settings.user)}`);
    environment.push(`MONGO_INITDB_ROOT_PASSWORD=\${${MONGO_ENV_VARS.password}}`);
  }
  const start: string[] = [];
  if (settings.replicaSet !== undefined) {
    if (auth) start.push(`    entrypoint: ${JSON.stringify(keyFileEntrypoint(settings.replicaSet))}`);
    else start.push(`    command: ["--replSet", ${JSON.stringify(literal(settings.replicaSet))}]`);
  }
  const lines = [
    "services:",
    "  mongodb:",
    "    image: mongo:8.0",
    `    container_name: ${settings.containerName}`,
    ...start,
    "    ports:",
    `      - "127.0.0.1:${settings.port}:27017"`,
    "    volumes:",
    "      - mongodb_data:/data/db",
    "      - mongodb_config:/data/configdb",
    "    environment:",
    ...environment.map((item) => `      - ${yaml(item)}`),
    "    healthcheck:",
    `      test: mongosh --eval "db.adminCommand('ping')"`,
    "      interval: 10s",
    "      timeout: 5s",
    "      retries: 5",
    "    restart: unless-stopped",
    "",
    "volumes:",
    "  mongodb_data:",
    "  mongodb_config:",
  ];
  return `${lines.join("\n")}\n`;
}
