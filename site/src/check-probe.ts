/**
 * The probe of the settings and of the dry run. The site check of the Pages workflow starts it in a browser at each
 * width, before the deploy. A failed check stops the deploy.
 *
 * The site check reads this TypeScript file directly. It removes the types and the `export` line, and it starts the
 * result as the body of an async function.
 */

// The site check gives these helpers to the probe. Each element of this page is an HTML element.
declare const check: (name: string, ok: unknown, detail?: unknown) => boolean;
declare const until: <T>(fn: () => T | Promise<T>, ms?: number) => Promise<T>;
declare const $: (selector: string) => HTMLElement | null;
declare const $$: (selector: string) => HTMLElement[];
declare const type: (target: string | Element, text: string) => void;
declare const click: (target: string | Element) => void;

const uri = () => $("#uri")?.textContent ?? "";
const file = () => $("#file-code")?.textContent ?? "";
const source = (key: string) => $(`#resolved tr[data-key="${key}"]`)?.dataset["source"] ?? "";
const problems = () => $$("#problems li").length;

check("the defaults give mongodb://localhost:27017", await until(() => uri() === "mongodb://localhost:27017"), uri());
check("each setting comes from a default or is unset", $$("#resolved tr").every((tr) => tr.dataset["source"] === "default" || tr.dataset["source"] === "unset"), $$("#resolved tr").map((tr) => tr.dataset["source"]).join());
check("the Compose file shows the default port", file().includes('"127.0.0.1:27017:27017"'), file().slice(0, 200));

type("#f-port", "27018");
check("the port 27018 changes the connection string", await until(() => uri() === "mongodb://localhost:27018"), uri());
check("the port comes from MONGO_PORT", source("port") === "env", source("port"));
check("the Compose file follows the port", await until(() => file().includes('"127.0.0.1:27018:27017"')), file().slice(0, 200));
check("the changed line of the Compose file is marked", $$("#file-code .ln.changed").length === 1, `${$$("#file-code .ln.changed").length} marked`);

type("#f-port", "abc");
check("a bad port shows a problem", await until(() => problems() === 1), `${problems()} problems`);
check("a bad port keeps the default port", uri() === "mongodb://localhost:27017" && source("port") === "invalid", `${uri()} ${source("port")}`);

click('#presets [data-preset="auth"]');
check("the user preset hides the password", await until(() => uri() === "mongodb://app:****@localhost:27017/?authSource=admin"), uri());
check("the auth source comes from its default", source("authSource") === "default", source("authSource"));
click("#show-password");
check("the toggle shows the placeholder password", await until(() => uri().includes("app:change-me@")), uri());
check("the Compose file does not hold the password", !file().includes("change-me") && file().includes("${MONGO_PASSWORD}"), file());
click("#show-password");

click('#tabs [data-tab="env"]');
check("the .env tab lists the variables", await until(() => file().includes("MONGO_USER=app")), file());
click('#tabs [data-tab="compose"]');

click('#presets [data-preset="defaults"]');
check("the defaults preset gives the first string again", await until(() => uri() === "mongodb://localhost:27017"), uri());

const steps = () => $$("#plan li[data-op]");
const creates = () => steps().filter((li) => li.dataset["op"] === "createCollection").map((li) => li.dataset["collection"]);
check("the dry run shows the steps of init and seed", steps().length > 0 && creates().join() === "users,posts,sessions", creates().join());
type("#existing", "users");
check("an existing collection is not created", await until(() => creates().join() === "posts,sessions"), creates().join());
check("the init result names the existing collection", ($("#init-result")?.textContent ?? "").includes('"existing":["users"]'), $("#init-result")?.textContent);
const before = steps().length;
click("#clear-first");
check("clearFirst off removes the clear steps", await until(() => steps().every((li) => li.dataset["op"] !== "deleteMany") && steps().length < before), `${before} -> ${steps().length}`);

check(
  "the API table shows a live result for each pure function",
  $$("#api-rows tr").length === 10 && $$("#api-rows output").length >= 8 && $$("#api-rows output").every((o) => (o.textContent ?? "") !== "" && !(o.textContent ?? "").startsWith("throws")),
  `${$$("#api-rows tr").length} rows, ${$$("#api-rows output").length} outputs`,
);

export {};
