import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import worker, { createSessionToken } from "../worker.js";
import { UsageMetrics, DAY_MS, dayNumber } from "../usage-metrics.js";

const origin = "https://stage.example";
const owner = ["owner", "test-owner-password"];
const guest = ["guest", "test-guest-password"];
const basic = ([user, pass]) => ({ Authorization: `Basic ${btoa(`${user}:${pass}`)}` });
let sequence = 0;
const event = (props = {}) => ({ v: 1, user: guest[0], kind: "active", id: `event-${String(++sequence).padStart(16, "0")}`, activeMs: 30000, ...props });
function storage() {
  const values = new Map();
  let alarm = null, queue = Promise.resolve();
  const api = {
    async get(key) { return structuredClone(values.get(key)); },
    async put(key, value) { values.set(key, structuredClone(value)); },
    async delete(key) { values.delete(key); },
    async list({ prefix = "", limit = Infinity } = {}) {
      return new Map([...values].filter(([key]) => key.startsWith(prefix)).slice(0, limit).map(([key, value]) => [key, structuredClone(value)]));
    },
    async getAlarm() { return alarm; },
    async setAlarm(value) { alarm = value; },
    transaction(fn) { const task = queue.then(() => fn(api)); queue = task.catch(() => {}); return task; },
  };
  return api;
}
function setup() {
  const stored = storage();
  const room = new UsageMetrics({ storage: stored });
  const requests = [], assets = [];
  const env = {
    SITE_USER: owner[0], SITE_PASS: owner[1], GUEST_USER: guest[0], GUEST_PASS: guest[1],
    STAGE_BETA_ACTIVE: "true", STAGE_USAGE_ENABLED: "true",
    USAGE_METRICS: { idFromName: (name) => name, get: () => ({ fetch: async (url, init) => {
      requests.push(init?.body ? JSON.parse(init.body) : String(url)); return room.fetch(url, init);
    } }) },
    ASSETS: { async fetch(request) { assets.push(request.url); return new Response("asset"); } },
  };
  const call = (path, account = guest, init = {}) => worker.fetch(new Request(origin + path, {
    ...init, headers: { ...(account ? basic(account) : {}), ...init.headers },
  }), env, {});
  const post = (payload, account = guest, headers = {}) => call("/usage/event", account, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
  });
  return { stored, env, room, call, post, requests, assets };
}

test("anonymous, guest and forged owner headers cannot read owner reports or page", async () => {
  const s = setup();
  for (const path of ["/usage", "/usage?lang=en", "/usage/report", "/usage/report?days=7"]) {
    assert.equal((await s.call(path, null)).status, 401);
    assert.equal((await s.call(path, guest, { headers: { "X-Shosai-Session-Owner": owner[0] } })).status, 403);
  }
  assert.equal(s.requests.length, 0);
  assert.equal(s.assets.length, 0);
  const cookie = await createSessionToken(guest[0], guest[1], Math.floor(Date.now()/1000));
  assert.equal((await s.call("/usage/report", null, { headers: {Cookie: `__Host-shosai-session=${cookie}`} })).status, 403);
  for (const path of ["/usage", "/usage?lang=en", "/usage/report"]) {
    const response = await s.call(path, owner);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.match(response.headers.get("Vary"), /Cookie/);
  }
});

test("record uses authenticated identity and discards content; switch of account is rejected", async () => {
  const s = setup();
  assert.equal((await s.post(event({ user: owner[0] }))).status, 409);
  assert.equal((await s.post(event(), null)).status, 401);
  assert.equal((await s.post(event({ show: "PRIVATE SHOW", text: "PRIVATE TEXT" }))).status, 200);
  assert.deepEqual(Object.keys(s.requests[0]).sort(), ["activeMs", "id", "kind", "user", "v"]);
  assert.equal(s.requests[0].user, guest[0]);
  const response = await s.call("/usage/report", owner);
  const report = await response.json();
  assert.equal(report.rows[0].activeDays, 1);
  assert.equal(report.rows[0].activeMs, 30000);
  assert.doesNotMatch(JSON.stringify([...(await s.stored.list()).values()]), /PRIVATE/);
});

test("same origin JSON, bounded payloads, periods and methods are enforced", async () => {
  const s = setup();
  for (const headers of [{Origin:"https://evil.example"},{Origin:"null"},{"Sec-Fetch-Site":"cross-site"}])
    assert.equal((await s.post(event(), guest, headers)).status, 403);
  assert.equal((await s.post(event(), guest, {"Content-Type":"text/plain"})).status, 400);
  for (const props of [{activeMs:30001},{activeMs:-1},{activeMs:1.5},{activeMs:0},{kind:"open",activeMs:1},{id:"bad"},{v:2},{kind:"save"}])
    assert.equal((await s.post(event(props))).status, 400);
  assert.equal((await s.post(event({text:"a".repeat(3000)}))).status, 400);
  assert.equal((await s.call("/usage/event")).status, 405);
  assert.equal((await s.call("/usage/report?days=365", owner)).status, 400);
  assert.equal((await s.call("/usage/report", owner, {method:"POST"})).status, 405);
  assert.equal((await s.call("/usage/unknown", owner)).status, 404);
  assert.equal(s.requests.length, 0);
});

test("disabled, beta ended, missing or failed storage never become fake empty success", async () => {
  for (const overrides of [{STAGE_USAGE_ENABLED:"false"},{STAGE_BETA_ACTIVE:"false"},{USAGE_METRICS:undefined}]) {
    const s = setup(); Object.assign(s.env, overrides);
    assert.equal((await (await s.call("/usage/config")).json()).enabled, false);
    assert.equal((await s.post(event())).status, 503);
    assert.equal((await s.call("/stage.html")).status, 200);
  }
  const s = setup(); s.env.USAGE_METRICS.get = () => { throw new Error("storage failure"); };
  assert.equal((await s.post(event())).status, 503);
  assert.equal((await s.call("/usage/report", owner)).status, 503);
  const local = setup(); delete local.env.SITE_USER; delete local.env.SITE_PASS; delete local.env.GUEST_USER; delete local.env.GUEST_PASS;
  assert.equal((await worker.fetch(new Request("http://localhost/usage/report"), local.env, {})).status, 401);
});

test("duplicate IDs, concurrent overlapping tabs and restarts keep one duration", async (t) => {
  let now = Date.parse("2026-09-08T03:00:00Z");
  t.mock.method(Date, "now", () => now);
  const s = setup(), payload = event();
  await s.post(payload);
  now += 15000;
  await s.post(payload); // retry must not move last use or add time
  assert.equal((await s.stored.get("user:guest")).lastSeen, now - 15000);
  await Promise.all([s.post(event()),s.post(event())]);
  let report = await (await s.call("/usage/report", owner)).json();
  assert.equal(report.rows[0].activeMs,45000);
  const restarted = new UsageMetrics({storage:s.stored});
  report = await (await restarted.fetch("https://usage/report?days=7")).json();
  assert.equal(report.rows[0].activeMs,45000);
  assert.ok(await s.stored.getAlarm());
});

test("JST midnight splits time, periods include today, retention expires after 90 days", async (t) => {
  let now = Date.parse("2026-09-08T15:00:10Z"); // JST Sep 9 00:00:10
  t.mock.method(Date,"now",()=>now);
  const s = setup();
  await s.post(event());
  let record=await s.stored.get("user:guest");
  assert.equal(record.days[dayNumber(now)-1].activeMs,20000);
  assert.equal(record.days[dayNumber(now)].activeMs,10000);
  let report=await (await s.call("/usage/report?days=7",owner)).json();
  assert.equal(report.to,"2026-09-09"); assert.equal(report.from,"2026-09-03");
  assert.equal(report.rows[0].activeDays,2);
  now+=DAY_MS*7;
  report=await (await s.call("/usage/report?days=7",owner)).json();
  assert.equal(report.rows[0].activeDays,0); assert.equal(report.rows[0].activeMs,0);
  now+=DAY_MS*83;
  report=await (await s.call("/usage/report?days=90",owner)).json();
  assert.deepEqual(report.rows,[]);
  await s.room.alarm(); assert.equal(await s.stored.get("user:guest"),undefined);
});

test("opening counts a usage day without inventing active time; safe account names", async () => {
  const s=setup(); await s.post(event({kind:"open",activeMs:0}));
  const report=await (await s.call("/usage/report",owner)).json();
  assert.equal(report.rows[0].activeMs,0); assert.equal(report.rows[0].activeDays,1);
  const html=await (await s.call("/usage",owner)).text();
  assert.match(html,/td.textContent=value/); assert.doesNotMatch(html,/innerHTML/);
  assert.match(html,/frame-ancestors|操作時間/);
});

const source=await readFile(new URL("../stage-usage.js",import.meta.url),"utf8");
function meter() {
  const context={window:{},document:{getElementById:()=>null}};
  vm.runInNewContext(source,context);
  return context.window.SHOSAI_STAGE_USAGE_MODEL.createActivityMeter(0);
}
test("activity requires input and foreground, stops after 60s idle and excludes long sleep",()=>{
  const m=meter();
  m.sample(0,true); m.sample(5000,true); assert.equal(m.take(),0);
  m.input(5000,true); m.sample(10020,true); assert.equal(m.take(),5020); // real timer jitter
  m.sample(15000,false); m.sample(20000,false); assert.equal(m.take(),0);
  m.sample(20000,true);
  for(let now=25000;now<=70000;now+=5000) m.sample(now,true);
  assert.equal(m.take(),30000); // batch capped, long unflushed batches are not deferred
  m.sample(75000,true); assert.equal(m.take(),0);
  m.input(75000,true); m.sample(3600000,true); assert.equal(m.take(),0);
  m.reset(3600000); m.sample(3605000,true); assert.equal(m.take(),0);
});

test("public distribution excludes account metrics; beta caches only client asset, not reports",async()=>{
  const root=new URL("../",import.meta.url);
  const [stage,preview,sw,build]=await Promise.all(["stage.html","try.html","stage-sw.js","build_public.py"].map(file=>readFile(new URL(file,root),"utf8")));
  assert.match(stage,/stage-usage\.js\?v=2/); assert.doesNotMatch(preview,/stage-usage\.js/);
  assert.match(build,/"stage-usage\.js",/); assert.match(sw,/"\.\/stage-usage\.js\?v=2"/);
  const shell=sw.match(/const APP_SHELL = \[([\s\S]*?)\];/)[1];
  assert.doesNotMatch(shell,/\/usage/);
});

async function browserHarness({enabled=true,focused=true}={}) {
  let now=0,tick;
  const nodes=[],handlers=new Map(),sent=[];
  const node=()=>({hidden:false,children:[],append(...items){this.children.push(...items);},classList:{contains:()=>false}});
  const root=node(),head=node();
  const listen=(name,fn)=>handlers.set(name,fn);
  const document={getElementById:()=>root,createElement:()=>{const value=node();nodes.push(value);return value;},head,
    body:node(),documentElement:{lang:"ja"},visibilityState:"visible",hasFocus:()=>focused,addEventListener:listen};
  let responseStatus=200;
  const context={document,location:{protocol:"https:"},navigator:{onLine:true},performance:{now:()=>now},
    MutationObserver:class {observe(){}},AbortController,crypto:globalThis.crypto,setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{tick=fn;},
    async fetch(url,options){
      if(url==="/usage/config") return {ok:true,status:200,json:async()=>({enabled,user:"guest",canAdmin:false})};
      sent.push(JSON.parse(options.body));return {ok:responseStatus===200,status:responseStatus};
    },
  };
  context.window={crypto:context.crypto,fetch:context.fetch,addEventListener:listen};
  vm.runInNewContext(source,context);
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  await settle();
  return {sent,nodes,root,document,context,
    async at(time){now=time;tick();await settle();},
    input(time){now=time;handlers.get("pointerdown")({isTrusted:true,type:"pointerdown"});},
    async hide(){focused=false;handlers.get("blur")();await settle();},
    status(value){responseStatus=value;},
    offline(){context.navigator.onLine=false;handlers.get("offline")();},
    online(){context.navigator.onLine=true;handlers.get("online")();},
  };
}
test("client sends actual foreground activity and disclosure; idle, background and offline stop it",async()=>{
  const s=await browserHarness();
  assert.equal(s.root.children[0].hidden,false);
  assert.match(s.root.children[0].children[0].textContent,/利用状況を記録/);
  assert.equal(s.root.children[0].children[2].hidden,true,"guest never sees admin link");
  await s.at(5000);assert.equal(s.sent[0].kind,"open");
  s.input(6000);
  for(let time=10000;time<=90000;time+=5000) await s.at(time);
  assert.equal(s.sent.filter(e=>e.kind==="active").reduce((n,e)=>n+e.activeMs,0),60000);
  const before=s.sent.length;
  await s.hide();s.input(91000);await s.at(95000);await s.at(120000);
  assert.equal(s.sent.length,before);
  s.offline();s.input(120100);await s.at(125000);s.online();await s.at(130000);
  assert.equal(s.sent.length,before);
  for(const payload of s.sent) assert.deepEqual(Object.keys(payload).sort(),["activeMs","id","kind","user","v"]);
});
test("client never records when disabled; account change stops future submissions",async()=>{
  const disabled=await browserHarness({enabled:false});disabled.input(1000);await disabled.at(30000);
  assert.equal(disabled.sent.length,0);assert.equal(disabled.root.children[0].hidden,true);
  const s=await browserHarness();await s.at(5000);s.status(409);s.input(6000);
  for(let time=10000;time<=60000;time+=5000) await s.at(time);
  assert.equal(s.sent.length,2); // first opening + first active report, then stop
});
