/* TEAMRM - Posture & Correction — exercícios: biblioteca, vídeo explicativo, treino guiado e registro. */
'use strict';

let exFilter = { cat: '', q: '' };
let workoutDraft = { ids: [], patientId: '' };

async function mediaURL(id) {
  const m = await Store.get('media', id); if (!m) return null;
  if (m.kind === 'link') return { kind: 'link', url: m.url, name: m.name };
  return { kind: 'file', url: URL.createObjectURL(m.blob), name: m.name, type: m.type };
}
function embedFor(url) {
  const y = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  return y ? `https://www.youtube-nocookie.com/embed/${y[1]}` : null;
}
function videoBlock(med) {
  if (!med) return '';
  if (med.kind === 'file') return `<video src="${med.url}" controls playsinline preload="metadata" style="width:100%;max-height:60vh;border-radius:8px;background:#000"></video>`;
  const emb = embedFor(med.url);
  return (emb ? `<div class="vid169"><iframe src="${emb}" title="Vídeo explicativo" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : '') +
    `<p style="margin:0"><a href="${esc(med.url)}" target="_blank" rel="noopener">Abrir o vídeo em outra aba ↗</a></p>`;
}
/* Bloco reutilizável: vídeo explicativo próprio (arquivo ou link) para um exercício ou movimento */
async function bindOwnVideo(root, mediaId, label) {
  const box = $('[data-ownvideo]', root);
  const draw = async () => {
    const med = await mediaURL(mediaId);
    box.innerHTML = `<div class="stack"><div class="row spread"><h3>Seu vídeo explicativo</h3>${med ? '<button class="btn small ghost danger" data-vrm>Remover</button>' : ''}</div>
      ${med ? videoBlock(med) : `<p class="muted" style="margin:0;font-size:.9rem">Grave você mesmo(a) fazendo ${esc(label)} para mostrar ao paciente, ou cole o link de um vídeo seu (YouTube, Instagram, Drive).</p>`}
      <div class="row"><label class="btn small" style="cursor:pointer">${med?.kind === 'file' ? 'Trocar vídeo' : 'Gravar ou enviar vídeo'}<input type="file" accept="video/*" capture="user" data-vfile hidden></label>
        <input class="search" style="min-width:200px" data-vlink placeholder="https://youtu.be/…" value="${med?.kind === 'link' ? esc(med.url) : ''}"><button class="btn small" data-vsave>Salvar link</button></div></div>`;
    $('[data-vfile]', box).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 200 * 1048576) return toast('Vídeo acima de 200 MB. Grave um trecho mais curto.', 4000);
      await Store.put('media', { id: mediaId, kind: 'file', blob: f, name: f.name, type: f.type, createdAt: todayISO() }); toast('Vídeo salvo neste aparelho'); draw();
    };
    $('[data-vsave]', box).onclick = async () => {
      const u = $('[data-vlink]', box).value.trim();
      if (!/^https?:\/\//.test(u)) return toast('Cole um link que comece com https://');
      await Store.put('media', { id: mediaId, kind: 'link', url: u, name: u, createdAt: todayISO() }); toast('Link salvo'); draw();
    };
    const rm = $('[data-vrm]', box); if (rm) rm.onclick = async () => { await Store.del('media', mediaId); toast('Vídeo removido'); draw(); };
  };
  await draw();
}

SCREENS.exercises = async () => {
  const draw = () => {
    const q = exFilter.q.toLowerCase();
    const list = EXERCISES.filter(e => (!exFilter.cat || e.cat === exFilter.cat) && (!q || (e.name + ' ' + e.area).toLowerCase().includes(q)));
    $('#exlist').innerHTML = list.length ? list.map(e => `<div class="exrow"><button class="exmain" data-ex="${e.id}">${exPicto(e.pose, 64)}<span style="min-width:0"><b>${esc(e.name)}</b><br><span class="muted" style="font-size:.85rem">${esc(e.dose)}</span><br><span class="tag">${esc(EX_CATS[e.cat])}</span> <span class="muted" style="font-size:.78rem">${esc(e.area)}</span></span></button>
      <label class="excheck" title="Incluir no treino"><input type="checkbox" data-pick="${e.id}" ${workoutDraft.ids.includes(e.id) ? 'checked' : ''}><span class="sr">Incluir no treino</span></label></div>`).join('') : '<div class="panel empty muted">Nenhum exercício com esse filtro.</div>';
    $('#excount').textContent = list.length;
    $$('[data-ex]').forEach(b => b.onclick = () => go('exercise', { id: b.dataset.ex }));
    $$('[data-pick]').forEach(c => c.onchange = () => { const id = c.dataset.pick; workoutDraft.ids = c.checked ? [...workoutDraft.ids, id] : workoutDraft.ids.filter(x => x !== id); bar(); });
    bar();
  };
  const bar = () => { const n = workoutDraft.ids.length; $('#start').textContent = n ? `Começar o treino (${n})` : 'Começar o treino'; $('#start').disabled = !n; };
  app.innerHTML = `<div class="exhead"><div class="excount"><b class="num" id="excount">${EXERCISES.length}</b><span>exercícios</span></div>
      <label class="f" style="flex:1;min-width:180px">Categoria<select id="cat"><option value="">Todos</option>${Object.entries(EX_CATS).map(([k, l]) => `<option value="${k}"${exFilter.cat === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <input class="search" id="exq" type="search" placeholder="Buscar exercício ou região (ex.: ombro, glúteo)" value="${esc(exFilter.q)}" aria-label="Buscar exercício">
    <p class="muted" style="margin:0;font-size:.85rem">Marque os exercícios para montar um treino. Toque no nome para ver a animação, os passos e o seu vídeo.</p>
    <div id="exlist" class="exlist"></div>
    <div class="exbar"><button class="btn primary" id="start" disabled>Começar o treino</button><button class="btn" id="log">Registro de treinos</button></div>`;
  $('#cat').onchange = e => { exFilter.cat = e.target.value; draw(); };
  $('#exq').oninput = e => { exFilter.q = e.target.value; draw(); };
  $('#start').onclick = () => go('workout', { ids: workoutDraft.ids });
  $('#log').onclick = () => go('workouts');
  draw();
};

SCREENS.exercise = async ({ id }) => {
  const e = EXERCISES.find(x => x.id === id); if (!e) return go('exercises');
  app.innerHTML = `${back('Exercícios')}
    <div class="stack" style="gap:4px"><span class="eyebrow">${esc(EX_CATS[e.cat])} · ${esc(e.area)}</span><h1>${esc(e.name)}</h1></div>
    <div class="exdetail"><div class="exanim">${exAnim(e, 220)}</div>
      <div class="stack"><div class="panel"><span class="eyebrow">Dose sugerida</span><p style="margin:4px 0 0;font-size:1.1rem"><b>${esc(e.dose)}</b></p></div>
      <div class="panel"><span class="eyebrow">Como fazer</span><ol style="margin:8px 0 0;padding-left:20px;display:grid;gap:6px">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="row"><button class="btn primary" id="add">${workoutDraft.ids.includes(id) ? 'No treino ✓' : 'Adicionar ao treino'}</button><button class="btn" id="now">Fazer agora</button></div></div></div>
    <section class="panel" data-ownvideo></section>`;
  bindBack('exercises');
  $('#add').onclick = () => { if (!workoutDraft.ids.includes(id)) workoutDraft.ids.push(id); $('#add').textContent = 'No treino ✓'; toast('Adicionado ao treino'); };
  $('#now').onclick = () => go('workout', { ids: [id] });
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
      <div class="exdetail"><div class="exanim">${exAnim(e, 200)}</div>
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
