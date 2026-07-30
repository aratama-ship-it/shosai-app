#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ProjectStore } from "./project-store.js";
import {
  createProjectSchema,
  mutationBaseSchema,
  placementSchema,
  projectIdSchema,
  sceneRehearsalSchema,
  sceneSchema,
} from "./schemas.js";
import { GUIDE, summarizeDocument } from "./stage-model.js";

const store = new ProjectStore();

function result(value) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify(value, null, 2),
    }],
  };
}

function safeTool(handler) {
  return async (input) => {
    try {
      return result(await handler(input || {}));
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }, null, 2),
        }],
      };
    }
  };
}

export function buildServer(projectStore = store) {
  const server = new McpServer({
    name: "stage-sketch-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "stage_sketch_get_guide",
    {
      title: "舞台スケッチMCPの使い方",
      description:
        "最初に読む。座標、対応する劇場・姿勢・道具、安全境界、確認してから読み込む手順を返す。",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    safeTool(async () => GUIDE),
  );

  server.registerTool(
    "stage_sketch_list_projects",
    {
      title: "MCP下書き一覧",
      description: "MCPがローカルに保存した舞台スケッチ下書きの一覧を返す。",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    safeTool(async () => ({ projects: await projectStore.list() })),
  );

  server.registerTool(
    "stage_sketch_read_project",
    {
      title: "MCP下書きを読む",
      description:
        "指定した下書きの現在revisionを読む。既定はトークンを節約する場面一覧。" +
        "更新前には必ず呼び、expectedRevisionへ現在値を渡す。全JSONが必要な場合だけview=fullを使う。",
      inputSchema: {
        ...projectIdSchema,
        view: z.enum(["summary", "scene_list", "full"]).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    safeTool(async ({ projectId, view = "scene_list" }) => {
      const document = await projectStore.read(projectId);
      if (view === "full") return document;
      const project = summarizeDocument(document);
      if (view === "summary") return { project };
      return {
        project,
        scenes: document.project.scenes.map((scene) => ({
          id: scene.id,
          kind: scene.kind,
          depth: scene.depth,
          title: scene.title,
          studyBeatId: scene.studyBeatId,
          note: scene.note,
          pieceCount: scene.pieces.length,
        })),
      };
    }),
  );

  server.registerTool(
    "stage_sketch_read_scene",
    {
      title: "一場面を読む",
      description:
        "指定した一場面の配置と、その配置が参照する演者・セットだけを読む。全プロジェクトを読むよりトークンを節約できる。",
      inputSchema: {
        ...projectIdSchema,
        sceneId: z.string(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    safeTool(async ({ projectId, sceneId }) => {
      const document = await projectStore.read(projectId);
      const scene = document.project.scenes.find((item) => item.id === sceneId);
      if (!scene) throw new Error(`sceneId ${sceneId} が見つかりません。`);
      const castIds = new Set(scene.pieces.map((piece) => piece.castId).filter(Boolean));
      const setIds = new Set(scene.pieces.map((piece) => piece.setId).filter(Boolean));
      return {
        project: summarizeDocument(document),
        scene,
        cast: document.project.cast.filter((item) => castIds.has(item.id)),
        sets: document.project.sets.filter((item) => setIds.has(item.id)),
      };
    }),
  );

  server.registerTool(
    "stage_sketch_create_project_draft",
    {
      title: "舞台スケッチ下書きを作る",
      description:
        "新しいショーと複数場面を、舞台スケッチで読み込めるローカルJSON下書きとして作る。" +
        "ブラウザにはまだ反映しない。同名assetNameは場面間で同じ演者・セットとして扱う。",
      inputSchema: createProjectSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    safeTool(async (input) => {
      const document = await projectStore.create(input);
      return {
        project: summarizeDocument(document),
        draftFile: projectStore.projectPath(document.project.id),
        nextStep: "内容を読み直し、inspectしてからprepare_importしてください。",
      };
    }),
  );

  server.registerTool(
    "stage_sketch_add_scenes",
    {
      title: "中間場面を追加する",
      description:
        "既存下書きへ場面またはセクションを追加する。afterSceneIdを使うと1-1と1-2の間などへ挿入できる。" +
        "古いrevisionからの上書きは拒否する。",
      inputSchema: {
        ...mutationBaseSchema,
        afterSceneId: z.string().optional(),
        scenes: z.array(sceneSchema).min(1).max(20),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    safeTool(async (input) => projectStore.addScenes(input)),
  );

  server.registerTool(
    "stage_sketch_update_scene",
    {
      title: "一場面を修正する",
      description:
        "場面名、メモ、背景、字下げ、配置を修正する。placementsは既定で全置換。" +
        "placementMode=appendの場合だけ既存配置へ追加する。以前の版は履歴へ残る。",
      inputSchema: {
        ...mutationBaseSchema,
        sceneId: z.string(),
        title: z.string().min(1).max(80).optional(),
        note: z.string().max(2000).optional(),
        background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        depth: z.number().int().min(0).max(4).optional(),
        studyBeatId: z.string().max(64).nullable().optional(),
        rehearsal: sceneRehearsalSchema,
        placementMode: z.enum(["replace", "append"]).optional(),
        placements: z.array(placementSchema).max(80).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    safeTool(async (input) => projectStore.updateScene(input)),
  );

  server.registerTool(
    "stage_sketch_inspect_project",
    {
      title: "下書きを点検する",
      description:
        "参照切れ、場面数、動線、空中・サーカス装置の専門家確認警告を点検する。" +
        "安全性を判定または保証するツールではない。",
      inputSchema: projectIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    safeTool(async ({ projectId }) => projectStore.inspect(projectId)),
  );

  server.registerTool(
    "stage_sketch_prepare_import",
    {
      title: "読み込み用JSONを準備する",
      description:
        "点検済み下書きから舞台スケッチの「読み込む」で選べるJSONを作る。" +
        "ブラウザへの反映は行わず、本人の確認操作を残す。",
      inputSchema: mutationBaseSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    safeTool(async ({ projectId, expectedRevision }) =>
      projectStore.prepareImport(projectId, expectedRevision)),
  );

  return server;
}

export async function run() {
  await store.init();
  const server = buildServer(store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`stage-sketch-mcp: ready (${store.dataRoot})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error("stage-sketch-mcp:", error);
    process.exitCode = 1;
  });
}
