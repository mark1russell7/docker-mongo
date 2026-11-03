import { resolveMongoConfig } from "@mark1russell7/docker-mongo/pure";
import { describe, expect, it } from "vitest";
import { API, result } from "./api.ts";
import { changedLines, envFile, parseCollections, parseNames, parseSeed, PRESETS, SAMPLE_COLLECTIONS, SAMPLE_SEED, shellWord, upCommand } from "./demo.ts";

describe("the presets", () => {
  it("give no problem, except the preset of bad values", () => {
    for (const preset of PRESETS) {
      const { problems } = resolveMongoConfig(preset.env);
      expect(problems.length > 0, preset.id).toBe(preset.id === "bad");
    }
  });

  it("use only an obvious placeholder as a password", () => {
    const passwords = PRESETS.map((preset) => preset.env["MONGO_PASSWORD"]).filter((p) => p !== undefined);
    expect(passwords).toEqual(["change-me"]);
  });
});

describe("the files", () => {
  it("writes a .env file with the set variables only", () => {
    expect(envFile({ MONGO_PORT: "27018", MONGO_HOST: "" })).toBe("MONGO_PORT=27018\n");
    expect(envFile({})).toMatch(/^# No variables/);
  });

  it("starts Compose with only the variables that the shipped file reads", () => {
    expect(upCommand({ MONGO_PORT: "27018", MONGO_USER: "app" })).toBe("MONGO_PORT=27018 docker compose up -d");
    expect(upCommand({})).toBe("docker compose up -d");
    expect(shellWord("it's")).toBe(`'it'\\''s'`);
  });

  it("finds the changed lines", () => {
    expect([...changedLines("a\nb\nc", "a\nc")]).toEqual([1]);
  });
});

describe("the inputs of the dry run", () => {
  it("parses the samples", () => {
    expect(parseCollections(SAMPLE_COLLECTIONS)).toMatchObject({ ok: true });
    expect(parseSeed(SAMPLE_SEED)).toMatchObject({ ok: true });
  });

  it("explains a bad input", () => {
    expect(parseCollections("{")).toMatchObject({ ok: false });
    expect(parseCollections('[{ "indexes": [] }]')).toEqual({ ok: false, error: 'Item 1 must have a "name" text.' });
    expect(parseCollections('[{ "name": "a", "indexes": [{}] }]')).toMatchObject({ ok: false });
    expect(parseSeed('{ "users": [1] }')).toEqual({ ok: false, error: 'The value of "users" must be a list of objects.' });
    expect(parseSeed("[]")).toMatchObject({ ok: false });
  });

  it("splits the names", () => {
    expect(parseNames(" users, posts  sessions,,")).toEqual(["users", "posts", "sessions"]);
  });
});

describe("the API table", () => {
  it("has a result for each example", () => {
    for (const row of API) for (const example of row.examples) expect(result(example), example.code).not.toMatch(/^throws/);
  });
});
