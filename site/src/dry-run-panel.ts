// The dry run: the steps of planInit and planSeed for the input, as mongosh commands, and the results that they give.
import { byId, copyText, h } from "@mark1russell7/site-pages/chrome";
import { mongoshCommand, planInit, planSeed, type InitStep, type SeedStep } from "@mark1russell7/docker-mongo/pure";
import { parseCollections, parseNames, parseSeed, SAMPLE_COLLECTIONS, SAMPLE_SEED } from "./demo.ts";

const OP_LABEL: Readonly<Record<(InitStep | SeedStep)["op"], string>> = {
  createCollection: "create",
  createIndex: "index",
  deleteMany: "clear",
  insertMany: "insert",
};

export class DryRunPanel {
  private script = "";

  constructor() {
    const collections = byId<HTMLTextAreaElement>("collections");
    const seed = byId<HTMLTextAreaElement>("seed");
    collections.value = SAMPLE_COLLECTIONS;
    seed.value = SAMPLE_SEED;
    for (const id of ["collections", "existing", "seed"]) byId(id).addEventListener("input", () => this.render());
    byId("clear-first").addEventListener("change", () => this.render());
    byId<HTMLButtonElement>("copy-plan").addEventListener("click", (event) => void copyText(event.currentTarget as HTMLButtonElement, this.script));
    this.render();
  }

  private render(): void {
    const collections = parseCollections(byId<HTMLTextAreaElement>("collections").value);
    const seed = parseSeed(byId<HTMLTextAreaElement>("seed").value);
    const existing = parseNames(byId<HTMLInputElement>("existing").value);
    const clearFirst = byId<HTMLInputElement>("clear-first").checked;

    byId("collections-error").textContent = collections.ok ? "" : collections.error;
    byId("seed-error").textContent = seed.ok ? "" : seed.error;
    byId("collections").setAttribute("aria-invalid", String(!collections.ok));
    byId("seed").setAttribute("aria-invalid", String(!seed.ok));

    const init = collections.ok ? planInit(collections.value, existing) : undefined;
    const seeded = seed.ok ? planSeed(seed.value, clearFirst) : undefined;
    const steps: { readonly phase: "init" | "seed"; readonly step: InitStep | SeedStep }[] = [
      ...(init?.steps ?? []).map((step) => ({ phase: "init" as const, step })),
      ...(seeded?.steps ?? []).map((step) => ({ phase: "seed" as const, step })),
    ];

    const commands = steps.map(({ step }) => mongoshCommand(step));
    this.script = `${commands.join("\n")}\n`;
    byId("plan").replaceChildren(
      ...(steps.length === 0
        ? [h("li", { class: "empty" }, "No steps: correct the input.")]
        : steps.map(({ phase, step }, i) =>
            h(
              "li",
              { class: `op-${step.op}`, "data-op": step.op, "data-collection": step.collection },
              h("span", { class: "phase" }, phase),
              h("span", { class: "op" }, OP_LABEL[step.op]),
              h("code", { class: "cmd" }, commands[i] ?? ""),
            ),
          )),
    );
    byId("plan-count").textContent = `${steps.length} ${steps.length === 1 ? "step" : "steps"}`;

    byId("results").replaceChildren(
      init === undefined
        ? ""
        : h(
            "div",
            { class: "res" },
            h("span", { class: "label" }, "InitResult"),
            h("code", { id: "init-result" }, JSON.stringify({ created: init.created, existing: init.existing, indexesCreated: init.indexes })),
          ),
      seeded === undefined
        ? ""
        : h("div", { class: "res" }, h("span", { class: "label" }, "SeedResult"), h("code", { id: "seed-result" }, JSON.stringify({ inserted: seeded.inserted, cleared: seeded.cleared }))),
    );
  }
}
