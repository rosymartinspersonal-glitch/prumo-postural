/* Prumo Postural — relatório PDF (jsPDF). */
'use strict';

const pdfSafe = s => String(s ?? '').replace(/≤ ?/g, 'até ').replace(/≥ ?/g, 'mín. ').replace(/[–—]/g, '-').replace(/[✓φ]/g, m => m === 'φ' ? 'phi' : '').replace(/×/g, 'x').replace(/÷/g, '/').replace(/…/g, '...');
const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0x1D2A6B; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

async function exportPDF(a, p) {
  if (!window.jspdf) await withTimeout(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), 20000);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }), S = await getSettings(), K = KINDS[kindOf(a)];
  const W = 210, Hh = 297, M = 14, INK = [20, 26, 51], MUT = [90, 97, 128];
  const SC = { ok: [23, 128, 74], warn: [168, 98, 0], bad: [192, 40, 58], na: MUT };
  let y = 0;
  const need = h => { if (y + h > Hh - 18) { doc.addPage(); y = 18; } };
  const h2 = t => { need(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK); doc.text(pdfSafe(t), M, y); y += 6; doc.setFont('helvetica', 'normal'); };
  const para = (t, size = 10, color = INK, indent = 0) => { doc.setFontSize(size); doc.setTextColor(...color); const L = doc.splitTextToSize(pdfSafe(t), W - 2 * M - indent); need(L.length * size * 0.45 + 1); doc.text(L, M + indent, y); y += L.length * size * 0.45 + 1; };

  // banner
  const bc = hexRgb(S.pdfColor), light = (bc[0] * 299 + bc[1] * 587 + bc[2] * 114) / 1000 > 150;
  doc.setFillColor(...bc); doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(...(light ? INK : [255, 255, 255])); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(pdfSafe(S.clinic || 'Avaliação postural'), M, 10);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  if (S.pdfSubtitle) doc.text(pdfSafe(S.pdfSubtitle), M, 15);
  doc.text(pdfSafe([S.professional, S.registry].filter(Boolean).join(' · ')), M, S.pdfSubtitle ? 20 : 16);
  if (S.contact) doc.text(pdfSafe(S.contact), M, S.pdfSubtitle ? 24.5 : 21);
  if (S.logo) { try { const li = await loadImg(S.logo), lh = 20, lw = Math.min(50, lh * li.naturalWidth / li.naturalHeight); doc.setFillColor(255, 255, 255); doc.roundedRect(W - M - lw - 2, 4, lw + 4, lh, 2, 2, 'F'); doc.addImage(S.logo, 'PNG', W - M - lw, 4, lw, lh); } catch { } }
  y = 37;
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(pdfSafe(K.label), M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUT); doc.text('Data: ' + fmtDate(a.date), W - M, y, { align: 'right' });
  y += 6;
  const ag = age(p.birth), im = bmi(p), sexo = { F: 'Feminino', M: 'Masculino', O: 'Outro' }[p.sex] || '-';
  const info = [['Paciente', p.name], ['Idade', ag != null ? ag + ' anos' : '-'], ['Sexo', sexo], ['Altura', p.height ? p.height + ' cm' : '-'], ['Peso', p.weight ? nf(p.weight) + ' kg' : '-'], ['IMC', im ? nf(im) + ' kg/m²' : '-']];
  doc.setFillColor(243, 244, 248); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'F');
  info.forEach(([k, v], i) => { const cx = M + 4 + (i % 3) * 61, cy = y + 7 + Math.floor(i / 3) * 9; doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(k.toUpperCase(), cx, cy - 2.6); doc.setFontSize(10); doc.setTextColor(...INK); doc.text(pdfSafe(v), cx, cy + 1.6, { maxWidth: 58 }); });
  y += 28;
  if (p.complaint) { doc.setFontSize(8); doc.setTextColor(...MUT); doc.text('QUEIXA PRINCIPAL', M, y); y += 4.5; para(p.complaint); y += 2; }

  const rowHeights = (m, tw) => {
    doc.setFontSize(9.5); const l = doc.splitTextToSize(pdfSafe(m.label), tw - 36).length;
    doc.setFontSize(7.5); const t = doc.splitTextToSize(pdfSafe(m.text + (m.ref ? ' · ref. ' + m.ref : '')), tw - 2).length;
    const e = S.pdfExplain && explain(m) ? doc.splitTextToSize(pdfSafe(explain(m)), tw - 2).length : 0;
    return { l, t, e, h: l * 4.2 + t * 3.3 + e * 3.3 + 3 };
  };
  const table = (ms, tx, tw, y0) => {
    let ty = y0;
    doc.setFontSize(7.5); doc.setTextColor(...MUT);
    doc.text('MEDIDA', tx, ty); doc.text('VALOR', tx + tw - 30, ty, { align: 'right' }); doc.text('SITUAÇÃO', tx + tw - 26, ty); ty += 2;
    doc.setDrawColor(211, 215, 228); doc.line(tx, ty, tx + tw, ty); ty += 4.5;
    for (const m of ms) {
      const rh = rowHeights(m, tw);
      if (ty + rh.h > Hh - 18) { doc.addPage(); ty = 18; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(pdfSafe(m.label), tw - 36), tx, ty);
      doc.setFont('courier', 'bold'); doc.text(pdfSafe(fmtM(m)), tx + tw - 30, ty, { align: 'right' }); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SC[m.status]); doc.setFillColor(...SC[m.status]); doc.circle(tx + tw - 25, ty - 1.1, 1.1, 'F'); doc.text(STATUS[m.status], tx + tw - 22.5, ty);
      let yy = ty + rh.l * 4.2 - 0.6;
      doc.setFontSize(7.5); doc.setTextColor(...MUT); const tl = doc.splitTextToSize(pdfSafe(m.text + (m.ref ? ' · ref. ' + m.ref : '')), tw - 2); doc.text(tl, tx, yy); yy += tl.length * 3.3;
      if (rh.e) { doc.setTextColor(60, 66, 96); const el = doc.splitTextToSize(pdfSafe(explain(m)), tw - 2); doc.text(el, tx, yy); }
      ty += rh.h;
    }
    return ty;
  };

  if (K.video) {
    const vv = a.video || {};
    h2('Resumo dos ângulos');
    const st = (vv.angles || []).map(k => ({ k, s: vstats(vv.series[k], vv.times) })).filter(x => x.s);
    doc.setFontSize(9.5);
    for (const { k, s } of st) { need(6); doc.setTextColor(...INK); doc.text(pdfSafe(VID_ANGLES[k].label), M, y); doc.setFont('courier', 'bold'); doc.text(`mín ${nf(s.min)}°  máx ${nf(s.max)}°  amplitude ${nf(s.amp)}°  média ${nf(s.mean)}°`, W - M, y, { align: 'right' }); doc.setFont('helvetica', 'normal'); y += 5.5; }
    y += 3;
    for (const { k } of st) { const c = seriesCanvas(vv.series[k], vv.times, pdfSafe(VID_ANGLES[k].label)); need(62); doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', M, y, W - 2 * M, (W - 2 * M) / 3); y += (W - 2 * M) / 3 + 4; }
    if (vv.keyframes?.length) { h2('Quadros-chave'); need(80); let x = M; for (const f of vv.keyframes) { const im2 = await loadImg(f.img); let iw = 80, ih = iw * im2.naturalHeight / im2.naturalWidth; if (ih > 100) { ih = 100; iw = ih * im2.naturalWidth / im2.naturalHeight; } doc.addImage(f.img, 'JPEG', x, y, iw, ih); doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(pdfSafe(f.label), x, y + ih + 4, { maxWidth: iw }); x += iw + 8; } y += 110; }
  } else {
    const slots = slotsOf(a).filter(s => viewReady(a.views[s], s));
    const cls = classifyPosture(a);
    if (cls) { need(18); doc.setFillColor(243, 244, 248); doc.roundedRect(M, y - 4, W - 2 * M, 14, 2, 2, 'F'); doc.setFontSize(8); doc.setTextColor(...MUT); doc.text('CLASSIFICAÇÃO POSTURAL ESTIMADA (KENDALL)', M + 3, y); doc.setFontSize(11); doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.text(pdfSafe(cls.tipo), M + 3, y + 6); doc.setFont('helvetica', 'normal'); y += 16; }
    for (const ref of slots.flatMap(s => measuresFor(s, a.views[s])).map(REFERRALS).filter(Boolean)) { need(10); doc.setTextColor(...SC.bad); doc.setFont('helvetica', 'bold'); para(ref, 10, SC.bad); doc.setFont('helvetica', 'normal'); y += 2; }
    for (const s of slots) {
      const vd = a.views[s], V = getView(s, vd), ms = measuresFor(s, vd);
      const cv = await compositeCanvas(V, vd, S, 1100);
      let iw = K.dynamic ? 48 : 62, ih = iw * cv.height / cv.width; const maxH = K.dynamic ? 64 : 96; if (ih > maxH) { ih = maxH; iw = ih * cv.width / cv.height; }
      const tx = M + iw + 6, tw = W - M - tx;
      const tblH = 8 + ms.reduce((t, m) => t + rowHeights(m, tw).h, 0);
      need(Math.min(Math.max(ih, tblH), Hh - 40) + 12);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK); doc.text(pdfSafe(V.label), M, y); y += 4;
      const y0 = y, page0 = doc.getNumberOfPages();
      doc.addImage(cv.toDataURL('image/jpeg', 0.85), 'JPEG', M, y, iw, ih);
      const ty = table(ms, tx, tw, y + 4);
      if (vd.comment) { doc.setFontSize(8.5); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(pdfSafe('Comentário: ' + vd.comment), tw), tx, ty + 1); }
      y = doc.getNumberOfPages() > page0 ? ty + 6 : Math.max(y0 + ih, ty + (vd.comment ? 6 : 0)) + 8;
    }
    const f = findings(a);
    h2('Principais achados');
    doc.setFontSize(9.5);
    if (!f.length) para('Nenhuma medida fora das faixas de referência.', 9.5);
    for (const { slot, m } of f) { need(6); doc.setFillColor(...SC[m.status]); doc.circle(M + 1.2, y - 1.1, 1.1, 'F'); doc.setTextColor(...INK); const L = doc.splitTextToSize(pdfSafe(`${m.label} (${slotLabel(a, slot).toLowerCase()}): ${m.text.toLowerCase()}, ${fmtM(m)}`), W - 2 * M - 4); doc.text(L, M + 4, y); y += L.length * 4.3 + 0.8; }
    if (a.includeExercises !== false && S.pdfExercises) {
      const ex = exercisesFor(f);
      if (ex.length) {
        y += 3; h2('Orientações de exercícios');
        for (const e of ex) {
          const steps = e.steps.map((s2, i) => `${i + 1}. ${s2}`).join('  ');
          doc.setFontSize(8.5); const L = doc.splitTextToSize(pdfSafe(steps), W - 2 * M); need(6 + L.length * 3.8);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(pdfSafe(e.name), M, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUT); doc.text(pdfSafe(e.dose), W - M, y, { align: 'right' }); y += 4;
          doc.setTextColor(...INK); doc.text(L, M, y); y += L.length * 3.8 + 2.5;
        }
      }
    }
  }
  if (a.notes) { y += 3; h2('Observações da coleta'); para(a.notes); }
  if (a.conclusion) { y += 3; h2('Conclusão do profissional'); para(a.conclusion); }
  need(30); y = Math.max(y + 18, Hh - 40);
  doc.setDrawColor(...INK); doc.line(W / 2 - 40, y, W / 2 + 40, y);
  doc.setFontSize(9); doc.setTextColor(...INK); doc.text(pdfSafe(S.professional || 'Profissional responsável'), W / 2, y + 4.5, { align: 'center' });
  if (S.registry) doc.text(pdfSafe(S.registry), W / 2, y + 9, { align: 'center' });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...MUT);
    doc.text('Medidas obtidas por fotogrametria 2D. Ferramenta de apoio: os resultados devem ser interpretados por profissional habilitado e não constituem diagnóstico.', M, Hh - 8, { maxWidth: W - 2 * M - 20 });
    doc.text(`${i}/${n}`, W - M, Hh - 8, { align: 'right' });
  }
  doc.save(`${slug(K.label)}-${slug(p.name)}-${a.date.slice(0, 10)}.pdf`);
}
