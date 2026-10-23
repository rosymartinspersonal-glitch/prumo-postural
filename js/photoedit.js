/* TEAMRM - Posture & Correction — editor de fotos para análise postural.
   Regras: só transformações rígidas (girar, cortar, enquadrar com margem neutra). Nada é esticado nem deformado.
   Toda edição parte da foto ORIGINAL, numa única reamostragem: editar de novo não acumula perda de qualidade.
   Endireite pelo ambiente (parede, batente, fio de prumo), nunca pelo corpo — a inclinação do corpo é o que se mede. */
'use strict';

const PE_MAX_OUT = 2400;        // lado maior da foto de trabalho (px)
const PE_JPEG_Q = 0.92;
const PE_PAD = '#E6E6E6';       // margem neutra usada para completar o formato 3:4
const PE_DEFAULT = () => ({ r90: 0, angle: 0, crop: { l: 0, r: 0, t: 0, b: 0 }, fill: false, body: null, pad34: false, lv: { lo: 0, hi: 255, g: 1 } });

/* ---------- geometria (funções puras) ---------- */
function peGeom(W0, H0, e, maxOut = PE_MAX_OUT) {
  const phi = ((e.r90 || 0) * 90 + (e.angle || 0)) * Math.PI / 180;
  const c = Math.abs(Math.cos(phi)), sn = Math.abs(Math.sin(phi));
  const odd = (e.r90 || 0) % 2 === 1, W1 = odd ? H0 : W0, H1 = odd ? W0 : H0, k = W1 / H1;
  let base;
  if (e.fill) { const BW = W0 * c + H0 * sn, BH = W0 * sn + H0 * c; base = { x0: -BW / 2, y0: -BH / 2, x1: BW / 2, y1: BH / 2 }; }
  else {   // maior retângulo com a proporção da foto que cabe inteiro dentro da foto girada (sem cantos vazios)
    const a = Math.min(W0 / 2 / (c + sn / k), H0 / 2 / (sn + c / k)), b = a / k;
    base = { x0: -a, y0: -b, x1: a, y1: b };
  }
  let r;
  if (e.body) r = { x0: Math.max(base.x0, e.body.x0), y0: Math.max(base.y0, e.body.y0), x1: Math.min(base.x1, e.body.x1), y1: Math.min(base.y1, e.body.y1) };
  else {
    const bw = base.x1 - base.x0, bh = base.y1 - base.y0, cr = e.crop || {};
    r = { x0: base.x0 + bw * (cr.l || 0), x1: base.x1 - bw * (cr.r || 0), y0: base.y0 + bh * (cr.t || 0), y1: base.y1 - bh * (cr.b || 0) };
  }
  const w = Math.max(8, r.x1 - r.x0), h = Math.max(8, r.y1 - r.y0);
  let Wp = w, Hp = h;
  if (e.pad34) { Wp = Math.max(w, h * 3 / 4); Hp = Math.max(h, w * 4 / 3); }
  const padX = (Wp - w) / 2, padY = (Hp - h) / 2;
  const s = Math.min(1, maxOut / Math.max(Wp, Hp));
  return { phi, x0: r.x0, y0: r.y0, w, h, padX, padY, s, outW: Math.max(1, Math.floor(Wp * s + 1e-6)), outH: Math.max(1, Math.floor(Hp * s + 1e-6)), W0, H0 };
}
function peMap(p, g) {        // ponto da foto original → foto ajustada
  const dx = p.x - g.W0 / 2, dy = p.y - g.H0 / 2, cs = Math.cos(g.phi), sn = Math.sin(g.phi);
  const qx = dx * cs - dy * sn, qy = dx * sn + dy * cs;
  return { x: g.s * (qx - g.x0 + g.padX), y: g.s * (qy - g.y0 + g.padY) };
}
function peUnmap(o, g) {      // ponto da foto ajustada → foto original
  const qx = o.x / g.s - g.padX + g.x0, qy = o.y / g.s - g.padY + g.y0, cs = Math.cos(g.phi), sn = Math.sin(g.phi);
  return { x: qx * cs + qy * sn + g.W0 / 2, y: -qx * sn + qy * cs + g.H0 / 2 };
}
function peRotSpace(p, W0, H0, e) {   // ponto original → espaço girado centrado (para enquadrar no corpo)
  const phi = ((e.r90 || 0) * 90 + (e.angle || 0)) * Math.PI / 180, dx = p.x - W0 / 2, dy = p.y - H0 / 2;
  return { x: dx * Math.cos(phi) - dy * Math.sin(phi), y: dx * Math.sin(phi) + dy * Math.cos(phi) };
}

/* Inclinação do ambiente: bordas retas quase verticais e quase horizontais (paredes, batentes, simetrógrafo, rodapé).
   Usa o tensor de estrutura (orientação média das bordas numa vizinhança 5×5), que não é enganado pelo serrilhado.
   Devolve o ângulo (graus) a somar à rotação; positivo = girar no sentido horário. */
function peBox(src, w, h, r) {   // média móvel separável
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let acc = 0; const o = y * w; for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[o + x] = acc / n; acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = acc / n; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}
function peDetectTilt(gray0, w, h, excl) {
  // 1) bordas fortes, separadas em quase verticais e quase horizontais (o corpo do paciente fica de fora)
  const gray = peBox(gray0, w, h, 1), V = [], H = [];
  const mags = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = (gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1]) - (gray[i - w - 1] + 2 * gray[i - 1] + gray[i + w - 1]);
    const gy = (gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1]) - (gray[i - w - 1] + 2 * gray[i - w] + gray[i - w + 1]);
    mags[i] = Math.hypot(gx, gy);
  }
  const sorted = Float32Array.from(mags).sort(), thr = Math.max(30, sorted[Math.floor(sorted.length * 0.88)] || 0);
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x, m = mags[i]; if (m < thr) continue;
    if (excl && x >= excl.x0 && x <= excl.x1 && y >= excl.y0 && y <= excl.y1) continue;
    const gx = (gray[i + 1] - gray[i - 1]), gy = (gray[i + w] - gray[i - w]);
    const ang = Math.atan2(Math.abs(gy), Math.abs(gx)) * 180 / Math.PI;    // 0 = gradiente horizontal (borda vertical)
    if (ang < 14) V.push(x - w / 2, y - h / 2); else if (ang > 76) H.push(x - w / 2, y - h / 2);
  }
  if (V.length + H.length < 200) return { angle: 0, conf: 0 };
  // 2) para cada ângulo de correção, projeta as bordas: linhas retas viram picos estreitos quando o ângulo está certo
  const L = Math.ceil(Math.hypot(w, h)) + 4, binsV = new Float32Array(2 * L), binsH = new Float32Array(2 * L);
  const score = c => {
    const t = c * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t); binsV.fill(0); binsH.fill(0);
    for (let k = 0; k < V.length; k += 2) { const u = V[k] * cs - V[k + 1] * sn; binsV[(u + L) | 0]++; }
    for (let k = 0; k < H.length; k += 2) { const u = H[k] * sn + H[k + 1] * cs; binsH[(u + L) | 0]++; }
    let s2 = 0; for (let b = 0; b < 2 * L; b++) s2 += binsV[b] * binsV[b] + binsH[b] * binsH[b];
    return s2;
  };
  let best = 0, bs = -1; const all = [];
  for (let c = -12; c <= 12.0001; c += 0.25) { const v = score(c); all.push(v); if (v > bs) { bs = v; best = c; } }
  let fine = best;
  for (let c = best - 0.3; c <= best + 0.3001; c += 0.02) { const v = score(c); if (v > bs) { bs = v; fine = c; } }
  all.sort((a, b) => a - b); const med = all[all.length >> 1] || 1;
  return { angle: Math.round(fine * 100) / 100, conf: Math.max(0, Math.min(1, 1 - med / bs)) };
}
/* Qualidade: exposição e nitidez (variância do laplaciano) */
function peQuality(rgba, w, h) {
  const n = w * h, gray = new Float32Array(n), histo = new Uint32Array(256);
  let sum = 0, clipHi = 0, clipLo = 0;
  for (let i = 0; i < n; i++) { const v = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]; gray[i] = v; histo[v | 0]++; sum += v; if (v > 250) clipHi++; if (v < 5) clipLo++; }
  const pct = q => { let acc = 0; for (let v = 0; v < 256; v++) { acc += histo[v]; if (acc >= n * q) return v; } return 255; };
  let lsum = 0, lsq = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, l = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w]; lsum += l; lsq += l * l; cnt++; }
  const lm = lsum / cnt;
  return { gray, mean: sum / n, p1: pct(0.01), p99: pct(0.99), clipHi: clipHi / n, clipLo: clipLo / n, sharp: lsq / cnt - lm * lm };
}
function peLUT(lv) {
  const lut = new Uint8ClampedArray(256), lo = lv.lo, hi = Math.max(lo + 1, lv.hi), g = lv.g || 1;
  for (let v = 0; v < 256; v++) { const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); lut[v] = Math.round(255 * Math.pow(x, 1 / g)); }
  return lut;
}
const peLvIdentity = lv => !lv || (lv.lo === 0 && lv.hi === 255 && (lv.g || 1) === 1);

/* ---------- desenho ---------- */
function peBorderColor(img) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 32, 32);
  const d = x.getImageData(0, 0, 32, 32).data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < 32; i++) for (const [px, py] of [[i, 0], [i, 31], [0, i], [31, i]]) { const k = (py * 32 + px) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
  return `rgb(${r / n | 0},${g / n | 0},${b / n | 0})`;
}
function peRender(img, e, maxOut, opts = {}) {
  const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height, g = peGeom(W0, H0, e, maxOut);
  const cv = document.createElement('canvas'); cv.width = g.outW; cv.height = g.outH;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = e.pad34 ? PE_PAD : (opts.fillColor || PE_PAD); ctx.fillRect(0, 0, g.outW, g.outH);
  if (e.fill && !e.pad34) { ctx.fillStyle = opts.fillColor || PE_PAD; ctx.fillRect(0, 0, g.outW, g.outH); }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(g.s, 0, 0, g.s, g.s * (g.padX - g.x0), g.s * (g.padY - g.y0));
  ctx.rotate(g.phi); ctx.translate(-W0 / 2, -H0 / 2);
  ctx.drawImage(img, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!opts.noLevels && !peLvIdentity(e.lv)) {
    const id = ctx.getImageData(0, 0, g.outW, g.outH), d = id.data, lut = peLUT(e.lv);
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    ctx.putImageData(id, 0, 0);
  }
  return { cv, g };
}

/* ---------- editor ---------- */
// blob: foto original; V: vista (para saber se é de corpo inteiro); init: edição anterior (opcional)
/* Abre a foto do celular com segurança: fotos muito grandes (48–200 MP) são reduzidas para
   no máximo 4096 px no lado maior antes de editar, porque o iPhone e o Android travam ou
   recarregam a página com imagens desse tamanho. Fotos até ~16 MP ficam como estão. */
const PE_SRC_MAX = 4096;
async function peLoadSource(blob) {
  const fit = (w, h) => { const k = Math.min(1, PE_SRC_MAX / Math.max(w, h)); return w * h > 16.7e6 ? k : 1; };
  const toCanvas = (src, w, h) => { const k = fit(w, h); if (k === 1) return src; const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height); if (src.close) src.close(); return c; };
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
    return toCanvas(img, img.naturalWidth, img.naturalHeight);
  } catch (e1) {
    if (window.createImageBitmap) { try { const bm = await createImageBitmap(blob); return toCanvas(bm, bm.width, bm.height); } catch (e2) { } }
    throw e1;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
function openPhotoEditor({ blob, V, init, title }) {
  return new Promise(async resolve => {
    let img; try { img = await peLoadSource(blob); } catch (err) {
      const heic = /hei[cf]/i.test(blob.type || '') || /\.hei[cf]$/i.test(blob.name || '');
      toast(heic ? 'Este celular não abre fotos HEIC aqui. No iPhone: Ajustes → Câmera → Formatos → "Mais Compatível". Ou envie a foto como JPG.' : 'Não foi possível abrir essa imagem. Tente uma foto JPG ou PNG.', 7000);
      return resolve(null);
    }
    const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height, fullBody = V && V.frame !== 'image';
    const e = Object.assign(PE_DEFAULT(), JSON.parse(JSON.stringify(init || {})));
    const fillColor = peBorderColor(img);
    let pose = null, refMode = false, refPts = [], grid = true, raf = 0, prev = null;
    // análise de qualidade (uma vez, na foto original reduzida)
    const qs = (() => { const k = Math.min(1, 640 / Math.max(W0, H0)), w = Math.round(W0 * k), h = Math.round(H0 * k), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); return peQuality(x.getImageData(0, 0, w, h).data, w, h); })();

    const m = document.createElement('div'); m.className = 'modal pe-modal';
    m.innerHTML = `<div class="panel pe" role="dialog" aria-modal="true" aria-label="Ajustar foto">
      <div class="row spread"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(title || 'Foto')}</span><h2>Ajustar foto</h2></div><button class="btn ghost small" data-x="0">Cancelar</button></div>
      <div class="pe-body">
        <div class="pe-stage"><canvas id="pe-cv"></canvas><div class="pe-hint" id="pe-hint" hidden></div></div>
        <div class="pe-side stack">
          <div id="pe-checks" class="pe-checks"></div>
          <div class="row" style="gap:6px"><button class="btn small primary" id="pe-auto">Endireitar automático</button><button class="btn small" id="pe-ref">Linha de referência</button></div>
          <div class="row" style="gap:6px"><button class="btn small" id="pe-l90" aria-label="Girar 90° à esquerda">↺ 90°</button><button class="btn small" id="pe-r90" aria-label="Girar 90° à direita">↻ 90°</button>${fullBody ? '<button class="btn small" id="pe-body">Enquadrar no corpo</button>' : ''}<label class="row" style="gap:6px;font-size:.88rem"><input type="checkbox" id="pe-grid" checked> Grade</label></div>
          <label class="f">Rotação fina: <b class="num" id="pe-av"></b>
            <span class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn small" id="pe-am" aria-label="Girar 0,1° à esquerda">−</button><input type="range" id="pe-ang" min="-15" max="15" step="0.1" style="flex:1"><button class="btn small" id="pe-ap" aria-label="Girar 0,1° à direita">+</button></span></label>
          <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="pe-pad"> Formato padrão 3:4 (completa com margem, sem esticar)</label>
          <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="pe-fill"> Não cortar os cantos ao girar (preenche os cantos)</label>
          <details><summary class="muted">Cortar bordas</summary><div class="grid-form" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px">${[['t', 'Em cima'], ['b', 'Embaixo'], ['l', 'Esquerda'], ['r', 'Direita']].map(([k, l]) => `<label class="f">${l}<input type="range" min="0" max="40" step="0.5" data-crop="${k}"></label>`).join('')}</div></details>
          <details><summary class="muted">Luz</summary><div class="stack" style="margin-top:8px">
            <label class="f">Brilho<input type="range" id="pe-gam" min="0.6" max="1.6" step="0.02"></label>
            <label class="f">Contraste<input type="range" id="pe-con" min="-40" max="60" step="1"></label>
            <div class="row"><button class="btn small" id="pe-light">Luz automática</button><button class="btn small ghost" id="pe-light0">Luz original</button></div></div></details>
          <p class="muted" style="margin:0;font-size:.8rem">A foto só é girada, cortada ou enquadrada: nada é esticado nem deformado, e cada ajuste parte da foto original. Endireite pelo ambiente (parede, batente, fio de prumo), nunca pelo corpo do paciente.</p>
        </div>
      </div>
      <div class="row pe-foot" style="justify-content:space-between"><button class="btn ghost" id="pe-reset">Voltar à foto original</button><div class="row"><button class="btn" data-x="0">Cancelar</button><button class="btn primary" data-x="1">Usar foto ✓</button></div></div>
    </div>`;
    document.body.appendChild(m);
    const cv = $('#pe-cv', m), ctx = cv.getContext('2d');
    const syncUI = () => {
      $('#pe-ang', m).value = e.angle; $('#pe-av', m).textContent = (e.angle > 0 ? '+' : '') + nf(e.angle, 1) + '°' + (e.r90 ? ` (+${e.r90 * 90}°)` : '');
      $('#pe-pad', m).checked = !!e.pad34; $('#pe-fill', m).checked = !!e.fill;
      $$('[data-crop]', m).forEach(i => i.value = (e.crop[i.dataset.crop] || 0) * 100);
      $('#pe-gam', m).value = e.lv.g; $('#pe-con', m).value = Math.round((e.lv.lo + 255 - e.lv.hi) / 2);
      const pb = $('#pe-body', m); if (pb) pb.textContent = e.body ? 'Desfazer enquadramento' : 'Enquadrar no corpo';
    };
    const draw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        prev = peRender(img, e, 900, { fillColor });
        cv.width = prev.g.outW; cv.height = prev.g.outH; ctx.drawImage(prev.cv, 0, 0);
        const W = cv.width, H = cv.height, lw = Math.max(1, W / 450);
        if (grid) {
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = lw;
          for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(W * i / 10, 0); ctx.lineTo(W * i / 10, H); ctx.stroke(); }
          for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo(0, H * i / 12); ctx.lineTo(W, H * i / 12); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(231,152,19,.9)'; ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        }
        if (refPts.length) { ctx.fillStyle = '#E79813'; ctx.strokeStyle = '#E79813'; ctx.lineWidth = lw * 2; refPts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, lw * 5, 0, 7); ctx.fill(); }); if (refPts.length === 2) { ctx.beginPath(); ctx.moveTo(refPts[0].x, refPts[0].y); ctx.lineTo(refPts[1].x, refPts[1].y); ctx.stroke(); } }
        drawChecks();
      });
    };
    // checagens
    function drawChecks() {
      const items = [];
      const g = peGeom(W0, H0, e);
      const outLong = Math.max(g.outW, g.outH);
      items.push(outLong >= 1200 ? ['ok', `Resolução boa (${g.outW} × ${g.outH} px)`] : ['warn', `Resolução baixa (${g.outW} × ${g.outH} px): aproxime a câmera ou use a câmera traseira`]);
      if (qs.mean < 70 || qs.clipLo > 0.2) items.push(['warn', 'Foto escura: use “Luz automática” ou ilumine melhor o local']);
      else if (qs.mean > 205 || qs.clipHi > 0.12) items.push(['warn', 'Foto clara demais (estourada): reduza a luz de fundo']);
      else items.push(['ok', 'Iluminação adequada']);
      items.push(qs.sharp > 60 ? ['ok', 'Foto nítida'] : ['warn', 'Foto possivelmente tremida ou desfocada: confira o zoom nos pontos ósseos']);
      if (lastTilt != null) items.push(Math.abs(lastTilt) <= 0.7 ? ['ok', 'Foto alinhada ao ambiente'] : ['warn', `Foto inclinada cerca de ${nf(Math.abs(lastTilt), 1)}°: toque em “Endireitar automático”`]);
      if (fullBody && pose) {
        const P = pose.L.map(p => peMap(p, g)), vis = pose.V;
        const head = P[0], feet = [29, 30, 31, 32].map(i => P[i]);
        const top = Math.min(...[0, 2, 5, 7, 8].map(i => P[i].y)), bottom = Math.max(...feet.map(p => p.y));
        if (vis[0] < 0.4 || head.y < g.outH * 0.03) items.push(['bad', 'Cabeça cortada ou encostada na borda']);
        if (Math.min(vis[29], vis[30], vis[31], vis[32]) < 0.35 || bottom > g.outH * 0.985) items.push(['bad', 'Pés cortados ou encostados na borda: os pés precisam aparecer inteiros']);
        const frac = (bottom - top) / g.outH;
        if (frac < 0.55) items.push(['warn', `Paciente pequeno no quadro (${nf(frac * 100, 0)}% da altura): toque em “Enquadrar no corpo”`]);
        const cx = (Math.min(...P.map(p => p.x)) + Math.max(...P.map(p => p.x))) / 2;
        if (Math.abs(cx - g.outW / 2) > g.outW * 0.15) items.push(['warn', 'Paciente fora do centro: toque em “Enquadrar no corpo”']);
        if (!items.some(i => i[0] !== 'ok' && /Cabeça|Pés|pequeno|centro/.test(i[1]))) items.push(['ok', 'Corpo inteiro no quadro']);
      }
      $('#pe-checks', m).innerHTML = items.map(([s, t]) => `<div class="pe-check ${s}"><span aria-hidden="true">${s === 'ok' ? '✓' : '!'}</span>${esc(t)}</div>`).join('');
    }
    let lastTilt = null;
    const bodyExclusion = (g, sc) => {
      if (!pose) return null;
      const P = pose.L.filter((_, i) => pose.V[i] > 0.3).map(p => peMap(p, g)); if (!P.length) return null;
      const xs = P.map(p => p.x * sc), ys = P.map(p => p.y * sc), hgt = Math.max(...ys) - Math.min(...ys);
      return { x0: Math.min(...xs) - hgt * 0.12, x1: Math.max(...xs) + hgt * 0.12, y0: Math.min(...ys) - hgt * 0.1, y1: Math.max(...ys) + hgt * 0.06 };
    };
    function measureTilt() {
      const r = peRender(img, e, 1000, { fillColor, noLevels: true }), w = r.g.outW, h = r.g.outH;
      const d = r.cv.getContext('2d').getImageData(0, 0, w, h).data, gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      const excl = bodyExclusion(peGeom(W0, H0, e), w / peGeom(W0, H0, e).outW) || { x0: w * 0.3, x1: w * 0.7, y0: 0, y1: h };
      return peDetectTilt(gray, w, h, excl);
    }
    // detecção do corpo em segundo plano (para checar enquadramento e ignorar o corpo ao endireitar)
    if (V && V.detect === 'pose') detectPoseRaw(img).then(p => { pose = p; draw(); }).catch(() => { });
    setTimeout(() => { try { lastTilt = measureTilt().angle; } catch (err) { } draw(); }, 50);

    const close = v => { cancelAnimationFrame(raf); m.remove(); resolve(v); };
    m.addEventListener('click', ev => {
      const b = ev.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === '0') return close(null);
      b.disabled = true; b.textContent = 'Salvando…';
      setTimeout(() => {
        const { cv: out, g } = peRender(img, e, PE_MAX_OUT, { fillColor });
        close({ img: out.toDataURL('image/jpeg', PE_JPEG_Q), e: JSON.parse(JSON.stringify(e)), g, W0, H0 });
      }, 30);
    });
    const setAngle = a => { e.angle = Math.max(-15, Math.min(15, Math.round(a * 10) / 10)); syncUI(); draw(); };
    $('#pe-ang', m).oninput = ev => setAngle(+ev.target.value);
    $('#pe-am', m).onclick = () => setAngle(e.angle - 0.1);
    $('#pe-ap', m).onclick = () => setAngle(e.angle + 0.1);
    $('#pe-l90', m).onclick = () => { e.r90 = (e.r90 + 3) % 4; e.body = null; syncUI(); draw(); };
    $('#pe-r90', m).onclick = () => { e.r90 = (e.r90 + 1) % 4; e.body = null; syncUI(); draw(); };
    $('#pe-grid', m).onchange = ev => { grid = ev.target.checked; draw(); };
    $('#pe-pad', m).onchange = ev => { e.pad34 = ev.target.checked; draw(); };
    $('#pe-fill', m).onchange = ev => { e.fill = ev.target.checked; draw(); };
    $$('[data-crop]', m).forEach(i => i.oninput = () => { e.crop[i.dataset.crop] = +i.value / 100; e.body = null; draw(); });
    $('#pe-auto', m).onclick = () => {
      let tot = 0, conf = 1;
      for (let it = 0; it < 2; it++) { const r = measureTilt(); conf = r.conf; if (r.conf < 0.12 || Math.abs(r.angle) < 0.05) break; tot += r.angle; e.angle = Math.max(-15, Math.min(15, e.angle + r.angle)); }
      lastTilt = measureTilt().angle;
      if (conf < 0.12 && !tot) toast('Não encontrei linhas retas no ambiente. Use “Linha de referência” num batente, parede ou fio de prumo.', 4500);
      else toast(Math.abs(tot) < 0.05 ? 'A foto já está alinhada' : `Foto girada ${nf(Math.abs(tot), 1)}°`);
      e.angle = Math.round(e.angle * 10) / 10; syncUI(); draw();
    };
    const hint = $('#pe-hint', m);
    $('#pe-ref', m).onclick = () => { refMode = !refMode; refPts = []; hint.hidden = !refMode; hint.textContent = 'Toque em dois pontos de uma linha que deveria ser vertical (batente, quina da parede, fio de prumo).'; $('#pe-ref', m).classList.toggle('primary', refMode); draw(); };
    cv.addEventListener('click', ev => {
      if (!refMode) return;
      const r = cv.getBoundingClientRect(), p = { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height };
      refPts.push(p); draw();
      if (refPts.length === 2) {
        let vx = refPts[1].x - refPts[0].x, vy = refPts[1].y - refPts[0].y;
        if (Math.hypot(vx, vy) < 20) { refPts = []; return toast('Marque dois pontos mais distantes'); }
        // mesma convenção da detecção automática: linhas quase verticais ou quase horizontais
        let alpha;
        if (Math.abs(vy) >= Math.abs(vx)) { if (vy < 0) { vx = -vx; vy = -vy; } alpha = Math.atan2(vx, vy) * 180 / Math.PI; }
        else { if (vx < 0) { vx = -vx; vy = -vy; } alpha = -Math.atan2(vy, vx) * 180 / Math.PI; }
        refMode = false; refPts = []; hint.hidden = true; $('#pe-ref', m).classList.remove('primary');
        setAngle(e.angle + alpha); lastTilt = 0; toast(`Foto girada ${nf(Math.abs(alpha), 1)}° pela linha de referência`);
      }
    });
    const pb = $('#pe-body', m); if (pb) pb.onclick = async () => {
      if (e.body) { e.body = null; syncUI(); draw(); return; }
      if (!pose) { pb.disabled = true; pb.textContent = 'Localizando o corpo…'; try { pose = await detectPoseRaw(img); } catch (err) { toast('Não encontrei o corpo na foto.'); } pb.disabled = false; }
      if (!pose) { syncUI(); return; }
      const P = pose.L.filter((_, i) => pose.V[i] > 0.3).map(p => peRotSpace(p, W0, H0, e));
      let x0 = Math.min(...P.map(p => p.x)), x1 = Math.max(...P.map(p => p.x)), y0 = Math.min(...P.map(p => p.y)), y1 = Math.max(...P.map(p => p.y));
      const bh = y1 - y0; y0 -= bh * 0.12; y1 += bh * 0.05; const cx = (x0 + x1) / 2; let hw = Math.max((x1 - x0) / 2 + bh * 0.12, (y1 - y0) * 3 / 8);
      e.body = { x0: cx - hw, x1: cx + hw, y0, y1: Math.max(y1, y0 + hw * 8 / 3) };
      e.pad34 = true; e.crop = { l: 0, r: 0, t: 0, b: 0 }; syncUI(); draw();
    };
    $('#pe-gam', m).oninput = ev => { e.lv.g = +ev.target.value; draw(); };
    $('#pe-con', m).oninput = ev => { const k = +ev.target.value, mid = (e.lv.lo + e.lv.hi) / 2, half = 127.5 - k; e.lv.lo = Math.round(mid - half); e.lv.hi = Math.round(mid + half); draw(); };
    $('#pe-light', m).onclick = () => {
      const lo = Math.max(0, qs.p1 - 2), hi = Math.min(255, qs.p99 + 2), mn = Math.min(0.95, Math.max(0.05, (qs.mean - lo) / Math.max(1, hi - lo)));
      e.lv = { lo, hi, g: Math.round(Math.max(0.7, Math.min(1.5, Math.log(mn) / Math.log(0.5))) * 100) / 100 }; syncUI(); draw();
    };
    $('#pe-light0', m).onclick = () => { e.lv = { lo: 0, hi: 255, g: 1 }; syncUI(); draw(); };
    $('#pe-reset', m).onclick = () => { Object.assign(e, PE_DEFAULT()); syncUI(); draw(); };
    syncUI(); draw();
  });
}

/* Remapeia os pontos já marcados quando a foto é reajustada (mesma posição anatômica) */
function peRemapPoints(points, oldG, newG) {
  const out = {};
  for (const k in points) out[k] = peMap(peUnmap(points[k], oldG), newG);
  return out;
}
/* Abre o editor para uma foto já existente, partindo da original guardada */
async function reEditPhoto(a, slot) {
  const vd = a.views[slot], V = getView(slot, vd);
  const med = await Store.get('media', `src:${a.id}:${slot}`);
  const blob = med?.blob || await (await fetch(vd.img)).blob();
  const prevImg = await loadImg(vd.img);
  const old = vd.edit && med?.blob ? vd.edit : null;
  const oldG = old ? old.g : peGeom(prevImg.naturalWidth, prevImg.naturalHeight, PE_DEFAULT());
  const r = await openPhotoEditor({ blob, V, init: old ? old.e : null, title: V.label });
  if (!r) return false;
  if (!med?.blob) await Store.put('media', { id: `src:${a.id}:${slot}`, kind: 'file', blob, name: 'original.jpg', type: blob.type, createdAt: todayISO() });
  const hadPts = vd.points && Object.keys(vd.points).length;
  vd.points = hadPts ? peRemapPoints(vd.points, oldG, r.g) : {};
  vd.img = r.img; vd.imgOrig = null; vd.edit = { e: r.e, g: r.g };
  await Store.put('assessments', a);
  if (hadPts) toast('Foto ajustada. Os pontos marcados foram reposicionados junto.');
  return true;
}
