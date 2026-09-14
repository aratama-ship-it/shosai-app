'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const model = { fixture: null, selectedCueId: null };
  const find = (items, id) => (items || []).find((item) => item.id === id) || null;
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const duration = (milliseconds) => `${Math.round((milliseconds || 0) / 1000 * 10) / 10}秒`;
  const typeClass = (type) => ({ '音響': 'type-sound', '転換': 'type-move', '進行': 'type-stage' }[type] || 'type-light');

  function anchorsFor(cueId) {
    return model.fixture.script.anchors.filter((anchor) => anchor.target?.kind === 'cue' && anchor.target.id === cueId);
  }

  function activitiesFor(anchors) {
    const ids = new Set(anchors.flatMap((anchor) => anchor.activityRefs || []));
    return model.fixture.coordination.activities.filter((activity) => ids.has(activity.id));
  }

  function estimateFor(activity) {
    const point = find(model.fixture.coordination.points, activity.endPointId);
    return point?.expression?.kind === 'after'
      ? find(model.fixture.coordination.estimates, point.expression.estimateId)
      : null;
  }

  function peopleFor(activity) {
    return activity.assignments.map((assignment) => find(model.fixture.coordination.people, assignment.personId)?.label || '未解決');
  }

  function originFor(cueId) {
    return model.fixture.coordination.origins.find((origin) => origin.cueId === cueId) || null;
  }

  function reviewFor(cueId) {
    return model.fixture.reviews.find((review) => review.subjectRefs.includes(cueId)) || null;
  }

  function selectedIndex() {
    return Math.max(0, model.fixture.script.cues.findIndex((cue) => cue.id === model.selectedCueId));
  }

  function cueStatus(cue) {
    const anchors = anchorsFor(cue.id);
    const activities = activitiesFor(anchors);
    if (!anchors.length) return { label: '台本 未割当', detail: '紙面位置と転換を要確認', anchors, activities };
    if (!activities.length) return { label: '転換 未接続', detail: 'activityを要確認', anchors, activities };
    return { label: reviewFor(cue.id)?.status === 'confirmed' ? '確認済み' : '要確認', detail: activities.map((activity) => activity.label).join(' / '), anchors, activities };
  }

  function renderActivity(activity, cue) {
    const estimate = estimateFor(activity);
    const node = make('article', 'activity');
    const head = make('div', 'activity-head');
    const title = make('div');
    title.append(make('p', 'eyebrow', '転換 activity'), make('h2', '', activity.label));
    head.append(title, make('p', 'activity-meta', `開始 ${cue.number}`));
    const facts = make('div', 'activity-facts');
    facts.append(make('span', '', `所要 `), make('strong', '', duration(estimate?.durationMs)), make('span', '', `担当 ${peopleFor(activity).join(' / ')}`));
    node.append(head, facts, make('p', 'activity-condition', estimate?.conditions || '見積条件は未記録です。'));
    return node;
  }

  function renderDetail(cue, index, status) {
    const detail = make('div', 'cue-detail');
    const previous = model.fixture.script.cues[index - 1];
    const next = model.fixture.script.cues[index + 1];
    const context = make('div', 'context-row');
    context.append(make('span', '', previous ? `前 ${previous.number} ${previous.description}` : 'この転換枠の開始'));
    context.append(make('b', '', cue.number));
    context.append(make('span', '', next ? `次 ${next.number} ${next.description}` : 'この転換枠の終端'));
    detail.append(context);
    if (status.anchors.length) {
      const anchor = status.anchors[0];
      const documentValue = find(model.fixture.script.documents, anchor.documentId);
      const reference = make('div', 'anchor-reference');
      reference.append(make('span', 'page-mark', `${documentValue?.label || '台本'} / ${anchor.pageIndex + 1}頁`), make('p', '', `「${anchor.quote}」`));
      detail.append(reference, make('p', 'source-note', '紙面位置は参照です。台本の頁全体を右パネルへ固定表示しません。'));
    } else {
      const missing = make('div', 'missing');
      missing.append(make('strong', '', '未割当'), document.createTextNode('　紙面位置・activity・担当・所要を推測で補いません。'));
      detail.append(missing);
    }
    if (status.activities.length) {
      const list = make('div', 'activity-list');
      status.activities.forEach((activity) => list.append(renderActivity(activity, cue)));
      detail.append(list);
    }
    const windowValue = model.fixture.coordination.windows[0];
    const completed = windowValue.completionActivityIds.length;
    const lastCue = model.fixture.script.cues[model.fixture.script.cues.length - 1];
    detail.append(make('p', 'window-note', `転換枠　${model.fixture.script.cues[0].number}開始 → ${lastCue.number}確認 / activity ${completed}件 / ${status.label}`));
    return detail;
  }

  function render() {
    const timeline = byId('timeline');
    timeline.replaceChildren();
    const cues = model.fixture.script.cues;
    const selected = selectedIndex();
    cues.forEach((cue, index) => {
      const status = cueStatus(cue);
      const interval = make('article', `cue-interval ${typeClass(cue.type)}${index === selected ? ' is-selected' : ''}`);
      const rail = make('div', 'cue-rail');
      rail.append(make('span', 'cue-dot'));
      const content = make('div', 'cue-content');
      const button = make('button', 'cue-select');
      button.type = 'button';
      button.setAttribute('aria-pressed', index === selected ? 'true' : 'false');
      const previousOrigin = index ? originFor(cues[index - 1].id) : null;
      const currentOrigin = originFor(cue.id);
      const delta = index && Number.isFinite(currentOrigin?.offsetFromBaseMs) && Number.isFinite(previousOrigin?.offsetFromBaseMs)
        ? `+${duration(currentOrigin.offsetFromBaseMs - previousOrigin.offsetFromBaseMs)}` : '開始';
      button.append(make('span', 'cue-number', cue.number), make('span', 'cue-label', cue.description), make('span', 'cue-meta', `${cue.type} / ${delta}`));
      button.addEventListener('click', () => select(cue.id, `${cue.number}を選択しました。`));
      content.append(button);
      if (index === selected) content.append(renderDetail(cue, index, status));
      interval.append(rail, content);
      timeline.append(interval);
    });
    const selectedCue = cues[selected];
    const unassigned = cues.filter((cue) => !anchorsFor(cue.id).length).length;
    byId('header-note').textContent = `${selectedCue.number} ${selectedCue.description} / ${selected + 1} of ${cues.length}`;
    byId('window-label').textContent = model.fixture.timeline.label;
    byId('window-summary').textContent = `${cues[0].number}–${cues[cues.length - 1].number} / ${cues.length}Q / 未割当 ${unassigned}`;
    byId('previous').disabled = selected === 0;
    byId('next').disabled = selected === cues.length - 1;
  }

  function select(cueId, message) {
    model.selectedCueId = cueId;
    render();
    byId('status').textContent = message;
  }

  async function start() {
    try {
      const response = await fetch('./workflow-timeline-fixture-2026-09-09.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`fixtureを読めません (${response.status})`);
      model.fixture = await response.json();
      model.selectedCueId = model.fixture.timeline?.focusCueId || model.fixture.script.cues[0]?.id;
      byId('previous').addEventListener('click', () => select(model.fixture.script.cues[selectedIndex() - 1]?.id, '前のQを選択しました。'));
      byId('next').addEventListener('click', () => select(model.fixture.script.cues[selectedIndex() + 1]?.id, '次のQを選択しました。'));
      render();
      byId('status').textContent = 'Q10からQ14までの前後関係を読み込みました。';
    } catch (error) {
      byId('timeline').hidden = true;
      byId('load-error').hidden = false;
      byId('load-error').textContent = `表示を作れませんでした: ${error.message}。HTTPサーバーから開いてください。`;
    }
  }

  start();
})();
