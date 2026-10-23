// Testes do editor de fotos (geometria e endireitamento) — node tests/foto.test.js
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { console, Math, Float32Array, Float64Array, Uint32Array, Uint8ClampedArray }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'photoedit.js'), 'utf8') + ';Object.assign(this,{peGeom,peMap,peUnmap,peDetectTilt,peQuality,peLUT,PE_DEFAULT});', ctx);
const { peGeom, peMap, peUnmap, peDetectTilt, peLUT, PE_DEFAULT } = ctx;
const near = (a, b, t, m) => assert(Math.abs(a - b) <= t, `${m}: ${a} ≠ ${b}`);
const W0 = 1200, H0 = 1600;

// 1) sem ajuste = identidade (nenhuma reamostragem de posição)
let g = peGeom(W0, H0, PE_DEFAULT());
assert.equal(g.outW, 1200); assert.equal(g.outH, 1600);
let p = peMap({ x: 300, y: 1000 }, g); near(p.x, 300, 1e-9, 'id x'); near(p.y, 1000, 1e-9, 'id y');

// 2) ida e volta exata com rotação, corte, 3:4 e redução
const e = Object.assign(PE_DEFAULT(), { r90: 1, angle: 3.7, crop: { l: .05, r: .02, t: .1, b: 0 }, pad34: true });
g = peGeom(4000, 3000, e);
for (const q of [{ x: 10, y: 20 }, { x: 2000, y: 1500 }, { x: 3999, y: 2999 }]) { const r = peUnmap(peMap(q, g), g); near(r.x, q.x, 1e-6, 'volta x'); near(r.y, q.y, 1e-6, 'volta y'); }
near(g.outW / g.outH, 3 / 4, 0.01, 'formato 3:4');
assert(Math.max(g.outW, g.outH) <= 2400);

// 3) proporções preservadas: distâncias escalam igual nos dois eixos (nada esticado)
const a = peMap({ x: 100, y: 100 }, g), b = peMap({ x: 600, y: 100 }, g), c = peMap({ x: 100, y: 600 }, g);
near(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - a.x, c.y - a.y), 1e-6, 'escala uniforme');
near((b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y), 0, 1e-6, 'ângulo reto preservado');

// 4) ao girar sem "preencher cantos", os 4 cantos da saída caem dentro da foto original
for (const an of [2, 7.5, -12]) {
  const e2 = Object.assign(PE_DEFAULT(), { angle: an }); const g2 = peGeom(W0, H0, e2);
  for (const o of [{ x: 0, y: 0 }, { x: g2.outW, y: 0 }, { x: 0, y: g2.outH }, { x: g2.outW, y: g2.outH }]) { const q = peUnmap(o, g2); assert(q.x >= -1e-6 && q.x <= W0 + 1e-6 && q.y >= -1e-6 && q.y <= H0 + 1e-6, 'canto fora da foto em ' + an + '°'); }
}

// 5) endireitar automático: grade de parede girada β → correção ≈ −β; corpo no centro é ignorado
function photo(beta, w = 480, h = 640) {
  const g = new Float32Array(w * h), cs = Math.cos(-beta * Math.PI / 180), sn = Math.sin(-beta * Math.PI / 180);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - w / 2, dy = y - h / 2, sx = dx * cs - dy * sn, sy = dx * sn + dy * cs;
    const d = Math.min(Math.abs(((sx % 40) + 40) % 40 - 20), Math.abs(((sy % 40) + 40) % 40 - 20));
    let v = 200 - 140 * Math.max(0, Math.min(1, 2.5 - d));   // linhas com borda suave, como numa foto
    if (Math.abs(dx) < 50 && Math.abs(dy) < 250) v = 120 + 60 * Math.sin((dx + dy * 0.3) / 9); // "corpo" inclinado no centro
    g[y * w + x] = v;
  }
  return g;
}
for (const beta of [0, 2.5, -4, 8]) {
  // duas passadas, como no app: a 2ª mede o que sobrou depois da 1ª correção
  const ex = { x0: 180, x1: 300, y0: 60, y1: 580 }, r1 = peDetectTilt(photo(beta), 480, 640, ex), r2 = peDetectTilt(photo(beta + r1.angle), 480, 640, ex);
  near(r1.angle + r2.angle, -beta, 0.15, `endireitar ${beta}°`); assert(r1.conf > 0.3, 'confiança');
}
// 5b) a correção detectada endireita de fato: uma linha vertical inclinada β na foto fica vertical após aplicar o ângulo
for (const beta of [3, -6]) {
  const r = peDetectTilt(photo(beta), 480, 640, null), gg = peGeom(480, 640, Object.assign(PE_DEFAULT(), { angle: r.angle }));
  const dir = { x: -Math.sin(beta * Math.PI / 180), y: Math.cos(beta * Math.PI / 180) };
  const p1 = peMap({ x: 240, y: 320 }, gg), p2 = peMap({ x: 240 + 200 * dir.x, y: 320 + 200 * dir.y }, gg);
  near(p2.x - p1.x, 0, 1.2, `linha vertical após endireitar ${beta}°`);
}
// 6) luz: LUT neutra é identidade
const lut = peLUT({ lo: 0, hi: 255, g: 1 }); for (let v = 0; v < 256; v += 17) assert.equal(lut[v], v);
console.log('Editor de fotos conferido.');
