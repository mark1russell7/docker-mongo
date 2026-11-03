// The start of the page: the theme, the settings, the dry run, the API table and the build line.
import { byId, copyText, h, setupTheme } from "@mark1russell7/site-pages/chrome";
import { API, result } from "./api.ts";
import { DryRunPanel } from "./dry-run-panel.ts";
import { SettingsPanel } from "./settings-panel.ts";
import "./style.css";

setupTheme(byId<HTMLButtonElement>("theme"), "docker-mongo-theme");
new SettingsPanel();
new DryRunPanel();

byId("api-rows").replaceChildren(
  ...API.map((row) =>
    h(
      "tr",
      {},
      h("td", {}, ...row.names.map((name) => h("code", { class: "name" }, name))),
      h("td", {}, row.what),
      h(
        "td",
        { class: "live" },
        ...row.examples.map((example) => h("div", { class: "ex" }, h("code", {}, example.code), h("span", { class: "arrow", "aria-hidden": "true" }, "→"), h("output", {}, result(example)))),
        row.note === undefined ? null : h("span", { class: "note" }, row.note),
      ),
    ),
  ),
);

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
  button.addEventListener("click", () => void copyText(button, byId(button.dataset["copy"]!).textContent ?? ""));
}

byId("build").append(
  `Version ${__BUILD__.version}, build `,
  __BUILD__.sha === "local" ? "local" : h("a", { href: `https://github.com/mark1russell7/docker-mongo/commit/${__BUILD__.sha}` }, __BUILD__.sha),
  ` of ${__BUILD__.date}`,
);
