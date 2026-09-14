'use strict';

/* project export をworkflow binding用に固定化する小さな共通関数。
 * JSONとして書き出された値だけを受け取り、UI状態や説明用scopeは含めない。 */
(function registerSnapshotCanonical(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.STAGE_SKETCH_WORKFLOW_SNAPSHOT = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, () => {
  function canonicalJson(value) {
    if (value === null) return 'null';
    if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError('snapshotに有限でない数値があります。');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
    throw new TypeError('snapshotにJSONとして保存できない値があります。');
  }
  function canonicalBaseExport(stageExport) {
    if (!stageExport || typeof stageExport !== 'object') throw new TypeError('Stage Sketch書き出しがありません。');
    return {
      kind: stageExport.kind,
      version: stageExport.version,
      project: stageExport.project,
      venues: Array.isArray(stageExport.venues) ? stageExport.venues : [],
    };
  }
  function canonicalBaseExportJson(stageExport) { return canonicalJson(canonicalBaseExport(stageExport)); }
  return Object.freeze({ canonicalJson, canonicalBaseExport, canonicalBaseExportJson });
});
