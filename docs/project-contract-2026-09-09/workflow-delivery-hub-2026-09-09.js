'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const model = { fixture: null, selectedRecipientId: null };
  const find = (items, id) => (items || []).find((item) => item.id === id) || null;
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const duration = (milliseconds) => `${Math.round((milliseconds || 0) / 1000 * 10) / 10}秒`;
  const kindLabel = (kind) => ({ overview: '全体', department: '部門', person: '個人' }[kind] || '出力先');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  function anchorsFor(cueId) {
    return model.fixture.script.anchors.filter((anchor) => anchor.target?.kind === 'cue' && anchor.target.id === cueId);
  }

  function activitiesFor(cueId) {
    const ids = new Set(anchorsFor(cueId).flatMap((anchor) => anchor.activityRefs || []));
    return model.fixture.coordination.activities.filter((activity) => ids.has(activity.id));
  }

  function peopleFor(activity) {
    return activity.assignments
      .map((assignment) => find(model.fixture.coordination.people, assignment.personId)?.label || '未解決')
      .join(' / ');
  }

  function originFor(cueId) {
    return model.fixture.coordination.origins.find((origin) => origin.cueId === cueId) || null;
  }

  function timeFor(cue, index) {
    if (!index) return '開始';
    const previous = originFor(model.fixture.script.cues[index - 1].id);
    const current = originFor(cue.id);
    if (!Number.isFinite(previous?.offsetFromBaseMs) || !Number.isFinite(current?.offsetFromBaseMs)) return '要確認';
    return `+${duration(current.offsetFromBaseMs - previous.offsetFromBaseMs)}`;
  }

  function recipient() {
    return find(model.fixture.distribution.recipients, model.selectedRecipientId);
  }

  function assignmentsFor(recipientId) {
    return model.fixture.distribution.cueAssignments.filter((assignment) => assignment.recipientRefs.includes(recipientId));
  }

  function sheetEntries(recipientValue) {
    const cues = model.fixture.script.cues;
    const assignments = assignmentsFor(recipientValue.id);
    const actions = new Map(assignments.map((assignment) => [assignment.cueId, assignment]));
    const contexts = new Set();
    if (model.fixture.distribution.contextPolicy?.includeAdjacentCues && recipientValue.kind !== 'overview') {
      cues.forEach((cue, index) => {
        if (!actions.has(cue.id)) return;
        if (cues[index - 1]) contexts.add(cues[index - 1].id);
        if (cues[index + 1]) contexts.add(cues[index + 1].id);
      });
    }
    return cues.flatMap((cue, index) => {
      const assignment = actions.get(cue.id) || null;
      if (!assignment && !contexts.has(cue.id)) return [];
      const activities = activitiesFor(cue.id);
      const anchored = anchorsFor(cue.id).length > 0;
      return [{ cue, index, assignment, activities, anchored, relation: assignment ? '操作' : '前後参照' }];
    });
  }

  function renderRecipientList() {
    const root = byId('recipient-list');
    root.replaceChildren();
    const groups = [
      ['overview', '全体'],
      ['department', '部門別'],
      ['person', '個人別'],
    ];
    groups.forEach(([kind, label]) => {
      const values = model.fixture.distribution.recipients.filter((item) => item.kind === kind);
      if (!values.length) return;
      const group = make('fieldset', 'recipient-group');
      group.append(make('legend', '', label));
      values.forEach((item) => {
        const button = make('button', 'recipient');
        button.type = 'button';
        button.setAttribute('aria-pressed', String(item.id === model.selectedRecipientId));
        const copy = make('span');
        copy.append(make('strong', '', item.label), make('span', '', item.subtitle));
        const type = make('span', 'recipient-kind', kindLabel(item.kind));
        type.dataset.kind = kindLabel(item.kind);
        button.append(copy, type);
        button.addEventListener('click', () => selectRecipient(item.id, `${item.label}用のQシートを選択しました。`));
        group.append(button);
      });
      root.append(group);
    });
  }

  function renderSheet() {
    const value = recipient();
    const entries = sheetEntries(value);
    const actions = entries.filter((entry) => entry.assignment);
    const contexts = entries.length - actions.length;
    const unassigned = entries.filter((entry) => !entry.anchored);
    byId('output-title').textContent = `${value.label}用 Qシート`;
    byId('output-summary').textContent = `操作 ${actions.length}Q / 参照 ${contexts}Q`;
    byId('output-note').replaceChildren(
      document.createTextNode('操作Qを主表示にし、前後Qは参照として残します。'),
      unassigned.length ? make('strong', '', ` 未割当 ${unassigned.length}Q`) : document.createTextNode(''),
    );
    const list = byId('sheet');
    list.replaceChildren();
    entries.forEach((entry) => {
      const row = make('li', `sheet-row ${entry.assignment ? 'is-action' : 'is-context'}`);
      row.append(make('span', 'time', timeFor(entry.cue, entry.index)));
      const copy = make('div');
      copy.append(make('strong', '', `${entry.cue.number}　${entry.cue.description}`));
      const activityText = entry.activities.length
        ? entry.activities.map((activity) => `${activity.label}（${peopleFor(activity)}）`).join(' / ')
        : '転換activity 未接続';
      const instruction = entry.assignment?.instruction || '前後の関係を確認';
      copy.append(make('p', '', `${entry.cue.type} / ${instruction} / ${activityText}`));
      if (!entry.anchored) {
        const missing = make('p', 'missing');
        missing.append(make('strong', '', '未割当'), document.createTextNode('　紙面位置・転換activity・担当・所要を推測で補いません。'));
        copy.append(missing);
      }
      row.append(copy, make('span', 'relation', entry.relation));
      list.append(row);
    });
  }

  function render() {
    renderRecipientList();
    renderSheet();
  }

  function selectRecipient(id, message) {
    model.selectedRecipientId = id;
    render();
    byId('status').textContent = message;
  }

  function printDocument(value, entries) {
    const safeTitle = escapeHtml(`${value.label}用 Qシート`);
    const rows = entries.map((entry) => {
      const activityText = entry.activities.length
        ? entry.activities.map((activity) => `${activity.label}（${peopleFor(activity)}）`).join(' / ')
        : '転換activity 未接続';
      const status = entry.anchored ? '台本位置 確認済み' : '未割当：推測で補いません';
      return `<tr><td>${escapeHtml(entry.relation)}</td><td>${escapeHtml(timeFor(entry.cue, entry.index))}</td><td>${escapeHtml(entry.cue.number)}</td><td>${escapeHtml(entry.cue.type)}</td><td><strong>${escapeHtml(entry.cue.description)}</strong><br><small>${escapeHtml(entry.assignment?.instruction || '前後の関係を確認')}</small></td><td>${escapeHtml(status)}</td><td>${escapeHtml(activityText)}</td></tr>`;
    }).join('');
    return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{margin:24px;color:#2b2620;font:14px/1.55 "Hiragino Sans","Yu Gothic",sans-serif}h1{margin:0;font-size:24px}p{color:#6a604e}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:8px;vertical-align:top;border-bottom:1px solid #c7b99f;text-align:left}th{color:#6a604e;font-size:12px}small{color:#6a604e}@media print{body{margin:10mm}}</style></head><body><h1>${safeTitle}</h1><p>架空fixtureによる確認用出力。操作Qと前後参照を区別し、未割当情報は補完しません。</p><table><thead><tr><th>表示</th><th>相対</th><th>Q</th><th>種別</th><th>内容</th><th>台本</th><th>転換</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  }

  function openPrint() {
    const value = recipient();
    const destination = window.open('', '_blank', 'width=820,height=900');
    if (!destination) {
      byId('status').textContent = '印刷用画面を開けませんでした。ブラウザのポップアップ設定を確認してください。';
      return;
    }
    destination.document.open();
    destination.document.write(printDocument(value, sheetEntries(value)));
    destination.document.close();
    byId('status').textContent = `${value.label}用の印刷画面を開きました。`;
  }

  function downloadCsv() {
    const value = recipient();
    const headers = ['表示種別', '相対時刻', 'Q', '種別', '内容', '操作メモ', '台本状態', '転換activity', '担当', '関係'];
    const rows = sheetEntries(value).map((entry) => {
      const activities = entry.activities.map((activity) => activity.label).join(' / ') || '未接続';
      const people = entry.activities.map(peopleFor).filter(Boolean).join(' / ') || '未割当';
      return [
        entry.relation,
        timeFor(entry.cue, entry.index),
        entry.cue.number,
        entry.cue.type,
        entry.cue.description,
        entry.assignment?.instruction || '前後の関係を確認',
        entry.anchored ? '確認済み' : '未割当（推測で補わない）',
        activities,
        people,
        entry.relation === '操作' ? '直接担当' : '前後参照',
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `q-sheet-${value.id.replace(/^recipient-/, '')}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    byId('status').textContent = `${value.label}用CSVを保存しました。`;
  }

  async function start() {
    try {
      const response = await fetch('./workflow-timeline-fixture-2026-09-09.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`fixtureを読めません (${response.status})`);
      model.fixture = await response.json();
      if (!model.fixture.distribution?.recipients?.length || !model.fixture.distribution?.cueAssignments?.length) {
        throw new Error('配布先またはQの割当がありません');
      }
      model.selectedRecipientId = model.fixture.distribution.recipients.find((item) => item.kind === 'overview')?.id
        || model.fixture.distribution.recipients[0].id;
      byId('print').addEventListener('click', openPrint);
      byId('csv').addEventListener('click', downloadCsv);
      render();
      byId('status').textContent = '全体・部門・個人の配布先を読み込みました。';
    } catch (error) {
      byId('workspace').hidden = true;
      byId('print').disabled = true;
      byId('csv').disabled = true;
      byId('load-error').hidden = false;
      byId('load-error').textContent = `表示を作れませんでした: ${error.message}。HTTPサーバーから開いてください。`;
    }
  }

  start();
})();
