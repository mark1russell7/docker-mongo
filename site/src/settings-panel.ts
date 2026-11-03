// The core of the page: the form of the variables, and the connection string, the resolved config and the files that they give.
import { byId, copyText, h } from "@mark1russell7/site-pages/chrome";
import {
  composeFile,
  connectionConfig,
  connectionUri,
  MONGO_ENV_VARS,
  resolveMongoConfig,
  type MongoEnv,
  type ResolvedMongoConfig,
} from "@mark1russell7/docker-mongo/pure";
import { changedLines, envFile, FIELDS, PRESETS, upCommand } from "./demo.ts";

type Tab = "compose" | "env" | "ts";

const TABS: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: "compose", label: "docker-compose.yml" },
  { id: "env", label: ".env" },
  { id: "ts", label: "TypeScript" },
];

const DEFAULT_COMPOSE = composeFile(resolveMongoConfig({}).settings);

const LABEL: Readonly<Record<string, string>> = Object.fromEntries(FIELDS.map((field) => [field.key, field.label]));

export class SettingsPanel {
  private env: Record<string, string> = {};
  private tab: Tab = "compose";
  private readonly inputs = new Map<string, HTMLInputElement>();
  private readonly badges = new Map<string, HTMLElement>();
  private readonly presetButtons: HTMLButtonElement[] = [];
  private readonly tabButtons: HTMLButtonElement[] = [];
  private fileText = "";

  constructor() {
    this.buildPresets();
    this.buildFields();
    this.buildTabs();
    byId<HTMLInputElement>("show-password").addEventListener("change", () => this.render());
    byId<HTMLButtonElement>("copy-uri").addEventListener("click", (event) => {
      void copyText(event.currentTarget as HTMLButtonElement, connectionUri(resolveMongoConfig(this.env).settings));
    });
    byId<HTMLButtonElement>("copy-file").addEventListener("click", (event) => void copyText(event.currentTarget as HTMLButtonElement, this.fileText));
    this.render();
  }

  private buildPresets(): void {
    for (const preset of PRESETS) {
      const button = h("button", { type: "button", class: "chip", "data-preset": preset.id, "aria-pressed": "false" }, preset.label);
      button.addEventListener("click", () => this.load(preset.env));
      this.presetButtons.push(button);
    }
    byId("presets").replaceChildren(...this.presetButtons);
  }

  private buildFields(): void {
    const rows = FIELDS.map((field) => {
      const variable = MONGO_ENV_VARS[field.key];
      const id = `f-${field.key}`;
      const input = h("input", {
        id,
        class: "mono",
        type: "text",
        spellcheck: "false",
        autocomplete: "off",
        autocapitalize: "off",
        placeholder: field.placeholder,
        "aria-describedby": `${id}-hint`,
        ...(field.key === "port" ? { inputmode: "numeric" } : {}),
      });
      input.addEventListener("input", () => {
        if (input.value === "") delete this.env[variable];
        else this.env[variable] = input.value;
        this.render();
      });
      this.inputs.set(variable, input);
      const badge = h("span", { class: "src s-default" }, "default");
      this.badges.set(field.key, badge);
      return h(
        "div",
        { class: "field", "data-key": field.key },
        h("label", { for: id }, h("span", { class: "name" }, field.label), h("code", { class: "var" }, variable)),
        h("div", { class: "input-row" }, input, badge),
        h("p", { class: "hint", id: `${id}-hint` }, field.hint),
      );
    });
    byId("fields").replaceChildren(...rows);
  }

  private buildTabs(): void {
    for (const tab of TABS) {
      const button = h("button", { type: "button", role: "tab", id: `tab-${tab.id}`, "data-tab": tab.id, "aria-selected": "false" }, tab.label);
      button.addEventListener("click", () => {
        this.tab = tab.id;
        this.render();
      });
      this.tabButtons.push(button);
    }
    byId("tabs").replaceChildren(...this.tabButtons);
  }

  private load(env: MongoEnv): void {
    this.env = {};
    for (const [name, value] of Object.entries(env)) if (value !== undefined && value !== "") this.env[name] = value;
    for (const [name, input] of this.inputs) input.value = this.env[name] ?? "";
    this.render();
  }

  private render(): void {
    const resolved = resolveMongoConfig(this.env);
    const show = byId<HTMLInputElement>("show-password").checked;
    const { settings } = resolved;

    byId("uri").textContent = connectionUri(settings, { redact: !show });
    byId("uri-box").dataset["ok"] = String(resolved.problems.length === 0);
    byId("db-line").textContent = `dbName: "${connectionConfig(settings).dbName}"`;
    byId("show-label").hidden = settings.password === undefined;

    byId("problems").replaceChildren(...resolved.problems.map((problem) => h("li", {}, problem)));

    this.renderResolved(resolved, show);
    this.renderFile(resolved);

    for (const button of this.presetButtons) {
      const preset = PRESETS.find((p) => p.id === button.dataset["preset"]);
      const same = preset !== undefined && sameEnv(preset.env, this.env);
      button.setAttribute("aria-pressed", String(same));
    }
    byId("up-cmd").textContent = upCommand(this.env);
  }

  private renderResolved(resolved: ResolvedMongoConfig, show: boolean): void {
    const rows = resolved.entries.map((entry) => {
      const badge = this.badges.get(entry.key);
      if (badge !== undefined) {
        badge.className = `src s-${entry.source}`;
        badge.textContent = entry.source;
      }
      const input = this.inputs.get(entry.variable);
      if (input !== undefined) {
        if (entry.source === "invalid") input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
      }
      const secret = entry.key === "password" && entry.value !== undefined && !show;
      const value = entry.value === undefined ? h("span", { class: "none" }, "none") : h("code", {}, secret ? "****" : entry.value);
      const from =
        entry.source === "env" || entry.source === "invalid"
          ? h("span", {}, h("span", { class: `src s-${entry.source}` }, entry.source), " ", h("code", {}, entry.variable))
          : h("span", { class: `src s-${entry.source}` }, entry.source);
      return h("tr", { "data-key": entry.key, "data-source": entry.source }, h("th", { scope: "row" }, LABEL[entry.key] ?? entry.key), h("td", {}, value), h("td", {}, from));
    });
    byId("resolved").replaceChildren(...rows);
  }

  private renderFile(resolved: ResolvedMongoConfig): void {
    for (const button of this.tabButtons) button.setAttribute("aria-selected", String(button.dataset["tab"] === this.tab));
    byId("file-pre").setAttribute("aria-labelledby", `tab-${this.tab}`);
    const code = byId("file-code");
    const note = byId("file-note");
    if (this.tab === "compose") {
      this.fileText = composeFile(resolved.settings);
      const changed = changedLines(this.fileText, DEFAULT_COMPOSE);
      const lines = this.fileText.trimEnd().split("\n");
      code.replaceChildren(...lines.map((line, i) => h("span", { class: changed.has(i) ? "ln changed" : "ln" }, line)));
      note.textContent =
        changed.size === 0
          ? "With the defaults, this is the docker-compose.yml of the package."
          : `${changed.size} ${changed.size === 1 ? "line differs" : "lines differ"} from the shipped file. The marked lines show them.`;
    } else if (this.tab === "env") {
      this.fileText = envFile(this.env);
      code.replaceChildren(this.fileText.trimEnd());
      note.textContent = "Keep a .env file with a password out of git.";
    } else {
      this.fileText = tsSample(resolved);
      code.replaceChildren(this.fileText);
      note.textContent = "The package reads the same variables from process.env.";
    }
    code.parentElement!.dataset["tab"] = this.tab;
  }
}

function tsSample(resolved: ResolvedMongoConfig): string {
  const config = connectionConfig(resolved.settings);
  return [
    'import { connectionConfig, resolveMongoConfig, withConnection } from "@mark1russell7/docker-mongo";',
    "",
    "const { settings } = resolveMongoConfig(process.env);",
    `// ${JSON.stringify({ uri: connectionUri(resolved.settings, { redact: true }), dbName: config.dbName })}`,
    "const ping = await withConnection(connectionConfig(settings), (db) => db.command({ ping: 1 }));",
  ].join("\n");
}

function sameEnv(a: MongoEnv, b: MongoEnv): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  return true;
}
