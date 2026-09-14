// 改訂の届け直し — 設計研究用の小さな意味モデル（2026-09-11 / Fable）
// 製品コード・製品schemaではない。架空の小公演 fixture に対して
// 「発行版（edition）」「受領票（receipt）」「影響対象（impact）」の規則を実行し、
// 反証シナリオの矛盾を機械的に確かめるためだけのもの。
// 用語は docs/project-contract-2026-09-09 の companion workflow v1 と
// docs/set-transitions-2026-09-08 の共通契約v1 に合わせる（cueId / anchor / activity / assignment / personId）。
'use strict';

export const CHANGE_KINDS = Object.freeze([
  'script-position',   // 台本の紙面位置だけ動いた（舞台監督が「意味同じ」と確認済み）
  'script-semantic',   // 合図語・台詞・順序など意味が変わった／同じと判定できない
  'cue-renumber',      // Q番号の表示変更（cueId不変）
  'scene-replace',     // シーンの差替え・並替え（sceneIdは維持または新規）
  'prop-change',       // 道具の変更
  'assignment-change', // 担当・代役の変更（personIdの入替）
  'revert',            // 発行済みの版を戻す（正本のUndoを発行に載せたもの）
]);

export const RECEIPT_KINDS = Object.freeze(['self', 'proxy']); // 実行記録・GO・閲覧は受領票に入れない

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export function createStore(fixture) {
  const st = {
    fixture,
    editions: [],   // 追記専用。削除・改変しない
    receipts: [],   // {editionId, personId, kind, at, by}
    canonical: { parentEditionId: null, revision: fixture.workflowRevision || 1 },
  };
  return st;
}

// ---------- 参照解決 ----------
function personsOfDepartment(f, dept) {
  return f.people.filter((p) => p.departments.includes(dept)).map((p) => p.id);
}
function chiefs(f) { return f.people.filter((p) => p.roles.includes('chief')).map((p) => p.id); }
function cue(f, id) { return f.cues.find((c) => c.id === id) || null; }
function scene(f, id) { return f.scenes.find((s) => s.id === id) || null; }
function anchorsTargeting(f, kind, id) {
  return f.anchors.filter((a) => a.target.kind === kind && a.target.id === id);
}
function activitiesWhere(f, pred) { return f.activities.filter(pred); }
function assignedPersons(act) { return act.assignments.map((a) => a.personId); }

// ---------- 影響対象の規則（R1提案） ----------
// 戻り値: { resolved: personId[], unresolved: string[] , routeToAll: boolean }
export function computeImpact(f, change, opts = {}) {
  const policy = opts.policy || 'hybrid'; // 'targeted' | 'all' | 'hybrid'
  const resolved = [];
  const unresolved = [];

  const requireAssigned = (act) => {
    for (const a of act.assignments) {
      if (a.personId) resolved.push(a.personId);
      else unresolved.push(`activity ${act.id} の担当枠 ${a.slotId} が未確定`);
    }
  };

  switch (change.kind) {
    case 'script-position': {
      if (!change.confirmedSameMeaning) {
        // 意味同じの確認が無い位置移動は semantic と同じ扱いにする（安全側）
        return computeImpact(f, { ...change, kind: 'script-semantic' }, opts);
      }
      // 舞台監督の位置確認だけ。受領を求める相手はいない
      break;
    }
    case 'script-semantic': {
      for (const cueId of change.cueIds || []) {
        const c = cue(f, cueId);
        if (!c) { unresolved.push(`cue ${cueId} が見つからない`); continue; }
        if (c.department) resolved.push(...personsOfDepartment(f, c.department));
        else unresolved.push(`cue ${cueId} の担当部門が未設定`);
        for (const a of anchorsTargeting(f, 'cue', cueId)) {
          if (a.speakerPersonId) resolved.push(a.speakerPersonId);
        }
        // その合図に依存する予定の担当
        for (const act of activitiesWhere(f, (x) => (x.cueRefs || []).includes(cueId))) requireAssigned(act);
      }
      break;
    }
    case 'cue-renumber': {
      // 表示だけの変更だが、呼ぶ人（舞台監督）と呼ばれる人（部門オペ）の間の番号は現場の接点なので受領を求める
      for (const cueId of change.cueIds || []) {
        const c = cue(f, cueId);
        if (!c) { unresolved.push(`cue ${cueId} が見つからない`); continue; }
        if (c.department) resolved.push(...personsOfDepartment(f, c.department));
        else unresolved.push(`cue ${cueId} の担当部門が未設定`);
      }
      resolved.push(...chiefs(f));
      break;
    }
    case 'scene-replace': {
      for (const sceneId of change.sceneIds || []) {
        const s = scene(f, sceneId);
        if (!s) { unresolved.push(`scene ${sceneId} が見つからない（IDを変えて差し替えた可能性）`); continue; }
        resolved.push(...s.castPersonIds);
        for (const act of activitiesWhere(f, (x) => (x.sceneRefs || []).includes(sceneId))) requireAssigned(act);
        for (const a of anchorsTargeting(f, 'scene', sceneId)) {
          // 配置図参照の注釈は舞台監督の確認対象。受領を求める相手は場面の人物側
          if (a.speakerPersonId) resolved.push(a.speakerPersonId);
        }
        for (const c of f.cues.filter((x) => x.sceneId === sceneId)) {
          if (c.department) resolved.push(...personsOfDepartment(f, c.department));
        }
      }
      // 差替え後の新IDが与えられ、旧IDを指す注釈が残るなら未解決
      for (const oldId of change.removedSceneIds || []) {
        const dangling = anchorsTargeting(f, 'scene', oldId);
        if (dangling.length) unresolved.push(`旧 scene ${oldId} を指す注釈 ${dangling.length} 件の行先が無い`);
      }
      break;
    }
    case 'prop-change': {
      for (const propId of change.propIds || []) {
        const acts = activitiesWhere(f, (x) => (x.propRefs || []).includes(propId));
        const holders = f.scenes.flatMap((s) => (s.propHolders || []).filter((h) => h.propId === propId).map((h) => h.personId));
        if (!acts.length && !holders.length) {
          unresolved.push(`道具 ${propId} と予定・人物の対応が無い（契約に道具の参照が無い）`);
          continue;
        }
        acts.forEach(requireAssigned);
        resolved.push(...holders);
      }
      break;
    }
    case 'assignment-change': {
      // change.swaps: [{fromPersonId, toPersonId, activityIds:[...]}]
      for (const sw of change.swaps || []) {
        if (!sw.toPersonId) unresolved.push(`交代先の人物が未確定（${sw.fromPersonId} の代役）`);
        else resolved.push(sw.toPersonId);
        if (sw.fromPersonId) resolved.push(sw.fromPersonId);
        for (const actId of sw.activityIds || []) {
          const act = f.activities.find((x) => x.id === actId);
          if (!act) { unresolved.push(`activity ${actId} が見つからない`); continue; }
          // 同じ予定に参加する相手（手渡し相手・共演者）
          for (const p of assignedPersons(act)) if (p && p !== sw.fromPersonId) resolved.push(p);
        }
      }
      resolved.push(...chiefs(f));
      break;
    }
    case 'revert': {
      // 戻す対象の版の影響対象をそのまま引き継ぐ
      const target = change.revertedEdition;
      if (!target) { unresolved.push('戻す対象の版が指定されていない'); break; }
      for (const ch of target.changes) {
        resolved.push(...ch.impact.resolved);
        unresolved.push(...ch.impact.unresolved.map((u) => `（戻し）${u}`));
      }
      break;
    }
    default:
      throw new Error(`unknown change kind: ${change.kind}`);
  }

  const everyone = f.people.map((p) => p.id);
  let routeToAll = false;
  let finalResolved = uniq(resolved);
  if (policy === 'all') { finalResolved = everyone; routeToAll = true; }
  else if (policy === 'hybrid' && unresolved.length) {
    // 未解決がある: 計算できた相手には絞って届け、未解決の理由はチーフへ「要確認」として集約する。
    // 誰一人計算できない変更だけ全員へ倒す（対象だけ通知の見落としを防ぐ最後の網）。
    if (finalResolved.length === 0) { finalResolved = everyone; routeToAll = true; }
    else finalResolved = uniq([...finalResolved, ...chiefs(f)]);
  }
  // 'targeted' は未解決があっても対象を広げない（見落としの反例に使う）
  return { resolved: finalResolved, unresolved: uniq(unresolved), routeToAll, needsChiefReview: unresolved.length > 0 };
}

// ---------- 発行版 ----------
export function issueEdition(st, { changes, issuedBy, at, fromParentEditionId, supersedes = [], policy = 'hybrid' }) {
  const f = st.fixture;
  const last = st.editions[st.editions.length - 1] || null;
  const expectedParent = last ? last.id : null;
  const parent = fromParentEditionId === undefined ? st.canonical.parentEditionId : fromParentEditionId;
  if (parent !== expectedParent) {
    const err = new Error('lineage-mismatch');
    err.detail = { expectedParent, parent };
    throw err;
  }
  for (const ch of changes) if (!CHANGE_KINDS.includes(ch.kind)) throw new Error(`unknown change kind: ${ch.kind}`);
  const edition = {
    id: `ed-${st.editions.length + 1}`,
    number: st.editions.length + 1,
    issuedBy, at,
    parentEditionId: expectedParent,
    supersedes: [...supersedes],
    changes: changes.map((ch, i) => ({ ...ch, id: ch.id || `ch-${st.editions.length + 1}-${i + 1}`, impact: computeImpact(f, ch, { policy }) })),
  };
  Object.freeze(edition);
  st.editions.push(edition);
  st.canonical.parentEditionId = edition.id;
  st.canonical.revision += 1;
  return edition;
}

export function cancelEdition() {
  // 発行済みの版は取り消せない。戻すなら 'revert' の変更を載せた新しい版を発行する
  throw new Error('editions-are-append-only');
}

export function editionById(st, id) { return st.editions.find((e) => e.id === id) || null; }

export function impactOfEdition(e) {
  return {
    resolved: uniq(e.changes.flatMap((c) => c.impact.resolved)),
    unresolved: uniq(e.changes.flatMap((c) => c.impact.unresolved)),
    routeToAll: e.changes.some((c) => c.impact.routeToAll),
  };
}

// ---------- 受領票 ----------
export function acknowledge(st, { editionId, personId, kind = 'self', at, by = null }) {
  if (!RECEIPT_KINDS.includes(kind)) throw new Error(`receipt kind not allowed: ${kind}`);
  if (!editionById(st, editionId)) throw new Error(`unknown edition ${editionId}`);
  if (kind === 'proxy' && !by) throw new Error('proxy receipt needs `by`');
  const r = Object.freeze({ editionId, personId, kind, at, by });
  st.receipts.push(r);
  return r;
}

export function receiptFor(st, editionId, personId) {
  // 版に紐づく。より新しい版の受領は古い版の受領を意味しない。
  const direct = st.receipts.find((r) => r.editionId === editionId && r.personId === personId);
  if (direct) return direct;
  // 上書き版（supersedes）を受領していれば、その人の当該版の影響が上書き版の影響に含まれる場合だけ充足
  const later = st.editions.filter((e) => e.supersedes.includes(editionId));
  for (const e of later) {
    const r = st.receipts.find((x) => x.editionId === e.id && x.personId === personId);
    if (r && impactOfEdition(e).resolved.includes(personId)) return { ...r, via: e.id };
  }
  return null;
}

export function coverage(st, editionId) {
  const e = editionById(st, editionId);
  const imp = impactOfEdition(e);
  return imp.resolved.map((personId) => {
    const r = receiptFor(st, editionId, personId);
    return { personId, status: r ? r.kind : 'none', via: r?.via || null };
  });
}

export function pendingFor(st, personId) {
  // その人に受領を求めている版のうち、未受領のもの（古い順）
  return st.editions
    .filter((e) => impactOfEdition(e).resolved.includes(personId))
    .filter((e) => !receiptFor(st, e.id, personId))
    .map((e) => e.id);
}

// 反例用: 「最新版を受領した」とだけ記録する素朴な実装
export function naiveLatestReceipt(st, personId) {
  const mine = st.receipts.filter((r) => r.personId === personId);
  if (!mine.length) return null;
  return st.editions[st.editions.length - 1].id; // 受領した版に関係なく最新版を受領済みとみなす
}

// ---------- メモの参照解決（部門共有メモ・個人メモ） ----------
export function visibleNotes(f, notes, viewerPersonId) {
  const viewer = f.people.find((p) => p.id === viewerPersonId);
  const isChief = viewer.roles.includes('chief');
  return notes.filter((n) => {
    if (n.visibility === 'private') return n.authorPersonId === viewerPersonId;
    if (n.visibility === 'department') return isChief || viewer.departments.includes(n.department);
    if (n.visibility === 'team') return true;
    return false;
  });
}

export function renderNoteRef(f, note) {
  // メモは cueId を参照する。表示時に現在の番号へ解決し、消えていれば参照切れとして残す
  const c = cue(f, note.cueId);
  return c ? { label: c.number, dangling: false } : { label: `（参照切れ: ${note.cueId}）`, dangling: true };
}
