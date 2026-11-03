/**
 * The functions of docker-mongo with no driver and no I/O: the settings from environment
 * variables, the connection string, the Compose file and the plans of init and seed.
 *
 * A browser bundle can import this entry, `@mark1russell7/docker-mongo/pure`. It does not import
 * `mongodb` or a `node:` module.
 */

export type { CollectionConfig, ConnectionConfig, IndexConfig } from "./types.js";
export type {
  ConnectionUriOptions,
  MongoEnv,
  MongoSettingKey,
  MongoSettings,
  ResolvedMongoConfig,
  ResolvedSetting,
  SettingSource,
} from "./settings.js";
export {
  composeFile,
  connectionConfig,
  connectionUri,
  MONGO_DEFAULTS,
  MONGO_ENV_VARS,
  resolveMongoConfig,
} from "./settings.js";

export type { InitPlan, InitStep, SeedPlan, SeedStep } from "./plan.js";
export { mongoshCommand, planInit, planSeed } from "./plan.js";
