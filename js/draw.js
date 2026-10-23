/* TEAMRM - Posture & Correction — desenho das linhas e ângulos sobre a foto, imagens de exemplo. */
'use strict';

const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgCache.get(src);
}
const STC = { ok: '#3DDC84', warn: '#FFB224', bad: '#FF5468', na: '#C9D0F5' };
const readyV = (V, P) => V.points.every(([k, , o]) => o || P[k]);

function pixelate(ctx, img, c, r) {
  const s = Math.max(4, Math.round(r / 6)), d = Math.max(2, Math.ceil(2 * r / s));
  const tmp = document.createElement('canvas'); tmp.width = d; tmp.height = d;
  tmp.getContext('2d').drawImage(img, c.x - r, c.y - r, 2 * r, 2 * r, 0, 0, d, d);
  ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.clip();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, d, d, c.x - r, c.y - r, 2 * r, 2 * r);
  ctx.restore(); ctx.imageSmoothingEnabled = true;
}

/* Simetrógrafo digital: grade quadriculada (5 ou 10 cm) com fio de prumo, ancorada nos pés do paciente.
   sym = { on, x (fio de prumo), top, foot (y do alto da cabeça e da base dos pés, em px da foto), cm, h (altura em cm) } */
function symCell(sym) { const body = Math.max(1, (sym.foot || 0) - (sym.top || 0)); return body / (sym.h > 50 ? sym.h : 170) * (sym.cm || 10); }
function drawSym(ctx, sym, W, H, lw) {
  if (!sym?.on || !(sym.foot > sym.top)) return;
  const c = symCell(sym); if (!(c > 2)) return;
  ctx.save();
  const line = (x0, y0, x1, y1, major) => { ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = lw * (major ? 0.7 : 0.45); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = major ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.5)'; ctx.lineWidth = lw * (major ? 0.45 : 0.28); ctx.stroke(); };
  const big = (sym.cm || 10) === 5 ? 10 : 5;   // linha mais forte a cada 50 cm
  for (let k = -Math.ceil(sym.x / c); sym.x + k * c <= W; k++) { const x = sym.x + k * c; if (k) line(x, 0, x, H, k % big === 0); }
  for (let k = 0; sym.foot - k * c >= 0; k++) { const y = sym.foot - k * c; line(0, y, W, y, k % big === 0); }
  for (let k = 1; sym.foot + k * c <= H; k++) line(0, sym.foot + k * c, W, sym.foot + k * c, false);
  // fio de prumo
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(sym.x, 0); ctx.lineTo(sym.x, H); ctx.stroke();
  ctx.strokeStyle = '#E79813'; ctx.lineWidth = lw * 0.7; ctx.stroke();
  // legenda da escala
  const fs = lw * 4.2; ctx.font = `600 ${fs}px "IBM Plex Mono",monospace`; ctx.textBaseline = 'middle';
  const t = `□ ${sym.cm || 10} cm`, tw = ctx.measureText(t).width, bx = lw * 3, by = H - fs * 2.2;
  ctx.fillStyle = 'rgba(11,14,26,.78)'; ctx.fillRect(bx, by - fs * 0.8, tw + lw * 3, fs * 1.6); ctx.fillStyle = '#fff'; ctx.fillText(t, bx + lw * 1.5, by);
  ctx.restore();
}
function drawOverlay(ctx, V, vd, img, o) {
  const P = vd.points || {}, lw = o.lw, color = o.color || '#FF2D8A';
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const complete = readyV(V, P);
  if (vd.mask && complete && !V.noMask && V.face) { const f = V.face(P); if (f) pixelate(ctx, img, f.c, f.r); }
  drawSym(ctx, vd.sym, W, H, lw);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (complete) {
    if (V.plumb) {
      const pb = V.plumb(P);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = lw * 0.6; ctx.setLineDash([lw * 3, lw * 2.5]);
      ctx.beginPath(); ctx.moveTo(pb.x, 0); ctx.lineTo(pb.x, H); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = lw * 0.5; ctx.setLineDash([lw * 1.5, lw * 1.5]);
    for (const [a, b] of V.levels || []) {
      if (!P[a] || !P[b]) continue;
      const y = Math.min(P[a].y, P[b].y), x0 = Math.min(P[a].x, P[b].x), x1 = Math.max(P[a].x, P[b].x), pad = (x1 - x0) * 0.25;
      ctx.beginPath(); ctx.moveTo(x0 - pad, y); ctx.lineTo(x1 + pad, y); ctx.stroke();
    }
    for (const [p, d, len] of (V.hlines ? V.hlines(P) : [])) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + d * len, p.y); ctx.stroke(); }
    if (V.vref && P[V.vref]) { const p = P[V.vref], len = H * 0.25; ctx.beginPath(); ctx.moveTo(p.x, p.y + len * .2); ctx.lineTo(p.x, p.y - len); ctx.stroke(); }
    ctx.restore();
    if (V.axis) {
      const ax = V.axis(P);
      if (ax) { ctx.save(); ctx.strokeStyle = '#7DD3FC'; ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(ax[0].x, ax[0].y); ctx.lineTo(ax[1].x, ax[1].y); ctx.stroke(); ctx.restore(); }
    }
    if (V.extra) { ctx.save(); V.extra(ctx, P, lw); ctx.restore(); }
  }
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  for (const [a, b] of V.lines || []) if (P[a] && P[b]) { ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke(); }
  if (vd.scale?.on && P.reguaA && P.reguaB) {
    ctx.save(); ctx.strokeStyle = '#FDE047'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(P.reguaA.x, P.reguaA.y); ctx.lineTo(P.reguaB.x, P.reguaB.y); ctx.stroke(); ctx.restore();
  }
  for (const k of Object.keys(P)) {
    const p = P[k], sel = o.sel === k, rad = lw * (sel ? 3.4 : 2.3);
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = k.startsWith('regua') ? '#FDE047' : '#FFFFFF'; ctx.fill();
    ctx.lineWidth = lw * (sel ? 1.2 : 0.9); ctx.strokeStyle = sel ? '#2743D6' : color; ctx.stroke();
    if (o.numbers) {
      const idx = V.points.findIndex(([q]) => q === k);
      if (idx >= 0) {
        ctx.font = `600 ${lw * 4.2}px "IBM Plex Mono",monospace`; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = lw * 0.9;
        const tx = p.x + rad + lw, ty = p.y - rad; ctx.strokeText(String(idx + 1), tx, ty); ctx.fillText(String(idx + 1), tx, ty);
      }
    }
  }
  if (complete && o.labels !== false) {
    const fs = lw * 5.2; ctx.font = `600 ${fs}px "IBM Plex Mono",monospace`; ctx.textBaseline = 'middle';
    let ms = []; try { ms = V.measures(P, scaleOf(vd)); } catch (e) { }
    for (const m of ms) {
      if (!m.at || !P[m.at]) continue;
      const t = fmtM(m), tw = ctx.measureText(t).width, p = P[m.at];
      let x = p.x + lw * 4, y = p.y - lw * 5;
      if (x + tw + lw * 3 > W) x = p.x - tw - lw * 7;
      ctx.fillStyle = 'rgba(11,14,26,.82)';
      const bx = x - lw * 1.4, by = y - fs * 0.72, bw = tw + lw * 2.8, bh = fs * 1.44;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, lw * 1.2); else ctx.rect(bx, by, bw, bh); ctx.fill();
      ctx.fillStyle = STC[m.status]; ctx.fillText(t, x, y);
    }
  }
}
async function compositeCanvas(V, vd, settings, maxSide = 1400) {
  const img = await loadImg(vd.img);
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
  const ctx = cv.getContext('2d'); ctx.scale(k, k); ctx.drawImage(img, 0, 0);
  drawOverlay(ctx, V, vd, img, { lw: Math.max(2, Math.max(img.naturalHeight, img.naturalWidth) / 320), color: settings.lineColor, labels: true });
  return cv;
}
async function paintInto(canvas, V, vd, settings) {
  if (!canvas || !V) return;
  const src = await compositeCanvas(V, vd, settings, 1000);
  canvas.width = src.width; canvas.height = src.height; canvas.getContext('2d').drawImage(src, 0, 0);
}

/* ---------- manequim sintético para os dados de exemplo ---------- */
function mannequinBase(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#E3E7F0'); g.addColorStop(1, '#CDD3E1'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let x = 0; x <= w; x += 20) { c.strokeStyle = x % 100 === 0 ? 'rgba(30,45,110,.22)' : 'rgba(30,45,110,.09)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); }
  for (let y = 0; y <= h; y += 20) { c.strokeStyle = y % 100 === 0 ? 'rgba(30,45,110,.22)' : 'rgba(30,45,110,.09)'; c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
  c.fillStyle = '#B9C0D2'; c.fillRect(0, h * 0.965, w, h * 0.035);
  const skin = '#6F7B9C'; c.fillStyle = skin; c.strokeStyle = skin; c.lineCap = 'round'; c.lineJoin = 'round';
  const seg = (pts, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.stroke(); };
  const circ = (p, r) => { c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); };
  const poly = pts => { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fill(); };
  return { cv, c, seg, circ, poly };
}
function drawMannequin(vk, P, w, h) {
  const { cv, c, seg, circ, poly } = mannequinBase(w, h), U = h * 0.9;
  if (vk === 'front' || vk === 'back') {
    const f = vk === 'front';
    const shL = f ? P.acromioD : P.acromioE, shR = f ? P.acromioE : P.acromioD;
    const hL = f ? P.eiasD : P.eipsE, hR = f ? P.eiasE : P.eipsD, hm = mid(hL, hR);
    const grow = (p, k) => ({ x: hm.x + (p.x - hm.x) * k, y: p.y });
    const head = f ? { x: P.nariz.x, y: P.nariz.y - 0.012 * U } : { x: P.c7.x, y: P.c7.y - 0.085 * U };
    seg([head, mid(shL, shR)], 0.05 * U); circ(head, 0.052 * U);
    poly([{ x: shL.x - .01 * U, y: shL.y }, { x: shR.x + .01 * U, y: shR.y }, grow(hR, 1.55), { x: grow(hR, 1.5).x, y: hR.y + .07 * U }, { x: grow(hL, 1.5).x, y: hL.y + .07 * U }, grow(hL, 1.55)]);
    for (const [sh, s] of [[shL, -1], [shR, 1]]) seg([sh, { x: sh.x + s * .03 * U, y: sh.y + .17 * U }, { x: sh.x + s * .035 * U, y: sh.y + .33 * U }], .038 * U);
    const legs = f ? [[P.eiasD, P.joelhoD, P.tornD], [P.eiasE, P.joelhoE, P.tornE]] : [[P.eipsE, lerp(P.eipsE, P.tornE, .52), P.pernaE, P.tornE], [P.eipsD, lerp(P.eipsD, P.tornD, .52), P.pernaD, P.tornD]];
    for (const L of legs) { const top = grow(L[0], 1.15); seg([{ x: top.x, y: top.y + .05 * U }, ...L.slice(1)], .058 * U); }
    if (!f) for (const s of ['E', 'D']) seg([P['torn' + s], P['calc' + s]], .03 * U);
    else for (const s of ['D', 'E']) seg([P['torn' + s], P['pe' + s] || { x: P['torn' + s].x, y: P['torn' + s].y + .03 * U }], .03 * U);
  } else if (vk === 'latD' || vk === 'latE') {
    const d = Math.sign(P.pe.x - P.maleolo.x) || 1;
    const head = { x: P.tragus.x + d * 0.022 * U, y: P.tragus.y - 0.01 * U };
    seg([{ x: P.c7.x + d * .02 * U, y: P.c7.y }, head], .05 * U); circ(head, .055 * U);
    poly([{ x: P.c7.x, y: P.c7.y }, { x: P.acromio.x + d * .055 * U, y: P.acromio.y + .02 * U }, { x: P.acromio.x + d * .065 * U, y: P.acromio.y + .12 * U },
      { x: P.eias.x + d * .01 * U, y: P.eias.y }, { x: P.eias.x, y: P.eias.y + .06 * U }, { x: P.eips.x - d * .03 * U, y: P.eips.y + .08 * U }, { x: P.eips.x - d * .015 * U, y: P.eips.y }]);
    seg([P.trocanter, P.joelho], .075 * U); seg([P.joelho, P.maleolo], .055 * U); seg([{ x: P.maleolo.x - d * .02 * U, y: P.maleolo.y + .015 * U }, P.pe], .03 * U);
    seg([P.acromio, { x: P.acromio.x + d * .005 * U, y: P.acromio.y + .17 * U }, { x: P.acromio.x + d * .03 * U, y: P.acromio.y + .32 * U }], .04 * U);
  } else if (vk === 'adamsPost') {
    // costas vistas por trás com o tronco fletido: contorno do dorso e gibosidade
    c.beginPath(); c.ellipse(w * .5, h * .5, w * .2, h * .12, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(P.torD.x - w * .03, P.torD.y + h * .03, w * .1, h * .045, -0.15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(P.torE.x + w * .03, P.torE.y + h * .04, w * .1, h * .04, 0.15, 0, Math.PI * 2); c.fill();
    seg([{ x: w * .44, y: h * .55 }, { x: w * .44, y: h * .96 }], w * .07); seg([{ x: w * .56, y: h * .55 }, { x: w * .56, y: h * .96 }], w * .07);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(w * .5, h * .39); c.lineTo(w * .5, h * .62); c.stroke(); c.setLineDash([]);
  } else if (vk === 'adamsLat') {
    seg([P.maleolo, P.joelho, P.trocanter], .06 * h); seg([P.sacro, P.apice || lerp(P.sacro, P.c7, .5), P.c7], .1 * h);
    circ({ x: P.c7.x + .05 * w, y: P.c7.y + .06 * h }, .045 * h);
    seg([lerp(P.apice || P.sacro, P.c7, .7), P.dedo], .035 * h);
    seg([P.maleolo, { x: P.maleolo.x + .08 * w, y: P.maleolo.y + .02 * h }], .03 * h);
  }
  return cv.toDataURL('image/jpeg', 0.86);
}
function shiftedTpl(V, w, h, shift, unit) {
  const P = tplPoints(V, w, h);
  for (const k in shift) if (P[k]) { P[k].x += shift[k][0] * unit; P[k].y += shift[k][1] * unit; }
  return P;
}
async function seedExample() {
  const w = 600, h = 800, pid = uid(), U = 0.9 * h;
  await Store.put('patients', { id: pid, name: 'Marina Albuquerque', birth: '1991-04-12', sex: 'F', height: 165, weight: 61, contact: '', complaint: 'Dor cervical no fim do expediente; trabalha 8 h ao computador.', notes: '', example: true, createdAt: todayISO() });
  const shifts = [
    { front: { olhoD: [0, .008], acromioD: [0, .016], eiasD: [0, .007], nariz: [-.012, 0], joelhoD: [.01, 0] }, back: { acromioD: [0, .016], escapD: [0, .014], c7: [.012, 0], calcD: [.012, 0], eipsD: [0, .006] },
      latD: { tragus: [.032, .004], c7: [-.004, 0], eias: [0, .012], joelho: [-.006, 0] }, latE: { tragus: [-.03, .004], eias: [0, .01] }, adamsPost: { torD: [0, -.022] } },
    { front: { olhoD: [0, .003], acromioD: [0, .007], eiasD: [0, .004], nariz: [-.004, 0], joelhoD: [.006, 0] }, back: { acromioD: [0, .007], escapD: [0, .006], c7: [.004, 0], calcD: [.008, 0] },
      latD: { tragus: [.014, .002], eias: [0, .006] }, latE: { tragus: [-.012, .002], eias: [0, .005] }, adamsPost: { torD: [0, -.012] } }];
  const dates = [new Date(Date.now() - 864e5 * 84), new Date(Date.now() - 864e5 * 2)];
  for (let i = 0; i < 2; i++) {
    const views = {};
    for (const vk of KINDS.postural.views) { const P = shiftedTpl(VIEWS[vk], w, h, shifts[i][vk], U); views[vk] = { img: drawMannequin(vk, P, w, h), points: P, mask: false, scale: null }; }
    await Store.put('assessments', { id: uid(), patientId: pid, kind: 'postural', date: dates[i].toISOString(), views, notes: i ? 'Após 12 sessões de fisioterapia e ajuste ergonômico do posto de trabalho.' : '', conclusion: '', example: true, createdAt: dates[i].toISOString() });
  }
}
