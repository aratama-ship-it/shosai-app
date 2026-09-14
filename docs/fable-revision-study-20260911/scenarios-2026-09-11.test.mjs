// 反証シナリオ 15件（架空小公演『灯台と三人』）— node --test で実行
// 各ケースで「正本の変更 → 発行 → 影響対象 → 受領状態 → Undo後」を追い、
// R1提案の規則で矛盾が出ないこと、素朴な規則では矛盾が出ることを確かめる。
// 実行後に scenario-results-2026-09-11.json を書き出す（HTMLの表の根拠）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  createStore, issueEdition, cancelEdition, acknowledge, receiptFor, coverage, pendingFor,
  naiveLatestReceipt, computeImpact, impactOfEdition, visibleNotes, renderNoteRef,
} from './revision-model-2026-09-11.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = () => JSON.parse(readFileSync(join(here, 'fixture-lighthouse-2026-09-11.json'), 'utf8'));
const results = [];
const record = (r) => { results.push(r); return r; };
const ids = (xs) => [...xs].sort();

test('S01 台本改訂で紙面位置だけ動いた（意味同じと確認済み）', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '2026-09-11T10:00', issuedBy: 'p-s', changes: [
    { kind: 'script-position', anchorIds: ['an-q7'], confirmedSameMeaning: true, summary: '台本v2で「扉を開けて」が次頁へ移動' },
  ] });
  const imp = impactOfEdition(e);
  assert.deepEqual(imp.resolved, []);
  assert.equal(imp.unresolved.length, 0);
  assert.deepEqual(coverage(st, e.id), []);
  record({ id: 'S01', kind: 'script-position', synthetic: true, impact: imp, receiptsRequired: 0,
    finding: '受領を求める相手は0人。ただし舞台監督の手元の印刷済みコーリング台本は旧版のままなので、版番号の表示だけは必要。' });
});

test('S01b 意味同じの確認が無い位置移動は意味変更として扱う', () => {
  const f = fixture();
  const imp = computeImpact(f, { kind: 'script-position', cueIds: ['q7'], confirmedSameMeaning: false });
  assert.deepEqual(ids(imp.resolved), ids(['p-l', 'p-b', 'p-a']));
  record({ id: 'S01b', kind: 'script-position', synthetic: true, impact: imp, finding: '確認が無ければ安全側に倒れて L・B・A へ届く。' });
});

test('S02 合図語の台詞が変わった → 発行後にUndo → 戻し版', () => {
  const st = createStore(fixture());
  const e3 = issueEdition(st, { at: '11:00', issuedBy: 'p-s', changes: [
    { kind: 'script-semantic', cueIds: ['q7'], summary: 'LX 7 の合図語が「扉を開けて」→「扉を閉めて」' },
  ] });
  assert.deepEqual(ids(impactOfEdition(e3).resolved), ids(['p-l', 'p-b', 'p-a']));
  acknowledge(st, { editionId: e3.id, personId: 'p-l', at: '11:05' });
  // 発行済みの版は取り消せない
  assert.throws(() => cancelEdition(st, e3.id), /append-only/);
  // 正本をUndoしても版は残る。戻し版を発行する
  const e4 = issueEdition(st, { at: '11:20', issuedBy: 'p-s', changes: [
    { kind: 'revert', revertedEdition: e3, summary: '版3の合図語変更を戻した' },
  ] });
  assert.deepEqual(ids(impactOfEdition(e4).resolved), ids(['p-l', 'p-b', 'p-a']));
  // 版3の受領は版4の受領にならない
  assert.equal(receiptFor(st, e4.id, 'p-l'), null);
  assert.deepEqual(pendingFor(st, 'p-l'), [e4.id]);
  assert.deepEqual(pendingFor(st, 'p-b'), [e3.id, e4.id]);
  record({ id: 'S02', kind: 'script-semantic', synthetic: true, impact: impactOfEdition(e3), receiptsRequired: 3,
    afterUndo: 'Undoは正本だけを戻す。発行済み版3は残り、戻し版4を同じ対象へ届け直す。L は版3を受領済みでも版4は未受領。',
    finding: 'Lは版3を見て卓のラベルを直しているかもしれない。版3を「取消」で消す実装は、Lの作業根拠を消す。' });
});

test('S03 Q番号の付け替え（LX 7→LX 7A、SND 8→SND 9）', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '12:00', issuedBy: 'p-s', changes: [
    { kind: 'cue-renumber', cueIds: ['q7', 'q8'], summary: '番号の付け替え。cueIdは不変' },
  ] });
  const imp = impactOfEdition(e);
  assert.deepEqual(ids(imp.resolved), ids(['p-l', 'p-m', 'p-s']));
  assert.ok(!imp.resolved.includes('p-b'), '演者には受領を求めない');
  // 意味の確認状態は失効しない（契約どおり）
  assert.equal(st.fixture.anchors.find((a) => a.id === 'an-q7').semanticStatus, 'confirmed');
  record({ id: 'S03', kind: 'cue-renumber', synthetic: true, impact: imp, receiptsRequired: 3,
    finding: '契約では「表示だけ更新・確認失効なし」。届け直しの層では、番号は舞台監督とオペの接点なので受領は必要。「意味の確認」と「受領」は別の状態として両立する。' });
});

test('S04a シーン差替え（同じsceneIdのまま配置を置換）', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '13:00', issuedBy: 'p-s', changes: [
    { kind: 'scene-replace', sceneIds: ['sc4'], summary: '4 食卓 の配置を新案に置換（IDは維持）' },
  ] });
  const imp = impactOfEdition(e);
  // 同じ場面を参照する T2（ランプ）の担当が未確定なので、チーフ S に「要確認」が付く
  assert.deepEqual(ids(imp.resolved), ids(['p-a', 'p-c', 'p-k', 'p-l', 'p-s']));
  assert.equal(imp.routeToAll, false);
  assert.ok(imp.unresolved.some((u) => u.includes('act-lamp')));
  record({ id: 'S04a', kind: 'scene-replace', synthetic: true, impact: imp, receiptsRequired: 5,
    finding: '場面の人物（A・C）、場面を参照する予定の担当（K・C・A）、場面に付くQの部門（L）へ絞れる。同じ場面を参照する未割当の予定（T2ランプ）があるため、舞台監督へ「担当未確定」の要確認が付く。全員へは広げない。' });
});

test('S04b シーン差替え（新しいsceneIdで作り直し、旧IDを指す注釈が残る）', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '13:10', issuedBy: 'p-s', changes: [
    { kind: 'scene-replace', sceneIds: ['sc4b'], removedSceneIds: ['sc4'], summary: '4 食卓 を新規シーンとして作り直し、旧シーンを削除' },
  ] });
  const imp = impactOfEdition(e);
  assert.ok(imp.unresolved.length >= 1);
  assert.equal(imp.routeToAll, true, '対象が確定できないので全員へ＋要確認');
  const targeted = computeImpact(st.fixture, e.changes[0], { policy: 'targeted' });
  assert.deepEqual(targeted.resolved, [], '対象だけ通知の方式では誰にも届かない');
  record({ id: 'S04b', kind: 'scene-replace', synthetic: true, impact: imp, targetedWouldReach: targeted.resolved,
    finding: '「差替え」をIDの作り直しで行うと注釈の行先が消え、対象だけ通知では誰にも届かない。UIは「同じシーンとして置換」を既定にし、未解決は全員＋要確認へ倒す。' });
});

test('S05 道具変更（机→ベンチ）: 道具の参照が契約に無い場合と有る場合', () => {
  const f = fixture();
  const withRefs = computeImpact(f, { kind: 'prop-change', propIds: ['prop-table'] });
  assert.deepEqual(ids(withRefs.resolved), ids(['p-k', 'p-c', 'p-a']));
  // 契約に道具の参照が無い状態を模す
  const bare = fixture();
  bare.activities.forEach((a) => { a.propRefs = []; });
  bare.scenes.forEach((s) => { s.propHolders = []; });
  const hybrid = computeImpact(bare, { kind: 'prop-change', propIds: ['prop-table'] });
  const targeted = computeImpact(bare, { kind: 'prop-change', propIds: ['prop-table'] }, { policy: 'targeted' });
  assert.equal(hybrid.routeToAll, true);
  assert.deepEqual(targeted.resolved, []);
  record({ id: 'S05', kind: 'prop-change', synthetic: true, impact: withRefs, impactWithoutPropModel: hybrid, targetedWouldReach: targeted.resolved,
    finding: '現行の companion workflow 契約と共通契約v1には道具の実体が無い。道具変更の対象は計算できず、対象だけ通知では見落とす。R1は「未解決→全員＋要確認」で埋め、道具の参照は後続の契約課題に残す。' });
});

test('S06 急な代役（B→D、今夜だけ）→ 翌日に戻す', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '18:00', issuedBy: 'p-s', changes: [
    { kind: 'assignment-change', swaps: [{ fromPersonId: 'p-b', toPersonId: 'p-d', activityIds: ['act-duet'] }], summary: 'BをDが代演（3 扉）' },
  ] });
  const imp = impactOfEdition(e);
  assert.deepEqual(ids(imp.resolved), ids(['p-d', 'p-b', 'p-a', 'p-s']));
  assert.ok(!imp.resolved.includes('p-l'), '合図の意味が変わらなければ照明には受領を求めない');
  // Bの個人メモはDに見えない
  const dSees = visibleNotes(st.fixture, st.fixture.notes, 'p-d');
  assert.ok(!dSees.some((n) => n.id === 'n2'));
  // 翌日戻す＝戻し版
  const back = issueEdition(st, { at: '翌 10:00', issuedBy: 'p-s', changes: [{ kind: 'revert', revertedEdition: e, summary: 'Bが復帰' }] });
  assert.deepEqual(ids(impactOfEdition(back).resolved), ids(['p-d', 'p-b', 'p-a', 'p-s']));
  record({ id: 'S06', kind: 'assignment-change', synthetic: true, impact: imp, receiptsRequired: 4,
    afterUndo: '翌日の復帰も戻し版として発行し、同じ4人へ届け直す。1晩の代役で版が2つ増える。',
    finding: '「今夜だけ」の範囲（公演回）を版の上に持たないため版が2つ増える。許容できるが、公演回スコープの一時上書きは将来課題。Bの個人メモはDへ自動で渡らない（渡すのはBの明示操作）。' });
});

test('S07 オフライン復帰: 受領票は版に紐づく', () => {
  const st = createStore(fixture());
  const e3 = issueEdition(st, { at: '14:00', issuedBy: 'p-s', changes: [{ kind: 'script-semantic', cueIds: ['q7'], summary: 'LX 7 合図語変更' }] });
  // L は 14:02 にオフラインで版3を受領（端末内に保留）
  const e4 = issueEdition(st, { at: '14:10', issuedBy: 'p-s', changes: [{ kind: 'cue-renumber', cueIds: ['q7'], summary: 'LX 7→LX 7A' }] });
  // 15:00 に復帰し、保留していた受領（版3）が送られる
  acknowledge(st, { editionId: e3.id, personId: 'p-l', at: '14:02', });
  assert.ok(receiptFor(st, e3.id, 'p-l'));
  assert.equal(receiptFor(st, e4.id, 'p-l'), null);
  assert.deepEqual(pendingFor(st, 'p-l'), [e4.id]);
  // 素朴な「最新版を受領」記録では版4も受領済みに見える
  assert.equal(naiveLatestReceipt(st, 'p-l'), e4.id);
  record({ id: 'S07', kind: 'offline', synthetic: true, impact: impactOfEdition(e4), receiptsRequired: 3,
    finding: '受領票に editionId を持たせないと、オフライン中に発行された版4が受領済みに化ける。受領は「最新」ではなく版番号へ結び付ける。' });
});

test('S08 オフライン中に別端末で正本が分岐 → 系譜の違う正本から発行できない', () => {
  const st = createStore(fixture());
  const e1 = issueEdition(st, { at: '09:00', issuedBy: 'p-s', changes: [{ kind: 'cue-renumber', cueIds: ['q8'], summary: 'SND 8→9' }] });
  // iPad 側（オフライン）はまだ版1を知らない正本（parent=null）から発行しようとする
  assert.throws(() => issueEdition(st, { at: '09:30', issuedBy: 'p-s', fromParentEditionId: null, changes: [{ kind: 'scene-replace', sceneIds: ['sc4'] }] }), /lineage-mismatch/);
  // 版1を取り込んでからなら発行できる
  const e2 = issueEdition(st, { at: '09:40', issuedBy: 'p-s', fromParentEditionId: e1.id, changes: [{ kind: 'scene-replace', sceneIds: ['sc4'] }] });
  assert.equal(e2.parentEditionId, e1.id);
  record({ id: 'S08', kind: 'offline', synthetic: true, impact: impactOfEdition(e2),
    finding: '正本はローカルファーストで端末ごとに分岐しうる。発行版に parentEditionId と baseSnapshotHash を持たせ、直前の発行版の系譜にない正本からの発行を止める。合流は既存方針どおり自動マージしない。' });
});

test('S09 部門共有メモは cueId を参照し、番号変更後も追従、削除後は参照切れとして残る', () => {
  const f = fixture();
  const note = f.notes.find((n) => n.id === 'n1');
  assert.equal(renderNoteRef(f, note).label, 'SND 8');
  f.cues.find((c) => c.id === 'q8').number = 'SND 9';
  assert.equal(renderNoteRef(f, note).label, 'SND 9');
  f.cues = f.cues.filter((c) => c.id !== 'q8');
  const r = renderNoteRef(f, note);
  assert.equal(r.dangling, true);
  record({ id: 'S09', kind: 'notes', synthetic: true, finding: 'メモが番号文字列を持つと付け替えで嘘になる。IDを参照し、表示時に解決する。Qが消えてもメモを捨てず参照切れとして残す。' });
});

test('S10 チーフの集約は部門共有だけ。個人メモは見えない', () => {
  const f = fixture();
  const chiefSees = visibleNotes(f, f.notes, 'p-s').map((n) => n.id);
  assert.deepEqual(ids(chiefSees), ids(['n1', 'n3']));
  const bSees = visibleNotes(f, f.notes, 'p-b').map((n) => n.id);
  assert.deepEqual(ids(bSees), ids(['n2']));
  record({ id: 'S10', kind: 'notes', synthetic: true, finding: '既存の注釈契約（private/department/team）と一致。代役Dにも B の private は出ない（S06）。' });
});

test('S11 受領を実行記録と混同しない: 受領票の種類は self/proxy だけ', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '15:00', issuedBy: 'p-s', changes: [{ kind: 'script-semantic', cueIds: ['q7'] }] });
  assert.throws(() => acknowledge(st, { editionId: e.id, personId: 'p-l', kind: 'executed', at: '15:01' }), /not allowed/);
  assert.throws(() => acknowledge(st, { editionId: e.id, personId: 'p-l', kind: 'go', at: '15:01' }), /not allowed/);
  acknowledge(st, { editionId: e.id, personId: 'p-l', kind: 'self', at: '15:01' });
  assert.equal(coverage(st, e.id).find((c) => c.personId === 'p-l').status, 'self');
  record({ id: 'S11', kind: 'receipt', synthetic: true, finding: '受領＝「自分に関わる変更を読んだ」だけ。卓へ反映した／GOした／閲覧した、は別の記録であり R1 には持たない。' });
});

test('S12 通知方式の比較: 全員通知の疲弊と、対象だけ通知の見落とし', () => {
  const f = fixture();
  const day = [
    { kind: 'cue-renumber', cueIds: ['q1'] }, { kind: 'script-position', confirmedSameMeaning: true },
    { kind: 'scene-replace', sceneIds: ['sc2'] }, { kind: 'cue-renumber', cueIds: ['q5'] },
    { kind: 'script-position', confirmedSameMeaning: true }, { kind: 'scene-replace', sceneIds: ['sc1'] },
    { kind: 'cue-renumber', cueIds: ['q13'] }, { kind: 'script-position', confirmedSameMeaning: true },
    { kind: 'prop-change', propIds: ['prop-lamp'] }, // ランプの担当は未確定（act-lamp の personId null）
    { kind: 'cue-renumber', cueIds: ['q12'] }, { kind: 'script-semantic', cueIds: ['q7'] },
    { kind: 'script-position', confirmedSameMeaning: true },
  ];
  const count = (policy) => {
    const per = Object.fromEntries(f.people.map((p) => [p.id, 0]));
    let missedByL = 0; let missedLamp = 0;
    day.forEach((ch, i) => {
      const imp = computeImpact(f, ch, { policy });
      imp.resolved.forEach((p) => { per[p] += 1; });
      if (i === 10 && !imp.resolved.includes('p-l')) missedByL += 1;      // 版11: Lの合図語変更
      if (i === 8 && imp.resolved.length === 0) missedLamp += 1;          // 版9: ランプ担当未確定
    });
    return { per, missedByL, missedLamp };
  };
  const all = count('all'); const targeted = count('targeted'); const hybrid = count('hybrid');
  assert.equal(all.per['p-l'], 12, '全員通知では L に12回届く（うち本人に関わるのは3件）');
  assert.equal(targeted.missedLamp, 1, '対象だけ通知では担当未確定のランプ変更が誰にも届かない');
  assert.equal(hybrid.missedLamp, 0);
  assert.equal(hybrid.missedByL, 0);
  assert.ok(hybrid.per['p-l'] < all.per['p-l']);
  record({ id: 'S12', kind: 'notification', synthetic: true, counts: { all: all.per, targeted: targeted.per, hybrid: hybrid.per },
    finding: `全員通知: Lに12件（関係3件）。対象だけ: 担当未確定の道具変更が0人へ。ハイブリッド: Lに${hybrid.per['p-l']}件、未確定は全員＋要確認。` });
});

test('S13 発行→Undo→再発行（版6を戻した版7）。版5だけ受領した人の扱い', () => {
  const st = createStore(fixture());
  const e5 = issueEdition(st, { at: '10:00', issuedBy: 'p-s', changes: [{ kind: 'cue-renumber', cueIds: ['q12'] }] });
  const e6 = issueEdition(st, { at: '10:30', issuedBy: 'p-s', changes: [{ kind: 'scene-replace', sceneIds: ['sc4'] }] });
  acknowledge(st, { editionId: e5.id, personId: 'p-l', at: '10:05' });
  acknowledge(st, { editionId: e6.id, personId: 'p-a', at: '10:35' }); // A は版6を見て動きを変えた
  const e7 = issueEdition(st, { at: '10:50', issuedBy: 'p-s', supersedes: [e6.id], changes: [{ kind: 'revert', revertedEdition: e6, summary: '版6の配置置換を戻した' }] });
  // A: 版6を受領済み → 版7（戻し）も受領が必要
  assert.deepEqual(pendingFor(st, 'p-a'), [e7.id]);
  // K: 版6も版7も未受領。版7を受領すれば、版7が版6を上書きするので版6の未受領は消える
  assert.deepEqual(pendingFor(st, 'p-k'), [e6.id, e7.id]);
  acknowledge(st, { editionId: e7.id, personId: 'p-k', at: '11:00' });
  assert.deepEqual(pendingFor(st, 'p-k'), []);
  assert.equal(receiptFor(st, e6.id, 'p-k').via, e7.id);
  record({ id: 'S13', kind: 'revert', synthetic: true,
    finding: '戻し版に supersedes を持たせると、両方未受領の人は戻し版1件の受領で済む。版6を見て動いた人（A）には戻し版7の受領を求める。「版6を無かったことにする」実装だと A の受領根拠が消える。' });
});

test('S14 受領は版単位。変更項目が3件でも部分受領はできない（R1の割り切り）', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '16:00', issuedBy: 'p-s', changes: [
    { kind: 'cue-renumber', cueIds: ['q7'] }, { kind: 'script-semantic', cueIds: ['q7'] }, { kind: 'scene-replace', sceneIds: ['sc3'] },
  ] });
  assert.equal(e.changes.length, 3);
  acknowledge(st, { editionId: e.id, personId: 'p-l', at: '16:05' });
  assert.equal(pendingFor(st, 'p-l').length, 0);
  record({ id: 'S14', kind: 'receipt', synthetic: true, changeCount: 3,
    finding: '受領は版に1回。項目ごとの受領は持たない代わりに、受領前に項目数と各項目を必ず表示する。項目単位の受領は反例が出てから。' });
});

test('S15 端末を持たない K への代理受領はチーフの手渡し記録として区別', () => {
  const st = createStore(fixture());
  const e = issueEdition(st, { at: '17:00', issuedBy: 'p-s', changes: [{ kind: 'scene-replace', sceneIds: ['sc4'] }] });
  assert.throws(() => acknowledge(st, { editionId: e.id, personId: 'p-k', kind: 'proxy', at: '17:10' }), /needs `by`/);
  acknowledge(st, { editionId: e.id, personId: 'p-k', kind: 'proxy', at: '17:10', by: 'p-s' });
  acknowledge(st, { editionId: e.id, personId: 'p-a', kind: 'self', at: '17:12' });
  const cov = coverage(st, e.id);
  assert.equal(cov.find((c) => c.personId === 'p-k').status, 'proxy');
  assert.equal(cov.find((c) => c.personId === 'p-a').status, 'self');
  assert.equal(cov.find((c) => c.personId === 'p-c').status, 'none');
  record({ id: 'S15', kind: 'receipt', synthetic: true, coverage: cov,
    finding: '紙で手渡した相手は「代理受領（誰が）」として本人受領と区別。チーフの集約画面は self / proxy / none の3値で見せる。' });
});

test('write results', () => {
  writeFileSync(join(here, 'scenario-results-2026-09-11.json'), JSON.stringify({ generatedAt: '2026-09-11', synthetic: true, results }, null, 2));
  assert.equal(results.length, 17);
});
