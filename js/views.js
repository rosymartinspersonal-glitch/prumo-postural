/* Prumo Postural — vistas, pontos anatômicos, medidas e tipos de avaliação.
   Cada vista define:
   points  [chave, nome, opcional?]
   tpl     posição-modelo (frame 'body' = unidades da altura do corpo; 'image' = fração da foto)
   detect  'pose' | 'face' | null, e derive(L) para converter os pontos do MediaPipe
   lines / levels / plumb / axis / face / extra  desenho
   measures(P, escala)  lista de medidas                                                     */
'use strict';

const opt = true;
const has = (P, ...ks) => ks.every(k => P[k]);

/* ---------- avaliação postural: 4 vistas ---------- */
const VIEWS = {
  front: {
    label: 'Anterior', short: 'Frente', detect: 'pose',
    hint: 'Paciente de frente para a câmera, braços ao longo do corpo, pés na largura do quadril. Câmera parada na altura do umbigo, a cerca de 3 m, sem zoom.',
    points: [['olhoD', 'Olho direito'], ['olhoE', 'Olho esquerdo'], ['nariz', 'Ponta do nariz'], ['acromioD', 'Acrômio direito'], ['acromioE', 'Acrômio esquerdo'],
      ['eiasD', 'EIAS direita'], ['eiasE', 'EIAS esquerda'], ['joelhoD', 'Centro da patela direita'], ['joelhoE', 'Centro da patela esquerda'],
      ['tornD', 'Tornozelo direito (centro)'], ['tornE', 'Tornozelo esquerdo (centro)'], ['peD', '2º dedo do pé direito', opt], ['peE', '2º dedo do pé esquerdo', opt]],
    tpl: { olhoD: [.47, .065], olhoE: [.53, .065], nariz: [.5, .08], acromioD: [.385, .19], acromioE: [.615, .19], eiasD: [.40, .47], eiasE: [.60, .47], joelhoD: [.445, .70], joelhoE: [.555, .70], tornD: [.45, .94], tornE: [.55, .94], peD: [.44, .99], peE: [.56, .99] },
    derive(L) {
      const mh = mid(L[23], L[24]), ms = mid(L[11], L[12]), T = mh.y - ms.y;
      const eias = h => ({ x: h.x + (h.x - mh.x) * 0.35, y: h.y - 0.10 * T });
      return { olhoD: L[5], olhoE: L[2], nariz: L[0], acromioD: L[12], acromioE: L[11], eiasD: eias(L[24]), eiasE: eias(L[23]), joelhoD: L[26], joelhoE: L[25], tornD: L[28], tornE: L[27], peD: L[32], peE: L[31] };
    },
    lines: [['olhoD', 'olhoE'], ['acromioD', 'acromioE'], ['eiasD', 'eiasE'], ['eiasD', 'joelhoD'], ['joelhoD', 'tornD'], ['eiasE', 'joelhoE'], ['joelhoE', 'tornE'], ['tornD', 'peD'], ['tornE', 'peE']],
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
      for (const s of ['D', 'E']) {
        if (!has(P, 'pe' + s)) continue;
        const t = P['torn' + s], p = P['pe' + s];
        const a = fromV(t, p), ext = Math.abs(p.x - mx) > Math.abs(t.x - mx);
        const sv = ext ? a : -a;
        out.push(M('rot' + s, `Rotação do pé ${sideTxt(s)}`, sv, { ok: [3, 18], warn: [0, 25], disp: a, ref: '3° a 18° de rotação externa', at: 'pe' + s, text: a < 0.5 ? 'Neutro' : ext ? 'Rotação externa' : 'Rotação interna' }));
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
    label: 'Posterior', short: 'Costas', detect: 'pose',
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
      out.push(M('troncoLat', 'Desvio do tronco (C7–sacro)', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'c7', text: v < 0.5 ? 'Alinhado' : 'Desviado para a ' + (P.c7.x > sac.x ? 'direita' : 'esquerda') }));
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
  const tplD = { tragus: [.505, .07], c7: [.455, .135], acromio: [.49, .19], manubrio: [.555, .215], rebordo: [.575, .36], eias: [.56, .45], eips: [.43, .43], trocanter: [.49, .50], joelho: [.492, .71], maleolo: [.49, .94], pe: [.58, .975] };
  const tpl = {}; for (const k in tplD) tpl[k] = r ? tplD[k] : [1 - tplD[k][0], tplD[k][1]];
  const dirOf = P => Math.sign(P.pe.x - P.maleolo.x) || (r ? 1 : -1);
  return {
    label: 'Lateral ' + (r ? 'direita' : 'esquerda'), short: 'Lat. ' + side, detect: 'pose', side,
    hint: `Lado ${r ? 'direito' : 'esquerdo'} do paciente voltado para a câmera, braços cruzados à frente do tronco ou relaxados sem cobrir a pelve. Olhar para o horizonte.`,
    points: [['tragus', 'Trágus'], ['c7', 'Processo espinhoso de C7'], ['acromio', 'Acrômio'], ['eias', 'EIAS'], ['eips', 'EIPS'], ['trocanter', 'Trocânter maior'],
      ['joelho', 'Linha articular do joelho'], ['maleolo', 'Maléolo lateral'], ['pe', 'Cabeça do 5º metatarso'], ['manubrio', 'Manúbrio do esterno', opt], ['rebordo', 'Rebordo costal inferior', opt]],
    tpl,
    derive(L) {
      const dir = Math.sign(L[I.foot].x - L[I.heel].x) || (r ? 1 : -1);
      const sh = L[I.sh], hip = L[I.hip], T = Math.abs(hip.y - sh.y);
      return { tragus: L[I.ear], c7: { x: sh.x - dir * 0.09 * T, y: sh.y - 0.12 * T }, acromio: sh, trocanter: hip,
        eias: { x: hip.x + dir * 0.22 * T, y: hip.y - 0.16 * T }, eips: { x: hip.x - dir * 0.20 * T, y: hip.y - 0.20 * T },
        joelho: L[I.knee], maleolo: L[I.ank], pe: L[I.foot], manubrio: { x: sh.x + dir * 0.2 * T, y: sh.y + 0.05 * T }, rebordo: { x: sh.x + dir * 0.26 * T, y: sh.y + 0.55 * T } };
    },
    lines: [['c7', 'tragus'], ['eips', 'eias'], ['acromio', 'trocanter'], ['trocanter', 'joelho'], ['joelho', 'maleolo'], ['maleolo', 'pe'], ['manubrio', 'rebordo']],
    levels: [],
    plumb: P => P.maleolo,
    axis: P => [P.maleolo, P.acromio],
    hlines: P => [[P.c7, dirOf(P), dist(P.c7, P.tragus) * 1.3]],
    dirOf,
    face: P => { const d = dirOf(P); return { c: { x: P.tragus.x + d * dist(P.tragus, P.c7) * 0.8, y: P.tragus.y }, r: dist(P.tragus, P.c7) * 0.75 }; },
    measures(P, sc) {
      const out = [], dir = dirOf(P);
      let v = Math.atan2(P.c7.y - P.tragus.y, (P.tragus.x - P.c7.x) * dir) * DEG;
      out.push(M('cva', 'Ângulo craniovertebral', v, { ok: [50, 90], warn: [45, 90], ref: '≥ 50°', at: 'tragus', text: v < 50 ? 'Anteriorização da cabeça' : 'Adequado' }));
      v = Math.atan2(P.eias.y - P.eips.y, Math.abs(P.eias.x - P.eips.x)) * DEG;
      out.push(M('pelveSag', 'Inclinação pélvica (EIAS–EIPS)', v, { ok: [4, 15], warn: [0, 20], ref: '4° a 15° de anteversão', at: 'eias', text: v > 15 ? 'Anteversão aumentada' : v < 4 ? 'Tendência à retroversão' : 'Anteversão fisiológica' }));
      v = Math.atan2((P.acromio.x - P.trocanter.x) * dir, P.trocanter.y - P.acromio.y) * DEG;
      out.push(M('troncoSag', 'Alinhamento do tronco (acrômio–trocânter)', v, { ok: [-5, 5], warn: [-8, 8], disp: Math.abs(v), ref: '≤ 5°', at: 'acromio', text: Math.abs(v) < 0.5 ? 'Vertical' : v > 0 ? 'Projeção anterior' : 'Projeção posterior' }));
      const dev = 180 - interior(P.trocanter, P.joelho, P.maleolo), xl = xOnLine(P.trocanter, P.maleolo, P.joelho.y);
      const sv = (P.joelho.x - xl) * dir < 0 ? dev : -dev;
      out.push(M('joelhoSag', 'Ângulo do joelho', sv, { ok: [-5, 5], warn: [-10, 10], disp: Math.abs(sv), ref: '≤ 5°', at: 'joelho', text: Math.abs(sv) < 1 ? 'Neutro' : sv > 0 ? 'Hiperextensão (recurvato)' : 'Flexo' }));
      v = Math.atan2((P.acromio.x - P.maleolo.x) * dir, P.maleolo.y - P.acromio.y) * DEG;
      out.push(M('corpo', 'Alinhamento corporal (acrômio–maléolo)', v, { ok: [-1, 4], warn: [-3, 6], disp: Math.abs(v), ref: '0° a 3° anterior', at: 'maleolo', text: Math.abs(v) < 0.5 ? 'Vertical' : v > 0 ? 'Inclinação anterior' : 'Inclinação posterior' }));
      if (has(P, 'manubrio', 'rebordo')) {
        v = Math.atan2((P.rebordo.x - P.manubrio.x) * dir, P.rebordo.y - P.manubrio.y) * DEG;
        out.push(M('torax', 'Inclinação do tórax (manúbrio–rebordo)', v, { ref: 'acompanhar evolução', at: 'rebordo', disp: Math.abs(v), text: v > 0 ? 'Tórax inclinado para trás (rebordo à frente)' : 'Tórax inclinado para a frente' }));
      }
      if (sc) out.push(M('cabeca_cm', 'Distância horizontal trágus–acrômio', (P.tragus.x - P.acromio.x) * dir / sc, { unit: 'cm', ref: 'acompanhar evolução', text: 'Positivo = cabeça à frente do ombro' }));
      return out;
    }
  };
}
VIEWS.latD = lateralView('D');
VIEWS.latE = lateralView('E');

/* ---------- flexão anterior de tronco: teste de Adams e flexibilidade ---------- */
VIEWS.adamsPost = {
  label: 'Adams — vista posterior', short: 'Adams', detect: null, frame: 'image',
  hint: 'Paciente de costas, pés juntos, joelhos estendidos, flete o tronco à frente até ~90° com braços pendentes e palmas unidas. Câmera atrás, na altura das costas, mirando ao longo da coluna. Fotografe cada região na altura da maior gibosidade.',
  points: [['torE', 'Torácica — ponto mais alto à esquerda'], ['torD', 'Torácica — ponto mais alto à direita'],
    ['tlE', 'Toracolombar — mais alto à esquerda', opt], ['tlD', 'Toracolombar — mais alto à direita', opt],
    ['lomE', 'Lombar — mais alto à esquerda', opt], ['lomD', 'Lombar — mais alto à direita', opt]],
  tpl: { torE: [.36, .41], torD: [.64, .41], tlE: [.38, .52], tlD: [.62, .51], lomE: [.40, .62], lomD: [.60, .62] },
  lines: [['torE', 'torD'], ['tlE', 'tlD'], ['lomE', 'lomD']],
  levels: [['torE', 'torD'], ['tlE', 'tlD'], ['lomE', 'lomD']],
  plumb: null, axis: null, face: () => null,
  measures(P, sc) {
    const out = [];
    for (const [k, nome, e, d] of [['atrTor', 'torácica', 'torE', 'torD'], ['atrTL', 'toracolombar', 'tlE', 'tlD'], ['atrLom', 'lombar', 'lomE', 'lomD']]) {
      if (!has(P, e, d)) continue;
      const v = tiltH(P[e], P[d]);
      const lado = P[d].y < P[e].y ? 'direita' : 'esquerda';
      out.push(M(k, `Rotação do tronco (ATR) — ${nome}`, v, { ok: [0, 4.99], warn: [0, 6.99], ref: '< 5°; ≥ 7° indica encaminhamento', at: d, text: v < 1 ? 'Sem gibosidade' : `Gibosidade à ${lado}` }));
      if (sc) out.push(M(k + '_cm', `Altura da gibosidade — ${nome}`, Math.abs(P[d].y - P[e].y) / sc, { unit: 'cm', ok: [0, 0.5], warn: [0, 1], ref: '≤ 0,5 cm' }));
    }
    return out;
  }
};
VIEWS.adamsLat = {
  label: 'Flexão anterior — vista lateral', short: 'Flexão', detect: 'pose', frame: 'image',
  hint: 'Paciente de lado para a câmera, pés juntos e joelhos estendidos, desce o tronco o máximo que conseguir com os braços pendentes. Use a régua para obter a distância dedo–chão em cm.',
  points: [['c7', 'Processo espinhoso de C7'], ['apice', 'Ápice da curva dorsal (ponto mais alto das costas)', opt], ['sacro', 'Sacro (S2 / EIPS)'], ['trocanter', 'Trocânter maior'],
    ['joelho', 'Linha articular do joelho'], ['maleolo', 'Maléolo lateral'], ['dedo', 'Ponta do 3º dedo da mão'], ['chao', 'Chão abaixo dos dedos']],
  tpl: { sacro: [.36, .33], apice: [.52, .30], c7: [.68, .52], trocanter: [.34, .43], joelho: [.345, .67], maleolo: [.35, .92], dedo: [.62, .84], chao: [.62, .95] },
  derive(L, w, h, V) {
    const r = (V[24] || 0) + (V[26] || 0) >= (V[23] || 0) + (V[25] || 0);
    const I = r ? { sh: 12, hip: 24, knee: 26, ank: 28, heel: 30, foot: 32, idx: 20 } : { sh: 11, hip: 23, knee: 25, ank: 27, heel: 29, foot: 31, idx: 19 };
    const sh = L[I.sh], hip = L[I.hip], T = dist(sh, hip);
    return { c7: lerp(hip, sh, 1.08), sacro: { x: hip.x - Math.sign(sh.x - hip.x) * 0.1 * T, y: hip.y - 0.1 * T }, apice: lerp(hip, sh, 0.6), trocanter: hip, joelho: L[I.knee], maleolo: L[I.ank], dedo: L[I.idx],
      chao: { x: L[I.idx].x, y: Math.max(L[I.heel].y, L[I.foot].y) } };
  },
  lines: [['sacro', 'apice'], ['apice', 'c7'], ['trocanter', 'joelho'], ['joelho', 'maleolo'], ['dedo', 'chao']],
  levels: [], plumb: null, axis: P => [P.sacro, P.c7], face: () => null,
  measures(P, sc) {
    const out = [];
    const trunk = { x: P.c7.x - P.sacro.x, y: P.c7.y - P.sacro.y }, thigh = { x: P.joelho.x - P.trocanter.x, y: P.joelho.y - P.trocanter.y };
    let v = vecAngle(trunk, thigh);
    out.push(M('troncoCoxa', 'Ângulo tronco–coxa', v, { ok: [0, 70], warn: [0, 90], ref: '≤ 70° (quanto menor, maior a flexibilidade)', at: 'trocanter', text: v <= 70 ? 'Boa flexibilidade de cadeia posterior' : v <= 90 ? 'Flexibilidade reduzida' : 'Flexibilidade muito reduzida' }));
    v = Math.atan2(P.c7.y - P.sacro.y, Math.abs(P.c7.x - P.sacro.x)) * DEG;
    out.push(M('flexTronco', 'Inclinação do tronco (sacro–C7 abaixo da horizontal)', v, { ref: 'acompanhar evolução', at: 'c7', text: v > 0 ? 'Tronco abaixo da horizontal' : 'Tronco acima da horizontal' }));
    const kd = 180 - interior(P.trocanter, P.joelho, P.maleolo);
    out.push(M('joelhoFlex', 'Extensão dos joelhos durante o teste', kd, { ok: [0, 5], warn: [0, 10], ref: '≤ 5° (joelhos estendidos)', at: 'joelho', text: kd <= 5 ? 'Joelhos estendidos' : 'Joelhos fletidos — o teste perde validade' }));
    if (has(P, 'apice')) {
      v = 180 - interior(P.sacro, P.apice, P.c7);
      out.push(M('curvaDorsal', 'Curvatura dorsal na flexão (sacro–ápice–C7)', v, { ref: 'acompanhar evolução; curva harmônica sem angulação', at: 'apice', text: 'Arco formado pela coluna' }));
    }
    const dd = P.chao.y - P.dedo.y;
    if (sc) out.push(M('dedoChao', 'Distância dedo–chão', dd / sc, { unit: 'cm', ok: [-40, 5], warn: [-40, 15], ref: '≤ 5 cm (negativo = ultrapassou o chão)', at: 'dedo', text: dd <= 0 ? 'Alcançou o chão' : 'Não alcançou o chão' }));
    else {
      const leg = dist(P.trocanter, P.maleolo) || 1;
      out.push(M('dedoChaoRel', 'Distância dedo–chão (% do comprimento da perna)', dd / leg * 100, { unit: '%', ref: 'use a régua para obter em cm', at: 'dedo', text: dd <= 0 ? 'Alcançou o chão' : 'Não alcançou o chão' }));
    }
    return out;
  }
};

/* ---------- cabeça e pescoço ---------- */
VIEWS.hnLat = {
  label: 'Cabeça e pescoço — lateral', short: 'Perfil', detect: 'pose', frame: 'image',
  hint: 'Foto de perfil do tronco superior, paciente sentado ou em pé, olhando para o horizonte. Enquadre da cintura para cima.',
  points: [['tragus', 'Trágus'], ['canto', 'Canto lateral do olho'], ['c7', 'Processo espinhoso de C7'], ['acromio', 'Acrômio']],
  tpl: { tragus: [.52, .30], canto: [.63, .27], c7: [.42, .50], acromio: [.50, .66] },
  derive(L, w, h, V) {
    const r = (V[8] || 0) >= (V[7] || 0);
    const ear = r ? L[8] : L[7], eye = r ? L[6] : L[3], sh = r ? L[12] : L[11];
    const dir = Math.sign(eye.x - ear.x) || 1, T = Math.abs(sh.y - ear.y);
    return { tragus: ear, canto: eye, c7: { x: sh.x - dir * 0.3 * T, y: sh.y - 0.35 * T }, acromio: sh };
  },
  lines: [['c7', 'tragus'], ['tragus', 'canto'], ['c7', 'acromio']],
  levels: [], plumb: P => P.acromio, axis: null,
  dirOf: P => Math.sign(P.canto.x - P.tragus.x) || 1,
  hlines: P => { const d = Math.sign(P.canto.x - P.tragus.x) || 1; return [[P.c7, d, dist(P.c7, P.tragus) * 1.3], [P.tragus, d, dist(P.tragus, P.canto) * 1.4]]; },
  face: P => ({ c: lerp(P.tragus, P.canto, .7), r: dist(P.tragus, P.canto) * 0.9 }),
  measures(P, sc) {
    const out = [], d = Math.sign(P.canto.x - P.tragus.x) || 1;
    let v = Math.atan2(P.c7.y - P.tragus.y, (P.tragus.x - P.c7.x) * d) * DEG;
    out.push(M('cva', 'Ângulo craniovertebral', v, { ok: [50, 90], warn: [45, 90], ref: '≥ 50°', at: 'tragus', text: v < 50 ? 'Anteriorização da cabeça' : 'Adequado' }));
    v = Math.atan2(P.tragus.y - P.canto.y, (P.canto.x - P.tragus.x) * d) * DEG;
    out.push(M('inclCraniana', 'Inclinação da cabeça (trágus–canto do olho)', v, { ok: [8, 22], warn: [4, 26], ref: '8° a 22°', at: 'canto', text: v > 22 ? 'Cabeça em extensão (olhar elevado)' : v < 8 ? 'Cabeça em flexão (olhar baixo)' : 'Neutra' }));
    v = 180 - interior(P.c7, P.tragus, P.canto);
    out.push(M('rotCraniana', 'Rotação craniana (C7–trágus–canto do olho)', interior(P.c7, P.tragus, P.canto), { ref: 'acompanhar evolução', at: 'c7', text: 'Ângulo entre pescoço e face' }));
    v = Math.atan2(P.acromio.y - P.c7.y, (P.acromio.x - P.c7.x) * d) * DEG;
    out.push(M('anguloOmbro', 'Ângulo do ombro (C7–acrômio)', v, { ok: [52, 120], warn: [47, 120], ref: '≥ 52°', at: 'acromio', text: v < 52 ? 'Ombro anteriorizado (protrusão)' : 'Adequado' }));
    const fhi = (P.tragus.x - P.acromio.x) * d / (Math.abs(P.acromio.y - P.tragus.y) || 1) * 100;
    out.push(M('fhpIndex', 'Índice de anteriorização da cabeça', fhi, { unit: '%', ok: [-100, 20], warn: [-100, 35], ref: '≤ 20% (deslocamento ÷ altura do pescoço)', text: fhi > 20 ? 'Cabeça à frente do ombro' : 'Cabeça alinhada ao ombro' }));
    if (sc) out.push(M('cabeca_cm', 'Distância horizontal trágus–acrômio', (P.tragus.x - P.acromio.x) * d / sc, { unit: 'cm', ok: [-10, 3], warn: [-10, 5], ref: '≤ 3 cm', text: 'Positivo = cabeça à frente do ombro' }));
    return out;
  }
};
VIEWS.hnFront = {
  label: 'Cabeça e pescoço — frontal', short: 'Frente', detect: 'pose', frame: 'image',
  hint: 'Foto de frente do tronco superior, ombros relaxados, olhando para a câmera. Enquadre da cintura para cima.',
  points: [['olhoD', 'Olho direito'], ['olhoE', 'Olho esquerdo'], ['nariz', 'Ponta do nariz'], ['mento', 'Mento (queixo)'], ['jugular', 'Incisura jugular'], ['acromioD', 'Acrômio direito'], ['acromioE', 'Acrômio esquerdo']],
  tpl: { olhoD: [.44, .25], olhoE: [.56, .25], nariz: [.5, .31], mento: [.5, .42], jugular: [.5, .6], acromioD: [.27, .68], acromioE: [.73, .68] },
  derive(L) {
    const ms = mid(L[11], L[12]), mouth = mid(L[9], L[10]), sw = dist(L[11], L[12]);
    return { olhoD: L[5], olhoE: L[2], nariz: L[0], mento: lerp(L[0], mouth, 2.1), jugular: { x: ms.x, y: ms.y - 0.06 * sw }, acromioD: L[12], acromioE: L[11] };
  },
  lines: [['olhoD', 'olhoE'], ['acromioD', 'acromioE'], ['jugular', 'mento']],
  levels: [['olhoD', 'olhoE'], ['acromioD', 'acromioE']],
  plumb: P => P.jugular, axis: P => [P.jugular, P.nariz],
  face: P => ({ c: mid(P.nariz, mid(P.olhoD, P.olhoE)), r: dist(P.olhoD, P.olhoE) * 1.3 }),
  measures(P) {
    const out = [];
    let v = tiltH(P.olhoD, P.olhoE);
    out.push(M('cabeca', 'Inclinação lateral da cabeça', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'olhoE', text: v < 0.5 ? 'Nivelada' : 'Inclinada para a ' + (P.olhoD.y > P.olhoE.y ? 'direita' : 'esquerda') }));
    v = fromV(P.jugular, P.nariz);
    out.push(M('desvioCabeca', 'Desvio lateral da cabeça (incisura jugular–nariz)', v, { ok: [0, 3], warn: [0, 6], ref: '≤ 3°', at: 'nariz', text: v < 0.5 ? 'Centrada' : 'Deslocada para a ' + (P.nariz.x < P.jugular.x ? 'direita' : 'esquerda') }));
    v = tiltH(P.acromioD, P.acromioE);
    out.push(M('ombros', 'Nivelamento dos ombros', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: 'acromioE', text: v < 0.5 ? 'Nivelados' : 'Ombro ' + (P.acromioD.y > P.acromioE.y ? 'direito' : 'esquerdo') + ' mais baixo' }));
    const dD = Math.abs(P.jugular.x - P.acromioD.x), dE = Math.abs(P.acromioE.x - P.jugular.x);
    v = Math.abs(dD - dE) / (dD + dE) * 100;
    out.push(M('simOmbros', 'Simetria da largura dos ombros', v, { unit: '%', ok: [0, 5], warn: [0, 10], ref: '≤ 5% de diferença', text: v < 1 ? 'Simétricos' : 'Ombro ' + (dD > dE ? 'direito' : 'esquerdo') + ' mais afastado da linha média' }));
    return out;
  }
};

/* ---------- simetria do tronco: POTSI e ATSI ---------- */
function trunkIndex(P, ref, top, sideA, sideB, L) {
  // ref = ponto da linha central (vertical), top = C7 ou incisura jugular
  const cl = P[ref].x, d = k => Math.abs(P[k].x - cl);
  const fai = (a, b) => Math.abs(d(a) - d(b)) / ((d(a) + d(b)) || 1) * 100;
  const hdi = (a, b) => Math.abs(P[a].y - P[b].y) / (L || 1) * 100;
  const faiTop = Math.abs(P[top].x - cl) / ((d('axila' + sideA) + d('axila' + sideB)) || 1) * 100;
  return {
    faiTop, faiA: fai('axila' + sideA, 'axila' + sideB), faiW: fai('cintura' + sideA, 'cintura' + sideB),
    hdiS: hdi('ombro' + sideA, 'ombro' + sideB), hdiA: hdi('axila' + sideA, 'axila' + sideB), hdiW: hdi('cintura' + sideA, 'cintura' + sideB),
    faiQ: P['quadril' + sideA] && P['quadril' + sideB] ? fai('quadril' + sideA, 'quadril' + sideB) : null
  };
}
function trunkMeasures(r, P, kind, top, ref) {
  const out = [], total = r.faiTop + r.faiA + r.faiW + r.hdiS + r.hdiA + r.hdiW;
  if (kind === 'POTSI') out.push(M('potsi', 'POTSI — índice de simetria posterior', total, { unit: 'idx', ok: [0, 27.5], warn: [0, 35], ref: '≤ 27,5', at: top, text: total <= 27.5 ? 'Tronco simétrico' : 'Assimetria de tronco' }));
  else out.push(M('atsi', 'ATSI — índice de simetria anterior', total, { unit: 'idx', ok: [0, 30], warn: [0, 40], ref: '≤ 30 (referência aproximada)', at: top, text: total <= 30 ? 'Tronco simétrico' : 'Assimetria de tronco' }));
  const comp = (k, l, v, okMax) => out.push(M(k, l, v, { unit: 'idx', ok: [0, okMax], warn: [0, okMax * 2], ref: '≤ ' + nf(okMax, 0) }));
  comp('faiTop', `Desvio frontal de ${kind === 'POTSI' ? 'C7' : 'incisura jugular'} (FAI)`, r.faiTop, 5);
  comp('faiA', 'Simetria das axilas (FAI)', r.faiA, 5);
  comp('faiW', 'Simetria da cintura (FAI)', r.faiW, 5);
  if (r.faiQ != null) comp('faiQ', 'Simetria do quadril', r.faiQ, 5);
  comp('hdiS', 'Diferença de altura dos ombros (HDI)', r.hdiS, 5);
  comp('hdiA', 'Diferença de altura das axilas (HDI)', r.hdiA, 5);
  comp('hdiW', 'Diferença de altura da cintura (HDI)', r.hdiW, 5);
  const v = fromV(P[ref], P[top]);
  out.push(M('inclTronco', 'Inclinação lateral do tronco', v, { ok: [0, 2], warn: [0, 4], ref: '≤ 2°', at: ref, text: v < 0.5 ? 'Alinhado' : 'Tronco inclinado' }));
  return out;
}
const trunkDerive = (L, top) => {
  const ms = mid(L[11], L[12]), mh = mid(L[23], L[24]), T = mh.y - ms.y;
  const ax = s => ({ x: s.x + (ms.x - s.x) * 0.18, y: s.y + 0.2 * T }), wa = (s, hp) => { const p = lerp(s, hp, .7); return { x: p.x + (mh.x - p.x) * 0.22, y: p.y }; };
  return { ms, mh, T, ax, wa };
};
VIEWS.potsi = {
  label: 'Tronco posterior (POTSI)', short: 'POTSI', detect: 'pose', frame: 'image',
  hint: 'Paciente de costas, sem camiseta, braços levemente afastados do tronco, cabelo preso. Enquadre da cabeça até o início dos glúteos.',
  points: [['c7', 'Processo espinhoso de C7'], ['fenda', 'Início da prega interglútea'], ['ombroE', 'Ponto mais alto do ombro E'], ['ombroD', 'Ponto mais alto do ombro D'],
    ['axilaE', 'Prega axilar posterior E'], ['axilaD', 'Prega axilar posterior D'], ['cinturaE', 'Ponto mais profundo da cintura E'], ['cinturaD', 'Ponto mais profundo da cintura D'],
    ['quadrilE', 'Ponto mais largo do quadril E', opt], ['quadrilD', 'Ponto mais largo do quadril D', opt]],
  tpl: { c7: [.5, .14], fenda: [.5, .86], ombroE: [.24, .2], ombroD: [.76, .2], axilaE: [.3, .37], axilaD: [.7, .37], cinturaE: [.34, .63], cinturaD: [.66, .63], quadrilE: [.3, .82], quadrilD: [.7, .82] },
  derive(L) {
    const t = trunkDerive(L);
    return { c7: { x: t.ms.x, y: t.ms.y - 0.12 * t.T }, fenda: { x: t.mh.x, y: t.mh.y + 0.05 * t.T }, ombroE: { x: L[11].x, y: L[11].y - 0.03 * t.T }, ombroD: { x: L[12].x, y: L[12].y - 0.03 * t.T },
      axilaE: t.ax(L[11]), axilaD: t.ax(L[12]), cinturaE: t.wa(L[11], L[23]), cinturaD: t.wa(L[12], L[24]),
      quadrilE: { x: L[23].x + (L[23].x - t.mh.x) * 0.5, y: L[23].y }, quadrilD: { x: L[24].x + (L[24].x - t.mh.x) * 0.5, y: L[24].y } };
  },
  lines: [['ombroE', 'ombroD'], ['axilaE', 'axilaD'], ['cinturaE', 'cinturaD'], ['quadrilE', 'quadrilD'], ['c7', 'fenda']],
  levels: [['ombroE', 'ombroD'], ['axilaE', 'axilaD'], ['cinturaE', 'cinturaD']],
  plumb: P => P.fenda, axis: null, face: () => null,
  measures(P) { return trunkMeasures(trunkIndex(P, 'fenda', 'c7', 'E', 'D', P.fenda.y - P.c7.y), P, 'POTSI', 'c7', 'fenda'); }
};
VIEWS.atsi = {
  label: 'Tronco anterior (ATSI)', short: 'ATSI', detect: 'pose', frame: 'image',
  hint: 'Paciente de frente, sem camiseta (top para mulheres), braços levemente afastados do tronco. Enquadre do queixo até o quadril.',
  points: [['jugular', 'Incisura jugular'], ['umbigo', 'Umbigo'], ['ombroD', 'Ponto mais alto do ombro D'], ['ombroE', 'Ponto mais alto do ombro E'],
    ['axilaD', 'Prega axilar anterior D'], ['axilaE', 'Prega axilar anterior E'], ['cinturaD', 'Ponto mais profundo da cintura D'], ['cinturaE', 'Ponto mais profundo da cintura E'],
    ['quadrilD', 'Ponto mais largo do quadril D', opt], ['quadrilE', 'Ponto mais largo do quadril E', opt]],
  tpl: { jugular: [.5, .16], umbigo: [.5, .7], ombroD: [.24, .18], ombroE: [.76, .18], axilaD: [.3, .34], axilaE: [.7, .34], cinturaD: [.34, .58], cinturaE: [.66, .58], quadrilD: [.3, .86], quadrilE: [.7, .86] },
  derive(L) {
    const t = trunkDerive(L);
    return { jugular: { x: t.ms.x, y: t.ms.y - 0.03 * t.T }, umbigo: lerp(t.ms, t.mh, .72), ombroD: { x: L[12].x, y: L[12].y - 0.03 * t.T }, ombroE: { x: L[11].x, y: L[11].y - 0.03 * t.T },
      axilaD: t.ax(L[12]), axilaE: t.ax(L[11]), cinturaD: t.wa(L[12], L[24]), cinturaE: t.wa(L[11], L[23]),
      quadrilD: { x: L[24].x + (L[24].x - t.mh.x) * 0.5, y: L[24].y }, quadrilE: { x: L[23].x + (L[23].x - t.mh.x) * 0.5, y: L[23].y } };
  },
  lines: [['ombroD', 'ombroE'], ['axilaD', 'axilaE'], ['cinturaD', 'cinturaE'], ['quadrilD', 'quadrilE'], ['jugular', 'umbigo']],
  levels: [['ombroD', 'ombroE'], ['axilaD', 'axilaE'], ['cinturaD', 'cinturaE']],
  plumb: P => P.umbigo, axis: null, face: () => null,
  measures(P) { return trunkMeasures(trunkIndex(P, 'umbigo', 'jugular', 'D', 'E', P.umbigo.y - P.jugular.y), P, 'ATSI', 'jugular', 'umbigo'); }
};

/* ---------- joelhos: valgo e varo ---------- */
VIEWS.joelhosF = {
  label: 'Membros inferiores — frontal', short: 'Joelhos', detect: 'pose', frame: 'image',
  hint: 'Paciente de frente, de shorts, patelas voltadas para a frente, pés paralelos tocando-se levemente (ou joelhos se tocando, se houver valgo). Enquadre do quadril aos pés. Use a régua para obter distâncias em cm.',
  points: [['quadrilD', 'Centro do quadril D (meio da prega inguinal)'], ['quadrilE', 'Centro do quadril E (meio da prega inguinal)'], ['joelhoD', 'Centro da patela D'], ['joelhoE', 'Centro da patela E'],
    ['tornD', 'Centro do tornozelo D'], ['tornE', 'Centro do tornozelo E'], ['condiloD', 'Côndilo femoral medial D'], ['condiloE', 'Côndilo femoral medial E'], ['maleoloD', 'Maléolo medial D'], ['maleoloE', 'Maléolo medial E']],
  tpl: { quadrilD: [.4, .08], quadrilE: [.6, .08], joelhoD: [.43, .5], joelhoE: [.57, .5], condiloD: [.47, .5], condiloE: [.53, .5], tornD: [.44, .9], tornE: [.56, .9], maleoloD: [.475, .9], maleoloE: [.525, .9] },
  derive(L) {
    const leg = dist(L[24], L[28]);
    const inw = (p, o, k) => ({ x: p.x + Math.sign(o.x - p.x) * k * leg, y: p.y });
    return { quadrilD: L[24], quadrilE: L[23], joelhoD: L[26], joelhoE: L[25], tornD: L[28], tornE: L[27], condiloD: inw(L[26], L[25], .06), condiloE: inw(L[25], L[26], .06), maleoloD: inw(L[28], L[27], .035), maleoloE: inw(L[27], L[28], .035) };
  },
  lines: [['quadrilD', 'joelhoD'], ['joelhoD', 'tornD'], ['quadrilE', 'joelhoE'], ['joelhoE', 'tornE'], ['condiloD', 'condiloE'], ['maleoloD', 'maleoloE']],
  levels: [], plumb: P => mid(P.tornD, P.tornE), axis: null, face: () => null,
  measures(P, sc) {
    const out = [], mx = (P.quadrilD.x + P.quadrilE.x) / 2;
    for (const s of ['D', 'E']) {
      const a = P['quadril' + s], k = P['joelho' + s], t = P['torn' + s];
      const dev = 180 - interior(a, k, t), xl = xOnLine(a, t, k.y), valgo = Math.abs(k.x - mx) < Math.abs(xl - mx);
      const sv = valgo ? dev : -dev;
      out.push(M('femtib' + s, `Eixo femorotibial — ${sideTxt(s)}`, sv, { ok: [-3, 6], warn: [-6, 10], disp: dev, ref: 'até 6° de valgo ou 3° de varo', at: 'joelho' + s, text: dev < 1 ? 'Alinhado' : valgo ? 'Valgo' : 'Varo' }));
    }
    const ic = P.condiloE.x - P.condiloD.x, im = P.maleoloE.x - P.maleoloD.x;
    if (sc) {
      out.push(M('intercondilar', 'Distância intercondilar (varo)', Math.max(0, ic / sc), { unit: 'cm', ok: [0, 3], warn: [0, 6], ref: '≤ 3 cm (adultos)', at: 'condiloE', text: ic / sc > 3 ? 'Afastamento dos joelhos — padrão varo' : 'Joelhos próximos' }));
      out.push(M('intermaleolar', 'Distância intermaleolar (valgo)', Math.max(0, im / sc), { unit: 'cm', ok: [0, 4], warn: [0, 8], ref: '≤ 4 cm (adultos)', at: 'maleoloE', text: im / sc > 4 ? 'Afastamento dos tornozelos — padrão valgo' : 'Tornozelos próximos' }));
    } else {
      const leg = (dist(P.quadrilD, P.tornD) + dist(P.quadrilE, P.tornE)) / 2 || 1;
      out.push(M('intercondilarRel', 'Distância intercondilar (% da perna)', Math.max(0, ic) / leg * 100, { unit: '%', ref: 'use a régua para obter em cm', text: 'Afastamento entre os joelhos' }));
      out.push(M('intermaleolarRel', 'Distância intermaleolar (% da perna)', Math.max(0, im) / leg * 100, { unit: '%', ref: 'use a régua para obter em cm', text: 'Afastamento entre os tornozelos' }));
    }
    return out;
  }
};

/* ---------- proporção áurea ---------- */
const PHI = (1 + Math.sqrt(5)) / 2;
VIEWS.aurea = {
  label: 'Proporção áurea', short: 'Áurea', detect: 'pose',
  hint: 'Paciente de frente, corpo inteiro no quadro com espaço acima da cabeça e abaixo dos pés, braços levemente afastados, roupa justa (top e shorts).',
  points: [['topo', 'Vértice (topo da cabeça)'], ['mento', 'Mento (queixo)'], ['ombroD', 'Deltoide — ponto mais lateral D'], ['ombroE', 'Deltoide — ponto mais lateral E'],
    ['cinturaD', 'Cintura — ponto mais estreito D'], ['cinturaE', 'Cintura — ponto mais estreito E'], ['umbigo', 'Umbigo'], ['joelho', 'Linha articular do joelho'], ['chao', 'Chão (entre os pés)']],
  tpl: { topo: [.5, 0], mento: [.5, .125], ombroD: [.365, .2], ombroE: [.635, .2], cinturaD: [.415, .37], cinturaE: [.585, .37], umbigo: [.5, .382], joelho: [.555, .72], chao: [.5, 1] },
  derive(L) {
    const ms = mid(L[11], L[12]), mh = mid(L[23], L[24]), s = ms.y - L[0].y, sw = dist(L[11], L[12]);
    const out = (p, k) => ({ x: p.x + Math.sign(p.x - ms.x) * k * sw, y: p.y });
    const w = (sh, hp) => { const p = lerp(sh, hp, .62); return { x: p.x + (mh.x - p.x) * 0.25, y: p.y }; };
    return { topo: { x: L[0].x, y: L[0].y - 0.9 * s }, mento: { x: L[0].x, y: L[0].y + 0.4 * s }, ombroD: out(L[12], .12), ombroE: out(L[11], .12), cinturaD: w(L[12], L[24]), cinturaE: w(L[11], L[23]),
      umbigo: lerp(ms, mh, .76), joelho: L[25], chao: { x: mid(L[29], L[30]).x, y: Math.max(L[29].y, L[30].y, L[31].y, L[32].y) } };
  },
  lines: [['ombroD', 'ombroE'], ['cinturaD', 'cinturaE']],
  levels: [['ombroD', 'ombroE'], ['cinturaD', 'cinturaE']],
  plumb: null, axis: null,
  face: P => ({ c: lerp(P.topo, P.mento, .55), r: dist(P.topo, P.mento) * 0.42 }),
  extra(ctx, P, lw) {
    // régua áurea lateral: topo→umbigo e umbigo→chão
    const x = Math.max(P.ombroE.x, P.ombroD.x) + dist(P.ombroD, P.ombroE) * 0.45;
    const seg = (a, b, c) => { ctx.strokeStyle = c; ctx.lineWidth = lw * 2.2; ctx.beginPath(); ctx.moveTo(x, a); ctx.lineTo(x, b); ctx.stroke(); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x - lw * 4, a); ctx.lineTo(x + lw * 4, a); ctx.stroke(); };
    seg(P.topo.y, P.umbigo.y, '#FDE047'); seg(P.umbigo.y, P.chao.y, '#F59E0B');
    ctx.setLineDash([lw * 2, lw * 2]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = lw * .6;
    ctx.beginPath(); ctx.moveTo(P.umbigo.x, P.umbigo.y); ctx.lineTo(x, P.umbigo.y); ctx.stroke(); ctx.setLineDash([]);
  },
  measures: null
};
VIEWS.aurea.measures = function (P) {
  const out = [], H = P.chao.y - P.topo.y, n = P.chao.y - P.umbigo.y;
  const add = (k, l, r, t) => { const dev = Math.abs(r / PHI - 1) * 100; out.push(M(k, l, dev, { unit: 'x', disp: r, ok: [0, 3], warn: [0, 6], ref: 'φ = 1,618 (±3%)', text: t })); };
  add('aureaAltura', 'Altura ÷ altura do umbigo', H / n, 'Proporção vertical clássica');
  add('aureaUmbigo', 'Umbigo–chão ÷ umbigo–topo', n / (H - n), 'Membros inferiores ÷ tronco e cabeça');
  add('aureaOmbros', 'Largura dos ombros ÷ largura da cintura', dist(P.ombroD, P.ombroE) / (dist(P.cinturaD, P.cinturaE) || 1), 'Proporção do tronco');
  const head = P.mento.y - P.topo.y;
  out.push(M('cabecasAltura', 'Altura em número de cabeças', H / (head || 1), { unit: 'x', ref: '7 a 8 cabeças (adulto)', ok: [6.8, 8.3], warn: [6, 9], text: 'Cânone de proporção' }));
  out.push(M('joelhoAltura', 'Altura do joelho (% da altura)', (P.chao.y - P.joelho.y) / H * 100, { unit: '%', ref: '≈ 28% (adulto)', ok: [25, 31], warn: [23, 33], text: 'Proporção do membro inferior' }));
  return out;
};

/* ---------- simetria facial ---------- */
VIEWS.face = {
  label: 'Simetria facial', short: 'Face', detect: 'face', frame: 'image', noMask: true,
  hint: 'Rosto de frente, sem sorrir, olhando para a lente, cabelo afastado da testa. Celular na altura dos olhos, a ~1 m, sem zoom digital.',
  points: [['triquio', 'Tríquio (linha do cabelo)'], ['glabela', 'Glabela'], ['pupilaD', 'Pupila direita'], ['pupilaE', 'Pupila esquerda'], ['ponta', 'Ponta do nariz'],
    ['asaD', 'Asa do nariz direita'], ['asaE', 'Asa do nariz esquerda'], ['subnasal', 'Subnasal'], ['comissuraD', 'Comissura labial direita'], ['comissuraE', 'Comissura labial esquerda'], ['mento', 'Mento']],
  tpl: { triquio: [.5, .1], glabela: [.5, .335], pupilaD: [.4, .39], pupilaE: [.6, .39], ponta: [.5, .53], asaD: [.45, .56], asaE: [.55, .56], subnasal: [.5, .58], comissuraD: [.43, .68], comissuraE: [.57, .68], mento: [.5, .83] },
  deriveFace(F) {
    const pair = (a, b) => F[a].x < F[b].x ? [F[a], F[b]] : [F[b], F[a]];  // direita do paciente = esquerda da foto
    const [pD, pE] = F.length > 473 ? pair(468, 473) : pair(159, 386);
    const [aD, aE] = pair(129, 358), [cD, cE] = pair(61, 291);
    return { triquio: F[10], glabela: F[9], pupilaD: pD, pupilaE: pE, ponta: F[1], asaD: aD, asaE: aE, subnasal: F[2], comissuraD: cD, comissuraE: cE, mento: F[152] };
  },
  lines: [['pupilaD', 'pupilaE'], ['asaD', 'asaE'], ['comissuraD', 'comissuraE']],
  levels: [['pupilaD', 'pupilaE'], ['asaD', 'asaE'], ['comissuraD', 'comissuraE']],
  plumb: null, axis: null, face: () => null,
  midline(P) { const m = mid(P.pupilaD, P.pupilaE), u = { x: P.pupilaE.x - P.pupilaD.x, y: P.pupilaE.y - P.pupilaD.y }, L = Math.hypot(u.x, u.y) || 1; return { m, u: { x: u.x / L, y: u.y / L }, n: { x: -u.y / L, y: u.x / L }, ipd: L }; },
  extra(ctx, P, lw) {
    const { m, n } = this.midline(P), len = dist(P.triquio, P.mento) * 0.7;
    ctx.strokeStyle = '#7DD3FC'; ctx.lineWidth = lw * .9; ctx.setLineDash([lw * 3, lw * 2]);
    ctx.beginPath(); ctx.moveTo(m.x - n.x * len, m.y - n.y * len); ctx.lineTo(m.x + n.x * len * 1.3, m.y + n.y * len * 1.3); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = lw * .5;
    for (const k of ['triquio', 'glabela', 'subnasal', 'mento']) { const p = P[k], w = dist(P.pupilaD, P.pupilaE) * .9; ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x + w, p.y); ctx.stroke(); }
  },
  measures(P) {
    const out = [], L = this.midline(P);
    const off = p => (p.x - L.m.x) * L.u.x + (p.y - L.m.y) * L.u.y;
    const along = p => (p.x - L.m.x) * L.n.x + (p.y - L.m.y) * L.n.y;
    for (const [k, l, a, b, okM] of [['incPupilas', 'Inclinação da linha bipupilar', 'pupilaD', 'pupilaE', 1.5], ['incAsas', 'Inclinação das asas do nariz', 'asaD', 'asaE', 2], ['incComissuras', 'Inclinação das comissuras labiais', 'comissuraD', 'comissuraE', 2]]) {
      const v = tiltH(P[a], P[b]);
      out.push(M(k, l, v, { ok: [0, okM], warn: [0, okM * 2], ref: '≤ ' + nf(okM) + '°', at: b, text: v < 0.5 ? 'Nivelada' : 'Lado ' + (P[a].y > P[b].y ? 'direito' : 'esquerdo') + ' mais baixo' }));
    }
    for (const [k, l, p] of [['desvMento', 'Desvio do mento', 'mento'], ['desvNariz', 'Desvio da ponta do nariz', 'ponta']]) {
      const o = off(P[p]), v = Math.abs(o) / L.ipd * 100;
      out.push(M(k, l + ' (% da distância interpupilar)', v, { unit: '%', ok: [0, 3], warn: [0, 6], ref: '≤ 3%', at: p, text: v < 1 ? 'Na linha média' : 'Desviado para a ' + (o < 0 ? 'direita' : 'esquerda') + ' do paciente' }));
    }
    const idx = [['pupilaD', 'pupilaE'], ['asaD', 'asaE'], ['comissuraD', 'comissuraE']].map(([a, b]) => { const dA = Math.abs(off(P[a])), dB = Math.abs(off(P[b])); return Math.abs(dA - dB) / ((dA + dB) || 1) * 100; });
    const si = idx.reduce((s, x) => s + x, 0) / idx.length;
    out.push(M('simFacial', 'Índice de assimetria facial', si, { unit: '%', ok: [0, 3], warn: [0, 6], ref: '≤ 3%', text: si <= 3 ? 'Face simétrica' : 'Assimetria entre hemifaces' }));
    const t = [along(P.glabela) - along(P.triquio), along(P.subnasal) - along(P.glabela), along(P.mento) - along(P.subnasal)], T = t[0] + t[1] + t[2] || 1;
    ['Terço superior', 'Terço médio', 'Terço inferior'].forEach((l, i) => out.push(M('terco' + (i + 1), l + ' da face', t[i] / T * 100, { unit: '%', ok: [30, 36.7], warn: [27, 40], ref: '≈ 33%', text: 'Proporção vertical da face' })));
    return out;
  }
};

/* ---------- amplitude de movimento (goniômetro em foto) ---------- */
const ROM_TYPES = {
  ang3: { n: 3, f: (P) => interior(P.a, P.b, P.c), d: 'ângulo no vértice' },
  ang3s: { n: 3, f: (P) => 180 - interior(P.a, P.b, P.c), d: '180° − ângulo no vértice' },
  ang3m90: { n: 3, f: (P) => interior(P.a, P.b, P.c) - 90, d: 'ângulo no vértice − 90°' },
  m90ang3: { n: 3, f: (P) => 90 - interior(P.a, P.b, P.c), d: '90° − ângulo no vértice' },
  vert2: { n: 2, f: (P) => fromV(P.a, P.b), d: 'reta em relação à vertical' },
  horiz2: { n: 2, f: (P) => tiltH(P.a, P.b), d: 'reta em relação à horizontal' },
  perp4: { n: 4, f: (P) => { const nrm = { x: -(P.b.y - P.a.y), y: P.b.x - P.a.x }, v = { x: P.d.x - P.c.x, y: P.d.y - P.c.y }, an = vecAngle(nrm, v); return Math.min(an, 180 - an); }, d: 'reta 2 em relação à perpendicular da reta 1' },
};
// pontos MediaPipe por lado [D, E] na ordem dos pontos do movimento
const ROM_PRESETS = [
  { id: 'ombroFlex', label: 'Flexão do ombro', type: 'ang3', normal: 180, pts: ['Trocânter maior', 'Acrômio (vértice)', 'Epicôndilo lateral'], mp: [[24, 12, 14], [23, 11, 13]], plane: 'Lateral' },
  { id: 'ombroExt', label: 'Extensão do ombro', type: 'ang3', normal: 60, pts: ['Trocânter maior', 'Acrômio (vértice)', 'Epicôndilo lateral'], mp: [[24, 12, 14], [23, 11, 13]], plane: 'Lateral' },
  { id: 'ombroAbd', label: 'Abdução do ombro', type: 'ang3', normal: 180, pts: ['Crista ilíaca', 'Acrômio (vértice)', 'Epicôndilo'], mp: [[24, 12, 14], [23, 11, 13]], plane: 'Frontal' },
  { id: 'cotoveloFlex', label: 'Flexão do cotovelo', type: 'ang3s', normal: 150, pts: ['Acrômio', 'Epicôndilo lateral (vértice)', 'Processo estiloide do rádio'], mp: [[12, 14, 16], [11, 13, 15]], plane: 'Lateral' },
  { id: 'quadrilFlex', label: 'Flexão do quadril', type: 'ang3s', normal: 120, pts: ['Acrômio', 'Trocânter maior (vértice)', 'Côndilo lateral do fêmur'], mp: [[12, 24, 26], [11, 23, 25]], plane: 'Lateral' },
  { id: 'quadrilExt', label: 'Extensão do quadril', type: 'ang3s', normal: 30, pts: ['Acrômio', 'Trocânter maior (vértice)', 'Côndilo lateral do fêmur'], mp: [[12, 24, 26], [11, 23, 25]], plane: 'Lateral' },
  { id: 'quadrilAbd', label: 'Abdução do quadril', type: 'ang3m90', normal: 45, pts: ['EIAS oposta', 'EIAS (vértice)', 'Centro da patela'], mp: [[23, 24, 26], [24, 23, 25]], plane: 'Frontal' },
  { id: 'joelhoFlex', label: 'Flexão do joelho', type: 'ang3s', normal: 135, pts: ['Trocânter maior', 'Linha articular do joelho (vértice)', 'Maléolo lateral'], mp: [[24, 26, 28], [23, 25, 27]], plane: 'Lateral' },
  { id: 'tornDorsi', label: 'Dorsiflexão do tornozelo', type: 'm90ang3', normal: 20, pts: ['Cabeça da fíbula', 'Maléolo lateral (vértice)', 'Cabeça do 5º metatarso'], mp: [[26, 28, 32], [25, 27, 31]], plane: 'Lateral' },
  { id: 'tornPlantar', label: 'Flexão plantar do tornozelo', type: 'ang3m90', normal: 50, pts: ['Cabeça da fíbula', 'Maléolo lateral (vértice)', 'Cabeça do 5º metatarso'], mp: [[26, 28, 32], [25, 27, 31]], plane: 'Lateral' },
  { id: 'cervFlex', label: 'Flexão cervical', type: 'ang3s', normal: 45, pts: ['Ponto médio do tronco (lateral)', 'C7 (vértice)', 'Trágus'], plane: 'Lateral' },
  { id: 'cervExt', label: 'Extensão cervical', type: 'ang3s', normal: 45, pts: ['Ponto médio do tronco (lateral)', 'C7 (vértice)', 'Trágus'], plane: 'Lateral' },
  { id: 'cervIncl', label: 'Inclinação lateral cervical', type: 'vert2', normal: 45, pts: ['Incisura jugular', 'Glabela'], plane: 'Frontal' },
  { id: 'cervRot', label: 'Rotação cervical', type: 'perp4', normal: 80, pts: ['Acrômio D', 'Acrômio E', 'Centro do vértice da cabeça', 'Ponta do nariz'], plane: 'Superior (foto de cima)' },
  { id: 'troncoFlex', label: 'Flexão do tronco', type: 'vert2', normal: 80, pts: ['Trocânter maior', 'Acrômio'], mp: [[24, 12], [23, 11]], plane: 'Lateral' },
  { id: 'troncoExt', label: 'Extensão do tronco', type: 'vert2', normal: 25, pts: ['Trocânter maior', 'Acrômio'], mp: [[24, 12], [23, 11]], plane: 'Lateral' },
  { id: 'troncoIncl', label: 'Inclinação lateral do tronco', type: 'vert2', normal: 35, pts: ['Sacro (S2)', 'C7'], plane: 'Posterior' },
  { id: 'livre3', label: 'Ângulo livre (3 pontos)', type: 'ang3', normal: 0, pts: ['Ponto 1', 'Vértice', 'Ponto 3'], plane: 'Qualquer' },
  { id: 'livreV', label: 'Reta livre × vertical', type: 'vert2', normal: 0, pts: ['Ponto 1', 'Ponto 2'], plane: 'Qualquer' },
  { id: 'livreH', label: 'Reta livre × horizontal', type: 'horiz2', normal: 0, pts: ['Ponto 1', 'Ponto 2'], plane: 'Qualquer' },
];
const ROM_KEYS = ['a', 'b', 'c', 'd'];
const ROM_TPL = { 2: [[.5, .75], [.5, .25]], 3: [[.3, .75], [.5, .45], [.78, .3]], 4: [[.25, .6], [.75, .6], [.5, .45], [.5, .2]] };
const romCache = new Map();
function romView(def) {
  const key = JSON.stringify(def); if (romCache.has(key)) return romCache.get(key);
  const T = ROM_TYPES[def.type] || ROM_TYPES.ang3, n = T.n;
  const points = def.pts.slice(0, n).map((l, i) => [ROM_KEYS[i], l]);
  const tpl = {}; ROM_TPL[n].forEach((p, i) => tpl[ROM_KEYS[i]] = p);
  const v = {
    label: def.label, short: def.label, frame: 'image', rom: true, detect: def.mp ? 'pose' : null,
    hint: `Plano: ${def.plane || 'à escolha'}. Fotografe o paciente na amplitude máxima do movimento, câmera perpendicular ao plano do movimento. Medida: ${T.d}.`,
    points, tpl,
    derive: def.mp ? (L, w, h, V) => { const vis = s => def.mp[s].reduce((a, i) => a + (V[i] || 0), 0); const m = vis(0) >= vis(1) ? def.mp[0] : def.mp[1]; const o = {}; m.forEach((idx, i) => o[ROM_KEYS[i]] = L[idx]); return o; } : null,
    lines: n === 4 ? [['a', 'b'], ['c', 'd']] : n === 3 ? [['a', 'b'], ['b', 'c']] : [['a', 'b']],
    levels: [], plumb: null, axis: null, face: () => null,
    vref: n === 2 && def.type === 'vert2' ? 'a' : null,
    measures(P) {
      const val = T.f(P);
      const o = { at: n === 3 ? 'b' : ROM_KEYS[n - 1], text: def.comment || '' };
      if (def.normal > 0) Object.assign(o, { ok: [def.normal * 0.9, 400], warn: [def.normal * 0.75, 400], ref: `${nf(def.normal, 0)}° (AAOS)`, text: (val >= def.normal * 0.9 ? 'Amplitude preservada' : val >= def.normal * 0.75 ? 'Amplitude levemente reduzida' : 'Amplitude reduzida') + ' · ' + nf(val / def.normal * 100, 0) + '% do normal' });
      return [M('rom_' + (def.id || slug(def.label)), def.label, val, o)];
    }
  };
  romCache.set(key, v); return v;
}

/* ---------- tipos de avaliação ---------- */
const KINDS = {
  postural: { label: 'Avaliação postural completa', desc: 'Quatro vistas de corpo inteiro e flexão anterior de tronco (teste de Adams e flexibilidade), com ângulos, desvios e classificação postural.', views: ['front', 'back', 'latD', 'latE', 'adamsPost', 'adamsLat'], icon: 'P' },
  rapida: { label: 'Avaliação rápida', desc: 'Vista anterior e lateral direita para uma triagem em poucos minutos.', views: ['front', 'latD'], icon: 'R' },
  adams: { label: 'Flexão anterior de tronco', desc: 'Teste de Adams (rotação do tronco, triagem de escoliose) e flexibilidade da cadeia posterior.', views: ['adamsPost', 'adamsLat'], icon: 'A' },
  cabeca: { label: 'Cabeça e pescoço', desc: 'Ângulo craniovertebral, inclinação da cabeça, ombro anteriorizado e simetria cervical.', views: ['hnLat', 'hnFront'], icon: 'C' },
  tronco: { label: 'Simetria de tronco', desc: 'Índices ATSI e POTSI com simetria de ombros, axilas, cintura e quadril.', views: ['atsi', 'potsi'], icon: 'T' },
  joelhos: { label: 'Joelhos: valgo e varo', desc: 'Eixo femorotibial e distâncias intercondilar e intermaleolar.', views: ['joelhosF'], icon: 'J' },
  aurea: { label: 'Proporção áurea', desc: 'Proporções corporais comparadas a φ = 1,618, com régua áurea sobre a foto.', views: ['aurea'], icon: 'φ' },
  face: { label: 'Simetria facial', desc: 'Inclinações, desvio da linha média, índice de assimetria e terços da face.', views: ['face'], icon: 'F' },
  adm: { label: 'Amplitude de movimento', desc: 'Goniômetro em foto com 17 movimentos de referência, ângulos livres e protocolos próprios.', dynamic: true, icon: '∠' },
  video: { label: 'Análise dinâmica em vídeo', desc: 'Rastreio quadro a quadro de ângulos articulares com gráficos temporais, por IA ou marcadores verdes.', video: true, icon: '▶' },
};
const kindOf = a => KINDS[a.kind] ? a.kind : 'postural';

function getView(slot, vd) { return vd?.rom ? romView(vd.rom) : VIEWS[vd?.vk || slot]; }
function slotsOf(a) {
  const k = KINDS[kindOf(a)];
  if (k.dynamic) return (a.order || Object.keys(a.views)).filter(s => a.views[s]);
  if (k.video) return [];
  return k.views;
}
function tplPoints(V, w, h) {
  const t = V.tpl, out = {};
  if (V.frame === 'image') { for (const k in t) out[k] = { x: t[k][0] * w, y: t[k][1] * h }; return out; }
  const H = 0.9 * h;
  for (const k in t) out[k] = { x: w / 2 + (t[k][0] - .5) * H, y: 0.05 * h + t[k][1] * H };
  return out;
}
function scaleOf(vd) {
  if (!vd?.scale?.on || !vd.scale.cm || !vd.points?.reguaA || !vd.points?.reguaB) return null;
  const d = dist(vd.points.reguaA, vd.points.reguaB);
  return d > 2 ? d / vd.scale.cm : null;
}
function viewReady(vd, slot) { const V = getView(slot, vd); return !!(V && vd && vd.img && vd.points && V.points.every(([k, , o]) => o || vd.points[k])); }
function measuresFor(slot, vd) { if (!viewReady(vd, slot)) return []; const V = getView(slot, vd); try { return V.measures(vd.points, scaleOf(vd)); } catch (e) { return []; } }
function allMeasures(a) { return slotsOf(a).flatMap(s => measuresFor(s, a.views[s]).map(m => ({ slot: s, m }))); }
function findings(a) { return allMeasures(a).filter(x => x.m.status === 'warn' || x.m.status === 'bad'); }
function slotLabel(a, s) { const V = getView(s, a.views[s]); return V ? V.label : s; }

/* Classificação postural de Kendall, estimada a partir da vista lateral */
function classifyPosture(a) {
  const s = ['latD', 'latE'].find(k => viewReady(a.views[k], k)); if (!s) return null;
  const m = Object.fromEntries(measuresFor(s, a.views[s]).map(x => [x.key, x]));
  const pel = m.pelveSag.score, tr = m.troncoSag.score, cva = m.cva.score, knee = m.joelhoSag.score, corpo = m.corpo.score;
  let tipo, desc;
  if (pel > 15 && cva < 50) { tipo = 'Cifolordótica'; desc = 'Anteversão pélvica aumentada com cabeça anteriorizada: sugere aumento das curvas lombar e torácica.'; }
  else if (pel > 15) { tipo = 'Lordótica'; desc = 'Anteversão pélvica aumentada: sugere hiperlordose lombar.'; }
  else if (tr < -3 && (corpo > 2 || knee > 5)) { tipo = 'Relaxada (sway-back)'; desc = 'Tronco projetado para trás com pelve à frente da linha de prumo e tendência a hiperextensão dos joelhos.'; }
  else if (pel < 4) { tipo = 'Dorso plano (flat back)'; desc = 'Pelve em retroversão com tronco retificado: sugere redução da lordose lombar.'; }
  else if (cva < 50) { tipo = 'Cabeça anteriorizada'; desc = 'Alinhamento global próximo do ideal, com projeção anterior da cabeça.'; }
  else { tipo = 'Próxima do alinhamento ideal'; desc = 'Pelve, tronco e cabeça dentro das faixas de referência na vista lateral.'; }
  return { tipo, desc, vista: getView(s).label };
}

/* Interpretação por medida (texto explicativo) */
function explain(m) {
  const ok = m.status === 'ok' || m.status === 'na';
  const k = m.key.startsWith('atr') ? 'atr' : m.key.replace(/[DE]$/, '');
  const T = {
    cabeca: ['Cabeça nivelada no plano frontal.', 'Cabeça inclinada lateralmente; pode refletir desequilíbrio da musculatura cervical ou compensação visual.'],
    ombros: ['Ombros nivelados.', 'Um ombro mais baixo; comum em desequilíbrio do trapézio superior, escoliose ou dominância do membro.'],
    pelve: ['Pelve nivelada.', 'Desnível pélvico; investigar diferença de comprimento dos membros inferiores, escoliose ou assimetria muscular do quadril.'],
    q: ['Alinhamento do joelho dentro do esperado.', m.text === 'Varo' ? 'Joelho em varo (para fora); sobrecarga no compartimento medial do joelho.' : 'Valgo acentuado (joelho para dentro); associado a fraqueza de glúteo médio e pronação do pé.'],
    rot: ['Rotação do pé dentro do esperado.', 'Rotação do pé fora do usual; pode refletir torção tibial, anteversão femoral ou compensação do quadril.'],
    eixo: ['Corpo centrado sobre a base de apoio.', 'Corpo deslocado lateralmente em relação à base; descarga de peso assimétrica.'],
    escapulas: ['Escápulas niveladas.', 'Escápulas em alturas diferentes; investigar escoliose torácica e controle escapular.'],
    troncoLat: ['Tronco alinhado sobre o sacro.', 'Tronco desviado lateralmente; sinal de alerta para escoliose ou compensação antálgica.'],
    calc: ['Retropé alinhado.', m.text === 'Varo' ? 'Retropé em varo (supinado); menor absorção de impacto.' : 'Retropé em valgo (pronado); pode sobrecarregar a cadeia medial do membro inferior.'],
    cva: ['Cabeça bem posicionada sobre o tronco.', 'Cabeça anteriorizada: aumenta a carga sobre a coluna cervical e está associada a dor cervical e cefaleia tensional.'],
    pelveSag: ['Inclinação pélvica fisiológica.', m.score > 15 ? 'Anteversão pélvica aumentada; associada a hiperlordose lombar e encurtamento de flexores do quadril.' : 'Pelve em tendência à retroversão; associada a retificação lombar e encurtamento de isquiotibiais.'],
    troncoSag: ['Tronco vertical sobre a pelve.', 'Tronco projetado em relação à pelve; altera a distribuição de carga na coluna.'],
    joelhoSag: ['Joelho em posição neutra.', m.score > 0 ? 'Hiperextensão do joelho (recurvato); sobrecarga em estruturas posteriores do joelho.' : 'Joelho em flexo; investigar encurtamento de isquiotibiais ou limitação articular.'],
    corpo: ['Corpo alinhado com a linha de prumo.', 'Corpo inclinado em relação à linha de prumo; maior gasto energético para manter a postura.'],
    atr: ['Sem rotação de tronco relevante no teste de Adams.', m.score >= 7 ? 'Rotação do tronco ≥ 7°: indica encaminhamento para avaliação médica e radiografia (suspeita de escoliose estrutural).' : 'Rotação do tronco entre 5° e 7°: acompanhar e repetir a avaliação.'],
    troncoCoxa: ['Boa flexibilidade da cadeia posterior.', 'Flexibilidade da cadeia posterior reduzida (isquiotibiais, glúteos e paravertebrais).'],
    dedoChao: ['Alcance adequado na flexão anterior.', 'Alcance reduzido na flexão anterior; sinal de encurtamento da cadeia posterior.'],
    joelhoFlex: ['Joelhos estendidos durante o teste.', 'Joelhos fletidos durante o teste: repita a foto com os joelhos estendidos.'],
    inclCraniana: ['Cabeça em posição neutra.', 'Cabeça fora da posição neutra no plano sagital.'],
    anguloOmbro: ['Ombro bem posicionado.', 'Ombro anteriorizado (protrusão); associado a encurtamento do peitoral e fraqueza dos estabilizadores escapulares.'],
    fhpIndex: ['Cabeça alinhada ao ombro.', 'Cabeça projetada à frente do ombro.'],
    desvioCabeca: ['Cabeça centrada sobre o tronco.', 'Cabeça deslocada lateralmente em relação ao tronco.'],
    simOmbros: ['Ombros simétricos em relação à linha média.', 'Assimetria de largura entre os ombros.'],
    potsi: ['Tronco posterior simétrico.', 'POTSI elevado: assimetria do tronco posterior, sinal de alerta para escoliose.'],
    atsi: ['Tronco anterior simétrico.', 'ATSI elevado: assimetria do tronco anterior.'],
    femtib: ['Eixo do membro inferior alinhado.', m.text === 'Varo' ? 'Joelho em varo.' : 'Joelho em valgo.'],
    intercondilar: ['Joelhos próximos com os pés juntos.', 'Joelhos afastados com os pés juntos: padrão de joelho varo.'],
    intermaleolar: ['Tornozelos próximos com os joelhos juntos.', 'Tornozelos afastados com os joelhos juntos: padrão de joelho valgo.'],
    simFacial: ['Hemifaces simétricas.', 'Assimetria entre as hemifaces; considerar avaliação odontológica, fonoaudiológica ou de ATM.'],
  };
  const e = T[k] || T[m.key] || (m.key.startsWith('rom_') ? ['Amplitude dentro do esperado.', 'Amplitude abaixo do esperado para o movimento.'] : null);
  return e ? e[ok ? 0 : 1] : '';
}

if (typeof module !== 'undefined') module.exports = { VIEWS, KINDS, ROM_PRESETS, romView, tplPoints, getView, measuresFor, classifyPosture, explain, PHI };
