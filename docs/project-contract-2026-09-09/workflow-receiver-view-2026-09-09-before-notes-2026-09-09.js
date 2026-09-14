'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const model = { fixture: null, recipientId: null, cueId: null, checks: new Set() };
  const find = (items, id) => (items || []).find((item) => item.id === id) || null;
  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const duration = (milliseconds) => `${Math.round((milliseconds || 0) / 100) / 10}秒`;

  function currentCue() {
    return find(model.fixture.script.cues, model.cueId);
  }

  function currentRecipient() {
    return find(model.fixture.distribution.recipients, model.recipientId);
  }

  function cueIndex(cueId = model.cueId) {
    return Math.max(0, model.fixture.script.cues.findIndex((cue) => cue.id === cueId));
  }

  function stageState(cueId = model.cueId) {
    return model.fixture.webViewer.stageStates.find((state) => state.cueId === cueId) || null;
  }

  function assignmentFor(recipientId, cueId) {
    return model.fixture.distribution.cueAssignments.find((assignment) => (
      assignment.cueId === cueId && assignment.recipientRefs.includes(recipientId)
    )) || null;
  }

  function anchorsFor(cueId) {
    return model.fixture.script.anchors.filter((anchor) => anchor.target?.kind === 'cue' && anchor.target.id === cueId);
  }

  function activitiesFor(cueId) {
    const activityIds = new Set(anchorsFor(cueId).flatMap((anchor) => anchor.activityRefs || []));
    return model.fixture.coordination.activities.filter((activity) => activityIds.has(activity.id));
  }

  function originFor(cueId) {
    return model.fixture.coordination.origins.find((origin) => origin.cueId === cueId) || null;
  }

  function deltaFor(cue, index) {
    if (!index) return '開始';
    const previous = originFor(model.fixture.script.cues[index - 1].id);
    const current = originFor(cue.id);
    if (!Number.isFinite(previous?.offsetFromBaseMs) || !Number.isFinite(current?.offsetFromBaseMs)) return '要確認';
    return `+${duration(current.offsetFromBaseMs - previous.offsetFromBaseMs)}`;
  }

  function renderRecipientOptions() {
    const select = byId('recipient');
    select.replaceChildren();
    const groups = [['overview', '全体'], ['department', '部門'], ['person', '個人']];
    groups.forEach(([kind, label]) => {
      const recipients = model.fixture.distribution.recipients.filter((item) => item.kind === kind);
      if (!recipients.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      recipients.forEach((recipient) => {
        group.append(new Option(`${recipient.label} — ${recipient.subtitle}`, recipient.id, false, recipient.id === model.recipientId));
      });
      select.append(group);
    });
  }

  function renderStageMap(state) {
    const map = byId('stage-map');
    map.replaceChildren(make('span', 'stage-upstage', '奥'));
    state.pieces.forEach((piece) => {
      const node = make('span', `stage-piece ${piece.kind === 'performer' ? 'is-performer' : 'is-set'}`, piece.label);
      node.style.left = `${piece.u * 100}%`;
      node.style.top = `${piece.v * 100}%`;
      node.setAttribute('aria-label', `${piece.label}の位置`);
      map.append(node);
    });
  }

  function renderStage() {
    const cue = currentCue();
    const state = stageState();
    byId('stage-title').textContent = state.sceneLabel;
    byId('stage-time').textContent = `${cue.number} / ${deltaFor(cue, cueIndex())}`;
    renderStageMap(state);
    byId('stage-brief').replaceChildren(
      make('dt', '', 'いまの状況'), make('dd', '', state.status),
      make('dt', '', '舞台メモ'), make('dd', '', state.stageNote),
      make('dt', '', '表示の範囲'), make('dd', '', '架空fixtureの舞台配置。実舞台・カメラ・位置追跡ではありません。'),
    );
  }

  function selectCue(cueId) {
    if (!find(model.fixture.script.cues, cueId)) return;
    model.cueId = cueId;
    model.checks.clear();
    render();
  }

  function renderRail() {
    const rail = byId('cue-rail');
    rail.replaceChildren();
    model.fixture.script.cues.forEach((cue, index) => {
      const button = make('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(cue.id === model.cueId));
      button.append(make('strong', '', cue.number), make('span', '', `${cue.type} / ${deltaFor(cue, index)}`));
      button.addEventListener('click', () => selectCue(cue.id));
      rail.append(button);
    });
  }

  function nextDirectAssignment() {
    const start = cueIndex();
    for (let index = start + 1; index < model.fixture.script.cues.length; index += 1) {
      const cue = model.fixture.script.cues[index];
      const assignment = assignmentFor(model.recipientId, cue.id);
      if (assignment) return { cue, assignment };
    }
    return null;
  }

  function renderChecklist(cue, assignment, hasAnchor) {
    const next = nextDirectAssignment();
    const labels = [
      `舞台状況「${stageState().status}」を読んだ`,
      assignment ? `自分の操作「${assignment.instruction}」を読んだ` : (next ? `次の自分の操作「${next.cue.number} ${next.assignment.instruction}」を確認した` : '自分の操作はこの転換枠にありません'),
      hasAnchor ? '台本参照と転換activityの有無を確認した' : '未割当のまま要確認と認識した',
    ];
    const list = byId('checklist');
    list.replaceChildren();
    labels.forEach((label, index) => {
      const key = `${model.recipientId}/${cue.id}/${index}`;
      const row = make('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = model.checks.has(key);
      input.addEventListener('change', () => {
        if (input.checked) model.checks.add(key);
        else model.checks.delete(key);
      });
      row.append(input, make('span', '', label));
      list.append(row);
    });
  }

  function renderNeighbors() {
    const index = cueIndex();
    const root = byId('neighbors');
    root.replaceChildren();
    [['前', model.fixture.script.cues[index - 1]], ['現在', currentCue()], ['次', model.fixture.script.cues[index + 1]]].forEach(([relation, cue]) => {
      const row = make('div', 'neighbor');
      if (!cue) {
        row.append(make('strong', '', relation), make('p', '', 'この転換枠にはありません。'));
      } else {
        const assignment = assignmentFor(model.recipientId, cue.id);
        row.append(make('strong', '', `${relation} ${cue.number}`), make('p', '', `${cue.description} / ${assignment ? `操作: ${assignment.instruction}` : '前後参照'}`));
      }
      root.append(row);
    });
  }

  function renderOperator() {
    const cue = currentCue();
    const recipient = currentRecipient();
    const assignment = assignmentFor(recipient.id, cue.id);
    const hasAnchor = anchorsFor(cue.id).length > 0;
    const hasActivities = activitiesFor(cue.id).length > 0;
    const index = cueIndex();
    byId('operator-title').textContent = `${recipient.label}の確認`;
    byId('operator-subtitle').textContent = recipient.subtitle;
    byId('current-cue').textContent = `${cue.number} / ${cue.type}`;
    byId('task-title').textContent = `${cue.number}　${cue.description}`;
    const copy = byId('task-copy');
    copy.replaceChildren(make('span', assignment ? 'is-direct' : '', assignment ? '自分の操作。' : '前後参照。'));
    copy.append(document.createTextNode(` ${assignment?.instruction || 'このQでは直接の操作を持ちません。'} 舞台は「${stageState().status}」。`));
    const warning = byId('warning');
    warning.replaceChildren();
    if (!hasAnchor) {
      const node = make('div', 'warning');
      node.append(make('strong', '', '未割当'), document.createTextNode('　紙面位置・転換activity・担当・所要を推測で補いません。'));
      warning.append(node);
    } else if (!hasActivities) {
      const node = make('div', 'warning');
      node.append(make('strong', '', '転換未接続'), document.createTextNode('　activityを推測で補いません。'));
      warning.append(node);
    }
    renderChecklist(cue, assignment, hasAnchor);
    renderNeighbors();
    byId('previous').disabled = index === 0;
    byId('next').disabled = index === model.fixture.script.cues.length - 1;
    byId('operator-foot').textContent = model.fixture.webViewer.checkPolicy.note;
  }

  function render() {
    renderRecipientOptions();
    renderStage();
    renderRail();
    renderOperator();
  }

  function selectRecipient(recipientId) {
    model.recipientId = recipientId;
    if (!assignmentFor(recipientId, model.cueId)) {
      const first = model.fixture.distribution.cueAssignments.find((assignment) => assignment.recipientRefs.includes(recipientId));
      if (first) model.cueId = first.cueId;
    }
    model.checks.clear();
    render();
  }

  async function start() {
    try {
      const response = await fetch('./workflow-timeline-fixture-2026-09-09.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`fixtureを読めません (${response.status})`);
      model.fixture = await response.json();
      if (!model.fixture.webViewer?.stageStates?.length || model.fixture.webViewer.checkPolicy?.persist !== false) {
        throw new Error('受け手画面の舞台状態または確認欄の契約がありません');
      }
      model.recipientId = model.fixture.distribution.recipients.find((recipient) => recipient.id === 'recipient-sound')?.id || model.fixture.distribution.recipients[0]?.id;
      model.cueId = model.fixture.webViewer.focusCueId || model.fixture.script.cues[0]?.id;
      byId('recipient').addEventListener('change', (event) => selectRecipient(event.target.value));
      byId('previous').addEventListener('click', () => selectCue(model.fixture.script.cues[cueIndex() - 1]?.id));
      byId('next').addEventListener('click', () => selectCue(model.fixture.script.cues[cueIndex() + 1]?.id));
      render();
    } catch (error) {
      byId('split').hidden = true;
      byId('load-error').hidden = false;
      byId('load-error').textContent = `表示を作れませんでした: ${error.message}。HTTPサーバーから開いてください。`;
    }
  }

  start();
})();
