import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const specSource = await readFile(new URL("docs/AI_PANEL_SPEC.md", root), "utf8");
const bridgeSource = await readFile(new URL("mac-app/Sources/StageSketchBridge.swift", root), "utf8");
const configSource = await readFile(new URL("mac-app/Sources/AppConfiguration.swift", root), "utf8");
const runnerSource = await readFile(new URL("mac-app/Sources/AgentRunner.swift", root), "utf8");
const selfTestSource = await readFile(new URL("mac-app/Sources/SelfTestRunner.swift", root), "utf8");

function bridgeStub(overrides = {}) {
  return {
    runAgent: async () => ({ ok: true, output: "", exitCode: 0 }),
    stopAgent: async () => false,
    agentInfo: async () => ({
      command: "/path/to/codex",
      args: "exec",
      model: "gpt-5.6-sol",
      reasoningEffort: "xhigh",
      source: "codex-config",
    }),
    writeProject: async () => ({ projectId: "show-1", revision: 1 }),
    latestPlan: async () => null,
    listEditExports: async () => [],
    readExport: async () => ({}),
    ...overrides,
  };
}

function loadPanelModel(bridge) {
  let removed = 0;
  const section = { remove() { removed += 1; } };
  const window = bridge ? { stageSketchBridge: bridge } : {};
  const document = {
    querySelectorAll(selector) {
      return selector === '[data-panel="ask"]' ? [section] : [];
    },
    getElementById() { return null; },
  };
  const context = vm.createContext({ window, document });
  vm.runInContext(stageSource, context);
  return { model: window.SHOSAI_STAGE_AI_PANEL_MODEL, removed };
}

function errorDisplay(model) {
  const element = { hidden: true, style: {}, textContent: "" };
  return {
    element,
    show(message) { model.writeError(element, message); },
  };
}

async function runPlanRequest(model, bridge, show, promptFactory = () => "prompt") {
  return model.requestPlan(
    bridge,
    { kind: "shosai-stage-sketch", version: 3, project: { id: "show-1" } },
    "指示",
    promptFactory,
    () => true,
    show,
  );
}

test("Macブリッジが無い環境ではAI指示sectionをDOMから取り除く", () => {
  const absent = loadPanelModel(null);
  assert.equal(absent.removed, 1);

  const present = loadPanelModel(bridgeStub());
  assert.equal(present.removed, 0);
});

test("AI指示欄はCommand+EnterとCtrl+Enterを実行ショートカットにする", () => {
  const { model } = loadPanelModel(bridgeStub());
  assert.equal(model.isRunShortcut({ key: "Enter", metaKey: true, ctrlKey: false }), true);
  assert.equal(model.isRunShortcut({ key: "Enter", metaKey: false, ctrlKey: true }), true);
  assert.equal(model.isRunShortcut({ key: "Enter", metaKey: false, ctrlKey: false }), false);
  assert.equal(model.isRunShortcut({ key: "Escape", metaKey: true, ctrlKey: false }), false);
  assert.match(stageSource, /askInput\?\.addEventListener\("keydown"[\s\S]*?isRunShortcut\(event\)/);
});

test("needs_clarificationの計画では採るボタンを出さない", () => {
  const { model } = loadPanelModel(bridgeStub());
  assert.equal(model.canAdopt({ status: "proposed" }), true);
  assert.equal(model.canAdopt({ status: "needs_clarification" }), false);
  assert.match(stageSource, /askAdopt\.hidden = !STAGE_AI_PANEL_MODEL\.canAdopt\(plan\)/);
});

test("AI実行権限の初回確認は承認後に一度だけ出す", () => {
  const { model } = loadPanelModel(bridgeStub());
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  let confirmations = 0;
  const confirm = () => { confirmations += 1; return true; };

  assert.equal(model.confirmPermission(storage, confirm), true);
  assert.equal(model.confirmPermission(storage, confirm), true);
  assert.equal(confirmations, 1);
  assert.equal(values.get(model.permissionKey), "accepted");
});

test("AI実行権限の初回確認を取り消したらエラー欄へ理由を表示する", () => {
  const { model } = loadPanelModel(bridgeStub());
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error("取り消し時は保存しない"); },
  };

  assert.equal(model.confirmPermission(storage, () => false), false);
  assert.match(
    stageSource,
    /if \(!allowed\) \{\s*showStageAskError\("取り消しました"\);\s*return;\s*\}/,
  );
});

test("止める経路はブリッジのstopAgentを呼ぶ", async () => {
  let calls = 0;
  const bridge = bridgeStub({
    stopAgent: async () => { calls += 1; return true; },
  });
  const { model } = loadPanelModel(bridge);

  assert.equal(await model.stopAgent(bridge), true);
  assert.equal(calls, 1);
  assert.match(stageSource, /askStop\?\.addEventListener\("click", stopStageAskRun\)/);
  assert.match(stageSource, /await STAGE_AI_PANEL_MODEL\.stopAgent\(bridge\)/);
});

test("runAgentがok:falseなら返却文を保ってAI起動エラーを表示する", async () => {
  const { model } = loadPanelModel(bridgeStub());
  const display = errorDisplay(model);
  const output = "env: node: No such file or directory\nsecond line";
  const outcome = await runPlanRequest(model, bridgeStub({
    runAgent: async () => ({ ok: false, output, exitCode: 127 }),
  }), display.show);

  assert.equal(outcome, null);
  assert.equal(display.element.hidden, false);
  assert.equal(display.element.style.whiteSpace, "pre-wrap");
  assert.equal(display.element.textContent, `AIの起動に失敗しました: ${output}`);
  assert.match(
    stageSource,
    /function adoptStageAskPlan\([\s\S]*?STAGE_AI_PANEL_MODEL\.runAgent\([\s\S]*?showStageAskError/,
  );
});

test("writeProjectが失敗したら書き出し箇所と原文を表示する", async () => {
  const { model } = loadPanelModel(bridgeStub());
  const display = errorDisplay(model);
  const outcome = await runPlanRequest(model, bridgeStub({
    writeProject: async () => { throw new Error("disk is read-only"); },
  }), display.show);

  assert.equal(outcome, null);
  assert.equal(
    display.element.textContent,
    "ショーの書き出しに失敗しました: disk is read-only",
  );
});

test("latestPlanが失敗してもAIの応答を計画読込エラーと一緒に返す", async () => {
  const { model } = loadPanelModel(bridgeStub());
  const display = errorDisplay(model);
  const output = "名前・位置・姿勢が未指定なので質問が必要です。";
  const outcome = await runPlanRequest(model, bridgeStub({
    runAgent: async () => ({ ok: true, output, exitCode: 0 }),
    latestPlan: async () => { throw new Error("plan file is unreadable"); },
  }), display.show);

  assert.equal(outcome.rawPlan, undefined);
  assert.equal(outcome.planReadError, "plan file is unreadable");
  assert.equal(outcome.output, output);
  assert.equal(display.element.hidden, true);
});

test("計画が無い場合のAI応答は末尾2000文字を残し丸めた旨を表示する", async () => {
  const { model } = loadPanelModel(bridgeStub());
  const short = model.missingPlanDetail("質問だけ返そうとしました。");
  assert.match(short, /今回の依頼に対応する編集計画を取得できませんでした。/);
  assert.match(short, /AIの応答:\n質問だけ返そうとしました。/);

  const longOutput = `先頭${"あ".repeat(2100)}末尾`;
  const long = model.missingPlanDetail(longOutput);
  assert.match(long, /長いため末尾2000文字だけ表示します/);
  assert.equal(long.endsWith(longOutput.slice(-2000)), true);
  assert.equal(long.includes("先頭"), false);
});

test("不足値は既定値で埋め、既存参照の複数候補だけ質問するようAIへ明記する", () => {
  assert.match(stageSource, /指示に含まれない値は、舞台スケッチの既定値で埋めて必ず operations を作ってください。/);
  assert.match(stageSource, /名前・位置・姿勢・向き・大きさ・色が未指定でも質問せず、既定値で配置してください。/);
  assert.match(stageSource, /questions で止まるのは、既存の演者・セットのどれを指すか複数候補があり、取り違えると既存の配置を壊す場合だけです。/);
  assert.doesNotMatch(stageSource, /operations を空配列にして questions/);
  assert.match(specSource, /未指定値は既定値で埋める（本人決定: 2026-08-09）/);
});

test("runAgentが例外を投げてもAI起動エラーとして表示する", async () => {
  const { model } = loadPanelModel(bridgeStub());
  const display = errorDisplay(model);
  const outcome = await runPlanRequest(model, bridgeStub({
    runAgent: async () => { throw new Error("process launch rejected"); },
  }), display.show);

  assert.equal(outcome, null);
  assert.equal(
    display.element.textContent,
    "AIの起動に失敗しました: process launch rejected",
  );
});

test("AI指示パネルは重複見出しを置かずsectionをaria-labelで区別する", () => {
  for (const html of [indexSource, stageHtml]) {
    const start = html.indexOf('<section class="stage-panel" data-panel="ask"');
    const end = html.indexOf("</aside>", start);
    const panel = start >= 0 && end >= 0 ? html.slice(start, end) : "";
    assert.match(
      panel,
      /<section class="stage-panel" data-panel="ask" data-title="AI指示" id="stage-ask-panel" aria-label="AI指示">/,
    );
    assert.doesNotMatch(panel, /<h2>\s*AI指示\s*<\/h2>/);
    assert.match(panel, /id="stage-ask-input"/);
    assert.match(panel, /class="btn-quiet" id="stage-ask-run"/);
    assert.doesNotMatch(html, /data-panel="AI指示"/);
  }
  assert.match(i18nSource, /"AI指示": "AI Instructions"/);
  assert.match(specSource, /^# メニュー「AI指示」— AI編集パネル 仕様書/m);
  assert.match(specSource, /data-panel="ask" data-title="AI指示"/);
});

test("AI指示パネルは既存の控えめな文字規則とボタンを使う", () => {
  assert.match(styleSource, /#stage-ask-panel,\s*#stage-ask-panel \* \{\s*font-family: var\(--sans\);/);
  assert.match(
    styleSource,
    /#stage-ask-error,\s*#stage-ask-elapsed,\s*#stage-ask-draft-body,\s*#stage-ask-agent-info \{[\s\S]*?color: rgba\(240, 231, 214, 0\.36\);[\s\S]*?font-size: 9\.5px;[\s\S]*?line-height: 1\.65;/,
  );
  assert.match(styleSource, /#stage-ask-draft-body li \{[\s\S]*?font-size: inherit;[\s\S]*?line-height: inherit;/);
  assert.doesNotMatch(indexSource, /class="stage-minor-action" id="stage-ask-run"/);
});

test("AI指示パネル下部にモデル名と推論強度を控えめに表示する", async () => {
  for (const html of [indexSource, stageHtml]) {
    assert.match(
      html,
      /<p class="stage-profile-hint" id="stage-ask-agent-info" aria-live="polite">不明<\/p>/,
    );
  }
  const { model } = loadPanelModel(bridgeStub());
  const element = { textContent: "" };
  const text = await model.renderAgentInfo(bridgeStub(), element);
  assert.equal(text, "gpt-5.6-sol / 推論 xhigh");
  assert.equal(element.textContent, text);
  assert.match(stageSource, /renderAgentInfo\(window\.stageSketchBridge, els\.askAgentInfo\)/);
});

test("agentInfoが読めない場合はモデル表示を不明にする", async () => {
  const { model } = loadPanelModel(bridgeStub());
  const element = { textContent: "読込中" };
  const bridge = bridgeStub({
    agentInfo: async () => { throw new Error("config.toml is unreadable"); },
  });
  const text = await model.renderAgentInfo(bridge, element);
  assert.equal(text, "不明");
  assert.equal(element.textContent, "不明");
  assert.equal(model.formatAgentInfo({ model: null, reasoningEffort: null }), "不明");
});

test("MacブリッジはagentInfoを公開しAgentModelだけを起動引数へ追加する", () => {
  assert.match(bridgeSource, /static let agentInfoMessage = "stageSketchAgentInfo"/);
  assert.match(bridgeSource, /agentInfo\(\) \{[\s\S]*?stageSketchAgentInfo\.postMessage/);
  assert.match(configSource, /defaults\.string\(forKey: "AgentModel"\)/);
  assert.match(configSource, /defaults\.string\(forKey: "AgentReasoningEffort"\)/);
  assert.match(configSource, /if line\.hasPrefix\("\["\) \{ break \}/);
  assert.match(configSource, /quotedValue\(in: line, key: "model"\)/);
  assert.match(configSource, /quotedValue\(in: line, key: "model_reasoning_effort"\)/);
  assert.match(
    runnerSource,
    /let modelArguments = configuredModelOverride\.map \{ \["-m", \$0\] \} \?\? \[\][\s\S]*?process\.arguments = configuredArguments \+ modelArguments \+ \[prompt\]/,
  );
  assert.match(selfTestSource, /name: "agent-info-values"/);
});
