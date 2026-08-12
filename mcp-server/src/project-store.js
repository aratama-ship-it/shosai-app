import { mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendScenes,
  assertId,
  createProjectDocument,
  summarizeDocument,
  updateScene,
  validateDocument,
} from "./stage-model.js";
import { applyEditOperations, createEditPlan } from "./edit-plan.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_DATA_ROOT = path.join(APP_ROOT, ".stage-sketch-mcp");
const DEFAULT_RELATED_DEMO_DIR = path.resolve(APP_ROOT, "../jjk-show");

function clone(value) {
  return structuredClone(value);
}

function safeFilename(value) {
  return String(value || "show")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\s]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 50) || "show";
}

function markdownCell(value) {
  return String(value || "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdownLink(label, relativePath) {
  return `[${label}](<${relativePath}>)`;
}

export class ProjectStore {
  constructor(dataRoot = process.env.STAGE_SKETCH_MCP_DATA_DIR || DEFAULT_DATA_ROOT, options = {}) {
    this.dataRoot = path.resolve(dataRoot);
    this.projectsDir = path.join(this.dataRoot, "projects");
    this.historyDir = path.join(this.dataRoot, "history");
    this.exportsDir = path.join(this.dataRoot, "exports");
    this.locksDir = path.join(this.dataRoot, "locks");
    this.plansDir = path.join(this.dataRoot, "plans");
    this.showIndexPath = path.join(this.dataRoot, "shows.json");
    this.showIndexReadmePath = path.join(this.dataRoot, "SHOWS.md");
    this.relatedDemoDir = path.resolve(
      options.relatedDemoDir || process.env.STAGE_SKETCH_RELATED_DEMO_DIR || DEFAULT_RELATED_DEMO_DIR,
    );
  }

  async init() {
    await Promise.all([
      mkdir(this.projectsDir, { recursive: true }),
      mkdir(this.historyDir, { recursive: true }),
      mkdir(this.exportsDir, { recursive: true }),
      mkdir(this.locksDir, { recursive: true }),
      mkdir(this.plansDir, { recursive: true }),
    ]);
  }

  projectPath(projectId) {
    return path.join(this.projectsDir, `${assertId(projectId, "projectId")}.json`);
  }

  planPath(planId) {
    const id = assertId(planId, "planId");
    if (!id.startsWith("plan-")) throw new Error("planIdはplan-で始めてください。");
    return path.join(this.plansDir, `${id}.json`);
  }

  async atomicWrite(target, value) {
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  }

  async atomicTextWrite(target, text) {
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, text, "utf8");
    await rename(temporary, target);
  }

  /* projects（正本）を入口にして、読み込み用コピーと履歴の場所を一枚へ集める。
     JSON を移動すると既存のMCP参照や共有済みのパスを壊すため、役割ごとの保存先は
     そのままにし、SHOWS.md / shows.json だけを常に最新の案内図にする。 */
  async refreshShowIndex() {
    await this.init();
    const exportEntries = await readdir(this.exportsDir, { withFileTypes: true });
    const importFilesByProjectId = new Map();
    for (const entry of exportEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(await readFile(path.join(this.exportsDir, entry.name), "utf8"));
        const projectId = parsed?.project?.id;
        if (!projectId) continue;
        const paths = importFilesByProjectId.get(projectId) || [];
        paths.push(`exports/${entry.name}`);
        importFilesByProjectId.set(projectId, paths);
      } catch (_) {
        // 壊れた共有用JSONは正本の索引を止めず、一覧にも混ぜない。
      }
    }

    const projectEntries = await readdir(this.projectsDir, { withFileTypes: true });
    const shows = [];
    for (const entry of projectEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const relativeProjectPath = `projects/${entry.name}`;
      try {
        const document = JSON.parse(await readFile(path.join(this.projectsDir, entry.name), "utf8"));
        const project = document?.project || {};
        const projectId = project.id || entry.name.slice(0, -5);
        const scenes = Array.isArray(project.scenes) ? project.scenes : [];
        const imports = (importFilesByProjectId.get(projectId) || []).sort();
        shows.push({
          projectId,
          title: project.title || projectId,
          versionLabel: project.versionLabel || "v1",
          revision: Number(document?.mcpMeta?.revision || 1),
          updatedAt: document?.mcpMeta?.updatedAt || project.createdAt || "",
          sceneCount: scenes.filter((scene) => scene.kind !== "section").length,
          sectionCount: scenes.filter((scene) => scene.kind === "section").length,
          projectFile: relativeProjectPath,
          importFiles: imports,
        });
      } catch (error) {
        shows.push({
          projectId: entry.name.slice(0, -5),
          title: "壊れたJSON（要確認）",
          versionLabel: "—",
          revision: null,
          updatedAt: "",
          sceneCount: null,
          sectionCount: null,
          projectFile: relativeProjectPath,
          importFiles: [],
          error: error.message,
        });
      }
    }

    /* この制作ワークスペース内の関連デモも、コピーせずに一覧へ載せる。
       呪術廻戦のJSONはMCPで編集する正本ではないため、projects/ へ複製しない。
       元の場所を示したまま「舞台スケッチで直接読み込める関連デモ」として区別する。 */
    const relatedEntries = await readdir(this.relatedDemoDir, { withFileTypes: true }).catch(() => []);
    for (const entry of relatedEntries) {
      if (!entry.isFile() || !/^demo-.*\.json$/i.test(entry.name)) continue;
      const relativeDemoPath = `../../jjk-show/${entry.name}`;
      try {
        const parsed = JSON.parse(await readFile(path.join(this.relatedDemoDir, entry.name), "utf8"));
        const project = parsed?.project;
        if (!project || !Array.isArray(project.scenes)) continue;
        shows.push({
          projectId: project.id || entry.name.slice(0, -5),
          title: project.title || entry.name,
          versionLabel: project.versionLabel || "v1",
          revision: null,
          updatedAt: "",
          sceneCount: project.scenes.filter((scene) => scene.kind !== "section").length,
          sectionCount: project.scenes.filter((scene) => scene.kind === "section").length,
          projectFile: relativeDemoPath,
          importFiles: [relativeDemoPath],
          sourceKind: "related-demo",
        });
      } catch (_) {
        // 関連デモの破損は、MCP下書きの一覧・保存を止めない。
      }
    }
    shows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    const index = {
      kind: "shosai-stage-sketch-show-index",
      version: 1,
      generatedAt: new Date().toISOString(),
      canonicalDirectory: "projects",
      importDirectory: "exports",
      archiveDirectory: "history",
      relatedDemoDirectory: "../../jjk-show",
      shows,
    };
    await this.atomicWrite(this.showIndexPath, index);

    const rows = shows.map((show) => `| ${[
      show.sourceKind === "related-demo" ? "関連デモ" : "MCP正本",
      markdownCell(show.title),
      markdownCell(show.versionLabel),
      `${show.sceneCount ?? "—"}場面`,
      markdownLink("正本", show.projectFile),
      show.importFiles.length
        ? show.importFiles.map((file, indexNumber) => markdownLink(`読込${indexNumber + 1}`, file)).join("<br>")
        : "—",
    ].join(" | ")} |`);
    const markdown = [
      "# 舞台スケッチ・ショー一覧",
      "",
      "このファイルがローカルJSONの入口です。編集の正本は `projects/`、アプリへ渡すコピーは `exports/`、過去版は `history/` に分けています。呪術廻戦の関連デモは元の `../../jjk-show/` に置いたまま、ここから直接参照できます。JSON自体は移動しないため、MCP・書き出し・既存の共有パスを壊しません。",
      "",
      "| 種類 | ショー | 版 | 場面 | 正本 | アプリで読むJSON |",
      "| --- | --- | --- | ---: | --- | --- |",
      ...rows,
      "",
      "## 使い方",
      "",
      "- 編集・確認するなら **正本** を開く。",
      "- 舞台スケッチの「読み込む」で開くなら **読込** を選ぶ。",
      "- **関連デモ** は舞台スケッチへ直接読み込めるJSON。MCPで編集するには、別名の新規ショーとして取り込む。",
      "- `history/` は過去版の保管なので、通常は一覧から選ばない。",
      "- `shows.json` はこの一覧と同じ内容を機械的に読むためのファイル。",
      "",
    ].join("\n");
    await this.atomicTextWrite(this.showIndexReadmePath, markdown);
    return index;
  }

  async create(input) {
    await this.init();
    const document = createProjectDocument(input);
    return this.withProjectLock(document.project.id, async () => {
      const target = this.projectPath(document.project.id);
      try {
        await readFile(target, "utf8");
        throw new Error(`projectId ${document.project.id} は既に使われています。`);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      await this.atomicWrite(target, document);
      await this.refreshShowIndex();
      return clone(document);
    });
  }

  async read(projectId) {
    await this.init();
    let parsed;
    try {
      parsed = JSON.parse(await readFile(this.projectPath(projectId), "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`projectId ${projectId} が見つかりません。`);
      }
      throw error;
    }
    const check = validateDocument(parsed);
    if (!check.valid) {
      throw new Error(`保存JSONが壊れています: ${check.errors.join(" / ")}`);
    }
    return parsed;
  }

  async readPlan(planId) {
    await this.init();
    let parsed;
    try {
      parsed = JSON.parse(await readFile(this.planPath(planId), "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error(`planId ${planId} が見つかりません。`);
      throw error;
    }
    if (parsed?.kind !== "stage-sketch-edit-plan" || parsed?.version !== 1) {
      throw new Error("編集計画JSONの形式が正しくありません。");
    }
    return parsed;
  }

  async list() {
    await this.init();
    // Finderなどで正本JSONを追加した場合も、一覧を開けば入口を同期できる。
    await this.refreshShowIndex();
    const entries = await readdir(this.projectsDir, { withFileTypes: true });
    const rows = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(await readFile(path.join(this.projectsDir, entry.name), "utf8"));
        rows.push(summarizeDocument(parsed));
      } catch (error) {
        rows.push({
          projectId: entry.name.slice(0, -5),
          status: "invalid",
          error: error.message,
        });
      }
    }
    return rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  assertRevision(document, expectedRevision) {
    const current = Number(document.mcpMeta?.revision || 1);
    if (Number(expectedRevision) !== current) {
      throw new Error(
        `revisionが一致しません。現在は${current}、指定は${expectedRevision}です。` +
        "stage_sketch_read_projectで読み直してから更新してください。",
      );
    }
  }

  async archive(document) {
    const projectId = assertId(document.project.id, "project.id");
    const revision = Number(document.mcpMeta?.revision || 1);
    const directory = path.join(this.historyDir, projectId);
    await mkdir(directory, { recursive: true });
    const target = path.join(directory, `revision-${revision}.json`);
    try {
      await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await this.atomicWrite(target, document);
    }
  }

  async withProjectLock(projectId, operation) {
    await this.init();
    const lockPath = path.join(this.locksDir, `${assertId(projectId, "projectId")}.lock`);
    const deadline = Date.now() + 4000;
    let handle;
    while (!handle) {
      try {
        handle = await open(lockPath, "wx");
        await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`, "utf8");
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        if (Date.now() >= deadline) {
          throw new Error(
            "別のCodexまたはClaude Codeがこの下書きを編集中です。数秒後に読み直してください。",
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    try {
      return await operation();
    } finally {
      await handle.close();
      await unlink(lockPath).catch(() => {});
    }
  }

  async mutate(projectId, expectedRevision, operation) {
    return this.withProjectLock(projectId, async () => {
      const document = await this.read(projectId);
      this.assertRevision(document, expectedRevision);
      await this.archive(document);
      const changed = clone(document);
      const result = operation(changed);
      const check = validateDocument(changed);
      if (!check.valid) throw new Error(check.errors.join(" / "));
      changed.mcpMeta = {
        ...(changed.mcpMeta || {}),
        status: "draft",
        revision: Number(document.mcpMeta?.revision || 1) + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.atomicWrite(this.projectPath(projectId), changed);
      await this.refreshShowIndex();
      return {
        result,
        project: summarizeDocument(changed),
        warnings: check.warnings,
      };
    });
  }

  async addScenes(input) {
    return this.mutate(input.projectId, input.expectedRevision, (document) =>
      appendScenes(document, input));
  }

  async updateScene(input) {
    return this.mutate(input.projectId, input.expectedRevision, (document) =>
      updateScene(document, input));
  }

  async planEdit(input) {
    const document = await this.read(input.projectId);
    this.assertRevision(document, input.expectedRevision);
    const plan = createEditPlan(document, input);
    await this.atomicWrite(this.planPath(plan.planId), plan);
    return clone(plan);
  }

  async applyEditPlan(input) {
    const plan = await this.readPlan(input.planId);
    if (plan.projectId !== input.projectId) {
      throw new Error(
        `計画のprojectIdは${plan.projectId}です。指定された${input.projectId}には適用できません。`,
      );
    }
    if (plan.status === "needs_clarification") {
      throw new Error(`確認が必要な編集計画は適用できません: ${plan.questions.join(" / ")}`);
    }
    if (plan.status !== "proposed") {
      throw new Error(`編集計画は${plan.status}のため適用できません。`);
    }
    if (Number(input.expectedRevision) !== Number(plan.expectedRevision)) {
      throw new Error(
        `計画作成時のrevisionは${plan.expectedRevision}です。` +
        "stage_sketch_read_projectで読み直し、新しい計画を作ってください。",
      );
    }
    const current = await this.read(input.projectId);
    this.assertRevision(current, input.expectedRevision);
    if (input.confirmed !== true) {
      return {
        applied: false,
        planId: plan.planId,
        projectId: plan.projectId,
        summary: plan.summary,
        warnings: plan.warnings,
        requiresConfirmation: true,
        nextStep: "内容を確認し、confirmed: true で再実行してください。",
      };
    }

    const nextRevision = Number(current.mcpMeta?.revision || 1) + 1;
    const changed = await this.mutate(input.projectId, input.expectedRevision, (document) => {
      const appliedDiff = applyEditOperations(document, plan.operations);
      document.project.versionLabel = `AI編集 r${nextRevision}`;
      return { planId: plan.planId, diff: appliedDiff };
    });

    const appliedAt = new Date().toISOString();
    const appliedPlan = {
      ...plan,
      status: "applied",
      appliedRevision: changed.project.revision,
      appliedAt,
    };
    await this.atomicWrite(this.planPath(plan.planId), appliedPlan);

    const inspection = await this.inspect(input.projectId);
    const editSummary = {
      planId: plan.planId,
      request: plan.request,
      summary: plan.summary,
      baseRevision: plan.expectedRevision,
      appliedRevision: changed.project.revision,
      diff: plan.diff,
      warnings: plan.warnings,
    };
    const preparedImport = await this.prepareImport(
      input.projectId,
      changed.project.revision,
      editSummary,
    );
    return {
      applied: true,
      plan: appliedPlan,
      project: changed.project,
      warnings: [...new Set([...plan.warnings, ...inspection.warnings])],
      inspection,
      preparedImport,
    };
  }

  async inspect(projectId) {
    const document = await this.read(projectId);
    return {
      project: summarizeDocument(document),
      ...validateDocument(document),
    };
  }

  async prepareImport(projectId, expectedRevision, editSummary = null) {
    const document = await this.read(projectId);
    this.assertRevision(document, expectedRevision);
    const check = validateDocument(document);
    if (!check.valid) throw new Error(check.errors.join(" / "));
    const output = {
      kind: "shosai-stage-sketch",
      version: 3,
      project: document.project,
      ...(editSummary ? { editSummary } : {}),
    };
    const filename = [
      safeFilename(document.project.title),
      safeFilename(document.project.versionLabel),
      `r${document.mcpMeta.revision}`,
    ].join("-") + ".json";
    const target = path.join(this.exportsDir, filename);
    await this.atomicWrite(target, output);
    await this.refreshShowIndex();
    return {
      project: summarizeDocument(document),
      importFile: target,
      warnings: check.warnings,
      nextStep: "舞台スケッチの「保存 > 読み込む」からこのJSONを選び、内容を確認してください。",
    };
  }
}
