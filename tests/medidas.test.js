// Testes das fórmulas de medida — rode com: node tests/medidas.test.js
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { console, module: undefined };
vm.createContext(ctx);
const src = ['core', 'views', 'exercises', 'content'].map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8')).join('\n');
vm.runInContext(src + '\n;Object.assign(this,{VIEWS,KINDS,ROM_PRESETS,ROM_TYPES,romView,tplPoints,explain,classifyPosture,exercisesFor,findings,PHI,EXERCISES,FINDING_EX});', ctx);
const { VIEWS, KINDS, ROM_PRESETS, romView, tplPoints, explain, classifyPosture, exercisesFor, PHI, EXERCISES, FINDING_EX } = ctx;

const W = 600, H = 800;
const mk = (vk, shift = {}, unit = 0.9 * H) => {
  const P = tplPoints(VIEWS[vk], W, H);
  for (const k in shift) { P[k].x += shift[k][0] * unit; P[k].y += shift[k][1] * unit; }
  return P;
};
const get = (vk, shift, sc = null, unit) => Object.fromEntries(VIEWS[vk].measures(mk(vk, shift, unit), sc).map(m => [m.key, m]));
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} ≠ ${b}`);
let n = 0; const t = (name, fn) => { fn(); n++; };

t('todas as vistas: posição-modelo calcula e fica dentro da referência nas medidas principais', () => {
  for (const vk in VIEWS) {
    const ms = VIEWS[vk].measures(tplPoints(VIEWS[vk], W, H), null);
    assert(ms.length > 0, vk);
    for (const m of ms) assert(Number.isFinite(m.v), `${vk}.${m.key} não é número`);
  }
  const f = get('front'); for (const k of ['cabeca', 'ombros', 'pelve', 'qD', 'qE', 'rotD', 'rotE', 'eixo']) assert.equal(f[k].status, 'ok', 'front.' + k);
  for (const vk of ['latD', 'latE']) { const m = get(vk); for (const k of ['cva', 'pelveSag', 'troncoSag', 'joelhoSag', 'corpo']) assert.equal(m[k].status, 'ok', vk + '.' + k); }
});

t('vista anterior: ombro 3° mais baixo, valgo/varo, rotação do pé', () => {
  const dx = (0.615 - 0.385) * 0.9 * H, dy = Math.tan(3 / 180 * Math.PI) * dx;
  let m = get('front', { acromioD: [0, dy / (0.9 * H)] });
  near(m.ombros.v, 3, 0.01, 'ombro 3°'); assert.equal(m.ombros.text, 'Ombro direito mais baixo'); assert.equal(m.ombros.status, 'warn');
  assert.equal(get('front', { joelhoD: [-0.04, 0] }).qD.text, 'Varo');
  assert.equal(get('front', { peD: [-0.03, 0] }).rotD.text, 'Rotação externa');
  assert.equal(get('front', { peD: [0.03, 0] }).rotD.text, 'Rotação interna');
});

t('laterais espelhadas dão o mesmo resultado; recurvato e CVA', () => {
  const a = get('latD', { tragus: [0.03, 0] }).cva, b = get('latE', { tragus: [-0.03, 0] }).cva;
  near(a.v, b.v, 0.01, 'CVA espelhado'); assert(a.v < 45 && a.status === 'bad');
  assert.equal(get('latD', { joelho: [-0.03, 0] }).joelhoSag.text, 'Hiperextensão (recurvato)');
  assert.equal(get('latE', { joelho: [0.03, 0] }).joelhoSag.text, 'Hiperextensão (recurvato)');
  assert.equal(get('back', { calcD: [0.015, 0] }).calcD.text, 'Valgo');
});

t('teste de Adams: ATR, lado da gibosidade e limiar de encaminhamento', () => {
  const P = tplPoints(VIEWS.adamsPost, W, H), dx = P.torD.x - P.torE.x;
  const at = deg => { const Q = JSON.parse(JSON.stringify(P)); Q.torD.y = Q.torE.y - Math.tan(deg * Math.PI / 180) * dx; return VIEWS.adamsPost.measures(Q, null).find(m => m.key === 'atrTor'); };
  near(at(4).v, 4, 1e-6, 'ATR 4°'); assert.equal(at(4).status, 'ok');
  assert.equal(at(6).status, 'warn'); assert.equal(at(7.5).status, 'bad');
  assert.equal(at(6).text, 'Gibosidade à direita');
  assert(/encaminha/i.test(explain(at(8))), 'texto de encaminhamento');
  // regiões opcionais só aparecem quando marcadas
  const Q = { torE: P.torE, torD: P.torD };
  assert.deepEqual(VIEWS.adamsPost.measures(Q, null).map(m => m.key), ['atrTor']);
});

t('flexão anterior: dedo–chão em cm com régua e joelhos estendidos', () => {
  const P = tplPoints(VIEWS.adamsLat, W, H);
  const ms = Object.fromEntries(VIEWS.adamsLat.measures(P, 4).map(m => [m.key, m]));
  near(ms.dedoChao.v, (P.chao.y - P.dedo.y) / 4, 1e-9, 'cm');
  assert.equal(ms.joelhoFlex.status, 'ok');
  assert(ms.troncoCoxa.v > 0 && ms.troncoCoxa.v < 90);
  const noSc = Object.fromEntries(VIEWS.adamsLat.measures(P, null).map(m => [m.key, m]));
  assert(noSc.dedoChaoRel && !noSc.dedoChao);
});

t('POTSI: tronco simétrico = 0; desvio de C7 aumenta o índice', () => {
  near(get('potsi').potsi.v, 0, 1e-9, 'simétrico');
  const m = get('potsi', { c7: [0.05, 0] }, null, W);
  assert(m.faiTop.v > 5 && m.potsi.v > 5);
  const atsi = get('atsi', { ombroD: [0, 0.05] }, null, H);
  assert(atsi.hdiS.v > 0 && atsi.atsi.v > 0);
});

t('proporção áurea: modelo em φ; razões corretas', () => {
  const m = get('aurea');
  near(m.aureaAltura.v, PHI, 0.01, 'altura/umbigo'); near(m.aureaUmbigo.v, PHI, 0.01, 'umbigo');
  assert.equal(m.aureaAltura.status, 'ok');
});

t('simetria facial: rosto simétrico e desvio do mento', () => {
  const m = get('face'); assert.equal(m.simFacial.status, 'ok'); near(m.desvMento.v, 0, 1e-9, 'mento');
  const d = get('face', { mento: [0.03, 0] }, null, W); assert(d.desvMento.v > 5); assert(/esquerda/.test(d.desvMento.text));
  const tot = m.terco1.v + m.terco2.v + m.terco3.v; near(tot, 100, 1e-6, 'terços somam 100%');
});

t('joelhos: valgo e distâncias em cm', () => {
  const m = get('joelhosF', {}, 2); assert(m.intercondilar && m.intermaleolar);
  assert.equal(get('joelhosF', { joelhoD: [0.04, 0] }, null, W).femtibD.text, 'Valgo');
});

t('cabeça e pescoço: CVA e ângulo do ombro', () => {
  const m = get('hnLat'); assert.equal(m.cva.status, 'ok'); assert(m.anguloOmbro.v > 52);
  const f = get('hnLat', { acromio: [0.12, -0.05] }, null, W); assert(f.anguloOmbro.v < 52);
});

t('goniômetro: tipos de ângulo', () => {
  const def = ROM_PRESETS.find(r => r.id === 'joelhoFlex'), V = romView(def);
  const P = { a: { x: 0, y: 0 }, b: { x: 0, y: 100 }, c: { x: 100, y: 100 } };   // ângulo reto no joelho
  near(V.measures(P)[0].v, 90, 1e-9, 'flexão 90°'); assert.equal(V.measures(P)[0].status, 'bad');
  const vert = romView(ROM_PRESETS.find(r => r.id === 'cervIncl'));
  near(vert.measures({ a: { x: 0, y: 100 }, b: { x: 100, y: 0 } })[0].v, 45, 1e-9, 'inclinação 45°');
  const rot = romView(ROM_PRESETS.find(r => r.id === 'cervRot'));
  near(rot.measures({ a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c: { x: 50, y: 50 }, d: { x: 100, y: 0 } })[0].v, 45, 1e-9, 'rotação 45°');
  const custom = romView({ id: 'c_x', label: 'Poplíteo', type: 'ang3', normal: 0, pts: ['A', 'B', 'C'] });
  assert.equal(custom.measures(P)[0].status, 'na');
});

t('classificação postural e exercícios ligados aos achados', () => {
  const a = { kind: 'postural', views: { latD: { img: 'x', points: mk('latD', { eias: [0, 0.03], tragus: [0.03, 0] }) } } };
  assert.equal(classifyPosture(a).tipo, 'Cifolordótica');
  const ok = { kind: 'postural', views: { latD: { img: 'x', points: mk('latD') } } };
  assert.equal(classifyPosture(ok).tipo, 'Próxima do alinhamento ideal');
  const ex = exercisesFor([{ m: { key: 'cva', label: 'Ângulo craniovertebral' } }]);
  assert(ex.some(e => e.id === 'retracao'));
  for (const k in FINDING_EX) for (const id of FINDING_EX[k]) assert(EXERCISES.find(e => e.id === id), 'exercício inexistente: ' + id);
});

t('todos os tipos de avaliação apontam para vistas existentes', () => {
  assert(KINDS.postural.views.includes('adamsPost') && KINDS.postural.views.includes('adamsLat'), 'avaliação completa inclui a flexão anterior de tronco');
  for (const k in KINDS) for (const v of KINDS[k].views || []) assert(VIEWS[v], k + '→' + v);
});

console.log(`${n} grupos de testes passaram.`);

// ---------- análise de vídeo: repetições e relatório ----------
{
  const vctx = { console, SCREENS: {}, module: undefined };
  vm.createContext(vctx);
  vm.runInContext(['core', 'views', 'exercises', 'video'].map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8')).join('\n') + '\n;Object.assign(this,{detectReps,movementReport,VMOVES,fppa});', vctx);
  const times = [...Array(150)].map((_, i) => i / 15);   // 10 s a 15 qps
  const reps3 = times.map(t => t < 1 ? 0 : t > 9.5 ? 0 : 75 - 75 * Math.cos((t - 1) / 8.5 * 3 * 2 * Math.PI)); // 3 repetições, pico 150°
  const R = vctx.movementReport({ move: 'ombroFlex', series: { p: reps3, c: times.map(() => 5) }, times, conf: 0.9 });
  assert.equal(R.reps.length, 3, 'conta 3 repetições');
  near(R.best, 150, 0.5, 'pico'); near(R.pct, 150 / 180 * 100, 0.5, '% do normal'); assert.equal(R.status, 'warn');
  assert(R.cv < 2, 'repetições regulares');
  const comp = R.items.find(i => /tronco/.test(i.label)); assert.equal(comp.status, 'ok');
  const R2 = vctx.movementReport({ move: 'ombroFlex', series: { p: reps3, c: times.map((t) => t * 2) }, times });
  assert.equal(R2.items.find(i => /tronco/.test(i.label)).status, 'bad', 'compensação de tronco detectada');
  // valgo dinâmico: joelho direito para dentro
  const P = { quadrilD: { x: 40, y: 50 }, joelhoD: { x: 48, y: 80 }, tornozeloD: { x: 40, y: 110 }, joelhoE: { x: 60, y: 80 } };
  assert(vctx.fppa(P, 'D') > 0, 'FPPA positivo = valgo');
  n++;
}
console.log('Análise de vídeo conferida.');
