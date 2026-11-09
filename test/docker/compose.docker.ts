/**
 * The Docker test of `composeFile` and `connectionUri`. Each case writes the Compose file of its
 * settings, starts it, and writes and reads one document through the connection string of the
 * same settings. It needs Docker, so `pnpm test` does not start it: CI starts it (compose.yml),
 * and `pnpm test:docker` starts it on a computer with Docker.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { withConnection } from "../../src/connect.js";
import { composeFile, connectionConfig, resolveMongoConfig, type MongoEnv } from "../../src/pure.js";

/** A password for the containers of this test only. */
const PASSWORD = "docker-test-only";

interface Case {
  readonly name: string;
  readonly env: MongoEnv;
}

// A port other than 27017 for each case: the member of a replica set records 27017, the port in the container.
const CASES: readonly Case[] = [
  { name: "defaults", env: { MONGO_PORT: "27117" } },
  { name: "user", env: { MONGO_PORT: "27118", MONGO_USER: "app", MONGO_PASSWORD: PASSWORD } },
  { name: "replica-set", env: { MONGO_PORT: "27119", MONGO_REPLICA_SET: "rs0" } },
  { name: "user-replica-set", env: { MONGO_PORT: "27120", MONGO_USER: "app", MONGO_PASSWORD: PASSWORD, MONGO_REPLICA_SET: "rs0" } },
];

const started: { project: string; file: string; dir: string; env: NodeJS.ProcessEnv }[] = [];

function compose(project: string, file: string, env: NodeJS.ProcessEnv, ...args: string[]): void {
  execFileSync("docker", ["compose", "-p", project, "-f", file, ...args], { env, stdio: "inherit", timeout: 240_000 });
}

/** This function starts `rs.initiate()` with no configuration, as the README tells, and waits for a primary. */
async function initiate(container: string, user: string | undefined): Promise<void> {
  const auth = user === undefined ? [] : ["-u", user, "-p", PASSWORD, "--authenticationDatabase", "admin"];
  const script = "try { rs.status() } catch (e) { rs.initiate() } while (!db.hello().isWritablePrimary) sleep(200)";
  // The first healthy check can come from the temporary server of the image's first start. Try again until mongod runs with --replSet.
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync("docker", ["exec", container, "mongosh", "--quiet", ...auth, "--eval", script], { stdio: "inherit", timeout: 60_000 });
      return;
    } catch (error) {
      if (attempt >= 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

describe("the Compose file of the settings starts a server that the connection string reaches", () => {
  afterAll(() => {
    for (const { project, file, dir, env } of started) {
      compose(project, file, env, "down", "-v");
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const c of CASES) {
    it(c.name, async () => {
      const project = `dm-${c.name}`;
      const env = { ...process.env, ...c.env, MONGO_CONTAINER_NAME: project };
      const { settings, problems } = resolveMongoConfig(env);
      expect(problems).toEqual([]);

      const dir = mkdtempSync(join(tmpdir(), `${project}-`));
      const file = join(dir, "docker-compose.yml");
      writeFileSync(file, composeFile(settings));
      started.push({ project, file, dir, env });
      compose(project, file, env, "up", "-d", "--wait", "--wait-timeout", "180");
      if (settings.replicaSet !== undefined) await initiate(project, settings.user);

      const count = await withConnection(connectionConfig(settings), async (db) => {
        await db.collection("probe").insertOne({ case: c.name });
        return db.collection("probe").countDocuments({ case: c.name });
      });
      expect(count).toBe(1);
    });
  }
});
