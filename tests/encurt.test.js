// Testes de encurtamento: vistas, pontos-modelo e medidas — node tests/encurt.test.js
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { console, Math, Number, String, JSON }; vm.createContext(ctx);
const src = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
vm.runInContext(src('core.js') + '\n' + src('views.js') + '\n' + src('encurt.js') + ';this.VIEWS=VIEWS;this.KINDS=KINDS;this.REF_ART=REF_ART;this.tplPoints=tplPoints;this.explain=explain;', ctx);
const { VIEWS, KINDS, REF_ART, tplPoints, explain } = ctx;
const K = KINDS.encurt;
assert.equal(K.views.length, 18);
for (const s of K.views) {
  const V = VIEWS[s]; assert(V, 'vista ' + s);
  assert(REF_ART[s] && REF_ART[s].startsWith('<svg'), 'desenho ' + s);
  for (const [k] of V.points) assert(V.tpl[k], `${s}: ponto-modelo ${k}`);
  const P = tplPoints(V, 1000, 1000), ms = V.measures(P, null);
  assert(ms.length >= 2, s + ' medidas');
  for (const m of ms) { assert(Number.isFinite(m.v), `${s}/${m.key} numérico`); assert(explain(m), `${s}/${m.key} explicação`); }
  // pontos detectados (MediaPipe) viram os mesmos nomes
  const L = Array.from({ length: 33 }, (_, i) => ({ x: 100 + i * 7, y: 50 + i * 11 }));
  if (!V.derive) continue;
  const D = V.derive(L, 1000, 1000, []); for (const [k] of V.points) assert(D[k], `${s}: derive ${k}`);
}
for (const k of ['front', 'back', 'latD', 'latE']) assert(REF_ART[k].startsWith('<svg'));
// posição-modelo deve sair "dentro do esperado" nas medidas de alinhamento
const st = s => Object.fromEntries(VIEWS[s].measures(tplPoints(VIEWS[s], 1000, 1000)).map(m => [m.key, m]));
assert.equal(st('encSlrD').encSlr.status, 'ok', 'SLR modelo');
assert.equal(st('encSlrE').encSlrJoelho.status, 'ok');
assert.equal(st('encSentUniD').encJoelhoExt.status, 'ok');
assert.equal(st('encSentUniD').encAlcanceRel.status, 'ok');
assert.equal(st('encPronoD').encElyQuadril.status, 'ok');
assert.equal(st('encUnipD').encPelveUni.status, 'ok');
assert.equal(st('encBracosE').encBracoElev.status, 'ok');
// queda da pelve do lado sem apoio = Trendelenburg positivo
const V = VIEWS.encUnipD, P = tplPoints(V, 1000, 1000); P.eiasE = { x: P.eiasE.x, y: P.eiasE.y + 40 };
const pel = V.measures(P).find(m => m.key === 'encPelveUni');
assert.notEqual(pel.status, 'ok'); assert(/Trendelenburg positivo/.test(pel.text));
console.log('encurtamentos: todos os testes passaram');
