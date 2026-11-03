// The rows of the API table. Each pure function has a live example: the page calls the package and shows the result.
import {
  composeFile,
  connectionConfig,
  connectionUri,
  mongoshCommand,
  planInit,
  planSeed,
  resolveMongoConfig,
} from "@mark1russell7/docker-mongo/pure";

/** One example: the code, and the result of the code as text. */
export interface Example {
  readonly code: string;
  readonly run: () => string;
}

/** One row of the table. */
export interface ApiRow {
  readonly names: readonly string[];
  readonly what: string;
  readonly examples: readonly Example[];
  /** The text for a row with no example in the browser. */
  readonly note?: string;
}

const local = resolveMongoConfig({}).settings;
const user = resolveMongoConfig({ MONGO_USER: "app", MONGO_PASSWORD: "change-me" }).settings;

export const API: readonly ApiRow[] = [
  {
    names: ["resolveMongoConfig"],
    what: "Reads the settings from environment variables. It tells the origin of each value and each problem.",
    examples: [
      { code: 'resolveMongoConfig({ MONGO_PORT: "27018" }).settings.port', run: () => String(resolveMongoConfig({ MONGO_PORT: "27018" }).settings.port) },
      { code: 'resolveMongoConfig({ MONGO_PORT: "x" }).problems', run: () => JSON.stringify(resolveMongoConfig({ MONGO_PORT: "x" }).problems) },
    ],
  },
  {
    names: ["connectionUri"],
    what: "Builds the connection string of the settings. It encodes the user and the password.",
    examples: [
      { code: "connectionUri(settings)", run: () => connectionUri(local) },
      { code: "connectionUri(withUser, { redact: true })", run: () => connectionUri(user, { redact: true }) },
    ],
  },
  {
    names: ["connectionConfig"],
    what: "Gives the { uri, dbName } of withConnection, initDatabase and seedDatabase.",
    examples: [{ code: "connectionConfig(settings)", run: () => JSON.stringify(connectionConfig(local)) }],
  },
  {
    names: ["composeFile"],
    what: "Writes the docker-compose.yml of the settings. With the defaults, it is the file of the package.",
    examples: [{ code: "composeFile(settings).split(\"\\n\").length", run: () => `${composeFile(local).trimEnd().split("\n").length} lines` }],
  },
  {
    names: ["planInit"],
    what: "Gives the steps of initDatabase: each new collection, then its indexes.",
    examples: [{ code: 'planInit([{ name: "users" }], ["users"]).existing', run: () => JSON.stringify(planInit([{ name: "users" }], ["users"]).existing) }],
  },
  {
    names: ["planSeed"],
    what: "Gives the steps of seedDatabase: the clear of each collection, then its insert.",
    examples: [{ code: "planSeed({ users: [{}, {}] }).inserted", run: () => JSON.stringify(planSeed({ users: [{}, {}] }).inserted) }],
  },
  {
    names: ["mongoshCommand"],
    what: "Writes a step of a plan as a mongosh command, for a log or a review.",
    examples: [{ code: 'mongoshCommand({ op: "deleteMany", collection: "users" })', run: () => mongoshCommand({ op: "deleteMany", collection: "users" }) }],
  },
  {
    names: ["withConnection", "createConnection"],
    what: "Opens a connection with the driver. withConnection closes it after the callback.",
    examples: [],
    note: "This function needs a MongoDB server, so it does not run in the browser.",
  },
  {
    names: ["initDatabase", "initDatabaseWithLogging"],
    what: "Does the steps of planInit on the server, and gives an InitResult.",
    examples: [],
    note: "The dry run above shows its steps.",
  },
  {
    names: ["seedDatabase", "seedDatabaseWithLogging"],
    what: "Does the steps of planSeed on the server, and gives a SeedResult.",
    examples: [],
    note: "The dry run above shows its steps.",
  },
];

/** This function gives the result of an example, or the message of its error. */
export function result(example: Example): string {
  try {
    return example.run();
  } catch (error) {
    return `throws: ${error instanceof Error ? error.message : String(error)}`;
  }
}
