/* Prumo Postural — avaliação postural por fotogrametria.
   Tudo roda no navegador; os dados ficam no IndexedDB deste aparelho. */
'use strict';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nf = (v, d = 1) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = iso => new Date(iso).toLocaleDateString('pt-BR');
const todayISO = () => new Date().toISOString();
const app = $('#app');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function age(birth) {
  if (!birth) return null;
  const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
const bmi = p => (p.height && p.weight) ? p.weight / Math.pow(p.height / 100, 2) : null;
const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function confirmBox(title, body, okLabel = 'Excluir') {
  return new Promise(res => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="panel" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p class="muted" style="margin:0">${esc(body)}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-x="0">Cancelar</button><button class="btn primary" data-x="1">${esc(okLabel)}</button></div></div>`;
    m.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b || e.target === m) { m.remove(); res(b?.dataset.x === '1'); } });
    document.body.appendChild(m);
    $('[data-x="1"]', m).focus();
  });
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Falha ao carregar ' + src)); document.head.appendChild(s); });
}
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgCache.get(src);
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- armazenamento local ---------- */
const Store = (() => {
  let db = null;
  const mem = { patients: new Map(), assessments: new Map(), settings: new Map() };
  function open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('prumo', 1);
        r.onupgradeneeded = () => { const d = r.result; for (const s of ['patients', 'assessments', 'settings']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
        r.onsuccess = () => { db = r.result; res(); };
        r.onerror = () => res();
        r.onblocked = () => res();
      } catch (e) { res(); }
    });
  }
  function tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error);
    });
  }
  return {
    open,
    get persistent() { return !!db; },
    all: s => db ? tx(s, 'readonly', o => o.getAll()) : Promise.resolve([...mem[s].values()]),
    get: (s, id) => db ? tx(s, 'readonly', o => o.get(id)) : Promise.resolve(mem[s].get(id)),
    put: (s, v) => db ? tx(s, 'readwrite', o => o.put(v)) : Promise.resolve(void mem[s].set(v.id, v)),
    del: (s, id) => db ? tx(s, 'readwrite', o => o.delete(id)) : Promise.resolve(void mem[s].delete(id)),
  };
})();

const DEFAULT_SETTINGS = { id: 'main', clinic: '', professional: '', registry: '', contact: '', logo: '', lineColor: '#FF2D8A', seeded: false };
async function getSettings() { return { ...DEFAULT_SETTINGS, ...(await Store.get('settings', 'main') || {}) }; }

/* ---------- geometria ---------- */
const DEG = 180 / Math.PI;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const tiltH = (a, b) => Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * DEG;   // inclinação em relação à horizontal
const fromV = (a, b) => Math.atan2(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * DEG;   // desvio em relação à vertical
function interior(a, b, c) {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * DEG;
}
const xOnLine = (a, b, y) => a.x + (b.x - a.x) * ((y - a.y) / ((b.y - a.y) || 1e-6));
const inR = (v, r) => r && v >= r[0] && v <= r[1];
const distToRange = (v, r) => !r ? 0 : v < r[0] ? r[0] - v : v > r[1] ? v - r[1] : 0;

const STATUS = { ok: 'Normal', warn: 'Atenção', bad: 'Alterado', na: 'Referência' };
function M(key, label, score, o) {
  const status = o.ok ? (inR(score, o.ok) ? 'ok' : inR(score, o.warn || o.ok) ? 'warn' : 'bad') : 'na';
  return { key, label, score, v: o.disp ?? score, unit: o.unit || '°', text: o.text || '', ref: o.ref || '', status, ok: o.ok, warn: o.warn, at: o.at || null };
}
const sideTxt = s => s === 'D' ? 'direito' : 'esquerdo';
const sideTxtF = s => s === 'D' ? 'direita' : 'esquerda';

/* ---------- vistas, pontos anatômicos e medidas ----------
   tpl: posição-modelo em unidades da altura do corpo (usada sem IA)
   derive: posição a partir dos 33 pontos do MediaPipe Pose (pixels)   */
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const VIEWS = {
  front: {
    label: 'Anterior', short: 'Frente',
    hint: 'Paciente de frente para a câmera, braços ao longo do corpo, pés na largura do quadril. Câmera na altura do umbigo, a cerca de 3 m, sem zoom.',
    points: [['olhoD', 'Olho direito'], ['olhoE', 'Olho esquerdo'], ['nariz', 'Ponta do nariz'], ['acromioD', 'Acrômio direito'], ['acromioE', 'Acrômio esquerdo'],
      ['eiasD', 'EIAS direita'], ['eiasE', 'EIAS esquerda'], ['joelhoD', 'Centro da patela direita'], ['joelhoE', 'Centro da patela esquerda'],
      ['tornD', 'Tornozelo direito (centro)'], ['tornE', 'Tornozelo esquerdo (centro)']],
    tpl: { olhoD: [.47, .065], olhoE: [.53, .065], nariz: [.5, .08], acromioD: [.385, .19], acromioE: [.615, .19], eiasD: [.40, .47], eiasE: [.60, .47], joelhoD: [.445, .70], joelhoE: [.555, .70], tornD: [.45, .94], tornE: [.55, .94] },
    derive(L) {
      const mh = mid(L[23], L[24]), ms = mid(L[11], L[12]), T = mh.y - ms.y;
      const eias = h => ({ x: h.x + (h.x - mh.x) * 0.35, y: h.y - 0.10 * T });
      return { olhoD: L[5], olhoE: L[2], nariz: L[0], acromioD: L[12], acromioE: L[11], eiasD: eias(L[24]), eiasE: eias(L[23]), joelhoD: L[26], joelhoE: L[25], tornD: L[28], tornE: L[27] };
    },
    lines: [['olhoD', 'olhoE'], ['acromioD', 'acromioE'], ['eiasD', 'eiasE'], ['eiasD', 'joelhoD'], ['joelhoD', 'tornD'], ['eiasE', 'joelhoE'], ['joelhoE', 'tornE']],
    levels: [['olhoD', 'olhoE'], ['acromioD', 'acromioE'], ['eiasD', 'eiasE']],
    plumb: P => mid(P.tornD, P.tornE),
    axis: P => [mid(P.tornD, P.tornE), P.nariz],
    face: P => ({ c: { x: P.nariz.x, y: (P.nariz.y + P.olhoD.y) / 2 }, r: dist(P.acromioD, P.acromioE) * 0.36 }),
    measures(P, sc) {
      const out = [];
      let v = tiltH(P.olhoD, P.olhoE);
      out.push(M('cabeca', 'Inclinação da cabeça', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'olhoE', text: v < 0.5 ? 'Nivelada' : 'Inclinada para a ' + (P.olhoD.y > P.olhoE.y ? 'direita' : 'esquerda') }));
      v = tiltH(P.acromioD, P.acromioE);
      out.push(M('ombros', 'Nivelamento dos ombros', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'acromioE', text: v < 0.5 ? 'Nivelados' : 'Ombro ' + (P.acromioD.y > P.acromioE.y ? 'direito' : 'esquerdo') + ' mais baixo' }));
      v = tiltH(P.eiasD, P.eiasE);
      out.push(M('pelve', 'Nivelamento pélvico (EIAS)', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'eiasE', text: v < 0.5 ? 'Nivelada' : 'EIAS ' + (P.eiasD.y > P.eiasE.y ? 'direita' : 'esquerda') + ' mais baixa' }));
      const mx = (P.eiasD.x + P.eiasE.x) / 2;
      for (const s of ['D', 'E']) {
        const a = P['eias' + s], k = P['joelho' + s], t = P['torn' + s];
        const dev = 180 - interior(a, k, t), xl = xOnLine(a, t, k.y);
        const sv = Math.abs(k.x - mx) < Math.abs(xl - mx) ? dev : -dev;
        out.push(M('q' + s, `Ângulo Q aprox. — joelho ${sideTxt(s)}`, sv, { ok: [8, 18], warn: [5, 22], disp: Math.abs(sv), ref: '8° a 18° de valgo', at: 'joelho' + s, text: sv >= 0 ? 'Valgo' : 'Varo' }));
      }
      const base = mid(P.tornD, P.tornE);
      v = fromV(base, P.nariz);
      out.push(M('eixo', 'Alinhamento corporal frontal', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'nariz', text: v < 0.5 ? 'Centrado' : 'Desvio para a ' + (P.nariz.x < base.x ? 'direita' : 'esquerda') }));
      if (sc) {
        out.push(M('ombros_cm', 'Diferença de altura dos ombros', Math.abs(P.acromioD.y - P.acromioE.y) / sc, { unit: 'cm', ok: [0, 1], warn: [0, 2], ref: '≤ 1 cm' }));
        out.push(M('pelve_cm', 'Diferença de altura das EIAS', Math.abs(P.eiasD.y - P.eiasE.y) / sc, { unit: 'cm', ok: [0, 1], warn: [0, 1.5], ref: '≤ 1 cm' }));
      }
      return out;
    }
  },
  back: {
    label: 'Posterior', short: 'Costas',
    hint: 'Paciente de costas, cabelo preso acima da nuca, pés na largura do quadril. Mesma distância e altura da vista anterior.',
    points: [['acromioE', 'Acrômio esquerdo'], ['acromioD', 'Acrômio direito'], ['c7', 'Processo espinhoso de C7'], ['escapE', 'Ângulo inferior da escápula E'], ['escapD', 'Ângulo inferior da escápula D'],
      ['eipsE', 'EIPS esquerda'], ['eipsD', 'EIPS direita'], ['pernaE', 'Linha média da perna E'], ['pernaD', 'Linha média da perna D'],
      ['tornE', 'Tendão do calcâneo E (maléolos)'], ['tornD', 'Tendão do calcâneo D (maléolos)'], ['calcE', 'Base do calcâneo E'], ['calcD', 'Base do calcâneo D']],
    tpl: { acromioE: [.385, .19], acromioD: [.615, .19], c7: [.5, .16], escapE: [.43, .33], escapD: [.57, .33], eipsE: [.46, .47], eipsD: [.54, .47], pernaE: [.448, .82], pernaD: [.552, .82], tornE: [.45, .92], tornD: [.55, .92], calcE: [.45, .97], calcD: [.55, .97] },
    derive(L) {
      const mh = mid(L[23], L[24]), ms = mid(L[11], L[12]), T = mh.y - ms.y;
      const esc_ = s => ({ x: s.x + (ms.x - s.x) * 0.35, y: s.y + 0.32 * T });
      const eips = h => ({ x: h.x + (mh.x - h.x) * 0.3, y: h.y - 0.08 * T });
      return { acromioE: L[11], acromioD: L[12], c7: { x: ms.x, y: ms.y - 0.12 * T }, escapE: esc_(L[11]), escapD: esc_(L[12]), eipsE: eips(L[23]), eipsD: eips(L[24]),
        pernaE: lerp(L[25], L[27], .55), pernaD: lerp(L[26], L[28], .55), tornE: L[27], tornD: L[28], calcE: L[29], calcD: L[30] };
    },
    lines: [['acromioE', 'acromioD'], ['escapE', 'escapD'], ['eipsE', 'eipsD'], ['pernaE', 'tornE'], ['tornE', 'calcE'], ['pernaD', 'tornD'], ['tornD', 'calcD']],
    levels: [['acromioE', 'acromioD'], ['escapE', 'escapD'], ['eipsE', 'eipsD']],
    plumb: P => mid(P.calcE, P.calcD),
    axis: P => [mid(P.eipsE, P.eipsD), P.c7],
    face: () => null,
    measures(P, sc) {
      const out = [];
      let v = tiltH(P.acromioE, P.acromioD);
      out.push(M('ombros', 'Nivelamento dos ombros', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'acromioD', text: v < 0.5 ? 'Nivelados' : 'Ombro ' + (P.acromioD.y > P.acromioE.y ? 'direito' : 'esquerdo') + ' mais baixo' }));
      v = tiltH(P.escapE, P.escapD);
      out.push(M('escapulas', 'Nivelamento das escápulas', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'escapD', text: v < 0.5 ? 'Niveladas' : 'Escápula ' + (P.escapD.y > P.escapE.y ? 'direita' : 'esquerda') + ' mais baixa' }));
      v = tiltH(P.eipsE, P.eipsD);
      out.push(M('pelve', 'Nivelamento pélvico (EIPS)', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'eipsD', text: v < 0.5 ? 'Nivelada' : 'EIPS ' + (P.eipsD.y > P.eipsE.y ? 'direita' : 'esquerda') + ' mais baixa' }));
      const sac = mid(P.eipsE, P.eipsD);
      v = fromV(sac, P.c7);
      out.push(M('tronco', 'Desvio do tronco (C7–sacro)', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'c7', text: v < 0.5 ? 'Alinhado' : 'Desviado para a ' + (P.c7.x > sac.x ? 'direita' : 'esquerda') }));
      const mx = (P.calcE.x + P.calcD.x) / 2;
      for (const s of ['E', 'D']) {
        const a = P['perna' + s], t = P['torn' + s], c = P['calc' + s];
        const dev = 180 - interior(a, t, c), xl = xOnLine(a, t, c.y);
        const sv = Math.abs(c.x - mx) > Math.abs(xl - mx) ? dev : -dev;
        out.push(M('calc' + s, `Retropé ${sideTxt(s)}`, sv, { ok: [-2, 6], warn: [-5, 10], disp: Math.abs(sv), ref: '0° a 5° de valgo', at: 'torn' + s, text: Math.abs(sv) < 0.5 ? 'Neutro' : sv > 0 ? 'Valgo' : 'Varo' }));
      }
      if (sc) out.push(M('ombros_cm', 'Diferença de altura dos ombros', Math.abs(P.acromioD.y - P.acromioE.y) / sc, { unit: 'cm', ok: [0, 1], warn: [0, 2], ref: '≤ 1 cm' }));
      return out;
    }
  },
};

function lateralView(side) {
  const r = side === 'D';
  const I = r ? { ear: 8, sh: 12, hip: 24, knee: 26, ank: 28, heel: 30, foot: 32 } : { ear: 7, sh: 11, hip: 23, knee: 25, ank: 27, heel: 29, foot: 31 };
  const tplD = { tragus: [.505, .07], c7: [.455, .135], acromio: [.49, .19], eias: [.56, .45], eips: [.43, .43], trocanter: [.49, .50], joelho: [.492, .71], maleolo: [.49, .94], pe: [.58, .975] };
  const tpl = {}; for (const k in tplD) tpl[k] = r ? tplD[k] : [1 - tplD[k][0], tplD[k][1]];
  const dirOf = P => Math.sign(P.pe.x - P.maleolo.x) || (r ? 1 : -1);
  return {
    label: 'Lateral ' + (r ? 'direita' : 'esquerda'), short: 'Lat. ' + side,
    hint: `Lado ${r ? 'direito' : 'esquerdo'} do paciente voltado para a câmera, braços cruzados à frente do tronco ou relaxados sem cobrir a pelve. Olhar para o horizonte.`,
    points: [['tragus', 'Trágus'], ['c7', 'Processo espinhoso de C7'], ['acromio', 'Acrômio'], ['eias', 'EIAS'], ['eips', 'EIPS'], ['trocanter', 'Trocânter maior'],
      ['joelho', 'Linha articular do joelho'], ['maleolo', 'Maléolo lateral'], ['pe', 'Cabeça do 5º metatarso']],
    tpl,
    derive(L) {
      const dir = Math.sign(L[I.foot].x - L[I.heel].x) || (r ? 1 : -1);
      const sh = L[I.sh], hip = L[I.hip], T = Math.abs(hip.y - sh.y);
      return { tragus: L[I.ear], c7: { x: sh.x - dir * 0.09 * T, y: sh.y - 0.12 * T }, acromio: sh, trocanter: hip,
        eias: { x: hip.x + dir * 0.22 * T, y: hip.y - 0.16 * T }, eips: { x: hip.x - dir * 0.20 * T, y: hip.y - 0.20 * T },
        joelho: L[I.knee], maleolo: L[I.ank], pe: L[I.foot] };
    },
    lines: [['c7', 'tragus'], ['eips', 'eias'], ['acromio', 'trocanter'], ['trocanter', 'joelho'], ['joelho', 'maleolo'], ['maleolo', 'pe']],
    levels: [],
    plumb: P => P.maleolo,
    axis: P => [P.maleolo, P.acromio],
    cva: true, dirOf,
    face: P => { const d = dirOf(P); return { c: { x: P.tragus.x + d * dist(P.tragus, P.c7) * 0.8, y: P.tragus.y }, r: dist(P.tragus, P.c7) * 0.75 }; },
    measures(P, sc) {
      const out = [], dir = dirOf(P);
      let v = Math.atan2(P.c7.y - P.tragus.y, (P.tragus.x - P.c7.x) * dir) * DEG;
      out.push(M('cva', 'Ângulo craniovertebral', v, { ok: [50, 90], warn: [45, 90], ref: '≥ 50°', at: 'tragus', text: v < 50 ? 'Anteriorização da cabeça' : 'Adequado' }));
      v = Math.atan2(P.eias.y - P.eips.y, Math.abs(P.eias.x - P.eips.x)) * DEG;
      out.push(M('pelve', 'Inclinação pélvica (EIAS–EIPS)', v, { ok: [4, 15], warn: [0, 20], ref: '4° a 15° de anteversão', at: 'eias', text: v > 15 ? 'Anteversão aumentada' : v < 4 ? 'Tendência à retroversão' : 'Anteversão fisiológica' }));
      v = Math.atan2((P.acromio.x - P.trocanter.x) * dir, P.trocanter.y - P.acromio.y) * DEG;
      out.push(M('tronco', 'Alinhamento do tronco (acrômio–trocânter)', v, { ok: [-5, 5], warn: [-8, 8], disp: Math.abs(v), ref: '≤ 5°', at: 'acromio', text: Math.abs(v) < 0.5 ? 'Vertical' : v > 0 ? 'Projeção anterior' : 'Projeção posterior' }));
      const dev = 180 - interior(P.trocanter, P.joelho, P.maleolo), xl = xOnLine(P.trocanter, P.maleolo, P.joelho.y);
      const sv = (P.joelho.x - xl) * dir < 0 ? dev : -dev;
      out.push(M('joelho', 'Ângulo do joelho', sv, { ok: [-5, 5], warn: [-10, 10], disp: Math.abs(sv), ref: '≤ 5°', at: 'joelho', text: Math.abs(sv) < 1 ? 'Neutro' : sv > 0 ? 'Hiperextensão (recurvato)' : 'Flexo' }));
      v = Math.atan2((P.acromio.x - P.maleolo.x) * dir, P.maleolo.y - P.acromio.y) * DEG;
      out.push(M('corpo', 'Alinhamento corporal (acrômio–maléolo)', v, { ok: [-1, 4], warn: [-3, 6], disp: Math.abs(v), ref: '0° a 3° anterior', at: 'maleolo', text: Math.abs(v) < 0.5 ? 'Vertical' : v > 0 ? 'Inclinação anterior' : 'Inclinação posterior' }));
      if (sc) out.push(M('cabeca_cm', 'Distância horizontal trágus–acrômio', (P.tragus.x - P.acromio.x) * dir / sc, { unit: 'cm', ref: 'acompanhar evolução', text: 'Positivo = cabeça à frente do ombro' }));
      return out;
    }
  };
}
VIEWS.latD = lateralView('D');
VIEWS.latE = lateralView('E');
const VIEW_ORDER = ['front', 'back', 'latD', 'latE'];

function tplPoints(vk, w, h) {
  const t = VIEWS[vk].tpl, out = {}, H = 0.9 * h;
  for (const k in t) out[k] = { x: w / 2 + (t[k][0] - .5) * H, y: 0.05 * h + t[k][1] * H };
  return out;
}
function scaleOf(vd) {
  if (!vd?.scale?.on || !vd.scale.cm || !vd.points.reguaA || !vd.points.reguaB) return null;
  const d = dist(vd.points.reguaA, vd.points.reguaB);
  return d > 2 ? d / vd.scale.cm : null;
}
function viewReady(vd, vk) { return vd && vd.img && vd.points && VIEWS[vk].points.every(([k]) => vd.points[k]); }
function measuresFor(vk, vd) { return viewReady(vd, vk) ? VIEWS[vk].measures(vd.points, scaleOf(vd)) : []; }
function findings(a) {
  const f = [];
  for (const vk of VIEW_ORDER) for (const m of measuresFor(vk, a.views[vk]))
    if (m.status === 'warn' || m.status === 'bad') f.push({ vk, m });
  return f;
}

/* ---------- detecção automática (MediaPipe Pose, código aberto) ---------- */
let posePromise = null;
function getPose() {
  if (!posePromise) {
    posePromise = (async () => {
      const V = '0.10.14';
      const vision = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/wasm`);
      return vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task', delegate: 'CPU' },
        runningMode: 'IMAGE', numPoses: 1
      });
    })();
    posePromise.catch(() => { posePromise = null; });
  }
  return posePromise;
}
async function detectPoints(vk, img) {
  const lm = await withTimeout(getPose(), 30000);
  const r = lm.detect(img);
  if (!r.landmarks || !r.landmarks.length) throw new Error('Nenhuma pessoa encontrada na foto');
  const w = img.naturalWidth, h = img.naturalHeight;
  const L = r.landmarks[0].map(p => ({ x: p.x * w, y: p.y * h }));
  const P = VIEWS[vk].derive(L);
  const out = {};
  for (const [k] of VIEWS[vk].points) out[k] = { x: Math.max(0, Math.min(w, P[k].x)), y: Math.max(0, Math.min(h, P[k].y)) };
  return out;
}

/* ---------- desenho: foto + linhas + ângulos ---------- */
const STC = { ok: '#3DDC84', warn: '#FFB224', bad: '#FF5468', na: '#C9D0F5' };
function pixelate(ctx, img, c, r) {
  const s = Math.max(4, Math.round(r / 6)), d = Math.ceil(2 * r / s);
  const tmp = document.createElement('canvas'); tmp.width = d; tmp.height = d;
  const t = tmp.getContext('2d'); t.drawImage(img, c.x - r, c.y - r, 2 * r, 2 * r, 0, 0, d, d);
  ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.clip();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, d, d, c.x - r, c.y - r, 2 * r, 2 * r);
  ctx.restore(); ctx.imageSmoothingEnabled = true;
}
function drawOverlay(ctx, vk, vd, img, o) {
  const V = VIEWS[vk], P = vd.points || {}, lw = o.lw, color = o.color || '#FF2D8A';
  const has = k => !!P[k];
  const complete = viewReady(vd, vk);
  if (vd.mask && complete && V.face(P)) { const f = V.face(P); pixelate(ctx, img, f.c, f.r); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const W = img.naturalWidth, H = img.naturalHeight;
  // fio de prumo
  if (complete) {
    const pb = V.plumb(P);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = lw * 0.6; ctx.setLineDash([lw * 3, lw * 2.5]);
    ctx.beginPath(); ctx.moveTo(pb.x, 0); ctx.lineTo(pb.x, H); ctx.stroke(); ctx.restore();
    // referências horizontais
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = lw * 0.5; ctx.setLineDash([lw * 1.5, lw * 1.5]);
    for (const [a, b] of V.levels) { const y = Math.min(P[a].y, P[b].y), x0 = Math.min(P[a].x, P[b].x), x1 = Math.max(P[a].x, P[b].x), pad = (x1 - x0) * 0.25;
      ctx.beginPath(); ctx.moveTo(x0 - pad, y); ctx.lineTo(x1 + pad, y); ctx.stroke(); }
    if (V.cva) { const d = V.dirOf(P), len = dist(P.c7, P.tragus) * 1.3; ctx.beginPath(); ctx.moveTo(P.c7.x, P.c7.y); ctx.lineTo(P.c7.x + d * len, P.c7.y); ctx.stroke(); }
    ctx.restore();
    const [ax0, ax1] = V.axis(P);
    ctx.save(); ctx.strokeStyle = '#7DD3FC'; ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(ax0.x, ax0.y); ctx.lineTo(ax1.x, ax1.y); ctx.stroke(); ctx.restore();
  }
  // segmentos
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  for (const [a, b] of V.lines) if (has(a) && has(b)) { ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke(); }
  // régua
  if (vd.scale?.on && P.reguaA && P.reguaB) {
    ctx.save(); ctx.strokeStyle = '#FDE047'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(P.reguaA.x, P.reguaA.y); ctx.lineTo(P.reguaB.x, P.reguaB.y); ctx.stroke(); ctx.restore();
  }
  // pontos
  const keys = Object.keys(P);
  for (const k of keys) {
    const p = P[k], sel = o.sel === k, rad = lw * (sel ? 3.4 : 2.3);
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = sel ? '#FFFFFF' : (k.startsWith('regua') ? '#FDE047' : '#FFFFFF'); ctx.fill();
    ctx.lineWidth = lw * (sel ? 1.2 : 0.9); ctx.strokeStyle = sel ? '#2743D6' : color; ctx.stroke();
    if (o.numbers) {
      const idx = V.points.findIndex(([q]) => q === k);
      if (idx >= 0) { ctx.font = `600 ${lw * 4.2}px "IBM Plex Mono",monospace`; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = lw * 0.9;
        const tx = p.x + rad + lw, ty = p.y - rad; ctx.strokeText(String(idx + 1), tx, ty); ctx.fillText(String(idx + 1), tx, ty); }
    }
  }
  // rótulos de ângulo
  if (complete && o.labels !== false) {
    const fs = lw * 5.2; ctx.font = `600 ${fs}px "IBM Plex Mono",monospace`; ctx.textBaseline = 'middle';
    for (const m of V.measures(P, scaleOf(vd))) {
      if (!m.at || !P[m.at]) continue;
      const t = `${nf(m.v)}${m.unit === '°' ? '°' : ' cm'}`, tw = ctx.measureText(t).width, p = P[m.at];
      let x = p.x + lw * 4, y = p.y - lw * 5;
      if (x + tw + lw * 3 > W) x = p.x - tw - lw * 7;
      ctx.fillStyle = 'rgba(11,14,26,.82)';
      const bx = x - lw * 1.4, by = y - fs * 0.72, bw = tw + lw * 2.8, bh = fs * 1.44;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, lw * 1.2) : ctx.rect(bx, by, bw, bh); ctx.fill();
      ctx.fillStyle = STC[m.status]; ctx.fillText(t, x, y);
    }
  }
}
async function compositeCanvas(vk, vd, settings, maxSide = 1400) {
  const img = await loadImg(vd.img);
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
  const ctx = cv.getContext('2d'); ctx.scale(k, k); ctx.drawImage(img, 0, 0);
  drawOverlay(ctx, vk, vd, img, { lw: Math.max(2, img.naturalHeight / 320), color: settings.lineColor, labels: true });
  return cv;
}
async function paintInto(canvas, vk, vd, settings) {
  const src = await compositeCanvas(vk, vd, settings, 1000);
  canvas.width = src.width; canvas.height = src.height; canvas.getContext('2d').drawImage(src, 0, 0);
}

/* ---------- dados de exemplo (manequim sintético) ---------- */
function drawMannequin(vk, P, w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#E3E7F0'); g.addColorStop(1, '#CDD3E1'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  // simetrógrafo
  for (let x = 0; x <= w; x += 20) { c.strokeStyle = x % 100 === 0 ? 'rgba(30,45,110,.22)' : 'rgba(30,45,110,.09)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); }
  for (let y = 0; y <= h; y += 20) { c.strokeStyle = y % 100 === 0 ? 'rgba(30,45,110,.22)' : 'rgba(30,45,110,.09)'; c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
  c.fillStyle = '#B9C0D2'; c.fillRect(0, h * 0.965, w, h * 0.035);
  const skin = '#6F7B9C', U = h * 0.9;
  c.fillStyle = skin; c.strokeStyle = skin; c.lineCap = 'round'; c.lineJoin = 'round';
  const seg = (pts, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.stroke(); };
  const circ = (p, r) => { c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); };
  const poly = pts => { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fill(); };
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
    if (!f) for (const s of ['E', 'D']) { seg([P['torn' + s], P['calc' + s]], .03 * U); }
    else for (const t of [P.tornD, P.tornE]) { c.beginPath(); c.ellipse(t.x, t.y + .025 * U, .026 * U, .014 * U, 0, 0, Math.PI * 2); c.fill(); }
  } else {
    const d = Math.sign(P.pe.x - P.maleolo.x) || 1;
    const head = { x: P.tragus.x + d * 0.022 * U, y: P.tragus.y - 0.01 * U };
    seg([{ x: P.c7.x + d * .02 * U, y: P.c7.y }, head], .05 * U); circ(head, .055 * U);
    poly([{ x: P.c7.x, y: P.c7.y }, { x: P.acromio.x + d * .055 * U, y: P.acromio.y + .02 * U }, { x: P.acromio.x + d * .065 * U, y: P.acromio.y + .12 * U },
      { x: P.eias.x + d * .01 * U, y: P.eias.y }, { x: P.eias.x, y: P.eias.y + .06 * U }, { x: P.eips.x - d * .03 * U, y: P.eips.y + .08 * U }, { x: P.eips.x - d * .015 * U, y: P.eips.y }]);
    seg([P.trocanter, P.joelho], .075 * U); seg([P.joelho, P.maleolo], .055 * U); seg([{ x: P.maleolo.x - d * .02 * U, y: P.maleolo.y + .015 * U }, P.pe], .03 * U);
    seg([P.acromio, { x: P.acromio.x + d * .005 * U, y: P.acromio.y + .17 * U }, { x: P.acromio.x + d * .03 * U, y: P.acromio.y + .32 * U }], .04 * U);
  }
  return cv.toDataURL('image/jpeg', 0.86);
}
function examplePoints(vk, w, h, shift) {
  const P = tplPoints(vk, w, h), U = 0.9 * h;
  for (const k in shift) if (P[k]) { P[k].x += shift[k][0] * U; P[k].y += shift[k][1] * U; }
  return P;
}
async function seedExample() {
  const w = 600, h = 800, pid = uid();
  await Store.put('patients', { id: pid, name: 'Marina Albuquerque', birth: '1991-04-12', sex: 'F', height: 165, weight: 61, contact: '', complaint: 'Dor cervical no fim do expediente; trabalha 8 h ao computador.', notes: '', example: true, createdAt: todayISO() });
  const shifts = [
    { front: { olhoD: [0, .008], acromioD: [0, .016], eiasD: [0, .007], nariz: [-.012, 0], joelhoD: [.01, 0] }, back: { acromioD: [0, .016], escapD: [0, .014], c7: [.012, 0], calcD: [.012, 0], eipsD: [0, .006] },
      latD: { tragus: [.032, .004], c7: [-.004, 0], eias: [0, .012], joelho: [-.006, 0] }, latE: { tragus: [-.03, .004], eias: [0, .01] } },
    { front: { olhoD: [0, .003], acromioD: [0, .007], eiasD: [0, .004], nariz: [-.004, 0], joelhoD: [.006, 0] }, back: { acromioD: [0, .007], escapD: [0, .006], c7: [.004, 0], calcD: [.008, 0] },
      latD: { tragus: [.014, .002], eias: [0, .006] }, latE: { tragus: [-.012, .002], eias: [0, .005] } }];
  const dates = [new Date(Date.now() - 1000 * 60 * 60 * 24 * 84), new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)];
  for (let i = 0; i < 2; i++) {
    const views = {};
    for (const vk of VIEW_ORDER) { const P = examplePoints(vk, w, h, shifts[i][vk]); views[vk] = { img: drawMannequin(vk, P, w, h), points: P, mask: false, scale: null }; }
    await Store.put('assessments', { id: uid(), patientId: pid, date: dates[i].toISOString(), views, notes: i ? 'Após 12 sessões de fisioterapia e ajuste ergonômico do posto de trabalho.' : '', conclusion: '', example: true, createdAt: dates[i].toISOString() });
  }
}

/* ---------- navegação ---------- */
let route = { name: 'patients', p: {} };
let cleanup = null;
function go(name, p = {}) {
  if (cleanup) { cleanup(); cleanup = null; }
  route = { name, p }; window.scrollTo(0, 0);
  $('#nav-patients').setAttribute('aria-current', name === 'settings' ? 'false' : 'page');
  $('#nav-settings').setAttribute('aria-current', name === 'settings' ? 'page' : 'false');
  const fn = SCREENS[name]; return fn(p);
}
$('#go-home').onclick = () => go('patients');
$('#nav-patients').onclick = () => go('patients');
$('#nav-settings').onclick = () => go('settings');

const back = (label, name, p) => `<div><button class="btn ghost small" data-back>← ${esc(label)}</button></div>`;
function bindBack(name, p) { const b = $('[data-back]'); if (b) b.onclick = () => go(name, p); }

/* ---------- telas ---------- */
const SCREENS = {};

SCREENS.patients = async () => {
  const [pts, ass] = await Promise.all([Store.all('patients'), Store.all('assessments')]);
  pts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const byP = {}; for (const a of ass) (byP[a.patientId] ||= []).push(a);
  const warnStore = Store.persistent ? '' : `<div class="banner warn">Este navegador não permite armazenamento local. Os dados serão perdidos ao fechar a página. Use o backup em Configurações.</div>`;
  app.innerHTML = `${warnStore}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Consultório</span><h1>Pacientes</h1></div>
    <button class="btn primary" id="new-p">+ Novo paciente</button></div>
    <input class="search" id="q" type="search" placeholder="Buscar por nome" aria-label="Buscar paciente">
    <div id="list"></div>`;
  const draw = q => {
    const list = pts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    $('#list').innerHTML = !pts.length
      ? `<div class="panel empty"><h2>Nenhum paciente ainda</h2><p class="muted" style="margin:0">Cadastre o primeiro paciente para iniciar uma avaliação postural.</p><button class="btn primary" id="new-p2">+ Novo paciente</button></div>`
      : !list.length ? `<div class="panel empty muted">Nenhum paciente com “${esc(q)}”.</div>`
      : `<div class="plist">${list.map(p => {
          const as = (byP[p.id] || []).sort((a, b) => b.date.localeCompare(a.date)), ag = age(p.birth);
          return `<button class="prow" data-id="${p.id}"><span class="av">${esc(initials(p.name))}</span>
            <span style="min-width:0"><b>${esc(p.name)}</b> ${p.example ? '<span class="tag">Exemplo</span>' : ''}<br>
            <span class="muted" style="font-size:.86rem">${ag != null ? ag + ' anos · ' : ''}${as.length ? as.length + (as.length > 1 ? ' avaliações' : ' avaliação') + ' · última em ' + fmtDate(as[0].date) : 'sem avaliações'}</span></span>
            <span class="muted" aria-hidden="true">›</span></button>`; }).join('')}</div>`;
    $$('.prow').forEach(b => b.onclick = () => go('patient', { id: b.dataset.id }));
    const n2 = $('#new-p2'); if (n2) n2.onclick = () => go('patientForm', {});
  };
  draw('');
  $('#q').oninput = e => draw(e.target.value);
  $('#new-p').onclick = () => go('patientForm', {});
};

SCREENS.patientForm = async ({ id }) => {
  const p = id ? await Store.get('patients', id) : { id: uid(), name: '', birth: '', sex: '', height: '', weight: '', contact: '', complaint: '', notes: '', createdAt: todayISO() };
  app.innerHTML = `${back(id ? 'Voltar ao paciente' : 'Pacientes')}
    <h1>${id ? 'Editar paciente' : 'Novo paciente'}</h1>
    <form class="panel stack" id="pf" novalidate>
      <div class="grid-form">
        <label class="f" style="grid-column:1/-1">Nome completo *<input id="f-name" required value="${esc(p.name)}" autocomplete="off"></label>
        <label class="f">Data de nascimento<input id="f-birth" type="date" value="${esc(p.birth)}"></label>
        <label class="f">Sexo<select id="f-sex"><option value="">—</option><option value="F"${p.sex === 'F' ? ' selected' : ''}>Feminino</option><option value="M"${p.sex === 'M' ? ' selected' : ''}>Masculino</option><option value="O"${p.sex === 'O' ? ' selected' : ''}>Outro</option></select></label>
        <label class="f">Altura (cm)<input id="f-height" type="number" inputmode="decimal" min="40" max="250" value="${esc(p.height)}"></label>
        <label class="f">Peso (kg)<input id="f-weight" type="number" inputmode="decimal" min="2" max="400" step="0.1" value="${esc(p.weight)}"></label>
        <label class="f" style="grid-column:1/-1">Contato<input id="f-contact" value="${esc(p.contact)}" placeholder="Telefone ou e-mail"></label>
        <label class="f" style="grid-column:1/-1">Queixa principal<textarea id="f-complaint" rows="2">${esc(p.complaint)}</textarea></label>
        <label class="f" style="grid-column:1/-1">Observações<textarea id="f-notes" rows="2">${esc(p.notes)}</textarea></label>
      </div>
      <p class="banner warn" id="f-err" hidden>Informe o nome do paciente.</p>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-cancel>Cancelar</button><button class="btn primary">Salvar paciente</button></div>
    </form>`;
  const leave = () => id ? go('patient', { id }) : go('patients');
  bindBack(); $('[data-back]').onclick = leave; $('[data-cancel]').onclick = leave;
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    const name = $('#f-name').value.trim();
    if (!name) { $('#f-err').hidden = false; $('#f-name').focus(); return; }
    Object.assign(p, { name, birth: $('#f-birth').value, sex: $('#f-sex').value, height: parseFloat($('#f-height').value) || '', weight: parseFloat($('#f-weight').value) || '', contact: $('#f-contact').value.trim(), complaint: $('#f-complaint').value.trim(), notes: $('#f-notes').value.trim() });
    await Store.put('patients', p); toast('Paciente salvo'); go('patient', { id: p.id });
  };
};

SCREENS.patient = async ({ id }) => {
  const p = await Store.get('patients', id);
  if (!p) return go('patients');
  const as = (await Store.all('assessments')).filter(a => a.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const ag = age(p.birth), im = bmi(p);
  const sexo = { F: 'Feminino', M: 'Masculino', O: 'Outro' }[p.sex] || '';
  app.innerHTML = `${back('Pacientes')}
    <div class="row spread" style="align-items:flex-start">
      <div class="row" style="gap:14px;align-items:center"><span class="av" style="width:56px;height:56px;font-size:1.2rem">${esc(initials(p.name))}</span>
        <div class="stack" style="gap:2px"><h1>${esc(p.name)} ${p.example ? '<span class="tag">Exemplo</span>' : ''}</h1>
        <span class="muted">${[ag != null ? ag + ' anos' : '', sexo, p.height ? p.height + ' cm' : '', p.weight ? nf(p.weight) + ' kg' : '', im ? 'IMC ' + nf(im) : ''].filter(Boolean).join(' · ') || 'Sem dados clínicos'}</span></div></div>
      <div class="row"><button class="btn" id="edit">Editar</button><button class="btn danger" id="del">Excluir</button></div>
    </div>
    ${p.complaint ? `<div class="panel"><span class="eyebrow">Queixa principal</span><p style="margin:6px 0 0">${esc(p.complaint)}</p></div>` : ''}
    <div class="row spread"><h2>Avaliações</h2><div class="row">${as.length > 1 ? '<button class="btn" id="cmp">Comparar evolução</button>' : ''}<button class="btn primary" id="new-a">+ Nova avaliação</button></div></div>
    <div id="alist">${as.length ? `<div class="plist">${as.map(a => {
      const done = VIEW_ORDER.filter(vk => viewReady(a.views[vk], vk)).length, f = findings(a);
      const bad = f.filter(x => x.m.status === 'bad').length, warn = f.length - bad;
      return `<div class="prow" style="grid-template-columns:1fr auto;cursor:default"><span><b class="num">${fmtDate(a.date)}</b><br><span class="muted" style="font-size:.86rem">${done}/4 vistas marcadas</span>
        ${done ? `<span class="row" style="gap:6px;margin-top:6px">${bad ? `<span class="st bad">${bad} alterado${bad > 1 ? 's' : ''}</span>` : ''}${warn ? `<span class="st warn">${warn} em atenção</span>` : ''}${!f.length ? '<span class="st ok">Sem achados</span>' : ''}</span>` : ''}</span>
        <span class="row" style="gap:6px"><button class="btn small" data-open="${a.id}">Fotos e pontos</button><button class="btn small primary" data-res="${a.id}" ${done ? '' : 'disabled'}>Resultados</button></span></div>`;
    }).join('')}</div>` : `<div class="panel empty"><h2>Nenhuma avaliação</h2><p class="muted" style="margin:0">Uma avaliação usa até 4 fotos: anterior, posterior e as duas laterais.</p></div>`}</div>`;
  bindBack('patients');
  $('#edit').onclick = () => go('patientForm', { id });
  $('#del').onclick = async () => {
    if (!(await confirmBox('Excluir paciente?', `${p.name} e as ${as.length} avaliações serão apagados deste aparelho. Essa ação não pode ser desfeita.`))) return;
    for (const a of as) await Store.del('assessments', a.id);
    await Store.del('patients', id); toast('Paciente excluído'); go('patients');
  };
  $('#new-a').onclick = async () => {
    const a = { id: uid(), patientId: id, date: todayISO(), views: {}, notes: '', conclusion: '', createdAt: todayISO() };
    await Store.put('assessments', a); go('assessment', { id: a.id });
  };
  const cmp = $('#cmp'); if (cmp) cmp.onclick = () => go('compare', { pid: id, a: as[as.length - 1].id, b: as[0].id });
  $$('[data-open]').forEach(b => b.onclick = () => go('assessment', { id: b.dataset.open }));
  $$('[data-res]').forEach(b => b.onclick = () => go('results', { id: b.dataset.res }));
};

SCREENS.assessment = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId), S = await getSettings();
  const done = VIEW_ORDER.filter(vk => viewReady(a.views[vk], vk)).length;
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Avaliação de ${esc(p.name)}</span><h1>Fotos e pontos anatômicos</h1></div>
      <label class="f" style="min-width:160px">Data da avaliação<input id="a-date" type="date" value="${a.date.slice(0, 10)}"></label></div>
    <p class="muted" style="margin:0;max-width:65ch">Fotografe as quatro vistas com o paciente em posição ortostática, de preferência em frente a uma parede lisa. Câmera parada, na altura do umbigo, com o corpo inteiro no quadro.</p>
    <div class="views">${VIEW_ORDER.map(vk => {
      const V = VIEWS[vk], vd = a.views[vk], ready = viewReady(vd, vk);
      return `<div class="slot"><div class="thumb">${vd?.img ? `<canvas data-cv="${vk}" aria-label="${V.label}"></canvas>` : `<span class="plumb"></span><span class="eyebrow" style="position:relative;background:var(--sunken);padding:4px 6px">${V.short}</span>`}</div>
        <div class="meta"><h3>${V.label}</h3>${!vd?.img ? '<span class="st na">Sem foto</span>' : ready ? `<span class="st ok">${Object.keys(vd.points).length} pontos</span>` : '<span class="st warn">Pontos pendentes</span>'}</div>
        <div class="acts"><label class="btn small${vd?.img ? '' : ' primary'}" style="cursor:pointer">${vd?.img ? 'Trocar foto' : 'Tirar ou escolher foto'}<input type="file" accept="image/*" capture="environment" data-file="${vk}" hidden></label>
          ${vd?.img ? `<button class="btn small" data-mark="${vk}">Marcar pontos</button><button class="btn small ghost danger" data-rm="${vk}" aria-label="Remover foto ${V.label}">Remover</button>` : ''}</div></div>`;
    }).join('')}</div>
    <div class="panel stack"><label class="f">Observações clínicas desta avaliação<textarea id="a-notes" rows="3" placeholder="Condições da coleta, uso de órteses, dor no momento etc.">${esc(a.notes)}</textarea></label></div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" id="see" ${done ? '' : 'disabled'}>Ver resultados (${done}/4 vistas)</button></div>`;
  bindBack('patient', { id: a.patientId });
  for (const vk of VIEW_ORDER) { const cv = $(`[data-cv="${vk}"]`); if (cv) paintInto(cv, vk, a.views[vk], S); }
  const save = async () => { a.notes = $('#a-notes').value; const d = $('#a-date').value; if (d) a.date = new Date(d + 'T12:00:00').toISOString(); await Store.put('assessments', a); };
  $('#a-notes').onchange = save; $('#a-date').onchange = save;
  $$('[data-file]').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    await save();
    const url = await straighten(f); if (!url) return;
    a.views[inp.dataset.file] = { img: url, points: {}, mask: false, scale: null };
    await Store.put('assessments', a);
    go('mark', { id, vk: inp.dataset.file, auto: true });
  });
  $$('[data-mark]').forEach(b => b.onclick = async () => { await save(); go('mark', { id, vk: b.dataset.mark }); });
  $$('[data-rm]').forEach(b => b.onclick = async () => {
    if (!(await confirmBox('Remover foto?', `A foto e os pontos da vista ${VIEWS[b.dataset.rm].label.toLowerCase()} serão apagados.`, 'Remover'))) return;
    delete a.views[b.dataset.rm]; await Store.put('assessments', a); go('assessment', { id });
  });
  $('#see').onclick = async () => { await save(); go('results', { id }); };
};

/* Ajuste de rotação da foto antes de marcar */
function straighten(file) {
  return new Promise(async res => {
    const url = URL.createObjectURL(file);
    let img; try { img = await loadImg(url); } catch { toast('Não foi possível abrir essa imagem. Tente JPG ou PNG.'); return res(null); }
    const maxS = 1600, k = Math.min(1, maxS / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="panel" role="dialog" aria-modal="true" style="max-width:520px">
      <h2>Endireitar a foto</h2><p class="muted" style="margin:0;font-size:.9rem">Gire até que as linhas verticais fiquem paralelas a uma referência vertical da foto (batente de porta, canto da parede).</p>
      <canvas id="rot-cv" style="width:100%;max-height:55vh;object-fit:contain;background:#0B0E1A;border-radius:8px"></canvas>
      <label class="f">Rotação: <span class="num" id="rot-v">0,0°</span><input id="rot" type="range" min="-15" max="15" step="0.5" value="0"></label>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-x="0">Cancelar</button><button class="btn primary" data-x="1">Usar esta foto</button></div></div>`;
    document.body.appendChild(m);
    const cv = $('#rot-cv', m); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const draw = (deg, grid = true) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0B0E1A'; ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2, H / 2); ctx.rotate(deg * Math.PI / 180); ctx.drawImage(img, -W / 2, -H / 2, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (grid) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, W / 500); for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(W * i / 8, 0); ctx.lineTo(W * i / 8, H); ctx.stroke(); } }
    };
    draw(0);
    const r = $('#rot', m); r.oninput = () => { $('#rot-v', m).textContent = nf(+r.value) + '°'; draw(+r.value); };
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === '1') { draw(+r.value, false); res(cv.toDataURL('image/jpeg', 0.88)); } else res(null);
      m.remove(); URL.revokeObjectURL(url); imgCache.delete(url);
    });
  });
}

/* Marcação de pontos */
SCREENS.mark = async ({ id, vk, auto }) => {
  const a = await Store.get('assessments', id); if (!a?.views[vk]) return go('assessment', { id });
  const S = await getSettings(), V = VIEWS[vk], vd = a.views[vk];
  vd.points ||= {};
  const img = await loadImg(vd.img), IW = img.naturalWidth, IH = img.naturalHeight;
  const st = { sel: null, z: 1, ox: 0, oy: 0, drag: null, k: 1, cssW: 0, cssH: 0 };
  const allPts = () => [...V.points, ...(vd.scale?.on ? [['reguaA', 'Régua — início'], ['reguaB', 'Régua — fim']] : [])];
  const firstMissing = () => allPts().find(([k]) => !vd.points[k])?.[0] || null;

  app.innerHTML = `${back('Fotos da avaliação')}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">Marcação de pontos</span><h1>Vista ${V.label.toLowerCase()}</h1></div></div>
    <div id="m-msg"></div>
    <div class="mark">
      <div class="stack">
        <div class="stage" id="stage"><canvas id="cv"></canvas><canvas class="loupe" id="loupe" width="264" height="264" hidden></canvas>
          <div class="tools"><button class="btn small" id="zo" aria-label="Diminuir zoom">−</button><button class="btn small" id="zi" aria-label="Aumentar zoom">+</button></div></div>
        <p class="muted" style="margin:0;font-size:.88rem">Arraste um ponto para ajustá-lo. Para posicionar um ponto específico, selecione-o na lista e toque na foto. Com zoom, arraste a área vazia para mover a imagem.</p>
      </div>
      <aside class="panel stack">
        <div class="row" style="gap:8px"><button class="btn small primary" id="auto">Detectar com IA</button><button class="btn small" id="tpl">Posicionar modelo</button></div>
        <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="mask" ${vd.mask ? 'checked' : ''} ${V.face({ tragus: { x: 0, y: 0 }, c7: { x: 0, y: 0 }, pe: { x: 1, y: 0 }, maleolo: { x: 0, y: 0 }, nariz: { x: 0, y: 0 }, olhoD: { x: 0, y: 0 }, acromioD: { x: 0, y: 0 }, acromioE: { x: 0, y: 0 } }) ? '' : 'disabled'}> Ocultar o rosto</label>
        <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="cal" ${vd.scale?.on ? 'checked' : ''}> Calibrar com régua (medidas em cm)</label>
        <label class="f" id="cal-f" ${vd.scale?.on ? '' : 'hidden'}>Comprimento real da régua (cm)<input id="cal-cm" type="number" inputmode="decimal" min="1" step="0.1" value="${vd.scale?.cm || 100}"></label>
        <div><span class="eyebrow">Pontos</span></div>
        <div class="plist2" id="plist" role="list"></div>
        <button class="btn primary" id="done">Concluir vista</button>
      </aside>
    </div>`;
  bindBack('assessment', { id });
  const cv = $('#cv'), ctx = cv.getContext('2d'), loupe = $('#loupe'), lctx = loupe.getContext('2d'), stage = $('#stage');
  const msg = (t, cls = '') => { $('#m-msg').innerHTML = t ? `<div class="banner ${cls}">${t}</div>` : ''; };

  let saveT = null;
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => Store.put('assessments', a), 250); };

  function layout() {
    const availW = stage.parentElement.clientWidth, maxH = Math.max(320, window.innerHeight * 0.72);
    const s0 = Math.min(availW / IW, maxH / IH);
    st.cssW = Math.round(IW * s0); st.cssH = Math.round(IH * s0); st.s0 = s0;
    const dpr = window.devicePixelRatio || 1; st.dpr = dpr;
    cv.width = Math.round(st.cssW * dpr); cv.height = Math.round(st.cssH * dpr);
    cv.style.width = st.cssW + 'px'; cv.style.height = st.cssH + 'px';
    stage.style.width = st.cssW + 'px'; stage.style.maxWidth = '100%'; stage.style.margin = '0 auto';
    clampPan(); draw();
  }
  function clampPan() { const k = st.s0 * st.z; st.k = k; st.ox = Math.max(0, Math.min(IW - st.cssW / k, st.ox)); st.oy = Math.max(0, Math.min(IH - st.cssH / k, st.oy)); }
  function draw() {
    const k = st.k, d = st.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = '#0B0E1A'; ctx.fillRect(0, 0, st.cssW, st.cssH);
    ctx.setTransform(d * k, 0, 0, d * k, -st.ox * k * d, -st.oy * k * d);
    ctx.drawImage(img, 0, 0);
    drawOverlay(ctx, vk, vd, img, { lw: 2.2 / k, color: S.lineColor, sel: st.sel, numbers: true });
    renderList();
  }
  const toImg = e => { const r = cv.getBoundingClientRect(); const sx = (e.clientX - r.left) * (st.cssW / r.width), sy = (e.clientY - r.top) * (st.cssH / r.height); return { x: st.ox + sx / st.k, y: st.oy + sy / st.k, sx, sy }; };
  function hit(p) { let best = null, bd = 24 / st.k; for (const [k] of allPts()) { const q = vd.points[k]; if (!q) continue; const d = dist(p, q); if (d < bd) { bd = d; best = k; } } return best; }
  function drawLoupe(p, sx, sy) {
    const Z = 3 * st.k, R = 132; loupe.hidden = false;
    loupe.style.left = (sx < st.cssW / 2 ? st.cssW - R - 10 : 10) + 'px';
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.fillStyle = '#0B0E1A'; lctx.fillRect(0, 0, 264, 264);
    lctx.save(); lctx.beginPath(); lctx.arc(132, 132, 132, 0, Math.PI * 2); lctx.clip();
    const s = 2 * Z; lctx.setTransform(s, 0, 0, s, 132 - p.x * s, 132 - p.y * s);
    lctx.drawImage(img, 0, 0); drawOverlay(lctx, vk, vd, img, { lw: 1.6 / Z, color: S.lineColor, sel: st.sel, labels: false });
    lctx.restore(); lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.strokeStyle = '#fff'; lctx.lineWidth = 2; lctx.beginPath(); lctx.moveTo(132, 108); lctx.lineTo(132, 156); lctx.moveTo(108, 132); lctx.lineTo(156, 132); lctx.stroke();
  }
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const p = toImg(e), h = hit(p);
    if (h) { st.sel = h; st.drag = { type: 'pt', k: h }; drawLoupe(p, p.sx, p.sy); }
    else if (st.sel && !vd.points[st.sel] || (st.sel && st.placing)) { vd.points[st.sel] = { x: p.x, y: p.y }; st.drag = { type: 'pt', k: st.sel }; st.placing = false; drawLoupe(p, p.sx, p.sy); persist(); }
    else if (st.z > 1) st.drag = { type: 'pan', x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy };
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!st.drag) return; const p = toImg(e);
    if (st.drag.type === 'pt') { vd.points[st.drag.k] = { x: Math.max(0, Math.min(IW, p.x)), y: Math.max(0, Math.min(IH, p.y)) }; draw(); drawLoupe(vd.points[st.drag.k], p.sx, p.sy); }
    else { st.ox = st.drag.ox - (e.clientX - st.drag.x) / st.k; st.oy = st.drag.oy - (e.clientY - st.drag.y) / st.k; clampPan(); draw(); }
  });
  const end = () => {
    if (st.drag?.type === 'pt') { persist(); const nx = firstMissing(); if (nx && !vd.points[st.sel]) st.sel = nx; }
    if (st.drag?.type === 'pt' && firstMissing()) st.sel = firstMissing();
    st.drag = null; loupe.hidden = true; draw();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  const zoom = f => { const cx = st.ox + st.cssW / st.k / 2, cy = st.oy + st.cssH / st.k / 2; st.z = Math.max(1, Math.min(5, st.z * f)); st.k = st.s0 * st.z; st.ox = cx - st.cssW / st.k / 2; st.oy = cy - st.cssH / st.k / 2; clampPan(); draw(); };
  $('#zi').onclick = () => zoom(1.6); $('#zo').onclick = () => zoom(1 / 1.6);

  function renderList() {
    const ms = viewReady(vd, vk) ? V.measures(vd.points, scaleOf(vd)) : [];
    $('#plist').innerHTML = allPts().map(([k, l], i) => `<button class="pt" role="listitem" data-k="${k}" aria-pressed="${st.sel === k}"><i>${k.startsWith('regua') ? 'R' : i + 1}</i><span>${esc(l)}</span><small>${vd.points[k] ? '✓' : 'pendente'}</small></button>`).join('')
      + (ms.length ? `<div style="margin-top:10px" class="stack"><span class="eyebrow">Medidas ao vivo</span>${ms.map(m => `<div class="row spread" style="font-size:.86rem;gap:6px"><span>${esc(m.label)}</span><span class="num">${nf(m.v)}${m.unit === '°' ? '°' : ' cm'}</span></div>`).join('')}</div>` : '');
    $$('.pt').forEach(b => b.onclick = () => { st.sel = b.dataset.k; st.placing = true; draw(); msg(`Toque na foto para posicionar: <b>${esc(allPts().find(([k]) => k === st.sel)[1])}</b>.`); });
  }

  async function runAuto() {
    const btn = $('#auto'); btn.disabled = true; btn.textContent = 'Detectando…';
    msg('Carregando o modelo de IA. Na primeira vez pode levar até 30 segundos; depois funciona offline.');
    try {
      const pts = await detectPoints(vk, img);
      for (const k in pts) vd.points[k] = pts[k];
      msg('Pontos detectados. Confira cada um com o zoom: a IA estima o centro das articulações, e pontos ósseos como EIAS, EIPS e C7 costumam precisar de ajuste.', '');
    } catch (err) {
      if (!Object.keys(vd.points).length) Object.assign(vd.points, tplPoints(vk, IW, IH));
      msg(`A detecção automática não funcionou aqui (${esc(err.message === 'timeout' ? 'tempo esgotado' : err.message)}). Coloquei os pontos numa posição-modelo; arraste cada um até o ponto anatômico.`, 'warn');
    }
    btn.disabled = false; btn.textContent = 'Detectar com IA'; st.sel = firstMissing(); persist(); draw();
  }
  $('#auto').onclick = runAuto;
  $('#tpl').onclick = () => { for (const [k] of V.points) delete vd.points[k]; Object.assign(vd.points, tplPoints(vk, IW, IH)); persist(); draw(); msg('Pontos na posição-modelo. Arraste cada um até o ponto anatômico.'); };
  $('#mask').onchange = e => { vd.mask = e.target.checked; persist(); draw(); };
  $('#cal').onchange = e => {
    vd.scale = { on: e.target.checked, cm: parseFloat($('#cal-cm').value) || 100 };
    $('#cal-f').hidden = !e.target.checked;
    if (e.target.checked && !vd.points.reguaA) { const x = IW * 0.12; vd.points.reguaA = { x, y: IH * 0.1 }; vd.points.reguaB = { x, y: IH * 0.85 }; msg('Arraste os dois pontos amarelos até as extremidades de um objeto de tamanho conhecido (régua, fio de prumo marcado) no mesmo plano do paciente.'); }
    if (!e.target.checked) { delete vd.points.reguaA; delete vd.points.reguaB; }
    persist(); draw();
  };
  $('#cal-cm').onchange = e => { vd.scale = { on: true, cm: parseFloat(e.target.value) || 100 }; persist(); draw(); };
  $('#done').onclick = async () => {
    clearTimeout(saveT); await Store.put('assessments', a);
    const miss = V.points.filter(([k]) => !vd.points[k]).length;
    if (miss) toast(`Faltam ${miss} pontos nesta vista`);
    go('assessment', { id });
  };
  const onR = () => layout(); window.addEventListener('resize', onR);
  cleanup = () => { window.removeEventListener('resize', onR); clearTimeout(saveT); Store.put('assessments', a); };
  st.sel = firstMissing();
  layout();
  if (auto && !Object.keys(vd.points).length) runAuto();
};

/* Resultados */
function measureTable(ms, extraCols = '') {
  return `<div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Valor</th><th>Situação</th></tr></thead><tbody>${ms.map(m => `
    <tr><td>${esc(m.label)}<span class="ref">${esc(m.text)}${m.ref ? ' · ref. ' + esc(m.ref) : ''}</span></td><td class="v">${nf(m.v)}${m.unit === '°' ? '°' : ' cm'}</td><td><span class="st ${m.status}">${STATUS[m.status]}</span></td></tr>`).join('')}</tbody></table></div>`;
}
SCREENS.results = async ({ id }) => {
  const a = await Store.get('assessments', id); if (!a) return go('patients');
  const p = await Store.get('patients', a.patientId), S = await getSettings();
  const all = (await Store.all('assessments')).filter(x => x.patientId === a.patientId).sort((x, y) => x.date.localeCompare(y.date));
  const prev = all.filter(x => x.date < a.date).pop();
  const vks = VIEW_ORDER.filter(vk => viewReady(a.views[vk], vk));
  const ms = vks.flatMap(vk => measuresFor(vk, a.views[vk]));
  const cnt = s => ms.filter(m => m.status === s).length;
  const f = findings(a);
  app.innerHTML = `${back(p.name)}
    <div class="row spread"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)} · ${fmtDate(a.date)}</span><h1>Resultados da avaliação</h1></div>
      <div class="row"><button class="btn" id="edit">Ajustar pontos</button>${prev ? '<button class="btn" id="cmp">Comparar com a anterior</button>' : ''}<button class="btn primary" id="pdf">Exportar PDF</button></div></div>
    <div class="summary">
      <div class="panel"><span class="eyebrow">Normais</span><b class="num" style="color:var(--ok)">${cnt('ok')}</b><span class="muted" style="font-size:.85rem">de ${ms.filter(m => m.status !== 'na').length} medidas</span></div>
      <div class="panel"><span class="eyebrow">Em atenção</span><b class="num" style="color:var(--warn)">${cnt('warn')}</b><span class="muted" style="font-size:.85rem">próximas do limite</span></div>
      <div class="panel"><span class="eyebrow">Alteradas</span><b class="num" style="color:var(--bad)">${cnt('bad')}</b><span class="muted" style="font-size:.85rem">fora da referência</span></div>
    </div>
    <div class="panel stack"><h2>Principais achados</h2>${f.length ? `<ul class="find">${f.sort((x, y) => (y.m.status === 'bad') - (x.m.status === 'bad')).map(({ vk, m }) => `<li><span class="st ${m.status}" style="margin-right:6px">${STATUS[m.status]}</span>${esc(m.label)} (${VIEWS[vk].label.toLowerCase()}): ${esc(m.text.toLowerCase())}, <span class="num">${nf(m.v)}${m.unit === '°' ? '°' : ' cm'}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Nenhuma medida fora das faixas de referência.</p>'}
      <label class="f">Conclusão do profissional (vai para o relatório)<textarea id="concl" rows="3" placeholder="Interpretação clínica, conduta e orientações.">${esc(a.conclusion)}</textarea></label></div>
    ${vks.map(vk => `<section class="panel stack"><h2>${VIEWS[vk].label}</h2><div class="res"><canvas data-cv="${vk}" aria-label="Foto ${VIEWS[vk].label} com linhas de medida"></canvas><div style="min-width:0">${measureTable(measuresFor(vk, a.views[vk]))}</div></div></section>`).join('')}
    ${VIEW_ORDER.length > vks.length ? `<p class="muted" style="margin:0">Vistas sem marcação completa: ${VIEW_ORDER.filter(v => !vks.includes(v)).map(v => VIEWS[v].label.toLowerCase()).join(', ')}.</p>` : ''}`;
  bindBack('patient', { id: a.patientId });
  for (const vk of vks) paintInto($(`[data-cv="${vk}"]`), vk, a.views[vk], S);
  $('#concl').onchange = async e => { a.conclusion = e.target.value; await Store.put('assessments', a); toast('Conclusão salva'); };
  $('#edit').onclick = () => go('assessment', { id });
  if (prev) $('#cmp').onclick = () => go('compare', { pid: a.patientId, a: prev.id, b: a.id });
  $('#pdf').onclick = async () => {
    a.conclusion = $('#concl').value; await Store.put('assessments', a);
    const b = $('#pdf'); b.disabled = true; b.textContent = 'Gerando PDF…';
    try { await exportPDF(a, p); toast('PDF gerado'); } catch (err) { toast('Não foi possível gerar o PDF: ' + err.message, 4000); }
    b.disabled = false; b.textContent = 'Exportar PDF';
  };
};

/* Comparação antes × depois */
SCREENS.compare = async ({ pid, a: ida, b: idb }) => {
  const p = await Store.get('patients', pid), S = await getSettings();
  const all = (await Store.all('assessments')).filter(x => x.patientId === pid).sort((x, y) => x.date.localeCompare(y.date));
  const A = all.find(x => x.id === ida) || all[0], B = all.find(x => x.id === idb) || all[all.length - 1];
  const opt = sel => all.map(x => `<option value="${x.id}"${x.id === sel ? ' selected' : ''}>${fmtDate(x.date)}</option>`).join('');
  const vks = VIEW_ORDER.filter(vk => viewReady(A.views[vk], vk) && viewReady(B.views[vk], vk));
  let better = 0, worse = 0;
  const rows = vk => {
    const ma = measuresFor(vk, A.views[vk]), mb = measuresFor(vk, B.views[vk]);
    return mb.map(m => {
      const o = ma.find(x => x.key === m.key); if (!o) return '';
      const da = distToRange(o.score, o.ok), db = distToRange(m.score, m.ok), dd = db - da;
      let cls = '', word = 'Estável';
      if (m.ok && Math.abs(dd) >= 0.5) { if (dd < 0) { cls = 'up'; word = 'Melhorou'; better++; } else { cls = 'down'; word = 'Piorou'; worse++; } }
      else if (!m.ok) word = '—';
      return `<tr><td>${esc(m.label)}<span class="ref">${m.ref ? 'ref. ' + esc(m.ref) : ''}</span></td><td class="v">${nf(o.v)}</td><td class="v">${nf(m.v)}</td><td class="delta ${cls}">${word}</td></tr>`;
    }).join('');
  };
  const sections = vks.map(vk => `<section class="panel stack"><h2>${VIEWS[vk].label}</h2>
    <div class="row" style="align-items:flex-start;gap:12px"><figure style="margin:0;flex:1;min-width:130px;max-width:220px"><canvas data-a="${vk}" style="width:100%;border-radius:8px;background:#0B0E1A"></canvas><figcaption class="muted num" style="font-size:.8rem">${fmtDate(A.date)}</figcaption></figure>
    <figure style="margin:0;flex:1;min-width:130px;max-width:220px"><canvas data-b="${vk}" style="width:100%;border-radius:8px;background:#0B0E1A"></canvas><figcaption class="muted num" style="font-size:.8rem">${fmtDate(B.date)}</figcaption></figure>
    <div style="flex:3;min-width:260px"><div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Antes</th><th style="text-align:right">Depois</th><th>Evolução</th></tr></thead><tbody>${rows(vk)}</tbody></table></div></div></div></section>`).join('');
  app.innerHTML = `${back(p.name)}
    <div class="stack" style="gap:4px"><span class="eyebrow">${esc(p.name)}</span><h1>Evolução entre avaliações</h1></div>
    <div class="panel row"><label class="f">Antes<select id="sa">${opt(A.id)}</select></label><label class="f">Depois<select id="sb">${opt(B.id)}</select></label>
      <div class="row" style="margin-left:auto;gap:8px" id="score"></div></div>
    ${sections || '<div class="panel empty muted">As duas avaliações precisam ter ao menos uma vista em comum com todos os pontos marcados.</div>'}`;
  $('#score').innerHTML = vks.length ? `<span class="st ok">${better} melhoraram</span><span class="st bad">${worse} pioraram</span>` : '';
  bindBack('patient', { id: pid });
  $('#sa').onchange = e => go('compare', { pid, a: e.target.value, b: B.id });
  $('#sb').onchange = e => go('compare', { pid, a: A.id, b: e.target.value });
  for (const vk of vks) { paintInto($(`[data-a="${vk}"]`), vk, A.views[vk], S); paintInto($(`[data-b="${vk}"]`), vk, B.views[vk], S); }
};

/* Configurações */
SCREENS.settings = async () => {
  const S = await getSettings();
  app.innerHTML = `<div class="stack" style="gap:4px"><span class="eyebrow">Consultório</span><h1>Configurações</h1></div>
    <form class="panel stack" id="sf"><h2>Dados do relatório</h2>
      <div class="grid-form">
        <label class="f" style="grid-column:1/-1">Nome da clínica<input id="s-clinic" value="${esc(S.clinic)}" placeholder="Ex.: Clínica Movimento Fisioterapia"></label>
        <label class="f">Profissional responsável<input id="s-prof" value="${esc(S.professional)}"></label>
        <label class="f">Registro profissional<input id="s-reg" value="${esc(S.registry)}" placeholder="CREFITO-4 000000-F"></label>
        <label class="f" style="grid-column:1/-1">Contato no rodapé<input id="s-contact" value="${esc(S.contact)}" placeholder="Endereço, telefone, Instagram"></label>
        <label class="f">Cor das linhas de medida<input id="s-color" type="color" value="${esc(S.lineColor)}" style="height:42px;padding:4px"></label>
        <div class="f">Logotipo<div class="row" style="gap:8px">${S.logo ? `<img src="${S.logo}" alt="Logotipo atual" style="height:40px;max-width:120px;object-fit:contain;background:#fff;border-radius:6px;padding:2px">` : ''}
          <label class="btn small" style="cursor:pointer">${S.logo ? 'Trocar' : 'Enviar imagem'}<input type="file" accept="image/*" id="s-logo" hidden></label>${S.logo ? '<button type="button" class="btn small ghost danger" id="s-logo-rm">Remover</button>' : ''}</div></div>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary">Salvar</button></div>
    </form>
    <section class="panel stack"><h2>Backup dos dados</h2>
      <p class="muted" style="margin:0;max-width:65ch">Pacientes, fotos e avaliações ficam somente neste aparelho, neste navegador. Exporte um backup com frequência e guarde em local seguro: ele contém dados de saúde protegidos pela LGPD.</p>
      <div class="row"><button class="btn" id="bk-out">Exportar backup</button><label class="btn" style="cursor:pointer">Restaurar backup<input type="file" accept="application/json,.json" id="bk-in" hidden></label><button class="btn ghost danger" id="ex-rm">Apagar paciente de exemplo</button></div>
      <p class="muted" id="bk-info" style="margin:0;font-size:.85rem"></p>
    </section>`;
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    Object.assign(S, { clinic: $('#s-clinic').value.trim(), professional: $('#s-prof').value.trim(), registry: $('#s-reg').value.trim(), contact: $('#s-contact').value.trim(), lineColor: $('#s-color').value });
    await Store.put('settings', S); toast('Configurações salvas');
  };
  $('#s-logo').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const u = URL.createObjectURL(f), im = await loadImg(u), k = Math.min(1, 400 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); S.logo = c.toDataURL('image/png'); URL.revokeObjectURL(u);
    await Store.put('settings', S); toast('Logotipo salvo'); go('settings');
  };
  const lr = $('#s-logo-rm'); if (lr) lr.onclick = async () => { S.logo = ''; await Store.put('settings', S); go('settings'); };
  $('#bk-out').onclick = async () => {
    const data = { app: 'prumo-postural', version: 1, exportedAt: todayISO(), settings: S, patients: await Store.all('patients'), assessments: await Store.all('assessments') };
    downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `prumo-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast('Backup exportado');
  };
  $('#bk-in').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (d.app !== 'prumo-postural') throw new Error('arquivo não é um backup do Prumo');
      if (!(await confirmBox('Restaurar backup?', `${d.patients.length} pacientes e ${d.assessments.length} avaliações serão adicionados ou substituídos neste aparelho.`, 'Restaurar'))) return;
      for (const p of d.patients) await Store.put('patients', p);
      for (const a of d.assessments) await Store.put('assessments', a);
      if (d.settings) await Store.put('settings', { ...d.settings, id: 'main', seeded: true });
      toast('Backup restaurado'); go('patients');
    } catch (err) { toast('Não foi possível restaurar: ' + err.message, 4000); }
  };
  $('#ex-rm').onclick = async () => {
    const ex = (await Store.all('patients')).filter(p => p.example); if (!ex.length) return toast('Não há paciente de exemplo');
    for (const p of ex) { for (const a of (await Store.all('assessments')).filter(a => a.patientId === p.id)) await Store.del('assessments', a.id); await Store.del('patients', p.id); }
    toast('Exemplo apagado');
  };
  try { if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); $('#bk-info').textContent = `Espaço usado: ${nf((e.usage || 0) / 1048576)} MB.`; } } catch { }
};

/* ---------- relatório PDF ---------- */
const pdfSafe = s => String(s ?? '').replace(/≤ ?/g, 'até ').replace(/≥ ?/g, 'mín. ').replace(/[–—]/g, '-').replace(/✓/g, '');
async function exportPDF(a, p) {
  if (!window.jspdf) await withTimeout(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), 20000);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }), S = await getSettings();
  const W = 210, Hh = 297, M = 14;
  const SC = { ok: [23, 128, 74], warn: [168, 98, 0], bad: [192, 40, 58], na: [90, 97, 128] };
  // cabeçalho
  doc.setFillColor(29, 42, 107); doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(pdfSafe(S.clinic || 'Avaliação postural'), M, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(pdfSafe([S.professional, S.registry].filter(Boolean).join(' · ')), M, 17);
  if (S.contact) doc.text(pdfSafe(S.contact), M, 22);
  if (S.logo) { try { const li = await loadImg(S.logo), lh = 18, lw = Math.min(50, lh * li.naturalWidth / li.naturalHeight); doc.setFillColor(255, 255, 255); doc.roundedRect(W - M - lw - 2, 4, lw + 4, lh, 2, 2, 'F'); doc.addImage(S.logo, 'PNG', W - M - lw, 4, lw, lh); } catch { } }
  let y = 36;
  doc.setTextColor(20, 26, 51); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Relatório de avaliação postural', M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 97, 128); doc.text('Data da avaliação: ' + fmtDate(a.date), W - M, y, { align: 'right' });
  y += 8;
  const ag = age(p.birth), im = bmi(p), sexo = { F: 'Feminino', M: 'Masculino', O: 'Outro' }[p.sex] || '-';
  const info = [['Paciente', p.name], ['Idade', ag != null ? ag + ' anos' : '-'], ['Sexo', sexo], ['Altura', p.height ? p.height + ' cm' : '-'], ['Peso', p.weight ? nf(p.weight) + ' kg' : '-'], ['IMC', im ? nf(im) + ' kg/m²' : '-']];
  doc.setFillColor(243, 244, 248); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'F');
  info.forEach(([k, v], i) => { const cx = M + 4 + (i % 3) * 61, cy = y + 7 + Math.floor(i / 3) * 9; doc.setFontSize(7.5); doc.setTextColor(90, 97, 128); doc.text(k.toUpperCase(), cx, cy - 2.6); doc.setFontSize(10); doc.setTextColor(20, 26, 51); doc.text(pdfSafe(v), cx, cy + 1.6); });
  y += 27;
  if (p.complaint) { doc.setFontSize(9); doc.setTextColor(90, 97, 128); doc.text('QUEIXA PRINCIPAL', M, y); y += 4.5; doc.setTextColor(20, 26, 51); doc.setFontSize(10); const t = doc.splitTextToSize(pdfSafe(p.complaint), W - 2 * M); doc.text(t, M, y); y += t.length * 4.6 + 3; }
  // vistas
  const vks = VIEW_ORDER.filter(vk => viewReady(a.views[vk], vk));
  for (const vk of vks) {
    const vd = a.views[vk], ms = measuresFor(vk, vd);
    const cv = await compositeCanvas(vk, vd, S, 1100);
    let iw = 62, ih = iw * cv.height / cv.width; if (ih > 96) { ih = 96; iw = ih * cv.width / cv.height; }
    const tblH = 8 + ms.length * 10.5, blockH = Math.max(ih, tblH) + 12;
    if (y + blockH > Hh - 18) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 26, 51); doc.text('Vista ' + VIEWS[vk].label.toLowerCase(), M, y); y += 4;
    doc.addImage(cv.toDataURL('image/jpeg', 0.85), 'JPEG', M, y, iw, ih);
    let ty = y + 4; const tx = M + iw + 6, tw = W - M - tx;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 97, 128);
    doc.text('MEDIDA', tx, ty); doc.text('VALOR', tx + tw - 30, ty, { align: 'right' }); doc.text('SITUAÇÃO', tx + tw - 26, ty); ty += 2;
    doc.setDrawColor(211, 215, 228); doc.line(tx, ty, tx + tw, ty); ty += 4.5;
    for (const m of ms) {
      doc.setFontSize(9.5); doc.setTextColor(20, 26, 51); doc.text(pdfSafe(m.label), tx, ty, { maxWidth: tw - 34 });
      doc.setFont('courier', 'bold'); doc.text(nf(m.v) + (m.unit === '°' ? '°' : ' cm'), tx + tw - 30, ty, { align: 'right' }); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SC[m.status]); doc.setFillColor(...SC[m.status]); doc.circle(tx + tw - 25, ty - 1.1, 1.1, 'F'); doc.text(STATUS[m.status], tx + tw - 22.5, ty);
      doc.setFontSize(7.5); doc.setTextColor(90, 97, 128); doc.text(pdfSafe(m.text + (m.ref ? ' · ref. ' + m.ref : '')), tx, ty + 3.8, { maxWidth: tw - 2 });
      ty += 10.5;
    }
    y += Math.max(ih, ty - y) + 8;
  }
  // achados e conclusão
  const f = findings(a);
  const conc = doc.splitTextToSize(pdfSafe(a.conclusion || ''), W - 2 * M), notes = doc.splitTextToSize(pdfSafe(a.notes || ''), W - 2 * M);
  const need = 16 + f.length * 5 + (a.conclusion ? conc.length * 4.6 + 10 : 0) + (a.notes ? notes.length * 4.6 + 10 : 0) + 40;
  if (y + need > Hh - 18) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 26, 51); doc.text('Principais achados', M, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  if (!f.length) { doc.text('Nenhuma medida fora das faixas de referência.', M, y); y += 5; }
  for (const { vk, m } of f) { doc.setFillColor(...SC[m.status]); doc.circle(M + 1.2, y - 1.1, 1.1, 'F'); doc.setTextColor(20, 26, 51); doc.text(pdfSafe(`${m.label} (${VIEWS[vk].label.toLowerCase()}): ${m.text.toLowerCase()}, ${nf(m.v)}${m.unit === '°' ? '°' : ' cm'}`), M + 4, y, { maxWidth: W - 2 * M - 4 }); y += 5; }
  if (a.notes) { y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Observações da coleta', M, y); y += 5.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(notes, M, y); y += notes.length * 4.6; }
  if (a.conclusion) { y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Conclusão do profissional', M, y); y += 5.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(conc, M, y); y += conc.length * 4.6; }
  y = Math.max(y + 18, Hh - 40);
  doc.setDrawColor(20, 26, 51); doc.line(W / 2 - 40, y, W / 2 + 40, y);
  doc.setFontSize(9); doc.setTextColor(20, 26, 51); doc.text(pdfSafe(S.professional || 'Profissional responsável'), W / 2, y + 4.5, { align: 'center' });
  if (S.registry) doc.text(pdfSafe(S.registry), W / 2, y + 9, { align: 'center' });
  // rodapé em todas as páginas
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(90, 97, 128);
    doc.text('Medidas obtidas por fotogrametria 2D. Ferramenta de apoio: os resultados devem ser interpretados por profissional habilitado e não constituem diagnóstico.', M, Hh - 8, { maxWidth: W - 2 * M - 20 });
    doc.text(`${i}/${n}`, W - M, Hh - 8, { align: 'right' });
  }
  doc.save(`avaliacao-postural-${slug(p.name)}-${a.date.slice(0, 10)}.pdf`);
}

/* ---------- inicialização ---------- */
(async () => {
  await Store.open();
  const S = await getSettings();
  if (!S.seeded) {
    const pts = await Store.all('patients');
    if (!pts.length) await seedExample();
    S.seeded = true; await Store.put('settings', S);
  }
  go('patients');
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { await navigator.serviceWorker.register('sw.js'); } catch { /* sem modo offline neste ambiente */ }
  }
})();

// exporta funções puras para os testes (Node)
if (typeof module !== 'undefined') module.exports = { VIEWS, tplPoints, interior, tiltH, fromV };
