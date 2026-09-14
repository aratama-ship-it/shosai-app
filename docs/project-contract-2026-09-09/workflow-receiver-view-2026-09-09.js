'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const model = {
    fixture: null,
    recipientId: null,
    cueId: null,
    checks: new Set(),
    notes: { scenes: {}, cues: {}, annotations: {} },
    annotationTool: 'select',
    selectedAnnotationId: null,
    pendingArrow: null,
  };
  const find = (items, id) => (items || []).find((item) => item.id === id) || null;
  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const duration = (milliseconds) => `${Math.round((milliseconds || 0) / 100) / 10}秒`;

  function noteStorageKey() {
    return `shosai-workflow-fixture-notes-v1/${model.fixture.projectBinding.projectId}/${model.recipientId}`;
  }

  function cleanNotes(value) {
    return {
      scenes: value?.scenes && typeof value.scenes === 'object' ? value.scenes : {},
      cues: value?.cues && typeof value.cues === 'object' ? value.cues : {},
      annotations: value?.annotations && typeof value.annotations === 'object' ? value.annotations : {},
    };
  }

  function loadNotes() {
    try {
      model.notes = cleanNotes(JSON.parse(window.localStorage.getItem(noteStorageKey()) || '{}'));
    } catch {
      model.notes = { scenes: {}, cues: {}, annotations: {} };
    }
  }

  function saveNotes(statusId, message = 'このブラウザに保存しました。共有されません。') {
    try {
      window.localStorage.setItem(noteStorageKey(), JSON.stringify(model.notes));
      if (statusId) byId(statusId).textContent = message;
    } catch {
      if (statusId) byId(statusId).textContent = 'このブラウザに保存できませんでした。';
    }
  }

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

  function annotationsForScene() {
    const annotations = model.notes.annotations[stageState().sceneRef];
    return Array.isArray(annotations) ? annotations : [];
  }

  function selectedAnnotation() {
    return annotationsForScene().find((annotation) => annotation.id === model.selectedAnnotationId) || null;
  }

  function createAnnotationId() {
    return `annotation-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function stagePoint(event) {
    const bounds = byId('stage-map').getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  }

  function saveAnnotations(message) {
    saveNotes('annotation-status', message || '舞台への書き込みをこのブラウザに保存しました。共有されません。');
  }

  function annotationLabel(annotation, index) {
    return annotation.kind === 'arrow'
      ? `矢印 ${index + 1}`
      : `付箋 ${index + 1}`;
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
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'stage-annotation-layer');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'annotation-arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    head.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    head.setAttribute('fill', '#ddc58d');
    marker.append(head);
    defs.append(marker);
    svg.append(defs);
    annotationsForScene().filter((annotation) => annotation.kind === 'arrow').forEach((annotation) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'stage-annotation-arrow');
      path.setAttribute('d', `M ${annotation.from.x * 1000} ${annotation.from.y * 1000} L ${annotation.to.x * 1000} ${annotation.to.y * 1000}`);
      svg.append(path);
    });
    map.append(svg);
    annotationsForScene().forEach((annotation, index) => {
      if (annotation.kind !== 'note') return;
      const node = make('button', `stage-annotation-note${annotation.id === model.selectedAnnotationId ? ' is-selected' : ''}`, annotation.text || 'メモ');
      node.type = 'button';
      node.style.left = `${annotation.at.x * 100}%`;
      node.style.top = `${annotation.at.y * 100}%`;
      node.setAttribute('aria-label', `${annotationLabel(annotation, index)}を選択`);
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        model.annotationTool = 'select';
        model.selectedAnnotationId = annotation.id;
        renderStageMap(stageState());
        renderAnnotationControls();
      });
      map.append(node);
    });
    map.dataset.annotationTool = model.annotationTool;
    map.setAttribute('aria-label', `現在の架空舞台配置。自分の書き込み ${annotationsForScene().length}件`);
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
    renderAnnotationControls();
  }

  function renderAnnotationControls() {
    const annotations = annotationsForScene();
    const selected = selectedAnnotation();
    document.querySelectorAll('[data-annotation-tool]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.annotationTool === model.annotationTool));
    });
    byId('annotation-help').textContent = ({
      select: '付箋を選ぶと内容を編集できます。矢印は一覧から選択・消去できます。',
      arrow: '舞台上で始点から終点までドラッグすると矢印を置きます。',
      note: '舞台上の置きたい場所をクリックすると付箋を置きます。',
    }[model.annotationTool] || '配置メモを選択できます。');
    const copy = byId('annotation-copy');
    const deleteButton = byId('annotation-delete');
    if (selected?.kind === 'note') {
      byId('annotation-editor-title').textContent = '選択中の付箋';
      copy.disabled = false;
      copy.value = selected.text || '';
      deleteButton.disabled = false;
    } else if (selected?.kind === 'arrow') {
      byId('annotation-editor-title').textContent = '選択中の矢印';
      copy.disabled = true;
      copy.value = '矢印には本文を付けません。';
      deleteButton.disabled = false;
    } else {
      byId('annotation-editor-title').textContent = '配置メモを選択';
      copy.disabled = true;
      copy.value = '';
      deleteButton.disabled = true;
    }
    const list = byId('annotation-list');
    list.replaceChildren();
    if (!annotations.length) {
      list.append(make('p', 'annotation-help', 'このシーンには自分の配置メモがありません。'));
    } else {
      annotations.forEach((annotation, index) => {
        const button = make('button');
        button.type = 'button';
        button.setAttribute('aria-pressed', String(annotation.id === model.selectedAnnotationId));
        button.append(
          make('strong', '', annotationLabel(annotation, index)),
          make('span', '', annotation.kind === 'note' ? (annotation.text || '本文なし') : '舞台上の方向を示す矢印'),
        );
        button.addEventListener('click', () => {
          model.annotationTool = 'select';
          model.selectedAnnotationId = annotation.id;
          renderStageMap(stageState());
          renderAnnotationControls();
        });
        list.append(button);
      });
    }
    if (!byId('annotation-status').textContent) {
      byId('annotation-status').textContent = model.fixture.webViewer.annotationPolicy.note;
    }
  }

  function addAnnotation(annotation, message) {
    const sceneRef = stageState().sceneRef;
    const annotations = annotationsForScene();
    model.notes.annotations[sceneRef] = [...annotations, annotation];
    model.selectedAnnotationId = annotation.id;
    model.annotationTool = 'select';
    saveAnnotations(message);
    renderStageMap(stageState());
    renderAnnotationControls();
  }

  function deleteSelectedAnnotation() {
    const selected = selectedAnnotation();
    if (!selected) return;
    const sceneRef = stageState().sceneRef;
    model.notes.annotations[sceneRef] = annotationsForScene().filter((annotation) => annotation.id !== selected.id);
    model.selectedAnnotationId = null;
    saveAnnotations('選択した書き込みを消去し、このブラウザに保存しました。');
    renderStageMap(stageState());
    renderAnnotationControls();
  }

  function renderNotes() {
    const recipient = currentRecipient();
    const cue = currentCue();
    const state = stageState();
    byId('scene-memo-title').textContent = `${recipient.label}のシーンメモ`;
    byId('cue-memo-title').textContent = `${recipient.label}の${cue.number}メモ`;
    byId('scene-memo').value = model.notes.scenes[state.sceneRef] || '';
    byId('cue-memo').value = model.notes.cues[cue.id] || '';
    byId('scene-memo-status').textContent = model.fixture.webViewer.notePolicy.note;
    byId('cue-memo-status').textContent = model.fixture.webViewer.notePolicy.note;
  }

  function setSceneMemo(value, statusId, message) {
    model.notes.scenes[stageState().sceneRef] = value;
    saveNotes(statusId, message);
  }

  function setCueMemo(value, statusId, message) {
    model.notes.cues[model.cueId] = value;
    saveNotes(statusId, message);
  }

  function selectCue(cueId) {
    if (!find(model.fixture.script.cues, cueId)) return;
    model.cueId = cueId;
    model.checks.clear();
    model.selectedAnnotationId = null;
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
    renderNotes();
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
    model.annotationTool = 'select';
    model.selectedAnnotationId = null;
    loadNotes();
    render();
  }

  function bindNotes() {
    byId('scene-memo').addEventListener('input', (event) => setSceneMemo(event.target.value));
    byId('cue-memo').addEventListener('input', (event) => setCueMemo(event.target.value));
    byId('scene-memo-save').addEventListener('click', () => setSceneMemo(byId('scene-memo').value, 'scene-memo-status'));
    byId('cue-memo-save').addEventListener('click', () => setCueMemo(byId('cue-memo').value, 'cue-memo-status'));
    byId('scene-memo-clear').addEventListener('click', () => {
      setSceneMemo('', 'scene-memo-status', 'シーンメモを消去し、このブラウザに保存しました。');
      byId('scene-memo').value = '';
    });
    byId('cue-memo-clear').addEventListener('click', () => {
      setCueMemo('', 'cue-memo-status', 'Qメモを消去し、このブラウザに保存しました。');
      byId('cue-memo').value = '';
    });
  }

  function bindStageAnnotations() {
    document.querySelectorAll('[data-annotation-tool]').forEach((button) => {
      button.addEventListener('click', () => {
        model.annotationTool = button.dataset.annotationTool;
        model.pendingArrow = null;
        renderStageMap(stageState());
        renderAnnotationControls();
      });
    });
    byId('stage-map').addEventListener('pointerdown', (event) => {
      if (event.target.closest('.stage-annotation-note')) return;
      if (model.annotationTool === 'arrow') {
        model.pendingArrow = stagePoint(event);
        byId('stage-map').setPointerCapture?.(event.pointerId);
        byId('annotation-status').textContent = '終点までドラッグしてください。';
      }
      if (model.annotationTool === 'note') {
        const at = stagePoint(event);
        addAnnotation({ id: createAnnotationId(), kind: 'note', at, text: 'メモ' }, '付箋をこのブラウザに保存しました。内容を編集できます。');
        requestAnimationFrame(() => byId('annotation-copy').focus());
      }
    });
    byId('stage-map').addEventListener('pointerup', (event) => {
      if (!model.pendingArrow) return;
      const from = model.pendingArrow;
      const to = stagePoint(event);
      model.pendingArrow = null;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length < 0.03) {
        byId('annotation-status').textContent = '矢印は少し距離を取ってドラッグしてください。';
        return;
      }
      addAnnotation({ id: createAnnotationId(), kind: 'arrow', from, to }, '矢印をこのブラウザに保存しました。');
    });
    byId('annotation-copy').addEventListener('input', (event) => {
      const selected = selectedAnnotation();
      if (!selected || selected.kind !== 'note') return;
      selected.text = event.target.value;
      saveAnnotations();
      renderStageMap(stageState());
    });
    byId('annotation-delete').addEventListener('click', deleteSelectedAnnotation);
  }

  function runArrowGestureVerification() {
    if (new URLSearchParams(window.location.search).get('verify') !== 'arrow') return;
    const map = byId('stage-map');
    const sceneRef = stageState().sceneRef;
    model.notes.annotations[sceneRef] = annotationsForScene().filter((annotation) => !annotation.verification);
    model.selectedAnnotationId = null;
    model.annotationTool = 'arrow';
    renderStageMap(stageState());
    renderAnnotationControls();
    requestAnimationFrame(() => {
      const bounds = map.getBoundingClientRect();
      if (!window.PointerEvent || !bounds.width || !bounds.height) {
        byId('annotation-status').textContent = '検証を開始できませんでした。PointerEvent または舞台の寸法を確認してください。';
        return;
      }
      const before = new Set(annotationsForScene().map((annotation) => annotation.id));
      const makePointer = (type, x, y) => new PointerEvent(type, {
        bubbles: true,
        clientX: bounds.left + bounds.width * x,
        clientY: bounds.top + bounds.height * y,
        pointerId: 709,
        pointerType: 'mouse',
      });
      map.dispatchEvent(makePointer('pointerdown', 0.26, 0.66));
      map.dispatchEvent(makePointer('pointerup', 0.68, 0.34));
      const created = annotationsForScene().find((annotation) => !before.has(annotation.id));
      if (!created || created.kind !== 'arrow') {
        byId('annotation-status').textContent = '検証に失敗しました。矢印は作成されませんでした。';
        return;
      }
      created.verification = true;
      saveAnnotations('検証: pointerdown → pointerup で矢印を作成し、このブラウザへの保存まで確認しました。テスト用の矢印は「選択を消去」で消せます。');
      renderStageMap(stageState());
      renderAnnotationControls();
    });
  }

  async function start() {
    try {
      const response = await fetch('./workflow-timeline-fixture-2026-09-09.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`fixtureを読めません (${response.status})`);
      model.fixture = await response.json();
      if (!model.fixture.webViewer?.stageStates?.length || model.fixture.webViewer.checkPolicy?.persist !== false) {
        throw new Error('受け手画面の舞台状態または確認欄の契約がありません');
      }
      if (model.fixture.webViewer.notePolicy?.storage !== 'browser-local' || model.fixture.webViewer.notePolicy?.sharing !== 'none') {
        throw new Error('メモの保存範囲がありません');
      }
      if (model.fixture.webViewer.annotationPolicy?.storage !== 'browser-local' || model.fixture.webViewer.annotationPolicy?.sharing !== 'none') {
        throw new Error('舞台への書き込み範囲がありません');
      }
      model.recipientId = model.fixture.distribution.recipients.find((recipient) => recipient.id === 'recipient-sound')?.id || model.fixture.distribution.recipients[0]?.id;
      model.cueId = model.fixture.webViewer.focusCueId || model.fixture.script.cues[0]?.id;
      loadNotes();
      byId('recipient').addEventListener('change', (event) => selectRecipient(event.target.value));
      byId('previous').addEventListener('click', () => selectCue(model.fixture.script.cues[cueIndex() - 1]?.id));
      byId('next').addEventListener('click', () => selectCue(model.fixture.script.cues[cueIndex() + 1]?.id));
      bindNotes();
      bindStageAnnotations();
      render();
      runArrowGestureVerification();
    } catch (error) {
      byId('split').hidden = true;
      byId('load-error').hidden = false;
      byId('load-error').textContent = `表示を作れませんでした: ${error.message}。HTTPサーバーから開いてください。`;
    }
  }

  start();
})();
