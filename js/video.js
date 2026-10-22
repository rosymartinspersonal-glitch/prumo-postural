/* TEAMRM - Posture & Correction — análise dinâmica em vídeo (vista lateral). */
'use strict';

const VID_PTS = { orelha: [8, 7], ombro: [12, 11], cotovelo: [14, 13], punho: [16, 15], quadril: [24, 23], joelho: [26, 25], tornozelo: [28, 27], pe: [32, 31] };
const VID_NAMES = { orelha: 'Orelha (trágus)', ombro: 'Acrômio', cotovelo: 'Epicôndilo lateral', punho: 'Punho', quadril: 'Trocânter maior', joelho: 'Joelho', tornozelo: 'Maléolo lateral', pe: '5º metatarso' };
// posição-modelo (unidades da altura do corpo, olhando para a direita)
const VID_TPL = { orelha: [.52, .08], ombro: [.5, .2], cotovelo: [.5, .36], punho: [.53, .5], quadril: [.5, .5], joelho: [.51, .71], tornozelo: [.5, .93], pe: [.58, .97] };
const VID_CHAIN = [['orelha', 'ombro'], ['ombro', 'cotovelo'], ['cotovelo', 'punho'], ['ombro', 'quadril'], ['quadril', 'joelho'], ['joelho', 'tornozelo'], ['tornozelo', 'pe']];
const vdir = (P, side) => (P.pe && P.tornozelo) ? (Math.sign(P.pe.x - P.tornozelo.x) || (side === 'D' ? 1 : -1)) : (side === 'D' ? 1 : -1);
const VID_ANGLES = {
  joelho: { label: 'Flexão do joelho', pts: ['quadril', 'joelho', 'tornozelo'], at: 'joelho', f: P => 180 - interior(P.quadril, P.joelho, P.tornozelo) },
  quadril: { label: 'Flexão do quadril', pts: ['ombro', 'quadril', 'joelho'], at: 'quadril', f: P => 180 - interior(P.ombro, P.quadril, P.joelho) },
  tronco: { label: 'Inclinação do tronco (+ à frente)', pts: ['ombro', 'quadril', 'pe', 'tornozelo'], at: 'ombro', f: (P, s) => Math.atan2((P.ombro.x - P.quadril.x) * vdir(P, s), P.quadril.y - P.ombro.y) * DEG },
  tornozelo: { label: 'Ângulo tíbia–pé (menor = mais dorsiflexão)', pts: ['joelho', 'tornozelo', 'pe'], at: 'tornozelo', f: P => interior(P.joelho, P.tornozelo, P.pe) },
  ombro: { label: 'Flexão do ombro', pts: ['quadril', 'ombro', 'cotovelo'], at: 'cotovelo', f: P => interior(P.quadril, P.ombro, P.cotovelo) },
  cotovelo: { label: 'Flexão do cotovelo', pts: ['ombro', 'cotovelo', 'punho'], at: 'punho', f: P => 180 - interior(P.ombro, P.cotovelo, P.punho) },
  cabeca: { label: 'Cabeça à frente do ombro', pts: ['orelha', 'ombro', 'pe', 'tornozelo'], at: 'orelha', f: (P, s) => Math.atan2((P.orelha.x - P.ombro.x) * vdir(P, s), P.ombro.y - P.orelha.y) * DEG },
};
const videoSession = {}; // id → { url, el } (o vídeo não é salvo)
let vidClock = 0; // o modelo de vídeo exige carimbos de tempo sempre crescentes, inclusive entre análises

function seekVideo(v, t) { return new Promise(r => { const h = () => { v.removeEventListener('seeked', h); r(); }; v.addEventListener('seeked', h); v.currentTime = t; }); }
function vidPoints(a) { return a.video.angles.reduce((s, k) => { VID_ANGLES[k].pts.forEach(p => s.add(p)); return s; }, new Set()); }
function denorm(p, w, h) { const o = {}; for (const k in p) o[k] = { x: p[k].x * w, y: p[k].y * h }; return o; }

function drawVideoFrame(ctx, video, w, h, P, vv, settings) {
  ctx.drawImage(video, 0, 0, w, h);
  if (!P) return;
  const lw = Math.max(2, h / 260);
  ctx.lineCap = 'round'; ctx.strokeStyle = settings.lineColor; ctx.lineWidth = lw;
  for (const [a, b] of VID_CHAIN) if (P[a] && P[b]) { ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke(); }
  for (const k in P) { ctx.beginPath(); ctx.arc(P[k].x, P[k].y, lw * 2.2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = lw * .8; ctx.stroke(); }
  const fs = lw * 5; ctx.font = `600 ${fs}px "IBM Plex Mono",monospace`; ctx.textBaseline = 'middle';
  for (const k of vv.angles) {
    const A = VID_ANGLES[k]; if (!A.pts.slice(0, 3).every(p => P[p])) continue;
    const val = A.f(P, vv.side), p = P[A.at], t = nf(val) + '°', tw = ctx.measureText(t).width;
    ctx.fillStyle = 'rgba(11,14,26,.82)'; ctx.fillRect(p.x + lw * 3, p.y - fs * .75, tw + lw * 3, fs * 1.5);
    ctx.fillStyle = '#C9D0F5'; ctx.fillText(t, p.x + lw * 4.5, p.y);
  }
}
function seriesCanvas(vals, times, label, w = 900, h = 300) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  const pts = vals.map((v, i) => [times[i], v]).filter(p => p[1] != null);
  if (!pts.length) return cv;
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])); if (hi - lo < 1) { lo -= 1; hi += 1; } const pad = (hi - lo) * .1; lo -= pad; hi += pad;
  const t0 = times[0], t1 = times[times.length - 1] || 1, pl = 60, pr = 16, pt = 30, pb = 36;
  const X = t => pl + (t - t0) / ((t1 - t0) || 1) * (w - pl - pr), Y = v => pt + (hi - v) / (hi - lo) * (h - pt - pb);
  c.font = '600 18px Helvetica, Arial'; c.fillStyle = '#141A33'; c.fillText(label, pl, 20);
  c.font = '14px Helvetica, Arial'; c.fillStyle = '#5A6180'; c.strokeStyle = '#D3D7E4'; c.lineWidth = 1;
  const st = niceStep((hi - lo) / 4);
  for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) { c.beginPath(); c.moveTo(pl, Y(v)); c.lineTo(w - pr, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(nf(v, st < 1 ? 1 : 0) + '°', pl - 6, Y(v) + 5); }
  c.textAlign = 'center'; const ts = niceStep((t1 - t0) / 6 || 1);
  for (let t = 0; t <= t1 + 1e-6; t += ts) c.fillText(nf(t, ts < 1 ? 1 : 0) + ' s', X(t), h - 12);
  c.strokeStyle = '#2743D6'; c.lineWidth = 2.5; c.beginPath(); pts.forEach(([t, v], i) => i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v))); c.stroke();
  return cv;
}
function vstats(vals, times) {
  const ok = vals.map((v, i) => [v, times[i]]).filter(p => p[0] != null); if (!ok.length) return null;
  let mn = ok[0], mx = ok[0]; for (const p of ok) { if (p[0] < mn[0]) mn = p; if (p[0] > mx[0]) mx = p; }
  return { min: mn[0], tmin: mn[1], max: mx[0], tmax: mx[1], amp: mx[0] - mn[0], mean: ok.reduce((s, p) => s + p[0], 0) / ok.length, n: ok.length };
}

SCREENS.video = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId), S = await getSettings();
  a.video ||= { side: 'D', angles: ['joelho', 'quadril', 'tronco'], mode: 'ia', fps: 15 };
  const vv = a.video, sess = videoSession[id] || {};
  const analyzed = vv.times && vv.times.length;
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)}</span><h1>Análise dinâmica em vídeo</h1></div>
      <label class="f" style="min-width:160px">Data<input id="a-date" type="date" value="${a.date.slice(0, 10)}"></label></div>
    <p class="muted" style="margin:0;max-width:75ch;font-size:.9rem">Grave de lado, câmera parada e perpendicular ao movimento, corpo inteiro no quadro (ex.: agachamento, marcha, levantar da cadeira). O vídeo fica só nesta sessão; são salvos os gráficos, a tabela e os quadros-chave.</p>
    <section class="panel stack"><h2>1. Vídeo e opções</h2>
      <div class="row"><label class="btn ${sess.url ? '' : 'primary'}" style="cursor:pointer">${sess.url ? 'Trocar vídeo' : 'Gravar ou escolher vídeo'}<input type="file" accept="video/*" capture="environment" id="vfile" hidden></label><span class="muted" id="vname">${esc(sess.name || vv.name || 'Nenhum vídeo carregado')}</span></div>
      <div class="grid-form">
        <label class="f">Lado voltado para a câmera<select id="vside"><option value="D"${vv.side === 'D' ? ' selected' : ''}>Direito</option><option value="E"${vv.side === 'E' ? ' selected' : ''}>Esquerdo</option></select></label>
        <label class="f">Rastreio<select id="vmode"><option value="ia"${vv.mode === 'ia' ? ' selected' : ''}>IA (sem marcadores)</option><option value="verde"${vv.mode === 'verde' ? ' selected' : ''}>Marcadores verdes</option></select></label>
        <label class="f">Quadros por segundo<select id="vfps">${[10, 15, 30].map(f => `<option${vv.fps === f ? ' selected' : ''}>${f}</option>`).join('')}</select></label>
      </div>
      <fieldset class="panel" style="padding:10px"><legend class="eyebrow">Ângulos</legend><div class="grid-form" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px">${Object.entries(VID_ANGLES).map(([k, A]) => `<label class="row" style="gap:6px;font-size:.9rem"><input type="checkbox" data-ang="${k}" ${vv.angles.includes(k) ? 'checked' : ''}> ${esc(A.label)}</label>`).join('')}</div></fieldset>
      <div class="row"><button class="btn primary" id="run" ${sess.url ? '' : 'disabled'}>Analisar vídeo</button><span class="muted" id="prog"></span></div>
    </section>
    <section class="panel stack" id="viewer" ${sess.url && analyzed ? '' : 'hidden'}><h2>2. Quadro a quadro</h2>
      <canvas id="vcv" style="width:100%;max-height:70vh;object-fit:contain;background:#0B0E1A;border-radius:8px"></canvas>
      <label class="f">Tempo: <span class="num" id="vt">0,0 s</span><input type="range" id="vslider" min="0" max="${Math.max(0, (vv.times?.length || 1) - 1)}" value="0"></label>
      <div class="row"><button class="btn" id="rec">Gerar vídeo com as linhas</button><button class="btn" id="vjpg">Salvar este quadro (JPEG)</button></div>
    </section>
    <div id="vres"></div>`;
  bindBack('patient', { id: a.patientId });
  $('#a-date').onchange = async e => { if (e.target.value) { a.date = new Date(e.target.value + 'T12:00:00').toISOString(); await Store.put('assessments', a); } };
  const readOpts = () => { vv.side = $('#vside').value; vv.mode = $('#vmode').value; vv.fps = +$('#vfps').value; vv.angles = $$('[data-ang]:checked').map(c => c.dataset.ang); };
  $('#vfile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (sess.url) URL.revokeObjectURL(sess.url);
    videoSession[id] = { url: URL.createObjectURL(f), name: f.name };
    vv.name = f.name; await Store.put('assessments', a); go('video', { id });
  };

  let video = null, cw = 0, ch = 0;
  const cv = $('#vcv'), ctx = cv.getContext('2d');
  async function ensureVideo() {
    if (video) return video;
    video = document.createElement('video'); video.src = sess.url; video.muted = true; video.playsInline = true; video.preload = 'auto';
    await new Promise((res, rej) => { video.onloadeddata = res; video.onerror = () => rej(new Error('formato de vídeo não suportado neste navegador')); });
    const k = Math.min(1, 900 / Math.max(video.videoWidth, video.videoHeight)); cw = Math.round(video.videoWidth * k); ch = Math.round(video.videoHeight * k);
    cv.width = cw; cv.height = ch; return video;
  }
  async function showFrame(i) {
    if (!vv.times?.length) return; await ensureVideo();
    await seekVideo(video, vv.times[i]);
    drawVideoFrame(ctx, video, cw, ch, vv.frames[i] ? denorm(vv.frames[i], cw, ch) : null, vv, S);
    $('#vt').textContent = nf(vv.times[i]) + ' s'; $('#vslider').value = i;
  }

  $('#run').onclick = async () => {
    readOpts(); if (!vv.angles.length) return toast('Escolha ao menos um ângulo');
    const btn = $('#run'); btn.disabled = true;
    try {
      await ensureVideo();
      const need = [...vidPoints(a)], idx = vv.side === 'D' ? 0 : 1;
      let lm = null;
      // no modo verde a IA só ajuda a identificar os marcadores no 1º quadro; se não carregar, usa a posição-modelo
      $('#prog').textContent = 'Carregando o modelo de IA…';
      try { lm = await withTimeout(model('poseVideo'), 40000); } catch (e) { if (vv.mode === 'ia') throw new Error('não foi possível carregar a IA (' + e.message + ')'); }
      const dur = video.duration, step = 1 / vv.fps, times = [], frames = [];
      let prev = null, prev2 = null; const base = vidClock + 1000;
      for (let t = 0; t <= dur - 0.02; t += step) {
        await seekVideo(video, t);
        let P = null;
        if (lm) {
          const ts = Math.max(vidClock + 1, base + Math.round(t * 1000)); vidClock = ts;
          const r = lm.detectForVideo(video, ts);
          if (r.landmarks?.length) { P = {}; for (const k of need) { const L = r.landmarks[0][VID_PTS[k][idx]]; P[k] = { x: L.x, y: L.y }; } }
        }
        if (vv.mode === 'verde') {
          // estimativa: IA deste quadro; sem IA, posição anterior + velocidade; no 1º quadro, posição-modelo
          const blobs = findGreenBlobs(video, video.videoWidth, video.videoHeight, 480).map(b => ({ x: b.x / video.videoWidth, y: b.y / video.videoHeight }));
          let est = P;
          if (!est && prev) { est = {}; for (const k of need) { const v = prev2 && prev2[k] ? { x: prev[k].x - prev2[k].x, y: prev[k].y - prev2[k].y } : { x: 0, y: 0 }; est[k] = { x: prev[k].x + v.x, y: prev[k].y + v.y }; } }
          if (!est) { est = {}; const H = 0.9; for (const k of need) { const tp = VID_TPL[k]; est[k] = { x: .5 + (vv.side === 'D' ? 1 : -1) * (tp[0] - .5) * H * ch / cw, y: .05 + tp[1] * H }; } }
          const snapped = snapToBlobs(est, blobs, prev ? (P ? 0.06 : 0.05) : 0.2);
          P = { ...est, ...snapped };
        }
        times.push(+t.toFixed(3)); frames.push(P); if (P) { prev2 = prev; prev = P; }
        $('#prog').textContent = `Analisando ${Math.round(t / dur * 100)}%`;
        drawVideoFrame(ctx, video, cw, ch, P ? denorm(P, cw, ch) : null, vv, S);
        $('#viewer').hidden = false;
      }
      vv.times = times; vv.frames = frames; vv.duration = dur; vv.series = {};
      for (const k of vv.angles) vv.series[k] = frames.map(P => P && VID_ANGLES[k].pts.slice(0, 3).every(q => P[q]) ? +VID_ANGLES[k].f(denorm(P, cw, ch), vv.side).toFixed(2) : null);
      // quadros-chave: mínimo e máximo do primeiro ângulo
      vv.keyframes = [];
      const s0 = vstats(vv.series[vv.angles[0]], times);
      if (s0) for (const [lab, t] of [['Mínimo', s0.tmin], ['Máximo', s0.tmax]]) {
        const i = times.indexOf(t); await seekVideo(video, t); drawVideoFrame(ctx, video, cw, ch, frames[i] ? denorm(frames[i], cw, ch) : null, vv, S);
        const kc = document.createElement('canvas'), kk = Math.min(1, 520 / Math.max(cw, ch)); kc.width = cw * kk; kc.height = ch * kk; kc.getContext('2d').drawImage(cv, 0, 0, kc.width, kc.height);
        vv.keyframes.push({ label: `${lab} de ${VID_ANGLES[vv.angles[0]].label.toLowerCase()} (${nf(t)} s)`, img: kc.toDataURL('image/jpeg', .85) });
      }
      await Store.put('assessments', a);
      $('#prog').textContent = `${frames.filter(Boolean).length} de ${frames.length} quadros com o corpo detectado.`;
      $('#vslider').max = times.length - 1; renderResults(); showFrame(0);
    } catch (err) { $('#prog').textContent = ''; toast('Não foi possível analisar: ' + err.message, 5000); }
    btn.disabled = false;
  };
  $('#vslider').oninput = e => showFrame(+e.target.value);
  $('#vjpg').onclick = () => cv.toBlob(b => downloadBlob(b, `${slug(p.name)}-video-${$('#vt').textContent.replace(/\W+/g, '')}.jpg`), 'image/jpeg', .92);
  $('#rec').onclick = async () => {
    await ensureVideo();
    const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'], mime = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!mime || !cv.captureStream) return toast('Este navegador não grava vídeo a partir da tela. Use o Chrome.', 4000);
    const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { downloadBlob(new Blob(chunks, { type: mime }), `${slug(p.name)}-analise.${mime.includes('mp4') ? 'mp4' : 'webm'}`); toast('Vídeo gerado'); $('#rec').disabled = false; };
    $('#rec').disabled = true; video.currentTime = 0; await seekVideo(video, 0); rec.start(); await video.play();
    const tick = () => {
      if (video.ended || video.paused) { rec.stop(); return; }
      let i = 0; const t = video.currentTime; while (i < vv.times.length - 1 && vv.times[i + 1] <= t) i++;
      drawVideoFrame(ctx, video, cw, ch, vv.frames[i] ? denorm(vv.frames[i], cw, ch) : null, vv, S);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  function renderResults() {
    if (!vv.times?.length) { $('#vres').innerHTML = ''; return; }
    const lab = vv.times.map(t => nf(t) + ' s');
    $('#vres').innerHTML = `<section class="panel stack"><h2>3. Resultados</h2>
      <div class="tbl-wrap"><table><thead><tr><th>Ângulo</th><th style="text-align:right">Mínimo</th><th style="text-align:right">Máximo</th><th style="text-align:right">Amplitude</th><th style="text-align:right">Média</th></tr></thead><tbody>
      ${vv.angles.map(k => { const s = vstats(vv.series[k], vv.times); return s ? `<tr><td>${esc(VID_ANGLES[k].label)}</td><td class="v">${nf(s.min)}° <span class="muted">(${nf(s.tmin)} s)</span></td><td class="v">${nf(s.max)}° <span class="muted">(${nf(s.tmax)} s)</span></td><td class="v">${nf(s.amp)}°</td><td class="v">${nf(s.mean)}°</td></tr>` : ''; }).join('')}</tbody></table></div>
      ${vv.angles.map(k => { const pts = vv.series[k].map((v, i) => v == null ? null : { v, label: lab[i], i }).filter(Boolean); return `<div class="stack" style="gap:4px"><h3>${esc(VID_ANGLES[k].label)}</h3><div style="position:relative" data-ch="${k}">${lineChartSVG(pts, { unit: '°', height: 200 })}</div></div>`; }).join('')}
      ${vv.keyframes?.length ? `<div class="row" style="align-items:flex-start">${vv.keyframes.map(f => `<figure style="margin:0;max-width:260px"><img src="${f.img}" alt="${esc(f.label)}" style="width:100%;border-radius:8px"><figcaption class="muted" style="font-size:.8rem">${esc(f.label)}</figcaption></figure>`).join('')}</div>` : ''}
      <label class="f">Conclusão do profissional<textarea id="vconcl" rows="3">${esc(a.conclusion || '')}</textarea></label>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="vpdf">Exportar PDF</button></div></section>`;
    bindCharts($('#vres'));
    vv.angles.forEach(k => { const svg = $(`[data-ch="${k}"] svg`); if (!svg) return; const idxs = vv.series[k].map((v, i) => v == null ? null : i).filter(i => i != null); svg._onHover = j => { if (sess.url) showFrame(idxs[j]); }; });
    $('#vconcl').onchange = async e => { a.conclusion = e.target.value; await Store.put('assessments', a); toast('Conclusão salva'); };
    $('#vpdf').onclick = async () => { a.conclusion = $('#vconcl').value; await Store.put('assessments', a); try { await exportPDF(a, p); toast('PDF gerado'); } catch (err) { toast('Não foi possível gerar o PDF: ' + err.message, 4000); } };
  }
  renderResults();
  if (sess.url && analyzed) showFrame(0);
  cleanup = () => { if (video) { video.pause(); video.removeAttribute('src'); } };
};
