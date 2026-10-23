/* TEAMRM — personagens em desenho animado que demonstram cada posição (sem foto de pessoa real).
   Esqueleto 2D simples (perfil e frente/costas), roupa: top preto e short/biquíni preto.
   Cada cena vai da posição relaxada até a posição do teste, segura e volta, em laço (como um GIF). */
'use strict';

const POSE_FIG = (() => {
  const SKIN = '#E3AC80', SKIN2 = '#C98F66', HAIR = '#2B1B12', CLOTH = '#141414', EDGE = '#6B6B6B', ACC = 'var(--accent)', MU = 'var(--muted)';
  const r1 = v => Math.round(v * 10) / 10;
  const dir = a => { const t = a * Math.PI / 180; return { x: Math.sin(t), y: Math.cos(t) }; };   // 0 = para baixo, 90 = para a frente, 180 = para cima
  const add = (p, d, l) => ({ x: p.x + d.x * l, y: p.y + d.y * l });
  const seg = (a, b, w, c, extra = '') => `<line x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${extra}/>`;
  const cloth = (a, b, w) => seg(a, b, w + 2, EDGE) + seg(a, b, w, CLOTH);
  const dot = (p, r, c) => `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r}" fill="${c}"/>`;
  const L = { tr: 46, nk: 7, hr: 9.5, ua: 25, fa: 23, th: 38, sh: 37, ft: 11 };

  /* ---------- perfil (olhando para a direita) ---------- */
  function side(p) {
    const P = { x: p.x, y: p.y }, T = dir(p.trunk);
    const S = add(P, T, 41), N = add(P, T, L.tr), H = add(N, dir(p.head), L.nk + L.hr);
    const fs = p.face || 1, fwd = dir(p.head - 90 * fs), back = dir(p.head + 90 * fs);
    const leg = (o, th, sh, ft, c, far) => {
      const K = add(o, dir(th), L.th), A = add(K, dir(sh), L.sh), F = add(A, dir(ft), L.ft);
      return { K, A, F, svg: seg(o, K, 11, c) + seg(K, A, 8, c) + seg(A, F, 5.5, c) + (far ? '' : '') };
    };
    const arm = (s, ua, fa, c) => { const E = add(s, dir(ua), L.ua), W = add(E, dir(fa), L.fa); return seg(s, E, 6.5, c) + seg(E, W, 5.5, c) + dot(add(W, dir(fa), 2.5), 3.4, c); };
    const off = { x: -1.6, y: -1.2 }, Pf = add(P, off, 1), Sf = add(S, off, 1);
    const lf = leg(Pf, p.thF, p.shF, p.ftF, SKIN2, true), ln = leg(P, p.thN, p.shN, p.ftN, SKIN);
    let s = '';
    s += arm(Sf, p.uaF, p.faF, SKIN2) + lf.svg + cloth(Pf, add(Pf, dir(p.thF), 11), 11);
    s += seg(P, S, 17, SKIN) + seg(S, N, 6, SKIN);                                   // tronco e pescoço
    s += cloth(add(P, T, 20), add(S, T, -2), 17.5);                                    // top
    s += cloth(add(P, T, 7), add(P, T, -1), 17) + ln.svg + cloth(P, add(P, dir(p.thN), 12), 12);   // short + perna da frente
    s += arm(S, p.uaN, p.faN, SKIN);
    s += dot(add(H, back, 1.6), L.hr + 0.6, HAIR) + dot(add(H, fwd, 1.2), L.hr - 0.8, SKIN);       // cabelo e rosto
    s += dot(add(add(H, back, 6), dir(p.head), 7), 4.2, HAIR);                                      // coque
    s += dot(add(add(H, fwd, 5.6), dir(p.head), 1.5), 1.25, '#222');                               // olho
    return { svg: s, A: ln.A, P, H };
  }

  /* ---------- frente / costas ---------- */
  function front(p) {
    const P = { x: p.x, y: p.y }, tf = p.tf, T = { x: P.x, y: P.y - L.tr * tf };
    const sh = { l: { x: T.x - 16, y: T.y + 4 * Math.sign(tf || 1) }, r: { x: T.x + 16, y: T.y + 4 * Math.sign(tf || 1) } };
    const hip = { l: { x: P.x - 8, y: P.y }, r: { x: P.x + 8, y: P.y } };
    const H = { x: T.x, y: T.y - (L.nk + L.hr) * p.hd };
    const side = (k, o) => k === 'l' ? -o : o;
    const legs = ['l', 'r'].map(k => {
      const g = p.legs[k], d1 = { x: side(k, Math.sin(g.tha * Math.PI / 180)), y: Math.cos(g.tha * Math.PI / 180) }, d2 = { x: side(k, Math.sin(g.sha * Math.PI / 180)), y: Math.cos(g.sha * Math.PI / 180) };
      const K = add(hip[k], d1, L.th * g.thl), A = add(K, d2, L.sh * g.shl);
      return seg(hip[k], K, 12, SKIN) + seg(K, A, 9, SKIN) + `<ellipse cx="${r1(A.x + side(k, 1.5))}" cy="${r1(A.y + 2)}" rx="5.5" ry="3.2" fill="${SKIN2}"/>` + cloth(hip[k], add(hip[k], d1, Math.min(10, L.th * g.thl)), 12);
    }).join('');
    const shorts = `<path d="M${r1(P.x - 15)} ${r1(P.y - 6)} H${r1(P.x + 15)} L${r1(P.x + 13)} ${r1(P.y + 6)} L${r1(P.x)} ${r1(P.y + 9)} L${r1(P.x - 13)} ${r1(P.y + 6)} Z" fill="${CLOTH}" stroke="${EDGE}" stroke-width="1"/>`;
    const torso = `<path d="M${r1(sh.l.x)} ${r1(sh.l.y)} L${r1(sh.r.x)} ${r1(sh.r.y)} L${r1(P.x + 12)} ${r1(P.y - 4)} L${r1(P.x - 12)} ${r1(P.y - 4)} Z" fill="${SKIN}" stroke="${SKIN}" stroke-width="5" stroke-linejoin="round"/>`;
    const topY = sh.l.y + (P.y - 4 - sh.l.y) * 0.5;
    const top = Math.abs(tf) > 0.25 ? `<path d="M${r1(sh.l.x + 2)} ${r1(sh.l.y + 2 * Math.sign(tf))} L${r1(sh.r.x - 2)} ${r1(sh.r.y + 2 * Math.sign(tf))} L${r1(T.x + 14)} ${r1(topY)} L${r1(T.x - 14)} ${r1(topY)} Z" fill="${CLOTH}" stroke="${EDGE}" stroke-width="1"/>`
      : `<path d="M${r1(T.x - 17)} ${r1(sh.l.y - 2)} H${r1(T.x + 17)}" stroke="${CLOTH}" stroke-width="7" stroke-linecap="round"/>`;
    const arms = ['l', 'r'].map(k => {
      const g = p.arms[k], d = { x: side(k, Math.sin(g.a * Math.PI / 180)), y: Math.cos(g.a * Math.PI / 180) };
      const E = add(sh[k], d, L.ua * g.l), W = add(E, d, L.fa * g.l);
      return seg(sh[k], E, 7, SKIN) + seg(E, W, 6, SKIN) + dot(add(W, d, 2.5), 3.6, SKIN2);
    }).join('');
    const neck = seg(T, { x: T.x, y: T.y - 6 * p.hd }, 7, SKIN);
    let head;
    if (p.back || (p.hairOnly && p.hd < 0.3)) head = dot(H, L.hr + 0.6, HAIR) + dot({ x: H.x, y: H.y - (L.hr + 2) * Math.sign(p.hd) }, 4.5, HAIR);
    else head = dot({ x: H.x, y: H.y - 1.8 }, L.hr + 0.7, HAIR) + dot({ x: H.x, y: H.y + 1.3 }, L.hr - 0.9, SKIN) + dot({ x: H.x, y: H.y - L.hr - 3 }, 4.2, HAIR)
      + dot({ x: H.x - 3.2, y: H.y }, 1.2, '#222') + dot({ x: H.x + 3.2, y: H.y }, 1.2, '#222') + `<path d="M${r1(H.x - 2.5)} ${r1(H.y + 4)} Q${r1(H.x)} ${r1(H.y + 5.6)} ${r1(H.x + 2.5)} ${r1(H.y + 4)}" stroke="#7a3b2a" stroke-width="1" fill="none"/>`;
    const upper = neck + torso + top + arms + head;
    const lower = legs + shorts;
    return { svg: p.bendBack ? upper + lower : lower + upper, P };
  }

  /* ---------- poses ---------- */
  const S0 = { x: 58, y: 84, trunk: 180, head: 180, uaN: 6, faN: 12, uaF: -4, faF: 4, thN: 2, shN: 0, ftN: 90, thF: -2, shF: -1, ftF: 90 };
  const F0 = { x: 60, y: 84, tf: 1, hd: 1, arms: { l: { a: 9, l: 1 }, r: { a: 9, l: 1 } }, legs: { l: { tha: 3, thl: 1, sha: 0, shl: 1 }, r: { tha: 3, thl: 1, sha: 0, shl: 1 } } };
  const W = (o, ch) => JSON.parse(JSON.stringify({ ...o, ...ch }));
  const legsF = (l, r) => ({ l: { ...F0.legs.l, ...l }, r: { ...F0.legs.r, ...r } });
  const armsF = (a, l = 1) => ({ l: { a, l }, r: { a, l } });
  const SIT0 = { x: 38, y: 84, trunk: 176, head: 180, uaN: 10, faN: 30, uaF: 6, faF: 26, thN: 90, shN: 90, ftN: 178, thF: 91, shF: 91, ftF: 178 };
  const SIT1 = { trunk: 118, head: 108, uaN: 100, faN: 96, uaF: 98, faF: 94 };
  const PR0 = { x: 78, y: 83, trunk: -90, head: -90, face: -1, uaN: -88, faN: 100, uaF: -86, faF: 98, thN: 90, shN: 90, ftN: 100, thF: 90, shF: 90, ftF: 100 };
  const SU0 = { x: 78, y: 83, trunk: -90, head: -90, face: 1, uaN: 85, faN: 90, uaF: 83, faF: 88, thN: 90, shN: 90, ftN: 180, thF: 90, shF: 90, ftF: 180 };
  const plumb = (c, J) => `<line x1="${r1(J.A.x)}" x2="${r1(J.A.x)}" y1="4" y2="162" stroke="${ACC}" stroke-width="1.4" stroke-dasharray="4 5" stroke-opacity=".7"/>`;
  const level = (c, J) => `<line x1="24" x2="96" y1="${r1(J.P.y)}" y2="${r1(J.P.y)}" stroke="${ACC}" stroke-width="1.4" stroke-dasharray="4 5"/>`;
  const SC = {
    front: { v: 'front', vb: '0 0 120 170', floor: 163, a: F0, b: W(F0, { arms: armsF(13) }), g: level, calm: true },
    back: { v: 'front', vb: '0 0 120 170', floor: 163, a: W(F0, { back: true }), b: W(F0, { back: true, arms: armsF(13) }), g: level, calm: true },
    latD: { v: 'side', vb: '0 0 120 170', floor: 163, a: S0, b: W(S0, { uaN: 12, faN: 20, uaF: 2, faF: 10, trunk: 179 }), g: plumb, calm: true },
    encBracosD: { v: 'side', vb: '0 0 120 170', floor: 163, a: S0, b: W(S0, { uaN: 90, faN: 90, uaF: 88, faF: 88 }), g: plumb },
    encFlexLatD: { v: 'side', vb: '0 0 120 170', floor: 163, a: S0, b: W(S0, { x: 50, trunk: 42, head: 15, uaN: 0, faN: -4, uaF: 2, faF: -2 }) },
    encSentBilD: { v: 'side', vb: '0 0 160 100', floor: 90, a: SIT0, b: W(SIT0, SIT1) },
    encSentUniD: { v: 'side', vb: '0 0 160 100', floor: 90, a: W(SIT0, { thF: 70, shF: -95, ftF: 0 }), b: W(SIT0, { ...SIT1, thF: 70, shF: -95, ftF: 0 }) },
    encPronoE: { v: 'side', vb: '0 0 160 100', floor: 90, a: PR0, b: W(PR0, { shN: 210, ftN: 230, shF: 205, ftF: 225 }) },
    encSlrD: { v: 'side', vb: '0 0 160 100', floor: 90, a: SU0, b: W(SU0, { thN: 170, shN: 170, ftN: 260 }) },
    encUnipD: { v: 'front', vb: '0 0 120 170', floor: 163, a: F0, b: W(F0, { x: 57, legs: legsF({}, { tha: 2, shl: 0.18, sha: -4 }) }), g: level },
    encCegD: { v: 'front', vb: '0 0 120 170', floor: 163, a: F0, b: W(F0, { x: 57, legs: legsF({}, { tha: 4, thl: 0.22, sha: 2 }) }), g: level },
    encFlexAnt: { v: 'front', vb: '0 0 120 170', floor: 163, a: F0, b: W(F0, { tf: 0.12, hd: -0.9, hairOnly: true, arms: armsF(5, 1.68) }) },
    adamsPost: { v: 'front', vb: '0 0 120 170', floor: 163, a: W(F0, { back: true }), b: W(F0, { back: true, bendBack: true, tf: -0.25, hd: -0.6, arms: armsF(4, 1.2), legs: legsF({ tha: 6 }, { tha: 6 }) }) },
  };
  // cenas espelhadas (lado esquerdo) e apelidos
  const MIRROR = { latE: 'latD', encBracosE: 'encBracosD', encFlexLatE: 'encFlexLatD', encSentBilE: 'encSentBilD', encSentUniE: 'encSentUniD', encPronoD: 'encPronoE', encSlrE: 'encSlrD', encUnipE: 'encUnipD', encCegE: 'encCegD' };
  const ALIAS = { adamsLat: 'encFlexLatD' };

  /* ---------- interpolação e desenho ---------- */
  const lerp = (a, b, t) => {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
    if (a && typeof a === 'object') { const o = {}; for (const k in a) o[k] = lerp(a[k], b?.[k] ?? a[k], t); for (const k in b || {}) if (!(k in o)) o[k] = b[k]; return o; }
    return t < 0.5 ? a : (b ?? a);
  };
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function scene(key) { if (SC[key]) return { s: SC[key], flip: false }; if (MIRROR[key]) return { s: SC[MIRROR[key]], flip: true }; if (ALIAS[key]) return scene(ALIAS[key]); return null; }
  function inner(key, t) {
    const sc = scene(key); if (!sc) return '';
    const { s, flip } = sc, p = lerp(s.a, s.b, t), [, , w, h] = s.vb.split(' ').map(Number);
    const J = s.v === 'side' ? side(p) : front(p);
    let out = `<line x1="4" x2="${w - 4}" y1="${s.floor}" y2="${s.floor}" stroke="${MU}" stroke-width="2" stroke-linecap="round"/>`;
    out += (s.g ? s.g(s, J) : '') + J.svg;
    return flip ? `<g transform="translate(${w} 0) scale(-1 1)">${out}</g>` : out;
  }
  const has = key => !!scene(key);
  const vb = key => scene(key)?.s.vb || '0 0 120 170';
  const svgStatic = (key, t = 1) => has(key) ? `<svg viewBox="${vb(key)}" width="100%" height="100%" aria-hidden="true">${inner(key, t)}</svg>` : '';
  const svgAnim = key => has(key) ? `<svg class="figanim" data-fig="${key}" viewBox="${vb(key)}" width="100%" height="100%" role="img" aria-label="Demonstração animada da posição">${inner(key, 0)}</svg>` : '';
  // fase do laço: segura relaxado → vai → segura no teste → volta
  function phase(ms, calm) {
    const C = calm ? 5200 : 4400, x = (ms % C) / C;
    if (calm) return 0.5 - 0.5 * Math.cos(x * 2 * Math.PI);
    if (x < .18) return 0; if (x < .5) return ease((x - .18) / .32); if (x < .82) return 1; return 1 - ease((x - .82) / .18);
  }
  return { inner, svgStatic, svgAnim, has, phase, isCalm: key => !!scene(key)?.s.calm, keys: () => [...Object.keys(SC), ...Object.keys(MIRROR), ...Object.keys(ALIAS)] };
})();

/* animação contínua de todas as figuras visíveis (≈ 25 quadros por segundo) */
if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined') {
  let last = 0;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = ts => {
    if (ts - last > 40 && !document.hidden) {
      last = ts;
      for (const el of document.querySelectorAll('svg.figanim')) {
        const k = el.dataset.fig, t = reduce ? 1 : POSE_FIG.phase(ts, POSE_FIG.isCalm(k));
        if (el._t === t) continue; el._t = t; el.innerHTML = POSE_FIG.inner(k, t);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
if (typeof module !== 'undefined') module.exports = { POSE_FIG };
