import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzePlan,configurePlan,DEFAULTS} from './people-plan-core-2026-09-09.mjs';
const base=JSON.parse(readFileSync(new URL('./shared-contract-fixture-2026-09-09.json',import.meta.url)));
const plan=c=>configurePlan(base,c);
const run=c=>analyzePlan(plan(c));
const row=(r,id)=>r.rows.find(a=>a.id===id);
const has=(r,code)=>r.issues.some(i=>i.code===code);
test('invalid earlier arrival blocks dependent work despite a later known cue',()=>{
 const d=plan({q13Ms:20000});d.activities.find(a=>a.id==='platform').startPointId='walk-C-end';
 const r=analyzePlan(d);assert.equal(row(r,'platform').state,'invalid');assert.equal(row(r,'exit').state,'invalid');assert.equal(r.windows[0].state,'invalid');assert.equal(row(r,'put').state,'known');
});
test('source identity ignores extra owner metadata',()=>{
 const d=plan();d.activities.find(a=>a.id==='platform').owner={...d.activities[0].owner,note:'extra'};
 assert.equal(row(analyzePlan(d),'platform').state,'invalid');
});
test('normal: common work counted once, 15 s and zero slack',()=>{
 const r=run();assert.equal(r.windows[0].end,15000);assert.equal(r.windows[0].slack,0);assert.equal(r.issues.length,0);assert.equal(r.rows.filter(a=>a.id==='carry').length,1);
 assert.deepEqual([row(r,'wait-C').start,row(r,'wait-C').end],[8000,8000]);
});
test('late appearance: C remains assigned while waiting, end 18 s',()=>{
 const r=run({appearanceEndMs:4000});assert.equal(r.windows[0].shortfall,3000);
 assert.deepEqual([row(r,'wait-C').start,row(r,'wait-C').end],[8000,11000]);assert.equal(row(r,'exit').end,18000);assert.ok(!has(r,'overlap'));
 assert.ok(r.windows[0].criticalIds.includes('appearance-A'));
});
test('fixed extra work overlaps each part of A occupation, never reordered',()=>{
 const r=run({extra:'person-A'});assert.equal(row(r,'extra').start,6000);
 const ids=r.issues.filter(i=>i.code==='overlap').flatMap(i=>i.activityIds);
 for(const id of ['put','hold-A','pickup'])assert.ok(ids.includes(id));assert.equal(r.windows[0].end,15000);
});
test('changing extra work participant changes the person receiving conflicts',()=>{
 const r=run({extra:'person-C'});assert.ok(r.issues.filter(i=>i.code==='overlap').every(i=>i.personIds[0]==='person-C'));
 assert.ok(!row(r,'extra').personIds.includes('person-A'));
});
test('unknown cue preserves known preceding operations',()=>{
 const r=run({q13Ms:null});assert.equal(r.windows[0].shortfall,null);assert.equal(row(r,'put').end,7000);
 assert.equal(row(r,'cue-wait').start,10000);assert.equal(row(r,'cue-wait').end,null);assert.equal(row(r,'exit').state,'unknown');
});
test('deadline alone unknown leaves activity times intact',()=>{
 const r=run({deadlineMs:null});assert.equal(row(r,'exit').end,15000);assert.equal(r.windows[0].shortfall,null);
});
test('unknown crew keeps unknown slot and does not invent a person',()=>{
 const r=run({join:'unresolved'});assert.ok(has(r,'assignment'));assert.equal(row(r,'pickup').crewUnknown,true);assert.deepEqual(row(r,'pickup').personIds,['person-A']);assert.equal(r.hasUncertainty,true);
});
test('unknown extra crew is not silently discarded',()=>assert.ok(has(run({extra:'unresolved'}),'assignment')));
test('unknown appearance end propagates while C approach remains known',()=>{
 const r=run({appearanceEndMs:null});
 for(const id of ['appearance-A','walk-A','carry','put','hold-A','pickup','cue-wait','exit'])assert.equal(row(r,id).state,'unknown',id);
 assert.equal(row(r,'platform').end,6000);assert.equal(row(r,'walk-C').end,8000);
 assert.equal(r.windows[0].shortfall,null);assert.equal(row(r,'wait-C').start,8000);assert.equal(row(r,'wait-C').end,null);
});
test('unresolved join leaves C approach conflicts attached to C',()=>{
 const r=run({join:'unresolved',extra:'person-C'}),conflicts=r.issues.filter(i=>i.code==='overlap');
 assert.equal(conflicts.length,1);assert.deepEqual(conflicts[0].personIds,['person-C']);
 assert.deepEqual(new Set(conflicts[0].activityIds),new Set(['walk-C','extra']));
 assert.equal(row(r,'pickup').crewUnknown,true);assert.deepEqual(row(r,'pickup').personIds,['person-A']);
});
test('18 s versus 12 s yields input shortfall of 6 s',()=>assert.equal(run({appearanceEndMs:4000,deadlineMs:12000}).windows[0].shortfall,6000));
test('duration editing propagates, null is not zero',()=>{
 assert.equal(run({putMs:6000}).windows[0].end,18000);assert.equal(run({putMs:null}).windows[0].end,null);
 assert.equal(run({putMs:null}).points['carry-end'].value,5000);
});
test('late cue extends both A and C occupation',()=>{
 const r=run({q13Ms:20000});assert.deepEqual([row(r,'cue-wait').start,row(r,'cue-wait').end],[10000,20000]);assert.equal(r.windows[0].end,25000);
});
test('early planned cue gives readiness time but does not expose a GO API',()=>{
 const r=run({q13Ms:0});assert.equal(row(r,'exit').start,10000);assert.equal(r.windows[0].end,15000);
});
test('repeated cue is unsupported and cannot yield old success',()=>{
 const d=plan();d.origins.push({...d.origins[1],id:'q13-repeat',offsetFromBaseMs:14000});const r=analyzePlan(d);
 assert.ok(has(r,'repeat-cue'));assert.equal(r.windows[0].end,null);assert.equal(row(r,'put').end,7000);
});
test('broken owner invalidates downstream timing',()=>{
 const d=plan();d.points.find(p=>p.id==='q12').ownerRef='missing';const r=analyzePlan(d);assert.ok(has(r,'time'));assert.equal(r.windows[0].end,null);
});
test('cycle fails locally, unrelated platform time remains',()=>{
 const d=plan();d.points.find(p=>p.id==='pickup-start').expression.pointIds=['pickup-end'];const r=analyzePlan(d);
 assert.equal(r.windows[0].end,null);assert.equal(row(r,'platform').end,6000);assert.ok(r.issues.some(i=>i.message.includes('循環')));
});
test('duplicated IDs never use first or last winner for timing',()=>{
 const d=plan();d.points.push({...d.points.find(p=>p.id==='exit-end')});const r=analyzePlan(d);assert.ok(has(r,'duplicate'));assert.equal(r.windows[0].end,null);
});
test('mixed plan context cannot compare',()=>{
 const d=plan();d.points.find(p=>p.id==='exit-end').planContextId='another';assert.equal(analyzePlan(d).windows[0].end,null);
});
test('missing point retains references, makes result unknown/invalid',()=>{
 const d=plan();d.activities.find(a=>a.id==='exit').endPointId='lost';const r=analyzePlan(d);assert.equal(row(r,'exit').state,'invalid');assert.ok(r.issues.some(i=>i.message.includes('参照切れ')));
});
test('duplicate person slots and interval boundary cases',()=>{
 const d=plan();d.activities.find(a=>a.id==='pickup').assignments[1].personId='person-A';const r=analyzePlan(d);assert.ok(has(r,'duplicate-person'));assert.equal(row(r,'pickup').personIds.length,1);
 assert.ok(!has(run(),'overlap'));
});
test('reserve shortage is distinct from execution shortfall',()=>{
 const d=plan({deadlineMs:16000});d.windows[0].reserveMs=3000;const r=analyzePlan(d);assert.equal(r.windows[0].shortfall,0);assert.equal(r.windows[0].reserveShortfall,2000);assert.ok(has(r,'reserve'));
});
test('invalid work duration never becomes a valid plan',()=>{
 const d=plan();d.estimates.find(e=>e.id==='estimate-exit-end').durationMs=0;assert.equal(analyzePlan(d).windows[0].state,'invalid');
 assert.throws(()=>plan({putMs:0}));assert.throws(()=>plan({q13Ms:NaN}));assert.throws(()=>plan({appearanceEndMs:-100}));
});
test('no mutation, unknown and source IDs survive fixture JSON roundtrip',()=>{
 const before=JSON.stringify(base);const d=plan({q13Ms:null,join:'unresolved'});const text=JSON.stringify(d),copy=JSON.parse(text);
 assert.deepEqual(analyzePlan(copy),analyzePlan(d));assert.equal(JSON.stringify(base),before);assert.deepEqual(DEFAULTS,{appearanceEndMs:0,q13Ms:10000,deadlineMs:15000,putMs:2000,extra:'none',join:'person-C'});
});
