'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const model = { fixture: null, selectedCueId: null };
  const text = (value) => value == null ? '' : String(value);
  const findById = (items, id) => (items || []).find((item) => item.id === id) || null;
  const duration = (milliseconds) => `${Math.round((milliseconds || 0) / 1000)}秒`;

  function cueForAnchor(anchor) {
    return anchor?.target?.kind === 'cue'
      ? findById(model.fixture.script.cues, anchor.target.id)
      : null;
  }

  function anchorsForCue(cueId) {
    return (model.fixture.script.anchors || []).filter((anchor) => cueForAnchor(anchor)?.id === cueId);
  }

  function activitiesForAnchors(anchors) {
    const ids = new Set(anchors.flatMap((anchor) => anchor.activityRefs || []));
    return (model.fixture.coordination.activities || []).filter((activity) => ids.has(activity.id));
  }

  function selectedCue() {
    return findById(model.fixture.script.cues, model.selectedCueId) || model.fixture.script.cues[0];
  }

  function setStatus(message) {
    byId('status').textContent = message;
  }

  function renderCueList(cue) {
    const list = byId('cue-list');
    list.replaceChildren();
    model.fixture.script.cues.forEach((item) => {
      const anchors = anchorsForCue(item.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cue-row${item.id === cue.id ? ' is-selected' : ''}`;
      button.setAttribute('aria-pressed', item.id === cue.id ? 'true' : 'false');
      button.innerHTML = '<span class="cue-number"></span><span class="cue-detail"><span class="cue-type"></span><span class="cue-description"></span></span><span class="cue-state"></span>';
      button.querySelector('.cue-number').textContent = item.number;
      button.querySelector('.cue-type').textContent = item.type;
      button.querySelector('.cue-description').textContent = item.description;
      button.querySelector('.cue-state').textContent = anchors.length ? '紙面あり' : '未割当';
      button.addEventListener('click', () => selectCue(item.id, 'Qを選択しました。'));
      list.append(button);
    });
  }

  function renderPaper(cue, anchors) {
    const documentRecord = model.fixture.script.documents[0];
    byId('document-label').textContent = `${documentRecord.label} / 1頁`;
    byId('paper-copy').textContent = anchors.length
      ? '合同fixture用の位置図です。実PDFを描画・保存する画面ではありません。'
      : 'このQには、fixture上の台本位置がまだ割り当てられていません。';
    const page = byId('paper-page');
    page.querySelector('.anchor-marker')?.remove();
    page.querySelector('.anchor-quote')?.remove();
    if (!anchors.length) return;

    const anchor = anchors[0];
    const [left, top, right, bottom] = anchor.rect;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'anchor-marker';
    marker.style.left = `${left * 100}%`;
    marker.style.top = `${top * 100}%`;
    marker.style.width = `${(right - left) * 100}%`;
    marker.style.height = `${Math.max((bottom - top) * 100, 7)}%`;
    marker.setAttribute('aria-label', `${cue.number}の台本位置。${anchor.quote}`);
    marker.textContent = cue.number;
    marker.addEventListener('click', () => selectCue(cue.id, '台本位置を選択しました。'));
    const quote = document.createElement('p');
    quote.className = 'anchor-quote';
    quote.textContent = `「${anchor.quote}」`;
    page.append(marker, quote);
  }

  function pointLabel(pointId) {
    const point = findById(model.fixture.coordination.points, pointId);
    if (!point) return '未定義';
    if (point.expression?.kind === 'anchor') return 'Qの開始';
    if (point.expression?.kind === 'after') {
      const estimate = findById(model.fixture.coordination.estimates, point.expression.estimateId);
      return `開始から${duration(estimate?.durationMs)}`;
    }
    return '時点';
  }

  function renderActivity(cue, activities) {
    const area = byId('activity-area');
    area.replaceChildren();
    if (!activities.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<strong>転換は未作成</strong><p>紙面位置、担当、所要時間を自動で補いません。</p>';
      area.append(empty);
      return;
    }
    activities.forEach((activity) => {
      const estimate = findById(
        model.fixture.coordination.estimates,
        findById(model.fixture.coordination.points, activity.endPointId)?.expression?.estimateId,
      );
      const card = document.createElement('article');
      card.className = 'activity-card';
      card.tabIndex = 0;
      card.innerHTML = '<p class="activity-kicker">転換 activity</p><h3></h3><div class="time-line"><span></span><i></i><span></span></div><p class="time-label"></p><p class="people"></p><p class="activity-note"></p>';
      card.querySelector('h3').textContent = activity.label;
      const times = card.querySelectorAll('.time-line span');
      times[0].textContent = cue.number;
      times[1].textContent = pointLabel(activity.endPointId);
      card.querySelector('.time-label').textContent = `${pointLabel(activity.startPointId)} → ${duration(estimate?.durationMs)} → ${pointLabel(activity.endPointId)}`;
      const people = activity.assignments.map((assignment) => findById(model.fixture.coordination.people, assignment.personId)?.label || '未解決');
      card.querySelector('.people').textContent = `担当 ${people.join(' / ')}`;
      card.querySelector('.activity-note').textContent = estimate?.conditions || '見積条件は未記録です。';
      const announce = () => setStatus(`${activity.label}を確認中。${people.join('と')}の担当、所要${duration(estimate?.durationMs)}。`);
      card.addEventListener('click', announce);
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') announce(); });
      area.append(card);
    });
  }

  function renderFacts(cue, anchors, activities) {
    byId('q-name').textContent = cue.number;
    byId('q-description').textContent = `${cue.type} / ${cue.description}`;
    byId('anchor-count').textContent = anchors.length ? `紙面位置 ${anchors.length}件` : '紙面位置 未割当';
    byId('activity-count').textContent = activities.length ? `転換 ${activities.length}件` : '転換 未作成';
    const review = (model.fixture.reviews || []).find((item) => item.subjectRefs.includes(cue.id));
    byId('review-status').textContent = review?.status === 'confirmed' ? '確認済み' : '要確認';
  }

  function render() {
    const cue = selectedCue();
    const anchors = anchorsForCue(cue.id);
    const activities = activitiesForAnchors(anchors);
    renderCueList(cue);
    renderPaper(cue, anchors);
    renderActivity(cue, activities);
    renderFacts(cue, anchors, activities);
  }

  function selectCue(id, message) {
    model.selectedCueId = id;
    render();
    setStatus(message || '表示を更新しました。');
  }

  async function start() {
    try {
      const response = await fetch('./project-workflow-fixture-2026-09-09.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`fixtureを読めません (${response.status})`);
      model.fixture = await response.json();
      model.selectedCueId = model.fixture.script.cues[0]?.id || null;
      if (!model.selectedCueId) throw new Error('cueがありません');
      render();
      setStatus('fixtureを読み込みました。Q、台本位置、転換を順に確認できます。');
    } catch (error) {
      byId('workspace').hidden = true;
      byId('load-error').hidden = false;
      byId('load-error').textContent = `表示を作れませんでした: ${text(error.message)}。HTTPサーバーから開いてください。`;
    }
  }

  start();
})();
