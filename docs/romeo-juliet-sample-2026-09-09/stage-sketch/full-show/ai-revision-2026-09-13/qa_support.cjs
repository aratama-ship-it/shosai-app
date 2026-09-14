/* Shared evidence and import-fidelity checks; no product writes. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname;
const REPO = path.resolve(HERE, '../../../../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function writeReport(name, report) {
  fs.mkdirSync(path.join(HERE, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(HERE, 'qa', name), JSON.stringify(report, null, 2) + '\n');
}
function fingerprint() {
  const files = fs.readdirSync(REPO).filter(name =>
    ['index.html', 'stage.html', 'style.css'].includes(name) ||
    (name.startsWith('stage-') && /\.(?:js|css)$/.test(name) && !name.includes('_backup_')));
  for (const name of fs.readdirSync(path.join(REPO, 'mcp-server/src'))) {
    if (name.endsWith('.js')) files.push('mcp-server/src/' + name);
  }
  return Object.fromEntries(files.sort().map(name => [name, sha(path.join(REPO, name))]));
}
// Compare every input-defined property that can change a scene's displayed
// layout or links. Missing input fields may receive legitimate native defaults.
const PIECE_FIELDS = ['id', 'type', 'castId', 'setId', 'originId', 'u', 'v',
  'w', 'h', 'dims', 'propShape', 'facing', 'pose', 'route', 'supportId',
  'heldBy', 'holdMode', 'holdSide', 'visible', 'elevation', 'scale'];
const SCENE_FIELDS = ['id', 'kind', 'title', 'beat', 'lightingIntent', 'rehearsal',
  'blackout', 'cueSeconds', 'audioTrackId'];
function definedFields(actual, expected, fields, label) {
  for (const key of fields) {
    if (!Object.hasOwn(expected, key)) continue;
    const value = expected[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assert.ok(actual[key] && typeof actual[key] === 'object', label + '.' + key);
      definedFields(actual[key], value, Object.keys(value), label + '.' + key);
    } else {
      assert.deepEqual(actual[key], value, label + '.' + key);
    }
  }
}
function assertImportFidelity(expectedDocument, actualDocument) {
  const expected = expectedDocument.project;
  const actual = actualDocument.project;
  let pieces = 0;
  const heldAdjustments = [];
  assert.deepEqual(actual.scenes.map(s => s.id), expected.scenes.map(s => s.id), 'scene order');
  for (const collection of ['cast', 'sets']) {
    assert.deepEqual(actual[collection].map(s => s.id), expected[collection].map(s => s.id), collection + ' ids');
    expected[collection].forEach((item, i) => definedFields(actual[collection][i], item,
      ['id', 'name', 'kind', 'propShape', 'dims', 'height'], collection + '/' + item.id));
  }
  expected.scenes.forEach((scene, i) => {
    const imported = actual.scenes[i];
    definedFields(imported, scene, SCENE_FIELDS, scene.id);
    assert.deepEqual((imported.pieces || []).map(p => p.id), (scene.pieces || []).map(p => p.id), scene.id + ' pieces');
    (scene.pieces || []).forEach((piece, j) => {
      const derived = piece.heldBy ? ['u', 'v', 'facing', 'route', 'supportId'] : [];
      const readBack = imported.pieces[j];
      // stage-sketch.js refreshBases derives held-prop placement from the
      // holder's hand/face. This is recorded, not called a byte-exact layout.
      for (const key of derived) {
        if (Object.hasOwn(piece, key) && JSON.stringify(piece[key]) !== JSON.stringify(readBack[key])) {
          heldAdjustments.push({ sceneId: scene.id, pieceId: piece.id, field: key, before: piece[key], after: readBack[key] });
        }
      }
      definedFields(readBack, piece, PIECE_FIELDS.filter(key => !derived.includes(key)), scene.id + '/' + piece.id);
      pieces++;
    });
  });
  return { scenes: expected.scenes.filter(s => s.kind === 'scene').length, pieces, mismatches: 0,
    heldPlacementAdjustments: heldAdjustments, heldPlacementRule: 'stage-sketch.js refreshBases: derive held prop coordinates from performer hand/face' };
}
module.exports = { HERE, REPO, sha, readJson, writeReport, fingerprint, assertImportFidelity };
