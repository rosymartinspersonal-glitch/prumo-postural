/* TEAMRM — Testes de encurtamento: faixas de normal editáveis, comparação direito × esquerdo e PDF lado a lado. */
'use strict';

/* ---------- faixas de normal (editáveis em Ajustes) ----------
   dir 'min' = quanto maior, melhor (normal ≥ ok; atenção ≥ warn) · 'max' = quanto menor, melhor (normal ≤ ok; atenção ≤ warn) */
const ENC_LIM = {
  encSlr: { label: 'Elevação da perna estendida', dir: 'min', ok: 80, warn: 70, u: '°', src: 'AAOS 70°–90°; abaixo de 70° é clinicamente relevante', txt: ['Isquiotibiais com boa flexibilidade', 'Leve encurtamento dos isquiotibiais', 'Encurtamento dos isquiotibiais'] },
  encEly: { label: 'Flexão do joelho de bruços (Ely)', dir: 'min', ok: 120, warn: 100, u: '°', src: 'flexão normal do joelho ≈ 135° (calcanhar perto do glúteo)', txt: ['Flexibilidade do quadríceps preservada', 'Leve encurtamento do quadríceps / reto femoral', 'Encurtamento do quadríceps / reto femoral'] },
  encElyQuadril: { label: 'Elevação do quadril no Ely', dir: 'max', ok: 10, warn: 20, u: '°', src: 'Ely positivo quando o quadril flexiona sozinho', txt: ['Quadril apoiado no chão', 'Quadril começa a sair do chão', 'Quadril sai do chão — Ely positivo (reto femoral encurtado)'] },
  encTroncoCoxa: { label: 'Ângulo tronco–coxa (sentar e alcançar)', dir: 'max', ok: 70, warn: 90, u: '°', src: 'mesmo critério da flexão anterior do app', txt: ['Boa flexibilidade de cadeia posterior', 'Flexibilidade reduzida', 'Flexibilidade muito reduzida'] },
  encAlcance: { label: 'Alcance até o pé (com régua)', dir: 'min', ok: 0, warn: -10, u: 'cm', src: 'alcançar a ponta do pé (toe-touch)', txt: ['Alcançou o pé', 'Não alcançou o pé (perto)', 'Não alcançou o pé'] },
  encAlcanceRel: { label: 'Alcance até o pé (sem régua)', dir: 'min', ok: 0, warn: -12, u: '%', src: 'alcançar a ponta do pé (toe-touch)', txt: ['Alcançou o pé', 'Não alcançou o pé (perto)', 'Não alcançou o pé'] },
  encJoelhoExt: { label: 'Joelho dobrado no sentar e alcançar', dir: 'max', ok: 10, warn: 20, u: '°', src: 'controle de qualidade da foto' },
  encSlrJoelho: { label: 'Joelho dobrado na elevação da perna', dir: 'max', ok: 10, warn: 20, u: '°', src: 'controle de qualidade da foto' },
  encPelveUni: { label: 'Queda da pelve no apoio unipodal', dir: 'max', ok: 2, warn: 4, u: '°', src: 'Asayama > 2°; Westhoff > 4° (StatPearls)' },
  encTroncoUni: { label: 'Inclinação do tronco no apoio unipodal', dir: 'max', ok: 3, warn: 6, u: '°', src: 'compensação do glúteo médio' },
  encOmbrosUni: { label: 'Ombros no apoio unipodal', dir: 'max', ok: 3, warn: 5, u: '°', src: 'nivelamento' },
  encJoelhoUni: { label: 'Joelho de apoio (valgo/varo)', dir: 'max', ok: 10, warn: 15, u: '°', src: 'alinhamento frontal' },
  encTroncoBracos: { label: 'Tronco com os braços à frente', dir: 'max', ok: 5, warn: 10, u: '°', src: 'compensação lombar' },
  encCorpoBracos: { label: 'Corpo com os braços à frente', dir: 'max', ok: 3, warn: 6, u: '°', src: 'alinhamento sobre os pés' },
  encFlexMaos: { label: 'Nível das mãos na flexão anterior', dir: 'max', ok: 3, warn: 6, u: '°', src: 'simetria' },
  encFlexOmbros: { label: 'Nível dos ombros na flexão anterior', dir: 'max', ok: 3, warn: 6, u: '°', src: 'simetria / rotação' },
  encFlexCentro: { label: 'Centralização do alcance', dir: 'max', ok: 10, warn: 20, u: '%', src: 'simetria' },
  encDifDE: { label: 'Diferença entre direito e esquerdo (ângulos)', dir: 'max', ok: 5, warn: 10, u: '°', src: 'assimetria clínica' },
  encDifDEcm: { label: 'Diferença entre direito e esquerdo (cm)', dir: 'max', ok: 3, warn: 6, u: 'cm', src: 'assimetria clínica' },
  encDifDEpct: { label: 'Diferença entre direito e esquerdo (%)', dir: 'max', ok: 5, warn: 10, u: '%', src: 'assimetria clínica' },
};
const ENC_DEF = JSON.parse(JSON.stringify(ENC_LIM));
async function encLoadRanges() {
  try { const r = (await Store.get('settings', 'encRanges'))?.v || {}; for (const k in ENC_LIM) Object.assign(ENC_LIM[k], { ok: ENC_DEF[k].ok, warn: ENC_DEF[k].warn }, r[k] || {}); } catch (e) { }
}
const encRef = L => `${L.dir === 'min' ? '≥' : '≤'} ${nf(L.ok, Number.isInteger(L.ok) ? 0 : 1)}${L.u === '°' ? '°' : ' ' + L.u} (atenção ${L.dir === 'min' ? '≥' : '≤'} ${nf(L.warn, Number.isInteger(L.warn) ? 0 : 1)}${L.u === '°' ? '°' : ' ' + L.u})`;
function encStatus(L, v) { return L.dir === 'min' ? (v >= L.ok ? 'ok' : v >= L.warn ? 'warn' : 'bad') : (v <= L.ok ? 'ok' : v <= L.warn ? 'warn' : 'bad'); }
// aplica as faixas atuais às medidas de cada vista dos encurtamentos
for (const k of Object.keys(VIEWS)) {
  if (!/^enc/.test(k)) continue;
  const V = VIEWS[k], base = V.measures.bind(V);
  V.measures = (P, sc) => base(P, sc).map(m => {
    const L = ENC_LIM[m.key]; if (!L) return m;
    const v = m.key === 'encJoelhoBracos' ? Math.abs(m.score) : m.score, st = encStatus(L, v);
    const big = 1e6;
    return { ...m, status: st, ok: L.dir === 'min' ? [L.ok, big] : [-big, L.ok], warn: L.dir === 'min' ? [L.warn, big] : [-big, L.warn], ref: encRef(L),
      text: L.txt ? L.txt[st === 'ok' ? 0 : st === 'warn' ? 1 : 2] : m.text };
  });
}

/* ---------- direito × esquerdo ---------- */
const ENC_PAIRS = [['encFlexLat', 'Flexão anterior — vistas laterais'], ['encSentUni', 'Sentar e alcançar unilateral'], ['encSentBil', 'Sentar e alcançar (duas pernas)'], ['encSlr', 'Elevação da perna estendida'],
  ['encProno', 'Teste de Ely (de bruços)'], ['encUnip', 'Apoio unipodal (Trendelenburg)'], ['encCeg', 'Apoio unipodal com flexão do quadril'], ['encBracos', 'Braços elevados à frente']];
// para medidas sem faixa própria (ex.: as da flexão anterior lateral), qual lado é "pior"
const ENC_DIR_EXTRA = { troncoCoxa: 'max', dedoChao: 'max', dedoChaoRel: 'max', joelhoFlex: 'max', flexTronco: 'min', curvaDorsal: null };
function encCompare(a) {
  const out = [];
  for (const [b, label] of ENC_PAIRS) {
    const sD = b + 'D', sE = b + 'E', vD = a.views?.[sD], vE = a.views?.[sE];
    const rD = viewReady(vD, sD), rE = viewReady(vE, sE);
    if (!rD && !rE) continue;
    const mD = rD ? measuresFor(sD, vD) : [], mE = rE ? measuresFor(sE, vE) : [];
    const keys = [...new Set([...mD, ...mE].map(m => m.key))];
    const rows = keys.map(k => {
      const d = mD.find(m => m.key === k), e = mE.find(m => m.key === k), any = d || e;
      const row = { key: k, label: any.label, unit: any.unit, d, e, diff: null, status: 'na', worse: null, text: rD && rE ? '' : 'Falta a foto do outro lado' };
      if (d && e) {
        const dv = Number(d.v), ev = Number(e.v), diff = Math.abs(dv - ev);
        const L = ENC_LIM[any.unit === 'cm' ? 'encDifDEcm' : any.unit === '%' ? 'encDifDEpct' : 'encDifDE'];
        row.diff = diff; row.status = encStatus(L, diff);
        const dir = ENC_LIM[k]?.dir || ENC_DIR_EXTRA[k];
        if (row.status !== 'ok' && dir) row.worse = dir === 'min' ? (dv < ev ? 'D' : 'E') : (dv > ev ? 'D' : 'E');
        row.text = row.status === 'ok' ? 'Simétrico' : row.worse ? `Lado ${row.worse === 'D' ? 'direito' : 'esquerdo'} mais limitado` : 'Assimetria entre os lados';
        row.pct = Math.max(Math.abs(dv), Math.abs(ev)) > 0.01 ? diff / Math.max(Math.abs(dv), Math.abs(ev)) * 100 : 0;
      }
      return row;
    });
    out.push({ base: b, label, rows, both: rD && rE });
  }
  return out;
}
const fmtNum = (v, unit) => v == null ? '—' : unit === '°' ? nf(v) + '°' : unit === 'cm' ? nf(cmOut(v)) + ' ' + cmUnit() : unit === '%' ? nf(v) + '%' : nf(v);
function encCompareHTML(a) {
  const C = encCompare(a); if (!C.length) return '';
  const nAsym = C.flatMap(c => c.rows).filter(r => r.status === 'warn' || r.status === 'bad').length;
  return `<section class="panel stack" id="enc-de"><div class="row spread"><h2>Direito × esquerdo</h2><span class="st ${nAsym ? 'warn' : 'ok'}">${nAsym ? nAsym + ' assimetria' + (nAsym > 1 ? 's' : '') : 'Sem assimetrias'}</span></div>
    <p class="muted" style="margin:0;font-size:.88rem">Diferença entre os lados em cada teste. Simétrico: até ${nf(ENC_LIM.encDifDE.ok, 0)}° (${nf(ENC_LIM.encDifDEcm.ok, 0)} cm ou ${nf(ENC_LIM.encDifDEpct.ok, 0)}%); alterado acima de ${nf(ENC_LIM.encDifDE.warn, 0)}°. Ajuste em Ajustes → Faixas dos testes de encurtamento.</p>
    ${C.map(c => `<div class="stack" style="gap:6px"><h3 style="margin-top:6px">${esc(c.label)}</h3><div class="tbl-wrap"><table><thead><tr><th>Medida</th><th style="text-align:right">Direito</th><th style="text-align:right">Esquerdo</th><th style="text-align:right">Diferença</th><th>Situação</th></tr></thead><tbody>
      ${c.rows.map(r => `<tr><td>${esc(r.label)}</td><td class="v">${r.d ? esc(fmtM(r.d)) : '—'}</td><td class="v">${r.e ? esc(fmtM(r.e)) : '—'}</td><td class="v">${r.diff == null ? '—' : esc(fmtNum(r.diff, r.unit))}</td><td>${r.diff == null ? `<span class="muted" style="font-size:.85rem">${esc(r.text)}</span>` : `<span class="st ${r.status}">${esc(r.text)}</span>`}</td></tr>`).join('')}
    </tbody></table></div></div>`).join('')}</section>`;
}
{ const base = SCREENS.results; SCREENS.results = async args => { await base(args); try { const a = await Store.get('assessments', args.id); const h = a && encCompareHTML(a); if (h) { const anchor = $('.summary'); (anchor || app.lastElementChild).insertAdjacentHTML('afterend', h); } } catch (e) { } }; }

/* ---------- Ajustes: editar as faixas ---------- */
{ const base = SCREENS.settings; SCREENS.settings = async args => {
  await base(args);
  const host = $$('details.setitem').pop()?.parentElement; if (!host) return;
  host.insertAdjacentHTML('beforeend', `<details class="setitem" id="enc-ranges"><summary><span class="sico">↔</span><span><b>Faixas dos testes de encurtamento</b><small>Valores de normal e de atenção usados nos resultados e no PDF</small></span></summary>
    <div class="stack" style="padding:12px 0 4px"><p class="muted" style="margin:0;font-size:.88rem">Padrão do app com a referência de cada valor. Troque pelos valores que você usa na clínica; vale para avaliações novas e antigas.</p>
    <div class="tbl-wrap"><table><thead><tr><th>Medida</th><th></th><th style="text-align:right">Normal</th><th style="text-align:right">Atenção</th><th>Referência</th></tr></thead><tbody>
    ${Object.entries(ENC_LIM).map(([k, L]) => `<tr><td>${esc(L.label)}</td><td class="muted">${L.dir === 'min' ? '≥' : '≤'}</td><td class="v"><input class="vin" data-rk="${k}" data-f="ok" inputmode="decimal" value="${nf(L.ok, Number.isInteger(L.ok) ? 0 : 1)}" aria-label="Normal: ${esc(L.label)}"> ${esc(L.u)}</td><td class="v"><input class="vin" data-rk="${k}" data-f="warn" inputmode="decimal" value="${nf(L.warn, Number.isInteger(L.warn) ? 0 : 1)}" aria-label="Atenção: ${esc(L.label)}"> ${esc(L.u)}</td><td><span class="ref">${esc(L.src || '')}${L.ok !== ENC_DEF[k].ok || L.warn !== ENC_DEF[k].warn ? ` · padrão ${ENC_DEF[k].dir === 'min' ? '≥' : '≤'} ${ENC_DEF[k].ok}/${ENC_DEF[k].warn}` : ''}</span></td></tr>`).join('')}
    </tbody></table></div><div class="row spread"><button class="btn ghost" id="er-reset">Restaurar padrão</button><button class="btn primary" id="er-save">Salvar faixas</button></div></div></details>`);
  $('#er-save').onclick = async () => {
    const v = {};
    for (const i of $$('[data-rk]')) { const n = Number(String(i.value).replace(',', '.')); if (!Number.isFinite(n)) { i.focus(); return toast('Valor inválido'); } (v[i.dataset.rk] ||= {})[i.dataset.f] = n; }
    for (const [k, o] of Object.entries(v)) { const L = ENC_LIM[k]; if (L.dir === 'min' ? o.warn > o.ok : o.warn < o.ok) return toast(`“${L.label}”: atenção precisa ficar ${L.dir === 'min' ? 'abaixo' : 'acima'} do normal`, 4000); }
    await Store.put('settings', { id: 'encRanges', v }); await encLoadRanges(); toast('Faixas salvas'); go('settings');
  };
  $('#er-reset').onclick = async () => { if (await confirmBox('Restaurar padrão?', 'As faixas dos testes de encurtamento voltam aos valores do app.', 'Restaurar')) { await Store.del('settings', 'encRanges'); await encLoadRanges(); go('settings'); } };
}; }

/* ---------- PDF dos encurtamentos: direito e esquerdo lado a lado ---------- */
async function encPDF(o) {
  const { doc, a, S, M, W, Hh, h2, para, need, SC, INK, MUT, getY, setY } = o;
  let y = getY();
  const box = (x, w, img, cv) => { let iw = w, ih = iw * cv.height / cv.width; if (ih > 78) { ih = 78; iw = ih * cv.width / cv.height; } doc.addImage(img, 'JPEG', x + (w - iw) / 2, y, iw, ih); return ih; };
  const sync = () => setY(y), pull = () => { y = getY(); };
  const colW = (W - 2 * M - 6) / 2;
  const singles = ['encFlexAnt', 'adamsPost'].filter(s => viewReady(a.views[s], s));
  const C = encCompare(a);
  // resumo de assimetrias
  const asym = C.flatMap(c => c.rows.filter(r => r.status === 'warn' || r.status === 'bad').map(r => ({ c, r })));
  sync(); h2('Resumo direito × esquerdo'); pull();
  doc.setFontSize(9.5);
  if (!asym.length) { sync(); para('Nenhuma assimetria acima da faixa entre os lados testados.', 9.5); pull(); }
  for (const { c, r } of asym) { need(6); doc.setFillColor(...SC[r.status]); doc.circle(M + 1.2, y - 1.1, 1.1, 'F'); doc.setTextColor(...INK); const L = doc.splitTextToSize(pdfSafe(`${c.label} — ${r.label}: D ${fmtM(r.d)} × E ${fmtM(r.e)} (diferença ${fmtNum(r.diff, r.unit)}). ${r.text}.`), W - 2 * M - 4); doc.text(L, M + 4, y); y += L.length * 4.2 + 1; }
  y += 3;
  for (const c of C) {
    const sD = c.base + 'D', sE = c.base + 'E';
    need(100); sync(); h2(c.label); pull();
    doc.setFontSize(8); doc.setTextColor(...MUT); doc.text('DIREITO', M + colW / 2, y, { align: 'center' }); doc.text('ESQUERDO', M + colW + 6 + colW / 2, y, { align: 'center' }); y += 2;
    let hMax = 0;
    for (const [s, x] of [[sD, M], [sE, M + colW + 6]]) {
      const vd = a.views[s];
      if (viewReady(vd, s)) { const cv = await compositeCanvas(getView(s, vd), vd, S, 900); hMax = Math.max(hMax, box(x, colW, cv.toDataURL('image/jpeg', 0.85), cv)); }
      else { doc.setDrawColor(211, 215, 228); doc.roundedRect(x, y, colW, 30, 2, 2); doc.setFontSize(9); doc.setTextColor(...MUT); doc.text('Sem foto', x + colW / 2, y + 16, { align: 'center' }); hMax = Math.max(hMax, 30); }
    }
    y += hMax + 5;
    // tabela comparativa
    const cx = [M, M + 82, M + 107, M + 132, M + 150];
    need(10); doc.setFontSize(7.5); doc.setTextColor(...MUT); ['MEDIDA', 'DIREITO', 'ESQUERDO', 'DIFERENÇA', 'SITUAÇÃO'].forEach((h, i) => doc.text(h, cx[i], y)); y += 1.8; doc.setDrawColor(211, 215, 228); doc.line(M, y, W - M, y); y += 4;
    for (const r of c.rows) {
      doc.setFontSize(9); const lab = doc.splitTextToSize(pdfSafe(r.label), 78), st = r.diff == null ? null : r.status;
      const sm = doc.splitTextToSize(pdfSafe(r.text), W - M - cx[4] - 3);
      const ref = (r.d || r.e)?.ref ? doc.splitTextToSize(pdfSafe('ref. ' + (r.d || r.e).ref), 78) : [];
      const h = Math.max(lab.length * 4, sm.length * 3.6) + ref.length * 3.2 + 2;
      need(h);
      doc.setTextColor(...INK); doc.text(lab, cx[0], y);
      doc.setFont('courier', 'bold');
      for (const [m, i] of [[r.d, 1], [r.e, 2]]) { if (m) { doc.setTextColor(...SC[m.status]); doc.text(pdfSafe(fmtM(m)), cx[i], y); } else { doc.setTextColor(...MUT); doc.text('-', cx[i], y); } }
      doc.setTextColor(...INK); doc.text(pdfSafe(r.diff == null ? '-' : fmtNum(r.diff, r.unit)), cx[3], y); doc.setFont('helvetica', 'normal');
      doc.setFontSize(8); if (st) { doc.setTextColor(...SC[st]); doc.setFillColor(...SC[st]); doc.circle(cx[4] - 2, y - 1.1, 1, 'F'); } else doc.setTextColor(...MUT); doc.text(sm, cx[4], y);
      if (ref.length) { doc.setFontSize(7); doc.setTextColor(...MUT); doc.text(ref, cx[0], y + lab.length * 4 - 0.8); }
      y += h;
    }
    y += 4;
  }
  for (const s of singles) {
    const vd = a.views[s], V = getView(s, vd), ms = measuresFor(s, vd);
    need(90); sync(); h2(V.label); pull();
    const cv = await compositeCanvas(V, vd, S, 900); const ih = box(M, colW, cv.toDataURL('image/jpeg', 0.85), cv);
    let ty = y + 2; const tx = M + colW + 6;
    for (const m of ms) { doc.setFontSize(9); doc.setTextColor(...INK); const L = doc.splitTextToSize(pdfSafe(m.label), colW - 30); doc.text(L, tx, ty); doc.setFont('courier', 'bold'); doc.setTextColor(...SC[m.status]); doc.text(pdfSafe(fmtM(m)), W - M, ty, { align: 'right' }); doc.setFont('helvetica', 'normal'); ty += L.length * 4; doc.setFontSize(7.5); doc.setTextColor(...MUT); const t = doc.splitTextToSize(pdfSafe(m.text + ' · ref. ' + m.ref), colW); doc.text(t, tx, ty); ty += t.length * 3.3 + 2; }
    y = Math.max(y + ih, ty) + 6;
  }
  sync();
}
