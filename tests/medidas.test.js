// Testes das fórmulas de medida: node tests/medidas.test.js
const assert = require('assert');
process.on('unhandledRejection', () => {});
const stub = { setAttribute() {}, appendChild() {}, addEventListener() {} };
global.document = { querySelector: () => stub, querySelectorAll: () => [], createElement: () => { throw new Error('sem DOM'); }, head: stub, body: stub };
global.window = { scrollTo() {} }; global.location = { protocol: 'file:' }; global.navigator = {};
const { VIEWS, tplPoints } = require('../app.js');
const W = 600, H = 800, U = 0.9 * H;
const get = (vk, shift = {}) => {
  const P = tplPoints(vk, W, H);
  for (const k in shift) { P[k].x += shift[k][0] * U; P[k].y += shift[k][1] * U; }
  return Object.fromEntries(VIEWS[vk].measures(P, null).map(m => [m.key, m]));
};
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} ≠ ${b}`);

// Modelo neutro: tudo nivelado e dentro da referência
let m = get('front');
near(m.ombros.v, 0, 0.01, 'ombros nivelados'); assert.equal(m.ombros.status, 'ok');
assert.equal(m.qD.text, 'Valgo'); assert.equal(m.qD.status, 'ok'); near(m.qD.v, m.qE.v, 0.01, 'Q simétrico');
m = get('back'); assert.equal(m.calcE.status, 'ok'); assert.equal(m.tronco.status, 'ok');
for (const vk of ['latD', 'latE']) {
  m = get(vk);
  assert(m.cva.v > 50 && m.cva.status === 'ok', vk + ' CVA neutro ' + m.cva.v);
  assert(m.pelve.v > 4 && m.pelve.v < 15, vk + ' pelve fisiológica ' + m.pelve.v);
  assert.equal(m.joelho.status, 'ok');
}
// Ombro direito 3° mais baixo (anterior): sobe/desce acrômio D
const dx = (0.615 - 0.385) * U, dy = Math.tan(3 / 180 * Math.PI) * dx;
m = get('front', { acromioD: [0, dy / U] });
near(m.ombros.v, 3, 0.01, 'ombro 3°'); assert.equal(m.ombros.text, 'Ombro direito mais baixo'); assert.equal(m.ombros.status, 'warn');
// Cabeça anteriorizada nas duas laterais (espelhadas) dá o mesmo CVA
const a = get('latD', { tragus: [0.03, 0] }).cva, b = get('latE', { tragus: [-0.03, 0] }).cva;
near(a.v, b.v, 0.01, 'CVA espelhado'); assert(a.v < 45 && a.status === 'bad', 'anteriorização ' + a.v);
// Joelho atrás da linha trocânter–maléolo = hiperextensão (lateral D, anterior = +x)
m = get('latD', { joelho: [-0.03, 0] }); assert.equal(m.joelho.text, 'Hiperextensão (recurvato)');
m = get('latE', { joelho: [0.03, 0] }); assert.equal(m.joelho.text, 'Hiperextensão (recurvato)');
// Joelho direito deslocado para fora = varo; calcâneo D para fora = valgo
m = get('front', { joelhoD: [-0.04, 0] }); assert.equal(m.qD.text, 'Varo');
m = get('back', { calcD: [0.015, 0] }); assert.equal(m.calcD.text, 'Valgo');
m = get('back', { calcD: [-0.015, 0] }); assert.equal(m.calcD.text, 'Varo');
// Calibração: 100 cm de régua
const P = tplPoints('front', W, H); P.acromioD.y += 20;
const ms = VIEWS.front.measures(P, 200 / 100); near(ms.find(x => x.key === 'ombros_cm').v, 10, 1e-9, 'cm');
console.log('Todas as medidas conferem.');
