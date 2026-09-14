'use strict';
// Local, fixed-layout interaction example. No PDF parser or persistent writes.
(() => {
  const START = 6, SNAP = 16, MIN_Y = 8, MAX_Y = 540;
  let drag = null, suppressClick = false;
  function clearPreview() {
    document.querySelectorAll('.drop-target').forEach(n => n.classList.remove('drop-target'));
    document.querySelectorAll('.drag-preview,.drag-ghost').forEach(n => n.remove());
  }
  function cleanup(message) {
    const previous = drag;
    drag = null;
    clearPreview();
    document.body.classList.remove('dragging');
    document.querySelectorAll('.drag-source').forEach(n => n.classList.remove('drag-source'));
    if (previous?.node.hasPointerCapture(previous.pointer)) previous.node.releasePointerCapture(previous.pointer);
    if (message) say(message);
    return previous;
  }
  function candidate(x, y) {
    const visible = document.querySelector('.pan').getBoundingClientRect();
    if (x < visible.left || x > visible.right || y < visible.top || y > visible.bottom || y < 0 || y > innerHeight) return null;
    return [...document.querySelectorAll('.word')].find(n => {
      const r = n.getBoundingClientRect();
      return x >= r.left-SNAP && x <= r.right+SNAP && y >= r.top-SNAP && y <= r.bottom+SNAP;
    }) || null;
  }
  function preview(e) {
    const d = drag;
    clearPreview();
    d.target = candidate(e.clientX, e.clientY);
    d.delta = d.target ? wordY(d.target.dataset.token, state.view==='new')-state.pos[d.id] : 0;
    d.valid = !!d.target && d.ids.every(id => state.pos[id]+d.delta >= MIN_Y && state.pos[id]+d.delta <= MAX_Y);
    if (d.valid) {
      d.target.classList.add('drop-target');
      for (const id of d.ids) {
        const line = document.createElement('div');
        line.className = 'drag-preview';
        line.style.top = state.pos[id]+d.delta+44+'px';
        line.setAttribute('aria-hidden','true');
        $('paper').append(line);
      }
    }
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.setAttribute('aria-hidden','true');
    ghost.style.left = Math.max(8,Math.min(innerWidth-208,e.clientX+12))+'px';
    ghost.style.top = Math.max(8,Math.min(innerHeight-112,e.clientY+12))+'px';
    const title = document.createElement('strong');
    title.textContent = d.ids.length>1 ? d.ids.length+'件をまとめて移動' : annotations.find(a=>a.id===d.id).label+'を付け直す';
    const hint = document.createElement('div');
    hint.textContent = d.valid ? '離して「'+words[d.target.dataset.token]+'」へ' : d.target ? '一部が紙面外です。移動できません' : '下線のある語へ。候補外は取消';
    ghost.append(title,hint);
    document.body.append(ghost);
    // The visible floating label follows the pointer; the status updates only on candidate changes.
    const key = d.valid ? d.target.dataset.token : 'none';
    if (d.lastKey!==key) {say(title.textContent+'。'+hint.textContent+'。Escで取消。');d.lastKey=key;}
  }
  document.addEventListener('pointerdown', e => {
    if (drag) {if (e.pointerId!==drag.pointer) cleanup('複数の指を検出したため、移動を取り消しました。');return;}
    const node = e.target.closest('.pin');
    if (!node || !editable() || e.button!==0 || !e.isPrimary) return;
    const id = node.dataset.ann;
    drag = {node,id,pointer:e.pointerId,x:e.clientX,y:e.clientY,ids:checked.has(id)?[...checked]:[id],active:false};
    node.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', e => {
    if (!drag || drag.pointer!==e.pointerId) return;
    if (!drag.active && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<START) return;
    if (!drag.active) {
      drag.active=true;
      selected=drag.id;
      document.body.classList.add('dragging');
      drag.ids.forEach(id=>document.querySelector('[data-ann="'+id+'"]')?.classList.add('drag-source'));
    }
    e.preventDefault();
    preview(e);
  }, {passive:false});
  document.addEventListener('pointerup', e => {
    if (!drag || drag.pointer!==e.pointerId) return;
    if (!drag.active) {cleanup();return;}
    preview(e);
    const d = cleanup();
    suppressClick=true;
    setTimeout(()=>{suppressClick=false;},0);
    if (!d.valid) {say('移動を取り消しました。元の注釈と指す箇所はそのままです。');return;}
    const token = d.target.dataset.token;
    if (!d.delta && state.tokens[d.id]===token) {say('同じ箇所です。注釈は変更していません。');return;}
    snapshot(() => {
      d.ids.forEach(id=>{state.pos[id]+=d.delta;state.reviewed[id]=false;});
      state.tokens[d.id]=token;
    }, d.ids.length+'件を移動しました。内容・接続は保持しています。指す箇所の意味は要確認。「戻す」で全件を戻せます。');
    document.querySelector('[data-ann="'+d.id+'"]')?.focus({preventScroll:true});
  });
  document.addEventListener('click', e => {
    if (suppressClick && e.target.closest('.paper')) {e.preventDefault();e.stopImmediatePropagation();}
    if (drag && !e.target.closest('.paper')) cleanup('別の操作へ切り替えたため、移動を取り消しました。');
  }, true);
  document.addEventListener('pointercancel', e => {if (drag?.pointer===e.pointerId) cleanup('移動を取り消しました。元の注釈はそのままです。');});
  document.addEventListener('lostpointercapture', e => {if (drag?.pointer===e.pointerId) cleanup('移動が中断されたため、元の注釈を保持しました。');});
  document.addEventListener('keydown', e => {if (!e.isComposing && e.key==='Escape' && drag) {e.preventDefault();cleanup('移動を取り消しました。元の注釈はそのままです。');}});
  window.addEventListener('blur',()=>{if(drag)cleanup('画面を離れたため、移動を取り消しました。');});
})();
