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

    const guide = await client.callTool({
      name: "stage_sketch_get_guide",
      arguments: {},
    });
    assert.equal(guide.isError, undefined);
    assert.match(guide.content[0].text, /ブラウザのlocalStorageへ直接書き込まない/);

    const created = await client.callTool({
      name: "stage_sketch_create_project_draft",
      arguments: {
        projectId: "wire-test",
        title: "通信テスト",
        scenes: [{ title: "場面 1" }],
      },
    });
    assert.equal(created.isError, undefined);
    assert.match(created.content[0].text, /wire-test/);
  } finally {
    await client.close();
  }
});

