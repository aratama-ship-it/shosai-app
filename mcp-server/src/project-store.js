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

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_DATA_ROOT = path.join(APP_ROOT, ".stage-sketch-mcp");

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

export class ProjectStore {
  constructor(dataRoot = process.env.STAGE_SKETCH_MCP_DATA_DIR || DEFAULT_DATA_ROOT) {
    this.dataRoot = path.resolve(dataRoot);
    this.projectsDir = path.join(this.dataRoot, "projects");
    this.historyDir = path.join(this.dataRoot, "history");
    this.exportsDir = path.join(this.dataRoot, "exports");
    this.locksDir = path.join(this.dataRoot, "locks");
  }

  async init() {
    await Promise.all([
      mkdir(this.projectsDir, { recursive: true }),
      mkdir(this.historyDir, { recursive: true }),
      mkdir(this.exportsDir, { recursive: true }),
      mkdir(this.locksDir, { recursive: true }),
    ]);
  }

  projectPath(projectId) {
    return path.join(this.projectsDir, `${assertId(projectId, "projectId")}.json`);
  }

  async atomicWrite(target, value) {
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, target);
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

  async list() {
    await this.init();
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

  async inspect(projectId) {
    const document = await this.read(projectId);
    return {
      project: summarizeDocument(document),
      ...validateDocument(document),
    };
  }

  async prepareImport(projectId, expectedRevision) {
    const document = await this.read(projectId);
    this.assertRevision(document, expectedRevision);
    const check = validateDocument(document);
    if (!check.valid) throw new Error(check.errors.join(" / "));
    const output = {
      kind: "shosai-stage-sketch",
      version: 3,
      project: document.project,
    };
    const filename = [
      safeFilename(document.project.title),
      safeFilename(document.project.versionLabel),
      `r${document.mcpMeta.revision}`,
    ].join("-") + ".json";
    const target = path.join(this.exportsDir, filename);
    await this.atomicWrite(target, output);
    return {
      project: summarizeDocument(document),
      importFile: target,
      warnings: check.warnings,
      nextStep: "舞台スケッチの「保存 > 読み込む」からこのJSONを選び、内容を確認してください。",
    };
  }
}
