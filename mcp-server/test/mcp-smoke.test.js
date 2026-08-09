import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("an MCP client can list and call the shared stdio tools", async () => {
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), "stage-sketch-mcp-wire-"));
  /* このテストファイルからの相対で解決する。cwd 依存にすると、リポジトリ直下から
     `node --test mcp-server/test/*.js` を流したときにサーバーが起動できず、
     「Connection closed」という原因の分かりにくい失敗になる。 */
  const serverPath = fileURLToPath(new URL("../src/server.js", import.meta.url));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: {
      ...process.env,
      STAGE_SKETCH_MCP_DATA_DIR: dataRoot,
    },
    stderr: "pipe",
  });
  const client = new Client({
    name: "stage-sketch-mcp-test-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    assert.ok(names.includes("stage_sketch_get_guide"));
    assert.ok(names.includes("stage_sketch_create_project_draft"));
    assert.ok(names.includes("stage_sketch_prepare_import"));
    assert.ok(names.includes("stage_sketch_plan_edit"));
    assert.ok(names.includes("stage_sketch_apply_edit_plan"));
    assert.equal(names.length, 11);

    const guide = await client.callTool({
      name: "stage_sketch_get_guide",
      arguments: {},
    });
    assert.equal(guide.isError, undefined);
    assert.match(guide.content[0].text, /ブラウザのlocalStorageへ直接書き込まない/);
    assert.match(guide.content[0].text, /"defaults"/);
    assert.match(guide.content[0].text, /情報不足だけでは質問しない/);
    assert.match(guide.content[0].text, /nextPieceColor\(cast.length\)/);
    assert.match(guide.content[0].text, /"operations": \[/);
    assert.match(guide.content[0].text, /"op": "add_placement"/);
    assert.match(guide.content[0].text, /"sceneId": "scene-1"/);

    const created = await client.callTool({
      name: "stage_sketch_create_project_draft",
      arguments: {
        projectId: "wire-test",
        title: "通信テスト",
        scenes: [{
          id: "scene-1",
          title: "場面 1",
          placements: [
            { assetType: "performer", assetName: "アキ", u: 0.5, v: 0.6 },
            { assetType: "set", assetName: "円座", kind: "block", u: 0.4, v: 0.5 },
          ],
        }],
      },
    });
    assert.equal(created.isError, undefined);
    assert.match(created.content[0].text, /wire-test/);

    const read = await client.callTool({
      name: "stage_sketch_read_project",
      arguments: { projectId: "wire-test" },
    });
    assert.equal(read.isError, undefined);
    assert.match(read.content[0].text, /"sceneId"/);
    assert.match(read.content[0].text, /"assetName": "アキ"/);
    assert.match(read.content[0].text, /"assetName": "円座"/);

    const planned = await client.callTool({
      name: "stage_sketch_plan_edit",
      arguments: {
        projectId: "wire-test",
        expectedRevision: 1,
        request: "場面名を更新する。まず差分だけ見せて",
        operations: [{
          op: "update_scene_fields",
          sceneId: "scene-1",
          title: "場面 1 更新案",
        }],
      },
    });
    assert.equal(planned.isError, undefined);
    const plan = JSON.parse(planned.content[0].text);
    assert.equal(plan.kind, "stage-sketch-edit-plan");

    const aliasPlanned = await client.callTool({
      name: "stage_sketch_plan_edit",
      arguments: {
        projectId: "wire-test",
        expectedRevision: 1,
        request: "typeとscene_idでも場面メモを更新できる",
        operations: [{
          type: "update_scene_fields",
          scene_id: "scene-1",
          note: "別名入力の更新案",
        }],
      },
    });
    assert.equal(aliasPlanned.isError, undefined);
    const aliasPlan = JSON.parse(aliasPlanned.content[0].text);
    assert.equal(aliasPlan.operations[0].op, "update_scene_fields");
    assert.equal(aliasPlan.operations[0].sceneId, "scene-1");
    assert.equal("type" in aliasPlan.operations[0], false);
    assert.equal("scene_id" in aliasPlan.operations[0], false);

    const conflictingAlias = await client.callTool({
      name: "stage_sketch_plan_edit",
      arguments: {
        projectId: "wire-test",
        expectedRevision: 1,
        request: "食い違う識別子は拒否する",
        operations: [{
          op: "update_scene_fields",
          type: "add_placement",
          sceneId: "scene-1",
          title: "適用されない更新案",
        }],
      },
    });
    assert.equal(conflictingAlias.isError, true);
    assert.match(conflictingAlias.content[0].text, /opとtypeが食い違っています/);
    assert.match(conflictingAlias.content[0].text, /操作の識別子はopにする必要があります/);

    const unconfirmed = await client.callTool({
      name: "stage_sketch_apply_edit_plan",
      arguments: {
        planId: plan.planId,
        projectId: "wire-test",
        expectedRevision: 1,
      },
    });
    assert.equal(unconfirmed.isError, undefined);
    assert.match(unconfirmed.content[0].text, /confirmed: true/);

    const minimalPlacement = await client.callTool({
      name: "stage_sketch_plan_edit",
      arguments: {
        projectId: "wire-test",
        expectedRevision: 1,
        request: "演者を1人追加して",
        operations: [{
          op: "add_placement",
          sceneId: "scene-1",
          placement: { assetType: "performer" },
        }],
      },
    });
    assert.equal(minimalPlacement.isError, undefined);
    const minimalPlan = JSON.parse(minimalPlacement.content[0].text);
    assert.equal(minimalPlan.status, "proposed");
    assert.equal(minimalPlan.operations[0].placement.assetName, "演者1");
    assert.equal(minimalPlan.operations[0].placement.pose, "stand");

    const emptyPlan = await client.callTool({
      name: "stage_sketch_plan_edit",
      arguments: {
        projectId: "wire-test",
        expectedRevision: 1,
        request: "何もしない",
        operations: [],
        questions: [],
      },
    });
    assert.equal(emptyPlan.isError, true);
    assert.match(emptyPlan.content[0].text, /Too small: expected array to have >=1 items/);
  } finally {
    await client.close();
  }
});
