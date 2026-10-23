/* TEAMRM - Posture & Correction — exercícios: biblioteca, vídeo explicativo, treino guiado e registro. */
'use strict';

let exFilter = { cat: '', q: '' };
let workoutDraft = { ids: [], patientId: '' };

/* ---------- mídias próprias: vários vídeos, fotos e links por exercício ou movimento ---------- */
// registro em media: { id, kind:'set', items:[{ iid, kind:'file'|'photo'|'link', blob?, url?, name, type? }] }
// (registros antigos com um único vídeo ou link continuam funcionando)
async function mediaItems(id) {
  const m = await Store.get('media', id); if (!m) return [];
  if (m.kind === 'set') return m.items || [];
  return [{ iid: 'old', kind: m.kind, blob: m.blob, url: m.url, name: m.name, type: m.type }];
}
async function saveMediaItems(id, items) {
  if (!items.length) return Store.del('media', id);
  await Store.put('media', { id, kind: 'set', items, createdAt: todayISO() });
}
async function addMediaItem(id, item) { const it = await mediaItems(id); it.push({ iid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...item }); await saveMediaItems(id, it); }
async function mediaURL(id) {   // primeiro item (compatibilidade)
  const m = (await mediaItems(id))[0]; if (!m) return null;
  return m.kind === 'link' ? { kind: 'link', url: m.url, name: m.name } : { kind: m.kind, url: URL.createObjectURL(m.blob), name: m.name, type: m.type };
}
function ytId(url) { const y = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/.exec(url || ''); return y ? y[1] : null; }
function embedFor(url) { const y = ytId(url); return y ? `https://www.youtube-nocookie.com/embed/${y}` : null; }
function videoBlock(med) {
  if (!med) return '';
  if (med.kind === 'file') return `<video src="${med.url}" controls playsinline preload="metadata" style="width:100%;max-height:60vh;border-radius:8px;background:#000"></video>`;
  if (med.kind === 'photo') return `<img src="${med.url}" alt="${esc(med.name || 'Foto')}" data-zoom style="width:100%;max-height:60vh;object-fit:contain;border-radius:8px;background:var(--sunken);cursor:zoom-in">`;
  const emb = embedFor(med.url);
  return (emb ? `<div class="vid169"><iframe src="${emb}" title="Vídeo explicativo" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : '') +
    `<p style="margin:0"><a href="${esc(med.url)}" target="_blank" rel="noopener">Abrir ${emb ? 'no YouTube' : 'o link'} ↗</a></p>`;
}
// foto: reduz para no máximo 1600 px (mantém proporção) para não lotar o aparelho
async function shrinkPhoto(f) {
  try {
    const url = URL.createObjectURL(f); const img = await loadImg(url); URL.revokeObjectURL(url);
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    if (k === 1 && f.size < 1.5 * 1048576) return f;
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || f), 'image/jpeg', 0.9));
  } catch { return f; }
}
function zoomPhoto(src) {
  const d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = `<img src="${src}" alt="Foto ampliada"><button class="btn small" aria-label="Fechar">✕ Fechar</button>`;
  d.onclick = () => d.remove(); document.body.appendChild(d);
}
document.addEventListener('click', e => { const z = e.target.closest?.('[data-zoom]'); if (z) zoomPhoto(z.src); });

/* Bloco reutilizável: vídeos, fotos e links próprios para um exercício ou movimento */
async function bindOwnVideo(root, mediaId, label) {
  const box = $('[data-ownvideo]', root); if (!box) return;
  let urls = [];
  const draw = async () => {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    const items = await mediaItems(mediaId);
    $$('[data-exmedia]').forEach(el => { if ('ex:' + el.dataset.exmedia === mediaId) { el._done = false; el.innerHTML = '<span aria-hidden="true">Sem foto ou vídeo ainda</span>'; fillExMedia(el); } });
    const view = items.map(m => { const med = m.kind === 'link' ? m : { ...m, url: URL.createObjectURL(m.blob) }; if (m.kind !== 'link') urls.push(med.url); return med; });
    const vids = view.filter(m => m.kind !== 'photo'), photos = view.filter(m => m.kind === 'photo');
    box.innerHTML = `<div class="stack"><h3 style="margin:0">Seus vídeos e fotos</h3>
      ${items.length ? '' : `<p class="muted" style="margin:0;font-size:.9rem">Inclua quantos quiser para ${esc(label)}: link do YouTube (ou Instagram, Drive), vídeo gravado no celular ou fotos de cada etapa.</p>`}
      ${vids.map(m => `<div class="ownitem">${videoBlock(m)}<button class="btn small ghost danger" data-mrm="${m.iid}">Remover ${m.kind === 'link' ? 'link' : 'vídeo'}</button></div>`).join('')}
      ${photos.length ? `<div class="ownphotos">${photos.map((m, i) => `<figure><img src="${m.url}" alt="Foto ${i + 1}" data-zoom><figcaption><span class="num">${i + 1}</span><button class="btn small ghost danger" data-mrm="${m.iid}" aria-label="Remover foto ${i + 1}">✕</button></figcaption></figure>`).join('')}</div>` : ''}
      <div class="ownadd">
        <div class="row"><label class="btn small" style="cursor:pointer">📹 Gravar vídeo<input type="file" accept="video/*" capture="environment" data-vfile hidden></label><label class="btn small" style="cursor:pointer">🎞️ Vídeo da galeria<input type="file" accept="video/*" data-vfile hidden></label></div>
        <div class="row"><label class="btn small" style="cursor:pointer">📷 Tirar foto<input type="file" accept="image/*" capture="environment" data-pfile hidden></label><label class="btn small" style="cursor:pointer">🖼️ Fotos da galeria<input type="file" accept="image/*" multiple data-pfile hidden></label></div>
        <div class="row"><input class="search" style="flex:1;min-width:200px" data-vlink type="url" inputmode="url" placeholder="Cole o link do YouTube: https://youtu.be/…"><button class="btn small" data-vsave>Salvar link</button></div>
      </div></div>`;
    $$('[data-vfile]', box).forEach(inp => inp.onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 200 * 1048576) return toast('Vídeo acima de 200 MB. Grave um trecho mais curto.', 4000);
      await addMediaItem(mediaId, { kind: 'file', blob: f, name: f.name, type: f.type }); toast('Vídeo salvo neste aparelho'); draw();
    });
    $$('[data-pfile]', box).forEach(inp => inp.onchange = async e => {
      const fs = [...e.target.files]; if (!fs.length) return;
      for (const f of fs) { const b = await shrinkPhoto(f); await addMediaItem(mediaId, { kind: 'photo', blob: b, name: f.name, type: b.type || f.type }); }
      toast(fs.length > 1 ? `${fs.length} fotos salvas` : 'Foto salva'); draw();
    });
    $('[data-vsave]', box).onclick = async () => {
      let u = $('[data-vlink]', box).value.trim();
      if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(u)) return toast('Cole um link válido, por exemplo https://youtu.be/…');
      await addMediaItem(mediaId, { kind: 'link', url: u, name: u }); toast(ytId(u) ? 'Vídeo do YouTube salvo' : 'Link salvo'); draw();
    };
    $$('[data-mrm]', box).forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Remover?', 'Este item sai só deste exercício.', 'Remover'))) return;
      await saveMediaItems(mediaId, (await mediaItems(mediaId)).filter(m => m.iid !== b.dataset.mrm)); toast('Removido'); draw();
    });
  };
  await draw();
}

/* ---------- exercícios e alongamentos próprios ---------- */
async function loadCustomEx() {
  const r = await Store.get('settings', 'customEx'); const list = r?.list || [];
  for (let i = EXERCISES.length - 1; i >= 0; i--) if (EXERCISES[i].custom) EXERCISES.splice(i, 1);
  list.forEach(e => { e.custom = true; e.dose = exDose(e); EXERCISES.push(e); });
  return list;
}
async function saveCustomEx(list) { await Store.put('settings', { id: 'customEx', list: list.map(({ dose, ...e }) => e) }); await loadCustomEx(); }
// ilustração de exercício próprio: 1ª foto, 1º vídeo ou capa do YouTube (preenchida depois de montar)
function exVisual(e, size, thumb) {
  if (!e.custom) return thumb ? exPicto(e.pose, size) : exAnim(e, size);
  return `<div class="exmedia${thumb ? ' thumb' : ''}" data-exmedia="${e.id}" style="width:${size}px;${thumb ? `height:${size}px` : ''}"><span aria-hidden="true">${thumb ? '🎬' : 'Sem foto ou vídeo ainda'}</span></div>`;
}
async function fillExMedia(el) {
  if (el._done) return; el._done = true;
  const items = await mediaItems('ex:' + el.dataset.exmedia);
  const thumb = el.classList.contains('thumb');
  const ph = items.find(m => m.kind === 'photo'), vf = items.find(m => m.kind === 'file'), yt = items.find(m => m.kind === 'link' && ytId(m.url));
  if (ph) el.innerHTML = `<img src="${URL.createObjectURL(ph.blob)}" alt="">`;
  else if (vf) el.innerHTML = `<video src="${URL.createObjectURL(vf.blob)}#t=0.5" muted playsinline ${thumb ? 'preload="metadata"' : 'autoplay loop'}></video>`;
  else if (yt) el.innerHTML = `<img src="https://i.ytimg.com/vi/${ytId(yt.url)}/hqdefault.jpg" alt="">${thumb ? '' : '<span class="ytbadge">▶ YouTube</span>'}`;
  else if (items.length) el.innerHTML = '<span aria-hidden="true">🔗</span>';
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.dataset?.exmedia) fillExMedia(n); n.querySelectorAll?.('[data-exmedia]').forEach(fillExMedia); }))).observe(document.body, { childList: true, subtree: true });

SCREENS.exedit = async ({ id } = {}) => {
  const list = await loadCustomEx();
  const e = id ? list.find(x => x.id === id) : null;
  const d = e?.d || { sets: 1, reps: 3, hold: 30, sides: false };
  const areas = [...new Set(EXERCISES.map(x => x.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  app.innerHTML = `${back(e ? e.name : 'Exercícios')}
    <h1>${e ? 'Editar exercício' : 'Novo exercício ou alongamento'}</h1>
    <section class="panel stack">
      <label class="f">Nome<input id="ce-name" value="${esc(e?.name || '')}" placeholder="Ex.: Alongamento do psoas na maca"></label>
      <div class="row" style="align-items:flex-end">
        <label class="f" style="flex:1;min-width:160px">Categoria<select id="ce-cat">${Object.entries(EX_CATS).map(([k, l]) => `<option value="${k}"${(e?.cat || 'alongamento') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f" style="flex:1;min-width:160px">Região<input id="ce-area" list="ce-areas" value="${esc(e?.area || '')}" placeholder="Ex.: Quadril e coxa"><datalist id="ce-areas">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist></label></div>
      <div class="row" style="align-items:flex-end">
        <label class="f" style="width:90px">Séries<input id="ce-sets" type="number" min="1" max="20" inputmode="numeric" value="${d.sets}"></label>
        <label class="f" style="width:90px">Repetições<input id="ce-reps" type="number" min="1" max="100" inputmode="numeric" value="${d.reps}"></label>
        <label class="f" style="width:130px">Segurar (s)<input id="ce-hold" type="number" min="0" max="600" inputmode="numeric" value="${d.hold || 0}"></label>
        <label class="row" style="gap:6px;padding-bottom:10px"><input type="checkbox" id="ce-sides" ${d.sides ? 'checked' : ''}> De cada lado</label></div>
      <p class="muted" style="margin:0;font-size:.85rem">Deixe "Segurar" em 0 para exercícios de repetição.</p>
      <label class="f">Como fazer (um passo por linha)<textarea id="ce-steps" rows="5" placeholder="Deitado de barriga para cima…&#10;Leve o joelho ao peito…&#10;Segure e respire devagar.">${esc((e?.steps || []).join('\n'))}</textarea></label>
      <div class="row"><button class="btn primary" id="ce-save">${e ? 'Salvar alterações' : 'Salvar e incluir vídeo ou fotos'}</button>${e ? '<button class="btn ghost danger" id="ce-del">Excluir exercício</button>' : ''}</div>
    </section>`;
  bindBack(e ? 'exercise' : 'exercises', e ? { id: e.id } : undefined);
  $('#ce-save').onclick = async () => {
    const name = $('#ce-name').value.trim(); if (!name) return toast('Dê um nome ao exercício');
    const num = (sel, min, max, def) => { const v = Math.round(+$(sel).value); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
    const rec = { id: e?.id || 'c_' + Date.now().toString(36), name, cat: $('#ce-cat').value, area: $('#ce-area').value.trim() || 'Geral', pose: null,
      d: { sets: num('#ce-sets', 1, 20, 1), reps: num('#ce-reps', 1, 100, 1), hold: num('#ce-hold', 0, 600, 0), sides: $('#ce-sides').checked },
      steps: $('#ce-steps').value.split('\n').map(x => x.trim()).filter(Boolean), createdAt: e?.createdAt || todayISO() };
    await saveCustomEx(e ? list.map(x => x.id === e.id ? rec : x) : [...list, rec]);
    toast(e ? 'Exercício atualizado' : 'Exercício criado. Agora inclua o vídeo ou as fotos.', 3500); go('exercise', { id: rec.id });
  };
  if (e) $('#ce-del').onclick = async () => {
    if (!(await confirmBox('Excluir exercício?', `“${e.name}”, com seus vídeos e fotos, será apagado deste aparelho.`))) return;
    await saveCustomEx(list.filter(x => x.id !== e.id)); await Store.del('media', 'ex:' + e.id);
    workoutDraft.ids = workoutDraft.ids.filter(x => x !== e.id); toast('Exercício excluído'); go('exercises');
  };
};

SCREENS.exercises = async () => {
  const draw = () => {
    const q = exFilter.q.toLowerCase();
    const list = EXERCISES.filter(e => (!exFilter.cat || e.cat === exFilter.cat || (exFilter.cat === '_mine' && e.custom)) && (!q || (e.name + ' ' + e.area).toLowerCase().includes(q)));
    $('#exlist').innerHTML = list.length ? list.map(e => `<div class="exrow"><button class="exmain" data-ex="${e.id}">${exVisual(e, 64, true)}<span style="min-width:0"><b>${esc(e.name)}</b><br><span class="muted" style="font-size:.85rem">${esc(e.dose)}</span><br><span class="tag">${esc(EX_CATS[e.cat])}</span>${e.custom ? ' <span class="tag mine">Meu</span>' : ''} <span class="muted" style="font-size:.78rem">${esc(e.area)}</span></span></button>
      <label class="excheck" title="Incluir no treino"><input type="checkbox" data-pick="${e.id}" ${workoutDraft.ids.includes(e.id) ? 'checked' : ''}><span class="sr">Incluir no treino</span></label></div>`).join('') : '<div class="panel empty muted">Nenhum exercício com esse filtro.</div>';
    $('#excount').textContent = list.length;
    $$('[data-ex]').forEach(b => b.onclick = () => go('exercise', { id: b.dataset.ex }));
    $$('[data-pick]').forEach(c => c.onchange = () => { const id = c.dataset.pick; workoutDraft.ids = c.checked ? [...workoutDraft.ids, id] : workoutDraft.ids.filter(x => x !== id); bar(); });
    bar();
  };
  const bar = () => { const n = workoutDraft.ids.length; $('#start').textContent = n ? `Começar o treino (${n})` : 'Começar o treino'; $('#start').disabled = !n; };
  app.innerHTML = `<div class="exhead"><div class="excount"><b class="num" id="excount">${EXERCISES.length}</b><span>exercícios</span></div>
      <label class="f" style="flex:1;min-width:180px">Categoria<select id="cat"><option value="">Todos</option><option value="_mine"${exFilter.cat === '_mine' ? ' selected' : ''}>Meus exercícios</option>${Object.entries(EX_CATS).map(([k, l]) => `<option value="${k}"${exFilter.cat === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <input class="search" id="exq" type="search" placeholder="Buscar exercício ou região (ex.: ombro, glúteo)" value="${esc(exFilter.q)}" aria-label="Buscar exercício">
    <button class="btn" id="newex">＋ Novo exercício ou alongamento (link do YouTube, vídeo ou fotos)</button>
    <p class="muted" style="margin:0;font-size:.85rem">Marque os exercícios para montar um treino. Toque no nome para ver a animação, os passos e o seu vídeo.</p>
    <div id="exlist" class="exlist"></div>
    <div class="exbar"><button class="btn primary" id="start" disabled>Começar o treino</button><button class="btn" id="log">Registro de treinos</button></div>`;
  $('#cat').onchange = e => { exFilter.cat = e.target.value; draw(); };
  $('#exq').oninput = e => { exFilter.q = e.target.value; draw(); };
  $('#start').onclick = () => go('workout', { ids: workoutDraft.ids });
  $('#newex').onclick = () => go('exedit');
  $('#log').onclick = () => go('workouts');
  draw();
};

SCREENS.exercise = async ({ id }) => {
  await loadCustomEx();
  const e = EXERCISES.find(x => x.id === id); if (!e) return go('exercises');
  app.innerHTML = `${back('Exercícios')}
    <div class="stack" style="gap:4px"><span class="eyebrow">${esc(EX_CATS[e.cat])} · ${esc(e.area)}</span><h1>${esc(e.name)}</h1></div>
    <div class="exdetail"><div class="exanim">${exVisual(e, 220)}</div>
      <div class="stack"><div class="panel"><span class="eyebrow">Dose sugerida</span><p style="margin:4px 0 0;font-size:1.1rem"><b>${esc(e.dose)}</b></p></div>
      <div class="panel"><span class="eyebrow">Como fazer</span>${e.steps.length ? `<ol style="margin:8px 0 0;padding-left:20px;display:grid;gap:6px">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '<p class="muted" style="margin:6px 0 0">Sem passos escritos. Veja o vídeo ou as fotos abaixo.</p>'}</div>
      <div class="row"><button class="btn primary" id="add">${workoutDraft.ids.includes(id) ? 'No treino ✓' : 'Adicionar ao treino'}</button><button class="btn" id="now">Fazer agora</button>${e.custom ? '<button class="btn ghost" id="edit">Editar</button>' : ''}</div></div></div>
    <section class="panel" data-ownvideo></section>`;
  bindBack('exercises');
  $('#add').onclick = () => { if (!workoutDraft.ids.includes(id)) workoutDraft.ids.push(id); $('#add').textContent = 'No treino ✓'; toast('Adicionado ao treino'); };
  $('#now').onclick = () => go('workout', { ids: [id] });
  if ($('#edit')) $('#edit').onclick = () => go('exedit', { id });
  await bindOwnVideo(app, 'ex:' + id, 'este exercício');
};

/* ---------- treino guiado ---------- */
let audioCtx = null;
function beep(f = 880, ms = 160) { try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = f; o.connect(g); g.connect(audioCtx.destination); g.gain.value = .15; o.start(); o.stop(audioCtx.currentTime + ms / 1000); } catch (e) { } }

SCREENS.workout = async ({ ids, patientId }) => {
  const list = (ids || []).map(i => EXERCISES.find(e => e.id === i)).filter(Boolean);
  if (!list.length) return go('exercises');
  const pts = (await Store.all('patients')).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const st = { i: 0, set: 1, rep: 0, side: 'D', timer: null, left: 0, started: Date.now(), done: {} };
  let wake = null; try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { }
  const render = () => {
    const e = list[st.i], d = e.d;
    app.innerHTML = `${back('Sair do treino')}
      <div class="row spread"><span class="eyebrow">Exercício ${st.i + 1} de ${list.length}</span>
        <label class="f" style="min-width:200px">Paciente<select id="wp"><option value="">Treino sem paciente</option>${pts.map(p => `<option value="${p.id}"${p.id === (patientId || '') ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>
      <div class="progress"><span style="width:${(st.i / list.length) * 100}%"></span></div>
      <h1>${esc(e.name)}</h1>
      <div class="exdetail"><div class="exanim">${exVisual(e, 200)}</div>
        <div class="stack">
          <div class="panel stack" style="text-align:center">
            <span class="eyebrow">Série ${st.set} de ${d.sets}${d.sides ? ' · lado ' + (st.side === 'D' ? 'direito' : 'esquerdo') : ''}</span>
            <b class="num bigcount" id="cnt">${d.hold ? (st.left || d.hold) + ' s' : st.rep + ' / ' + d.reps}</b>
            <span class="muted">${d.hold ? `Repetição ${Math.min(st.rep + 1, d.reps)} de ${d.reps}` : 'repetições'}</span>
            <div class="row" style="justify-content:center">${d.hold ? `<button class="btn primary" id="go">${st.timer ? 'Pausar' : 'Iniciar'}</button>` : '<button class="btn primary" id="plus">+1 repetição</button>'}<button class="btn" id="setdone">Série concluída</button></div>
          </div>
          <details class="panel"><summary><b>Como fazer</b></summary><ol style="margin:8px 0 0;padding-left:20px">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
          <div class="row spread"><button class="btn" id="prev" ${st.i ? '' : 'disabled'}>← Anterior</button><button class="btn" id="next">${st.i === list.length - 1 ? 'Concluir treino' : 'Próximo →'}</button></div>
        </div></div>`;
    $('[data-back]').onclick = finish.bind(null, false);
    $('#wp').onchange = ev => patientId = ev.target.value;
    if ($('#go')) $('#go').onclick = toggleTimer;
    if ($('#plus')) $('#plus').onclick = () => { st.rep++; beep(660, 80); if (st.rep >= d.reps) setDone(); else render(); };
    $('#setdone').onclick = setDone;
    $('#prev').onclick = () => { stop(); st.i--; resetEx(); render(); };
    $('#next').onclick = () => { stop(); if (st.i === list.length - 1) finish(true); else { st.i++; resetEx(); render(); } };
  };
  const resetEx = () => { st.set = 1; st.rep = 0; st.side = 'D'; st.left = 0; };
  const stop = () => { clearInterval(st.timer); st.timer = null; };
  const toggleTimer = () => {
    const d = list[st.i].d;
    if (st.timer) { stop(); render(); return; }
    st.left = st.left || d.hold; beep(520, 80);
    st.timer = setInterval(() => {
      st.left--; const c = $('#cnt'); if (c) c.textContent = st.left + ' s';
      if (st.left <= 3 && st.left > 0) beep(440, 60);
      if (st.left <= 0) { stop(); beep(880, 220); st.rep++; st.left = 0; if (st.rep >= d.reps) setDone(); else render(); }
    }, 1000);
    render();
  };
  const setDone = () => {
    const e = list[st.i], d = e.d; stop();
    st.done[e.id] = (st.done[e.id] || 0) + 1;
    if (d.sides && st.side === 'D') { st.side = 'E'; st.rep = 0; toast('Agora o lado esquerdo'); }
    else if (st.set < d.sets) { st.set++; st.side = 'D'; st.rep = 0; toast(`Descanse 30 s antes da série ${st.set}`); }
    else if (st.i < list.length - 1) { st.i++; resetEx(); toast('Próximo exercício'); }
    else return finish(true);
    render();
  };
  async function finish(save) {
    stop(); try { await wake?.release(); } catch (e) { }
    if (save && Object.keys(st.done).length) {
      await Store.put('workouts', { id: uid(), date: todayISO(), patientId: patientId || '', items: list.map(e => ({ id: e.id, sets: Math.ceil((st.done[e.id] || 0) / (e.d.sides ? 2 : 1)) })), minutes: Math.max(1, Math.round((Date.now() - st.started) / 60000)) });
      toast('Treino registrado'); return go('workouts');
    }
    go('exercises');
  }
  cleanup = () => { stop(); try { wake?.release(); } catch (e) { } };
  render();
};

/* ---------- registro de treinos ---------- */
SCREENS.workouts = async () => {
  const [ws, pts] = await Promise.all([Store.all('workouts'), Store.all('patients')]);
  const pName = id => pts.find(p => p.id === id)?.name || 'Sem paciente';
  ws.sort((a, b) => b.date.localeCompare(a.date));
  const now = Date.now(), within = d => ws.filter(w => now - new Date(w.date) < d * 864e5).length;
  // sessões por semana (8 semanas)
  const weeks = [...Array(8)].map((_, i) => { const end = now - i * 7 * 864e5, start = end - 7 * 864e5; return ws.filter(w => { const t = +new Date(w.date); return t > start && t <= end; }).length; }).reverse();
  const days = new Set(ws.map(w => w.date.slice(0, 10))); let streak = 0; for (let d = new Date(); days.has(d.toISOString().slice(0, 10)); d.setDate(d.getDate() - 1)) streak++;
  const mx = Math.max(1, ...weeks);
  app.innerHTML = `${back('Exercícios')}
    <div class="stack" style="gap:4px"><span class="eyebrow">Acompanhamento</span><h1>Registro de treinos</h1></div>
    <div class="summary"><div class="panel"><span class="eyebrow">Últimos 7 dias</span><b class="num">${within(7)}</b><span class="muted" style="font-size:.85rem">treinos</span></div>
      <div class="panel"><span class="eyebrow">Últimos 30 dias</span><b class="num">${within(30)}</b><span class="muted" style="font-size:.85rem">treinos</span></div>
      <div class="panel"><span class="eyebrow">Sequência</span><b class="num">${streak}</b><span class="muted" style="font-size:.85rem">dia${streak === 1 ? '' : 's'} seguidos</span></div></div>
    <section class="panel stack"><h2>Treinos por semana</h2>
      <svg viewBox="0 0 320 120" class="chart" role="img" aria-label="Treinos por semana nas últimas 8 semanas">${weeks.map((v, i) => { const h = v / mx * 80, x = 14 + i * 38; return `<rect x="${x}" y="${96 - h}" width="26" height="${Math.max(h, 1)}" rx="4" fill="var(--accent)"><title>${v} treino${v === 1 ? '' : 's'}</title></rect><text x="${x + 13}" y="${92 - h}" text-anchor="middle" class="ax">${v || ''}</text><text x="${x + 13}" y="112" text-anchor="middle" class="ax">${i === 7 ? 'atual' : '−' + (7 - i) + 's'}</text>`; }).join('')}<line x1="8" x2="312" y1="96" y2="96" stroke="var(--line)"/></svg></section>
    <section class="stack"><h2>Histórico</h2>${ws.length ? `<div class="plist">${ws.map(w => `<div class="prow arow"><span style="min-width:0"><b>${fmtDate(w.date)}</b> <span class="muted">· ${esc(pName(w.patientId))} · ${w.minutes} min</span><br><span class="muted" style="font-size:.85rem">${esc(w.items.map(i => (EXERCISES.find(e => e.id === i.id)?.name || i.id) + (i.sets ? ` (${i.sets}×)` : '')).join(' · '))}</span></span><span class="row"><button class="btn small" data-again="${w.id}">Repetir</button><button class="btn small ghost danger" data-wdel="${w.id}">Excluir</button></span></div>`).join('')}</div>` : '<div class="panel empty muted">Nenhum treino registrado. Monte um treino na biblioteca de exercícios.</div>'}</section>`;
  bindBack('exercises');
  $$('[data-again]').forEach(b => b.onclick = () => { const w = ws.find(x => x.id === b.dataset.again); go('workout', { ids: w.items.map(i => i.id), patientId: w.patientId }); });
  $$('[data-wdel]').forEach(b => b.onclick = async () => { if (await confirmBox('Excluir registro?', 'Este treino será removido do histórico.')) { await Store.del('workouts', b.dataset.wdel); go('workouts'); } });
};
