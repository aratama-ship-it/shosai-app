/* UI proposal only. Actual Stage Sketch HTML/CSS/renderer, synthetic timing overlay. */
window.addEventListener('load',()=>{
 const $=s=>document.querySelector(s), bridge=window.SHOSAI_STAGE_SESSION_BRIDGE;
 if(!bridge){document.body.insertAdjacentHTML('afterbegin','<p>プレビューの初期化に失敗しました。</p>');return;}
 const original=JSON.parse(bridge.exportDocumentString());
 const groups=[];let group;
 for(const scene of original.project.scenes){if(scene.kind==='section'){group={id:scene.id,title:scene.title,scenes:[]};groups.push(group);}else if(group)group.scenes.push(scene);}
 if(!groups.length)return;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let section=0,selected=1,time=14,view='plan',unit='seconds',zoom=1,playing=false,last=0,offset=.5,arrival=0,curve='曲線',who=0;
 const duration=60, starts=[0,12,28,44];
 const header=$('.stage-sketch-head');
 header.insertAdjacentHTML('afterend',`<nav class="nm nm-tabs" aria-label="編集モード"><div role="tablist" aria-label="舞台スケッチの編集画面"><button role="tab" id="nm-standard-tab" aria-selected="false">舞台編集</button> <button role="tab" id="nm-music-tab" aria-selected="true">音楽編集</button></div><span class="nm-badge">UI設計案 · 本体未反映・保存なし</span><a href="plan.html">設計計画を見る</a></nav><div class="nm nm-context nm-music-only"><label>セクション <select id="nm-section" aria-label="編集中のセクション">${groups.map((g,i)=>`<option value="${i}">${esc(g.title)}</option>`).join('')}</select></label><label>音源 <select id="nm-audio" aria-label="編集中の音源"><option>音源A · 見本</option><option>音源B · 見本</option></select></label><button id="nm-add-audio">＋ 音源を追加</button><label class="nm-volume">音量 <input type="range" min="0" max="100" value="75" aria-label="音量（見本・音声なし）"></label></div><p class="nm nm-standard-note">舞台編集の配置比較用。既存パネルをそのまま表示しています（この見本では操作・保存しません）。</p>`);
 $('#stage-col-left').insertAdjacentHTML('beforeend','<section class="nm nm-side nm-music-only"><h2>シーン</h2><div id="nm-scenes"></div><p class="nm-muted">タイミング未設定のシーンも<br>この一覧に残します。</p></section>');
 $('#stage-col-right').insertAdjacentHTML('beforeend',`<section class="nm nm-side nm-inspector nm-music-only"><h2 id="nm-selection-title">転換</h2><div class="nm-mini-grid"><label>出発 <input id="nm-depart" type="number" step="0.1" value="10" aria-label="転換の出発時刻（見本）"></label><label>到着 <input id="nm-arrive" type="number" step="0.1" value="12" aria-label="転換の到着時刻（見本）"></label></div><hr><h3>動きを調整する演者</h3><select id="nm-person" aria-label="動きを調整する演者"></select><label>動き出しの遅れ <span id="nm-unit-label">秒</span><input id="nm-offset" type="number" min="-4" max="4" step="0.1" value="0.5"></label><label>早く到着 <span class="nm-unit-label">秒</span><input id="nm-arrival-offset" type="number" min="-4" max="4" step="0.1" value="0"></label><label>経路 <select id="nm-path"><option>曲線</option><option>直線</option></select></label><p class="nm-muted">セットの転換は舞台編集の設定を参照。</p><button id="nm-to-standard">舞台編集で配置を確認</button></section>`);
 $('#stage-col-center').insertAdjacentHTML('afterbegin',`<div class="nm nm-viewbar nm-music-only"><div class="nm-row"><button id="nm-front" aria-pressed="false">正面図</button><button id="nm-plan" aria-pressed="true">平面図</button></div><label><input id="nm-routes" type="checkbox" checked>動線</label><small id="nm-scene-caption"></small></div>`);
 $('.stage-sketch-grid').insertAdjacentHTML('afterend',`<section class="nm nm-timeline nm-music-only" aria-label="音楽とシーンのタイムライン"><div class="nm-transport"><button id="nm-home" aria-label="先頭へ戻る">⏮</button><button id="nm-play" aria-label="見本の動きを再生">▶</button><output id="nm-time">0:14.00</output><div role="group" aria-label="時間軸の単位"><button id="nm-seconds" aria-pressed="true">時間</button> <button id="nm-counts" aria-pressed="false">カウント</button></div><button id="nm-record" class="nm-primary">この位置にシーンを合わせる</button><button id="nm-cue">＋ 合図</button><span class="nm-spacer"></span><button id="nm-zoom-out" aria-label="タイムラインを縮小">−</button><span id="nm-zoom-value">全体</span><button id="nm-zoom-in" aria-label="タイムラインを拡大">＋</button></div><div class="nm-timeline-scroll"><div class="nm-tracks"><div class="nm-lane nm-ruler" id="nm-ruler"><span class="nm-lane-title">時間</span></div><div class="nm-lane"><span class="nm-lane-title">音源</span><svg class="nm-wave" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-label="音声ファイルから抽出していない説明用の波形"></svg><span class="nm-audio-caption" id="nm-audio-caption">音源A · 波形は見本／音声なし</span></div><div class="nm-lane" id="nm-scene-lane"><span class="nm-lane-title">シーン</span></div><div class="nm-lane" id="nm-transition-lane"><span class="nm-lane-title">転換</span></div><div class="nm-lane" id="nm-cue-lane"><span class="nm-lane-title">合図</span></div><div class="nm-playhead"></div></div></div><div class="nm-foot"><span>仮テンポ 120 BPM</span><label>スナップ <select aria-label="スナップの見本" id="nm-snap"><option>0.1 秒</option><option>なし</option></select></label><span id="nm-status">シーン・音源は別々に管理</span><span>時刻・動きは説明用の仮設定</span></div></section><div class="nm nm-toast" role="status"></div>`);
 const wave=$('.nm-wave');wave.innerHTML=Array.from({length:240},(_,i)=>{const h=3+Math.abs(Math.sin(i*.71)*Math.sin(i*.113))*39;return `<path d="M${i*5} ${24-h/2}v${h}" stroke="#d3ac59" stroke-width="2"/>`;}).join('');
 const toast=s=>{$('.nm-toast').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('.nm-toast').textContent='',3200);};
 const rows=()=>groups[section].scenes;
 const stamp=s=>unit==='counts'?`${(s*2+1).toFixed(s%0.5?1:0)} カウント`:`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
 function setView(v){view=v;document.body.dataset.nmView=v;$('#nm-front').setAttribute('aria-pressed',v==='front');$('#nm-plan').setAttribute('aria-pressed',v==='plan');const sel=$('#stage-view-select');sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));window.dispatchEvent(new Event('resize'));}
 function mode(m){stop();document.body.classList.toggle('nm-music',m==='music');$('#nm-standard-tab').setAttribute('aria-selected',m==='standard');$('#nm-music-tab').setAttribute('aria-selected',m==='music');if(m==='standard'){const doc=structuredClone(original);doc.project.activeSceneId=rows()[selected].id;bridge.applyDocumentString(JSON.stringify(doc));}else paint();setView(view);}
 function draw(){
   $('#nm-scenes').innerHTML=rows().map((s,i)=>`<button class="nm-scene" data-scene="${i}" aria-pressed="${i===selected}"><span>${esc(s.title)}</span><small>${stamp(starts[i]??i*12)}</small></button>`).join('');
   $('#nm-scene-lane').innerHTML='<span class="nm-lane-title">シーン</span>'+rows().map((s,i)=>`<button class="nm-block" data-scene="${i}" aria-pressed="${i===selected}" style="left:${starts[i]/duration*100}%;width:${((starts[i+1]??60)-starts[i])/duration*100}%" title="${esc(s.title)}">${i+1} ${esc(s.title)}</button>`).join('');
   $('#nm-transition-lane').innerHTML='<span class="nm-lane-title">転換</span>'+rows().slice(1).map((s,i)=>`<button class="nm-block nm-transition" data-scene="${i+1}" aria-label="シーン${i+2}への転換を選ぶ" style="left:${(starts[i+1]-4)/duration*100}%;width:${4/duration*100}%" title="シーン${i+2}へ・${stamp(starts[i+1]-4)}〜${stamp(starts[i+1])}">↗ ${i+2}へ</button>`).join('');
   $('#nm-ruler').innerHTML=`<span class="nm-lane-title">${unit==='counts'?'カウント':'時間'}</span>`+Array.from({length:6*zoom},(_,i)=>{let s=i*10/zoom;return `<span class="nm-tick" style="left:${s/duration*100}%">${unit==='counts'?s*2+1:`0:${String(s).padStart(2,'0')}`}</span>`;}).join('');
   const scene=rows()[selected];$('#nm-selection-title').textContent=`シーン${selected+1}への転換`;
   $('#nm-scene-caption').textContent=scene.title;$('#nm-person').innerHTML=original.project.cast.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');$('#nm-person').value=who;
   $('#nm-depart').value=unit==='counts'?Math.max(0,starts[selected]-4)*2+1:Math.max(0,starts[selected]-4);$('#nm-arrive').value=unit==='counts'?starts[selected]*2+1:starts[selected];
   $('#nm-offset').value=offset*(unit==='counts'?2:1);$('#nm-arrival-offset').value=arrival*(unit==='counts'?2:1);$('#nm-unit-label').textContent=unit==='counts'?'カウント':'秒';$('.nm-unit-label').textContent=$('#nm-unit-label').textContent;
   $('.nm-tracks').style.width=`${100*zoom}%`;$('#nm-zoom-value').textContent=zoom===1?'全体':`${zoom}倍`;paint();
 }
 function paint(){
   $('#nm-time').textContent=stamp(time);$('.nm-playhead').style.left=`calc(var(--nm-label) + (100% - var(--nm-label)) * ${time/duration})`;
   // Native scene geometry is reused; music timing here is explicitly synthetic.
   const index=Math.max(0,starts.findLastIndex(s=>s<=time));
   const base=rows()[Math.min(index,rows().length-1)], next=rows()[index+1];
   const doc=structuredClone(original);const target=doc.project.scenes.find(s=>s.id===base.id);doc.project.activeSceneId=base.id;
   if(next&&time>=starts[index+1]-4){for(const p of target.pieces){const q=next.pieces.find(x=>p.castId?x.castId===p.castId:p.setId&&x.setId===p.setId);if(!q)continue;const delay=p.castId===original.project.cast[who]?.id?offset:0;const early=p.castId===original.project.cast[who]?.id?arrival:0;let t=Math.max(0,Math.min(1,(time-(starts[index+1]-4)-delay)/Math.max(.1,4-delay-early)));p.u+=(q.u-p.u)*t;p.v+=(q.v-p.v)*t;if(curve==='曲線'&&p.castId)p.v+=Math.sin(t*Math.PI)*.035;}}
   bridge.applyDocumentString(JSON.stringify(doc));bridge.finishSceneTransition();
 }
 function stop(){playing=false;$('#nm-play').textContent='▶';$('#nm-play').setAttribute('aria-label','見本の動きを再生');}
 function tick(t){if(!playing)return;if(last)time=Math.min(duration,time+(t-last)/1000);last=t;paint();if(time>=duration)stop();else setTimeout(()=>requestAnimationFrame(tick),90);}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(b){selected=Number(b.dataset.scene);time=starts[selected];stop();draw();}});
 $('#nm-standard-tab').onclick=()=>mode('standard');$('#nm-to-standard').onclick=()=>mode('standard');$('#nm-music-tab').onclick=()=>mode('music');$('#nm-front').onclick=()=>setView('front');$('#nm-plan').onclick=()=>setView('plan');
 $('#nm-section').onchange=e=>{section=Number(e.target.value);selected=0;time=0;stop();draw();};
 $('#nm-audio').onchange=e=>{$('#nm-audio-caption').textContent=e.target.value+' · 波形は見本／音声なし';toast('音源の切替例です。シーンの数・並びは変えません。');};
 $('#nm-add-audio').onclick=()=>toast('本実装ではここで音源を選択。シーンやセクションは増やしません。');
 $('#nm-home').onclick=()=>{time=0;stop();paint();};$('#nm-play').onclick=()=>{if(playing)return stop();if(time>=duration)time=0;playing=true;last=0;$('#nm-play').textContent='Ⅱ';$('#nm-play').setAttribute('aria-label','見本の動きを一時停止');requestAnimationFrame(tick);};
 for(const u of ['seconds','counts'])$('#nm-'+u).onclick=()=>{unit=u;$('#nm-seconds').setAttribute('aria-pressed',u==='seconds');$('#nm-counts').setAttribute('aria-pressed',u==='counts');$('#nm-snap').options[0].text=u==='seconds'?'0.1 秒':'0.5 カウント';draw();};
 $('#nm-zoom-in').onclick=()=>{zoom=Math.min(4,zoom*2);draw();};$('#nm-zoom-out').onclick=()=>{zoom=Math.max(1,zoom/2);draw();};
 $('#nm-ruler').onpointerdown=e=>{const r=e.currentTarget.getBoundingClientRect();time=Math.max(0,Math.min(duration,(e.clientX-r.left)/r.width*duration));stop();paint();};
 $('#nm-record').onclick=()=>toast(`シーン${selected+1}の時刻を ${stamp(time)} に合わせる操作案です（データ変更なし）。`);
 $('#nm-cue').onclick=()=>{const b=document.createElement('button');b.className='nm-block';b.textContent='◆ 合図';b.style.left=Math.min(92,time/duration*100)+'%';b.title=stamp(time);b.onclick=()=>toast('台本Qとの対応づけは設計上の確認事項です。');$('#nm-cue-lane').append(b);};
 $('#nm-person').onchange=e=>{who=Number(e.target.value);paint();};$('#nm-offset').oninput=e=>{offset=Number(e.target.value)/(unit==='counts'?2:1);paint();};$('#nm-arrival-offset').oninput=e=>{arrival=Number(e.target.value)/(unit==='counts'?2:1);paint();};$('#nm-path').onchange=e=>{curve=e.target.value;paint();};
 for(const id of ['nm-depart','nm-arrive'])$('#'+id).onchange=()=>toast('出発・到着の直接入力欄の配置案です。タイミングの書込みは未実装です。');
 $('#nm-routes').onchange=e=>{const input=$('#stage-plan-routes-cast');if(input){input.checked=e.target.checked;input.dispatchEvent(new Event('change',{bubbles:true}));}toast(e.target.checked?'動線を表示する設定例':'動線を隠す設定例');};
 // Original editing controls are comparison-only. The prototype is the only interactive surface.
 window.addEventListener('click',e=>{if(!e.target.closest('.nm')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 window.addEventListener('keydown',e=>{if(!e.target.closest('.nm')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 for(const ev of ['pointerdown','pointermove','pointerup','wheel','input','change'])window.addEventListener(ev,e=>{if(e.isTrusted&&!e.target.closest('.nm')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 draw();mode('music');window.__NATIVE_MUSIC_PREVIEW__.ready=true;
});
