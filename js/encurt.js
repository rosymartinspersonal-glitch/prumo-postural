/* TEAMRM — Testes de encurtamento muscular (flexibilidade) e desenhos de referência das posturas.
   Os desenhos são bonecos de traço (sem pessoa real), só para identificar a posição de cada foto. */
'use strict';

/* ---------- desenhos de referência (SVG, cores do tema) ---------- */
const REF_ART = (() => {
  const ink = 'var(--ink)', acc = 'var(--accent)', mu = 'var(--muted)';
  const S = (vb, inner) => `<svg viewBox="${vb}" width="100%" height="100%" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const body = d => `<g stroke="${ink}" stroke-width="4" stroke-opacity=".85">${d}</g>`;
  const head = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" stroke="${ink}" stroke-width="3.5" stroke-opacity=".85"/>`;
  const guide = d => `<g stroke="${acc}" stroke-width="2" stroke-dasharray="5 4">${d}</g>`;
  const arc = d => `<path d="${d}" stroke="${acc}" stroke-width="2.4"/>`;
  const floor = (y, w = 160) => `<line x1="4" x2="${w - 4}" y1="${y}" y2="${y}" stroke="${mu}" stroke-width="2"/>`;
  const flip = (w, svg) => svg.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/, `$1<g transform="translate(${w} 0) scale(-1 1)">$2</g>$3`);
  // em pé, de frente / de costas (viewBox 120×170)
  const standFront = (extra = '', legs = 'M52 82 L50 122 L50 160 M68 82 L70 122 L70 160') => S('0 0 120 170',
    head(60, 16) + body(`M60 24 V32 M42 34 H78 M42 34 L44 82 M78 34 L76 82 M47 82 H73 M60 32 V82 M42 34 L36 84 M78 34 L84 84 ${legs}`) + extra);
  const front = standFront(`<g fill="${ink}" stroke="none"><circle cx="57" cy="15" r="1.4"/><circle cx="63" cy="15" r="1.4"/></g>` + guide('M30 34 H90 M34 82 H86'));
  const back = standFront(guide('M60 6 V164') + guide('M30 34 H90 M34 82 H86'));
  // perfil olhando para a direita (viewBox 120×170)
  const side = (arms = 'M58 36 L60 62 L62 86') => S('0 0 120 170',
    head(62, 16) + body(`M60 24 L58 34 M58 34 C54 50 52 62 56 82 M56 82 L58 122 L58 160 L72 162 ${arms}`) + guide('M58 4 V166'));
  const latD = side(), latE = flip(120, latD);
  const armsFwd = side('M58 36 L104 36');
  // sentado, uma perna estendida e a outra dobrada, alcançando o pé (viewBox 160×100)
  const sitUni = S('0 0 160 100', floor(90) + head(104, 42) + body('M44 86 L88 50 M44 86 L128 86 L132 70 M88 50 L126 68 M44 86 L70 66 L64 84 L52 86') + arc('M64 86 A20 20 0 0 0 59 74'));
  const sitBil = S('0 0 160 100', floor(90) + head(104, 42) + body('M44 86 L88 50 M44 86 L128 86 L132 70 M88 50 L128 70 M44 84 L128 82') + arc('M64 86 A20 20 0 0 0 59 74'));
  // deitado de barriga para baixo, joelhos dobrados (viewBox 160×100), cabeça à esquerda
  const prone = S('0 0 160 100', floor(90) + head(16, 80, 7) + body('M24 84 L92 84 L128 86 L110 40 M24 84 L40 76 L24 70') + guide('M92 86 L150 86') + arc('M118 86 A12 12 0 0 0 124 74'));
  // deitado de costas, uma perna estendida elevada (viewBox 160×100), cabeça à esquerda
  const slr = S('0 0 160 100', floor(90) + head(14, 82, 7) + body('M22 84 L80 86 L150 86 M80 86 L104 14 M28 84 L52 88') + guide('M80 86 L148 86') + arc('M108 86 A28 28 0 0 0 89 60'));
  // em pé sobre uma perna, de frente (viewBox 120×170). Apoio na perna direita do paciente = lado esquerdo da imagem
  const unipBack = standFront(guide('M30 82 H90'), 'M52 82 L50 122 L50 160 M68 82 L72 124 L80 108');   // joelho dobrado para trás
  const unipHip = standFront(guide('M30 82 H90'), 'M52 82 L50 122 L50 160 M68 82 L74 98 L72 130');   // quadril dobrado à frente (joelho alto)
  return {
    front, back, latD, latE,
    encSentUniD: sitUni, encSentUniE: flip(160, sitUni), encSentBilD: sitBil, encSentBilE: flip(160, sitBil),
    encPronoD: flip(160, prone), encPronoE: prone, encSlrD: slr, encSlrE: flip(160, slr),
    encUnipD: unipBack, encUnipE: flip(120, unipBack), encCegD: unipHip, encCegE: flip(120, unipHip),
    encBracosD: armsFwd, encBracosE: flip(120, armsFwd),
  };
})();

/* ---------- vistas dos testes ---------- */
(() => {
  const mirror = (tpl, r) => { const o = {}; for (const k in tpl) o[k] = r ? tpl[k] : [1 - tpl[k][0], tpl[k][1]]; return o; };
  const IX = r => r ? { ear: 8, sh: 12, el: 14, wr: 16, idx: 20, hip: 24, knee: 26, ank: 28, foot: 32 } : { ear: 7, sh: 11, el: 13, wr: 15, idx: 19, hip: 23, knee: 25, ank: 27, foot: 31 };
  const lado = r => r ? 'direita' : 'esquerda', ladoM = r => r ? 'direito' : 'esquerdo';
  const base = { frame: 'image', levels: [], plumb: null, axis: null, face: () => null };

  // 1) sentar e alcançar (unilateral ou com as duas pernas)
  function sitReach(r, uni) {
    const I = IX(r);
    return { ...base, side: r ? 'D' : 'E', detect: 'pose',
      label: uni ? `Sentar e alcançar unilateral — perna ${lado(r)} estendida` : `Sentar e alcançar (duas pernas) — perfil ${ladoM(r)}`,
      short: uni ? `Alcance uni. ${r ? 'D' : 'E'}` : `Alcance ${r ? 'D' : 'E'}`,
      hint: uni ? `Sentado no chão, perna ${lado(r)} estendida e a outra dobrada com a sola do pé encostada na coxa. Inclina o tronco à frente e leva as mãos em direção ao pé, sem dobrar o joelho. Câmera de lado, na altura do quadril.`
        : `Sentado no chão com as duas pernas estendidas e juntas. Inclina o tronco à frente e leva as mãos em direção aos pés, sem dobrar os joelhos. Lado ${ladoM(r)} voltado para a câmera, na altura do quadril.`,
      points: [['acromio', 'Acrômio'], ['trocanter', 'Trocânter maior'], ['joelho', 'Linha articular do joelho'], ['maleolo', 'Maléolo lateral'], ['pe', 'Ponta do pé (dedos)'], ['mao', 'Ponta dos dedos da mão']],
      tpl: mirror({ trocanter: [.27, .86], acromio: [.55, .5], joelho: [.52, .86], maleolo: [.78, .86], pe: [.83, .7], mao: [.86, .68] }, r),
      derive: L => ({ acromio: L[I.sh], trocanter: L[I.hip], joelho: L[I.knee], maleolo: L[I.ank], pe: L[I.foot], mao: L[I.idx] }),
      lines: [['acromio', 'trocanter'], ['trocanter', 'joelho'], ['joelho', 'maleolo'], ['maleolo', 'pe'], ['acromio', 'mao']],
      measures(P, sc) {
        const out = [];
        let v = interior(P.acromio, P.trocanter, P.joelho);
        out.push(M('encTroncoCoxa', 'Ângulo tronco–coxa', v, { ok: [0, 70], warn: [0, 90], ref: '≤ 70° (quanto menor, mais flexível)', at: 'trocanter', text: v <= 70 ? 'Boa flexibilidade de cadeia posterior' : v <= 90 ? 'Flexibilidade reduzida' : 'Flexibilidade muito reduzida' }));
        const leg = dist(P.trocanter, P.maleolo) || 1, u = { x: (P.maleolo.x - P.trocanter.x) / leg, y: (P.maleolo.y - P.trocanter.y) / leg };
        const d = (P.mao.x - P.pe.x) * u.x + (P.mao.y - P.pe.y) * u.y;   // + = passou da ponta do pé
        if (sc) out.push(M('encAlcance', 'Alcance em relação à ponta do pé', d / sc, { unit: 'cm', ok: [0, 100], warn: [-10, 100], ref: '≥ 0 cm (alcança ou passa do pé)', at: 'mao', text: d >= 0 ? 'Alcançou o pé' : 'Não alcançou o pé' }));
        else out.push(M('encAlcanceRel', 'Alcance em relação à ponta do pé (% da perna)', d / leg * 100, { unit: '%', ok: [0, 100], warn: [-12, 100], ref: '≥ 0% · use a régua para obter em cm', at: 'mao', text: d >= 0 ? 'Alcançou o pé' : 'Não alcançou o pé' }));
        v = 180 - interior(P.trocanter, P.joelho, P.maleolo);
        out.push(M('encJoelhoExt', 'Joelho durante o teste (flexão)', v, { ok: [0, 10], warn: [0, 20], ref: '≤ 10° (joelho estendido)', at: 'joelho', text: v <= 10 ? 'Joelho estendido' : 'Joelho dobrado — o teste perde validade' }));
        return out;
      } };
  }
  // 2) decúbito ventral com flexão dos joelhos (teste de Ely — reto femoral)
  function prone(r) {
    const I = IX(r);
    return { ...base, side: r ? 'D' : 'E', detect: 'pose',
      label: `Flexão dos joelhos de bruços (teste de Ely) — perfil ${ladoM(r)}`, short: `Ely ${r ? 'D' : 'E'}`,
      hint: `Deitado de barriga para baixo, testa apoiada nos braços. Dobra os joelhos levando os calcanhares em direção ao glúteo, sem tirar o quadril do chão. Lado ${ladoM(r)} voltado para a câmera, na altura do chão.`,
      points: [['acromio', 'Acrômio'], ['trocanter', 'Trocânter maior'], ['joelho', 'Linha articular do joelho'], ['maleolo', 'Maléolo lateral']],
      tpl: mirror({ acromio: [.78, .8], trocanter: [.45, .8], joelho: [.2, .82], maleolo: [.47, .46] }, r),
      derive: L => ({ acromio: L[I.sh], trocanter: L[I.hip], joelho: L[I.knee], maleolo: L[I.ank] }),
      lines: [['acromio', 'trocanter'], ['trocanter', 'joelho'], ['joelho', 'maleolo']],
      measures(P) {
        const out = [];
        let v = 180 - interior(P.trocanter, P.joelho, P.maleolo);
        out.push(M('encEly', 'Flexão do joelho de bruços', v, { ok: [120, 200], warn: [100, 200], ref: '≥ 120° (calcanhar perto do glúteo)', at: 'joelho', text: v >= 120 ? 'Flexibilidade do quadríceps preservada' : v >= 100 ? 'Leve encurtamento do quadríceps / reto femoral' : 'Encurtamento do quadríceps / reto femoral' }));
        v = 180 - interior(P.acromio, P.trocanter, P.joelho);
        out.push(M('encElyQuadril', 'Elevação do quadril (compensação)', v, { ok: [0, 10], warn: [0, 20], ref: '≤ 10° (quadril apoiado)', at: 'trocanter', text: v <= 10 ? 'Quadril apoiado no chão' : 'Quadril sai do chão — Ely positivo (reto femoral encurtado)' }));
        return out;
      } };
  }
  // 3) elevação da perna estendida (isquiotibiais)
  function slr(r) {
    const I = IX(r), O = IX(!r);
    return { ...base, side: r ? 'D' : 'E', detect: 'pose',
      label: `Elevação da perna estendida — perna ${lado(r)}`, short: `Perna ${r ? 'D' : 'E'} elevada`,
      hint: `Deitado de costas, braços abertos no chão. Eleva a perna ${lado(r)} estendida o máximo possível, com a outra perna estendida apoiada e o quadril sem sair do chão. Lado ${ladoM(r)} voltado para a câmera, na altura do chão.`,
      points: [['acromio', 'Acrômio'], ['trocanter', 'Trocânter maior'], ['joelho', `Joelho da perna elevada`], ['maleolo', 'Maléolo da perna elevada'], ['apoio', 'Maléolo da perna apoiada']],
      tpl: mirror({ acromio: [.14, .8], trocanter: [.48, .82], joelho: [.515, .45], maleolo: [.55, .08], apoio: [.93, .82] }, r),
      derive: L => ({ acromio: L[I.sh], trocanter: L[I.hip], joelho: L[I.knee], maleolo: L[I.ank], apoio: L[O.ank] }),
      lines: [['acromio', 'trocanter'], ['trocanter', 'joelho'], ['joelho', 'maleolo'], ['trocanter', 'apoio']],
      measures(P) {
        const out = [];
        let v = interior(P.maleolo, P.trocanter, P.apoio);
        out.push(M('encSlr', 'Elevação da perna estendida (flexão do quadril)', v, { ok: [80, 200], warn: [70, 200], ref: '≥ 80° (AAOS: 70° a 90°)', at: 'trocanter', text: v >= 80 ? 'Isquiotibiais com boa flexibilidade' : v >= 70 ? 'Leve encurtamento dos isquiotibiais' : 'Encurtamento dos isquiotibiais' }));
        v = 180 - interior(P.trocanter, P.joelho, P.maleolo);
        out.push(M('encSlrJoelho', 'Joelho da perna elevada (flexão)', v, { ok: [0, 10], warn: [0, 20], ref: '≤ 10° (joelho estendido)', at: 'joelho', text: v <= 10 ? 'Joelho estendido' : 'Joelho dobrado — o ângulo fica superestimado' }));
        return out;
      } };
  }
  // 4) apoio unipodal de frente (Trendelenburg) — joelho para trás ou quadril à frente
  function single(r, hip) {
    const I = IX(r), sw = r ? 'E' : 'D';   // lado sem apoio
    return { ...base, side: r ? 'D' : 'E', detect: 'pose',
      label: hip ? `Apoio unipodal com flexão do quadril — apoio na perna ${lado(r)}` : `Apoio unipodal (Trendelenburg) — apoio na perna ${lado(r)}`,
      short: hip ? `Unipodal quadril ${r ? 'D' : 'E'}` : `Unipodal ${r ? 'D' : 'E'}`,
      hint: hip ? `De frente para a câmera, apoiado na perna ${lado(r)}. Eleva o outro joelho à frente até a altura do quadril e mantém por 30 s, braços relaxados. Câmera na altura do umbigo.`
        : `De frente para a câmera, apoiado na perna ${lado(r)}. Dobra o outro joelho levando o pé para trás e mantém por 30 s, braços relaxados. Câmera na altura do umbigo.`,
      points: [['acromioD', 'Acrômio direito'], ['acromioE', 'Acrômio esquerdo'], ['eiasD', 'EIAS direita'], ['eiasE', 'EIAS esquerda'], ['joelho', `Centro da patela (perna de apoio)`], ['torn', 'Tornozelo da perna de apoio (centro)']],
      tpl: r ? { acromioD: [.36, .2], acromioE: [.64, .2], eiasD: [.41, .46], eiasE: [.59, .46], joelho: [.42, .7], torn: [.42, .93] }
        : { acromioD: [.36, .2], acromioE: [.64, .2], eiasD: [.41, .46], eiasE: [.59, .46], joelho: [.58, .7], torn: [.58, .93] },
      derive(L) {
        const mh = mid(L[23], L[24]), ms = mid(L[11], L[12]), T = mh.y - ms.y, eias = h => ({ x: h.x + (h.x - mh.x) * 0.35, y: h.y - 0.10 * T });
        return { acromioD: L[12], acromioE: L[11], eiasD: eias(L[24]), eiasE: eias(L[23]), joelho: L[I.knee], torn: L[I.ank] };
      },
      lines: [['acromioD', 'acromioE'], ['eiasD', 'eiasE'], [r ? 'eiasD' : 'eiasE', 'joelho'], ['joelho', 'torn']],
      levels: [['acromioD', 'acromioE'], ['eiasD', 'eiasE']],
      measures(P) {
        const out = [];
        let v = tiltH(P.eiasD, P.eiasE);
        const low = P.eiasD.y > P.eiasE.y ? 'D' : 'E';
        out.push(M('encPelveUni', 'Nivelamento da pelve no apoio unipodal', v, { ok: [0, 2], warn: [0, 5], ref: '≤ 2° (pelve nivelada)', at: 'eias' + low,
          text: v < 1 ? 'Pelve nivelada' : low === sw ? `Queda da pelve do lado sem apoio — Trendelenburg positivo (fraqueza do glúteo médio ${ladoM(r)})` : `Pelve elevada do lado sem apoio (compensação)` }));
        const mE = mid(P.eiasD, P.eiasE), mA = mid(P.acromioD, P.acromioE);
        v = fromV(mE, mA);
        out.push(M('encTroncoUni', 'Inclinação lateral do tronco', v, { ok: [0, 3], warn: [0, 6], ref: '≤ 3°', at: 'acromio' + (mA.x < mE.x ? 'D' : 'E'), text: v < 1 ? 'Tronco centrado' : 'Tronco inclinado para a ' + (mA.x < mE.x ? 'direita' : 'esquerda') + (v > 3 ? ' (compensação do glúteo médio)' : '') }));
        v = tiltH(P.acromioD, P.acromioE);
        out.push(M('encOmbrosUni', 'Nivelamento dos ombros', v, { ok: [0, 3], warn: [0, 5], ref: '≤ 3°', at: 'acromioE', text: v < 1 ? 'Nivelados' : 'Ombro ' + (P.acromioD.y > P.acromioE.y ? 'direito' : 'esquerdo') + ' mais baixo' }));
        const e = P[r ? 'eiasD' : 'eiasE'], dev = 180 - interior(e, P.joelho, P.torn), xl = xOnLine(e, P.torn, P.joelho.y);
        const valgo = Math.abs(P.joelho.x - mE.x) < Math.abs(xl - mE.x);
        out.push(M('encJoelhoUni', 'Alinhamento do joelho de apoio', dev, { ok: [0, 10], warn: [0, 15], ref: '≤ 10°', at: 'joelho', text: dev < 3 ? 'Joelho alinhado' : valgo ? 'Joelho para dentro (valgo dinâmico)' : 'Joelho para fora (varo)' }));
        return out;
      } };
  }
  // 5) em pé de perfil com os braços elevados à frente
  function arms(r) {
    const I = IX(r);
    return { ...base, side: r ? 'D' : 'E', detect: 'pose',
      label: `Braços elevados à frente — perfil ${ladoM(r)}`, short: `Braços ${r ? 'D' : 'E'}`,
      hint: `Em pé, lado ${ladoM(r)} voltado para a câmera. Eleva os braços estendidos à frente até a altura dos ombros, palmas para baixo, sem mexer o resto do corpo. Câmera na altura do umbigo.`,
      points: [['tragus', 'Trágus'], ['acromio', 'Acrômio'], ['punho', 'Punho'], ['trocanter', 'Trocânter maior'], ['joelho', 'Linha articular do joelho'], ['maleolo', 'Maléolo lateral']],
      tpl: mirror({ tragus: [.52, .1], acromio: [.48, .2], punho: [.86, .2], trocanter: [.48, .5], joelho: [.48, .71], maleolo: [.48, .94] }, r),
      derive: L => ({ tragus: L[I.ear], acromio: L[I.sh], punho: L[I.wr], trocanter: L[I.hip], joelho: L[I.knee], maleolo: L[I.ank] }),
      lines: [['tragus', 'acromio'], ['acromio', 'punho'], ['acromio', 'trocanter'], ['trocanter', 'joelho'], ['joelho', 'maleolo']],
      plumb: P => P.maleolo, axis: P => [P.maleolo, P.acromio],
      measures(P) {
        const out = [], fwd = Math.sign(P.punho.x - P.acromio.x) || 1;
        let v = interior(P.trocanter, P.acromio, P.punho);
        out.push(M('encBracoElev', 'Elevação dos braços (flexão do ombro)', v, { ok: [80, 100], warn: [70, 110], ref: '≈ 90° (braços na altura dos ombros)', at: 'acromio', text: v < 80 ? 'Braços abaixo da altura dos ombros' : v > 100 ? 'Braços acima da altura dos ombros' : 'Braços na altura dos ombros' }));
        v = fromV(P.trocanter, P.acromio);
        const back = (P.acromio.x - P.trocanter.x) * fwd < 0;
        out.push(M('encTroncoBracos', 'Inclinação do tronco com os braços à frente', v, { ok: [0, 5], warn: [0, 10], ref: '≤ 5°', at: 'acromio', text: v < 2 ? 'Tronco vertical' : back ? 'Tronco jogado para trás (compensação lombar — possível encurtamento de grande dorsal / peitoral)' : 'Tronco inclinado à frente' }));
        v = fromV(P.maleolo, P.acromio);
        out.push(M('encCorpoBracos', 'Alinhamento do corpo (maléolo–acrômio)', v, { ok: [0, 3], warn: [0, 6], ref: '≤ 3°', at: 'acromio', text: v < 1 ? 'Alinhado sobre os pés' : ((P.acromio.x - P.maleolo.x) * fwd > 0 ? 'Corpo projetado à frente' : 'Corpo projetado para trás') }));
        v = 180 - interior(P.trocanter, P.joelho, P.maleolo);
        const hyper = ((P.joelho.x - xOnLine(P.trocanter, P.maleolo, P.joelho.y)) * fwd) < 0;
        out.push(M('encJoelhoBracos', 'Joelhos (perfil)', hyper ? v : -v, { ok: [-5, 5], warn: [-10, 10], disp: v, ref: '≤ 5°', at: 'joelho', text: v < 2 ? 'Neutros' : hyper ? 'Hiperextensão dos joelhos' : 'Joelhos dobrados' }));
        return out;
      } };
  }
  for (const r of [true, false]) {
    const s = r ? 'D' : 'E';
    VIEWS['encSentUni' + s] = sitReach(r, true);
    VIEWS['encSentBil' + s] = sitReach(r, false);
    VIEWS['encProno' + s] = prone(r);
    VIEWS['encSlr' + s] = slr(r);
    VIEWS['encUnip' + s] = single(r, false);
    VIEWS['encCeg' + s] = single(r, true);
    VIEWS['encBracos' + s] = arms(r);
  }
})();

KINDS.encurt = {
  label: 'Testes de encurtamento', icon: 'E',
  desc: 'Flexibilidade e compensações em 14 fotos: sentar e alcançar (uni e bilateral), teste de Ely, elevação da perna estendida, apoio unipodal (Trendelenburg e com flexão do quadril) e braços à frente. Cada vista mostra o desenho da posição.',
  views: ['encSentUniD', 'encSentUniE', 'encSentBilD', 'encSentBilE', 'encSlrD', 'encSlrE', 'encPronoD', 'encPronoE', 'encUnipD', 'encUnipE', 'encCegD', 'encCegE', 'encBracosD', 'encBracosE'],
};

/* textos explicativos das medidas novas */
{
  const base = explain;
  const T = {
    encTroncoCoxa: ['Boa flexibilidade da cadeia posterior.', 'Flexibilidade da cadeia posterior reduzida (isquiotibiais, glúteos e paravertebrais).'],
    encAlcance: ['Alcança o pé: flexibilidade adequada.', 'Não alcança o pé: sinal de encurtamento da cadeia posterior.'],
    encAlcanceRel: ['Alcança o pé: flexibilidade adequada.', 'Não alcança o pé: sinal de encurtamento da cadeia posterior.'],
    encJoelhoExt: ['Joelho estendido durante o teste.', 'Joelho dobrado durante o teste: repita a foto com o joelho estendido.'],
    encEly: ['Quadríceps com boa flexibilidade.', 'Flexão do joelho limitada de bruços: sinal de encurtamento do quadríceps (reto femoral).'],
    encElyQuadril: ['Quadril apoiado durante o teste.', 'O quadril sai do chão ao dobrar o joelho: teste de Ely positivo (reto femoral encurtado).'],
    encSlr: ['Isquiotibiais com boa flexibilidade.', 'Elevação da perna limitada: sinal de encurtamento dos isquiotibiais (descartar dor ciática se houver sintomas).'],
    encSlrJoelho: ['Joelho estendido durante o teste.', 'Joelho dobrado durante a elevação: o resultado fica superestimado.'],
    encPelveUni: ['Pelve estável no apoio unipodal.', 'Pelve instável no apoio unipodal: avaliar força do glúteo médio do lado do apoio.'],
    encTroncoUni: ['Tronco estável sobre a perna de apoio.', 'Tronco inclina sobre a perna de apoio: compensação comum de fraqueza do glúteo médio.'],
    encOmbrosUni: ['Ombros nivelados no apoio unipodal.', 'Ombros desnivelados no apoio unipodal: compensação do tronco.'],
    encJoelhoUni: ['Joelho de apoio alinhado.', 'Joelho de apoio desalinhado: avaliar controle do quadril (glúteo médio) e do pé.'],
    encBracoElev: ['Braços na altura dos ombros.', 'Braços fora da altura dos ombros: confira a posição antes de interpretar.'],
    encTroncoBracos: ['Tronco estável ao elevar os braços.', 'O tronco compensa ao elevar os braços: avaliar encurtamento de grande dorsal e peitorais e controle do core.'],
    encCorpoBracos: ['Corpo alinhado sobre os pés.', 'Corpo projetado ao elevar os braços: compensação postural.'],
    encJoelhoBracos: ['Joelhos em posição neutra.', 'Joelhos fora da posição neutra durante o teste.'],
  };
  explain = m => T[m.key] ? T[m.key][m.status === 'ok' || m.status === 'na' ? 0 : 1] : base(m);
}

/* desenho de referência dentro do cartão da vista (sem foto) */
function refArtFor(slot) { return REF_ART[slot] || ''; }

/* cartão no Início */
if (typeof ART !== 'undefined' && typeof HOME_CARDS !== 'undefined') {
  ART.encurt = REF_ART.encSlrD.replace('viewBox="0 0 160 100"', 'viewBox="0 -10 160 120"');
  const i = HOME_CARDS.findIndex(([k]) => k === 'adm');
  HOME_CARDS.splice(i < 0 ? HOME_CARDS.length : i, 0, ['encurt', 'Encurtamentos']);
}
