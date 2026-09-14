// Revision 2: original stage editor + timeline only. No alternate editor shell.
window.addEventListener('load',function initializeTimeline(){
 const $=s=>document.querySelector(s),bridge=window.SHOSAI_STAGE_SESSION_BRIDGE;
 if(!bridge){setTimeout(initializeTimeline,50);return;}
 const doc=JSON.parse(bridge.exportDocumentString()),groups=[];let group;
 for(const scene of doc.project.scenes){if(scene.kind==='section'){group={id:scene.id,title:scene.title,scenes:[]};groups.push(group);}else if(group)group.scenes.push(scene);}
 if(!groups.length){setTimeout(initializeTimeline,50);return;}
 let section=0,time=0,unit='time',zoom=1,playing=false,last=0;
 const starts=[0,12,28,44],duration=60,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Use the EXISTING view control; no additional view bar or editor tabs.
 const view=$('#stage-view-select');
 for(const option of [...view.options])if(!['front','plan'].includes(option.value))option.remove();
 view.setAttribute('aria-label','表示する図');view.title='正面または平面を一つ表示';
 view.value='front';view.dispatchEvent(new Event('change',{bubbles:true}));
 document.body.insertAdjacentHTML('beforeend',`<section class="tl" aria-label="追加したタイムライン"><div class="tl-toolbar"><strong class="tl-title">タイムライン <small id="tl-section"></small></strong><button id="tl-home" aria-label="先頭へ戻る">⏮</button><button id="tl-play" aria-label="タイムラインの見本を再生">▶</button><output id="tl-time">0:00.00</output><button id="tl-time-unit" aria-pressed="true">時間</button><button id="tl-count-unit" aria-pressed="false">カウント</button><button id="tl-out" aria-label="タイムラインを縮小">−</button><span id="tl-zoom">全体</span><button id="tl-in" aria-label="タイムラインを拡大">＋</button></div><div class="tl-scroll"><div class="tl-tracks"><div class="tl-row tl-ruler" id="tl-ruler"></div><div class="tl-row tl-audio"><span class="tl-row-title">音源</span><svg class="tl-wave" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-label="説明用の波形"></svg><span class="tl-audio-note">音源A · 波形は見本／音声なし</span></div><div class="tl-row" id="tl-scenes"></div><div class="tl-row" id="tl-transitions"></div><div class="tl-head"></div></div></div><div class="tl-footer"><span>UI確認用 · 本体未反映・保存なし</span><span>時刻は仮設定（120 BPM）</span><span>既存の舞台編集画面＋タイムラインのみ</span></div></section>`);
 $('.tl-wave').innerHTML=Array.from({length:240},(_,i)=>{const h=2+Math.abs(Math.sin(i*.71)*Math.sin(i*.113))*34;return `<path d="M${i*5} ${20-h/2}v${h}" stroke="#d3ac59" stroke-width="2"/>`;}).join('');
 const rows=()=>groups[section].scenes;
 const stamp=s=>unit==='count'?`${(s*2+1).toFixed(1)} カウント`:`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
 function cursor(){$('#tl-time').textContent=stamp(time);$('.tl-head').style.left=`calc(var(--tl-label) + (100% - var(--tl-label)) * ${time/duration})`;}
 function draw(){
  $('#tl-section').textContent=groups[section].title;
  $('#tl-ruler').innerHTML=`<span class="tl-row-title">${unit==='count'?'カウント':'時間'}</span>`+Array.from({length:6*zoom},(_,i)=>{const s=i*10/zoom;return `<span class="tl-tick" style="left:${s/duration*100}%">${unit==='count'?s*2+1:`0:${String(s).padStart(2,'0')}`}</span>`;}).join('');
  $('#tl-scenes').innerHTML='<span class="tl-row-title">シーン</span>'+rows().map((s,i)=>`<button class="tl-block" data-tl-scene="${i}" style="left:${starts[i]/duration*100}%;width:${((starts[i+1]??60)-starts[i])/duration*100}%" title="${esc(s.title)}">${esc(s.title)}</button>`).join('');
  $('#tl-transitions').innerHTML='<span class="tl-row-title">転換</span>'+rows().slice(1).map((s,i)=>`<button class="tl-block tl-transition" data-tl-scene="${i+1}" aria-label="${esc(s.title)}への転換" style="left:${(starts[i+1]-4)/duration*100}%;width:${4/duration*100}%" title="${esc(s.title)}へ">↗ ${i+2}へ</button>`).join('');
  $('.tl-tracks').style.width=`${zoom*100}%`;$('#tl-zoom').textContent=zoom===1?'全体':`${zoom}倍`;cursor();
 }
 function stop(){playing=false;$('#tl-play').textContent='▶';$('#tl-play').setAttribute('aria-label','タイムラインの見本を再生');}
 function choose(i){stop();time=starts[i];const snapshot=JSON.parse(bridge.exportDocumentString());snapshot.project.activeSceneId=rows()[i].id;bridge.applyDocumentString(JSON.stringify(snapshot));bridge.finishSceneTransition();cursor();document.querySelectorAll('#tl-scenes button').forEach((b,n)=>b.setAttribute('aria-pressed',n===i));}
 $('.tl').addEventListener('click',e=>{const b=e.target.closest('[data-tl-scene]');if(b)choose(Number(b.dataset.tlScene));});
 $('#tl-ruler').onpointerdown=e=>{const r=e.currentTarget.getBoundingClientRect();time=Math.max(0,Math.min(duration,(e.clientX-r.left)/r.width*duration));stop();cursor();};
 $('#tl-home').onclick=()=>{time=0;stop();cursor();};
 function tick(t){if(!playing)return;if(last)time=Math.min(duration,time+(t-last)/1000);last=t;cursor();if(time>=duration)stop();else requestAnimationFrame(tick);}
 $('#tl-play').onclick=()=>{if(playing)return stop();if(time>=duration)time=0;last=0;playing=true;$('#tl-play').textContent='Ⅱ';$('#tl-play').setAttribute('aria-label','タイムラインの見本を一時停止');requestAnimationFrame(tick);};
 for(const u of ['time','count'])$('#tl-'+u+'-unit').onclick=()=>{unit=u;$('#tl-time-unit').setAttribute('aria-pressed',u==='time');$('#tl-count-unit').setAttribute('aria-pressed',u==='count');draw();};
 $('#tl-in').onclick=()=>{zoom=Math.min(4,zoom*2);draw();};$('#tl-out').onclick=()=>{zoom=Math.max(1,zoom/2);draw();};
 // Existing scene list stays in place and drives the timeline's section.
 $('#stage-scene-list').addEventListener('click',()=>setTimeout(()=>{const p=JSON.parse(bridge.exportDocumentString()).project;const n=groups.findIndex(g=>g.id===p.activeSceneId||g.scenes.some(s=>s.id===p.activeSceneId));if(n<0)return;section=n;const i=rows().findIndex(s=>s.id===p.activeSceneId);time=i<0?0:starts[i];stop();draw();},0));
 // Review-only boundary: retain controls visually; only scene/view/canvas navigation is active.
 window.addEventListener('click',e=>{if(e.target.closest('.tl,#stage-scene-list,#stage-view-select,.stage-zoom-fab'))return;e.preventDefault();e.stopImmediatePropagation();},{capture:true});
 window.addEventListener('keydown',e=>{if(e.target.closest('.tl,#stage-view-select'))return;e.preventDefault();e.stopImmediatePropagation();},{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 draw();window.__NATIVE_MUSIC_PREVIEW__.ready=true;window.__NATIVE_MUSIC_PREVIEW__.revision='timeline-only';
});
