/* TEAMRM - Posture & Correction — núcleo: utilidades, armazenamento local e geometria. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nf = (v, d = 1) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = iso => new Date(iso).toLocaleDateString('pt-BR');
const todayISO = () => new Date().toISOString();
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function age(birth) {
  if (!birth) return null;
  const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
const bmi = p => (p.height && p.weight) ? p.weight / Math.pow(p.height / 100, 2) : null;
const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

/* ---------- armazenamento (IndexedDB, com memória como reserva) ---------- */
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

const DEFAULT_SETTINGS = {
  id: 'main', clinic: '', professional: '', registry: '', contact: '', logo: '', lineColor: '#FF2D8A', seeded: false,
  palette: 'teamrm', theme: 'auto', pdfColor: '#0D0D0D', brandV: 2, pdfSubtitle: '', pdfExplain: true, pdfExercises: true, protocols: []
};
async function getSettings() { return { ...DEFAULT_SETTINGS, ...(await Store.get('settings', 'main') || {}) }; }

/* ---------- geometria ---------- */
const DEG = 180 / Math.PI;
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const tiltH = (a, b) => Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * DEG;   // inclinação em relação à horizontal (0–90)
const fromV = (a, b) => Math.atan2(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * DEG;   // desvio em relação à vertical (0–90)
function interior(a, b, c) {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * DEG;
}
function vecAngle(u, v) {
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * DEG;
}
const xOnLine = (a, b, y) => a.x + (b.x - a.x) * ((y - a.y) / ((b.y - a.y) || 1e-6));
const inR = (v, r) => r && v >= r[0] && v <= r[1];
const distToRange = (v, r) => !r ? 0 : v < r[0] ? r[0] - v : v > r[1] ? v - r[1] : 0;

/* ---------- medida ---------- */
const STATUS = { ok: 'Normal', warn: 'Atenção', bad: 'Alterado', na: 'Referência' };
/* unit: '°' | 'cm' | '%' | 'x' (razão) | 'idx' (índice) */
function M(key, label, score, o) {
  const status = o.ok ? (inR(score, o.ok) ? 'ok' : inR(score, o.warn || o.ok) ? 'warn' : 'bad') : 'na';
  return { key, label, score, v: o.disp ?? score, unit: o.unit || '°', text: o.text || '', ref: o.ref || '', status, ok: o.ok, warn: o.warn, at: o.at || null };
}
function fmtM(m) {
  if (m.unit === '°') return nf(m.v) + '°';
  if (m.unit === 'cm') return nf(m.v) + ' cm';
  if (m.unit === '%') return nf(m.v) + '%';
  if (m.unit === 'x') return nf(m.v, 3);
  return nf(m.v);
}
const sideTxt = s => s === 'D' ? 'direito' : 'esquerdo';
const sideTxtF = s => s === 'D' ? 'direita' : 'esquerda';

if (typeof module !== 'undefined') module.exports = {};
