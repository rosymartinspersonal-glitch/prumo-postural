/* TEAMRM — Contratos Personal: PDFs (contrato, calendário, diretrizes, conjunto, versão assinada e comprovante). */
'use strict';

async function pcPDF(k, cl, part) {
  if (!window.jspdf) await withTimeout(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), 20000);
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const P = await pcProfessional(), S = k.schedule, Y = PC.yearSummary(S);
  const W = 210, H = 297, M = 15, INK = [17, 17, 17], MUT = [93, 92, 87], ACC = [231, 152, 19], GREEN = [23, 128, 74], RED = [192, 40, 58];
  const T = s => pdfSafe(s);
  let y = 0, title = '';
  const newPage = t => { if (y) doc.addPage(); title = t || title; header(); };
  const header = () => {
    doc.setFillColor(13, 13, 13); doc.rect(0, 0, W, 20, 'F'); doc.setFillColor(...ACC); doc.rect(0, 20, W, 1.2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(T(title), M, 9);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(230, 230, 230);
    doc.text(T(`${P.name || 'Profissional'}${P.reg ? ' · ' + P.reg : ''}`), M, 15);
    doc.text(T(`Aluno: ${cl?.name || '—'} · ${k.title} · versão ${k.version}`), W - M - (logoW ? logoW + 4 : 0), 15, { align: 'right' });
    if (logo) try { doc.addImage(logo, 'PNG', W - M - logoW, 3, logoW, 14); } catch (e) { }
    y = 30;
  };
  let logo = null, logoW = 0;
  try { const src = P.logo || 'assets/logo.png', li = await loadImg(src), c = document.createElement('canvas'); c.width = li.naturalWidth; c.height = li.naturalHeight; c.getContext('2d').drawImage(li, 0, 0); logo = c.toDataURL('image/png'); logoW = Math.min(36, 14 * li.naturalWidth / li.naturalHeight); } catch (e) { }
  const need = h => { if (y + h > H - 18) newPage(); };
  const h2 = t => { need(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK); doc.text(T(t), M, y); y += 2; doc.setDrawColor(...ACC); doc.setLineWidth(0.6); doc.line(M, y, M + 24, y); doc.setLineWidth(0.2); y += 6; };
  const h3 = t => { need(10); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK); const L = doc.splitTextToSize(T(t), W - 2 * M); doc.text(L, M, y); y += L.length * 4.6 + 1.5; };
  const para = (t, size = 9.5, color = INK, indent = 0, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color); const L = doc.splitTextToSize(T(t), W - 2 * M - indent); for (const line of L) { need(size * 0.45); doc.text(line, M + indent, y); y += size * 0.45; } y += 1.2; };
  const field = (label, value) => { doc.setFontSize(9.5); const lw = 58, L = doc.splitTextToSize(T(value || ' '), W - 2 * M - lw - 2); need(L.length * 4.4 + 2); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUT); doc.text(doc.splitTextToSize(T(label), lw - 2), M, y); doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.text(L, M + lw, y); doc.setDrawColor(225, 224, 218); doc.line(M + lw, y + 1.2 + (L.length - 1) * 4.4, W - M, y + 1.2 + (L.length - 1) * 4.4); y += L.length * 4.4 + 2.4; doc.setFont('helvetica', 'normal'); };
  const table = (cols, rows, widths, opts = {}) => {
    const rowH = 6.2, drawHead = () => { doc.setFillColor(13, 13, 13); doc.rect(M, y - 4.3, W - 2 * M, rowH, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255); let x = M + 2; cols.forEach((c, i) => { doc.text(T(c), i ? x + widths[i] - 4 : x, y, i ? { align: 'right' } : undefined); x += widths[i]; }); y += rowH; doc.setFont('helvetica', 'normal'); };
    need(rowH * 2); drawHead();
    rows.forEach((r, ri) => {
      if (y + rowH > H - 18) { newPage(); drawHead(); }
      if (opts.bold?.(ri)) doc.setFont('helvetica', 'bold'); if (ri % 2) { doc.setFillColor(245, 244, 240); doc.rect(M, y - 4.3, W - 2 * M, rowH, 'F'); }
      doc.setFontSize(9); doc.setTextColor(...INK); let x = M + 2; r.forEach((c, i) => { doc.text(T(String(c)), i ? x + widths[i] - 4 : x, y, i ? { align: 'right' } : undefined); x += widths[i]; }); y += rowH; doc.setFont('helvetica', 'normal');
    }); y += 3;
  };
  const signLines = () => { need(40); y += 16; const w = (W - 2 * M - 16) / 2; doc.setDrawColor(...INK); doc.line(M, y, M + w, y); doc.line(M + w + 16, y, W - M, y); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(T(cl?.name || 'Aluno(a)'), M + w / 2, y + 4.5, { align: 'center' }); doc.text(T(P.name || 'Profissional'), M + w + 16 + w / 2, y + 4.5, { align: 'center' }); doc.setFontSize(8); doc.setTextColor(...MUT); doc.text('Contratante', M + w / 2, y + 8.5, { align: 'center' }); doc.text(T('Contratada' + (P.reg ? ' · ' + P.reg : '')), M + w + 16 + w / 2, y + 8.5, { align: 'center' }); y += 14; };

  const partContrato = () => { newPage('Contrato de prestação de serviços de personal trainer'); h2(k.title); for (const s of k.sections) { h3(s.title); for (const i of s.items) { if (i.type === 'field') field(i.label, i.value); else { para(i.label, 9.5, INK, 0, true); y -= 0.6; para(i.text || '', 9.5); } } y += 2; } signLines(); };
  const partCal = () => {
    newPage(`Calendário de aulas de personal — ${S.year}`);
    h2(`Calendário ${S.year}`);
    const R = PC.ruleAt(S, S.start);
    field('Período', `${PC.br(S.start)} a ${PC.br(S.end)}`);
    field('Dias e horários', R.days.map(d => `${PC.DOW[d.dow]}${d.time ? ' às ' + d.time : ''}`).join(', ') || '—');
    field('Duração e valor', [...new Set(R.days.map(d => `${d.dur} min · ${PC.money(d.price)} por aula`))].join(' / ') || '—');
    if ((S.rules || []).length > 1) for (const r of S.rules.slice(1)) field(`A partir de ${PC.br(r.from)}`, r.days.map(d => `${PC.DOW[d.dow]} ${d.time || ''} (${d.dur} min, ${PC.money(d.price)})`).join('; '));
    y += 2;
    // 12 mini-calendários (3 por linha)
    const cw = (W - 2 * M - 8) / 3, cellW = cw / 7, cellH = 5.2;
    for (let row = 0; row < 4; row++) {
      need(7 * cellH + 16);
      const y0 = y;
      for (let col = 0; col < 3; col++) {
        const m = row * 3 + col + 1, x0 = M + col * (cw + 4), MS = Y.months[m - 1], byDate = Object.fromEntries(MS.lessons.map(l => [l.date, l]));
        const offBy = Object.fromEntries((S.offs || []).map(o => [o.date, o]));
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(T(PC.MONTHS[m - 1].toUpperCase()), x0 + cw / 2, y0, { align: 'center' });
        doc.setFontSize(7); doc.setTextColor(...MUT); PC.DOW_S.forEach((d, i) => doc.text(d, x0 + i * cellW + cellW / 2, y0 + 4.5, { align: 'center' }));
        const first = new Date(Date.UTC(S.year, m - 1, 1)).getUTCDay();
        for (let d = 1; d <= PC.daysIn(S.year, m); d++) {
          const idx = first + d - 1, cx = x0 + (idx % 7) * cellW, cy = y0 + 6 + Math.floor(idx / 7) * cellH, date = PC.iso(S.year, m, d), L = byDate[date], off = offBy[date];
          if (L && !L.discounted) { doc.setFillColor(...(L.extra ? [214, 236, 247] : [220, 241, 228])); doc.rect(cx + 0.3, cy + 0.3, cellW - 0.6, cellH - 0.6, 'F'); }
          else if (off && off.kind !== 'reposicao' && (off.discount || L)) { doc.setFillColor(251, 227, 230); doc.rect(cx + 0.3, cy + 0.3, cellW - 0.6, cellH - 0.6, 'F'); }
          doc.setFont('helvetica', L && !L.discounted ? 'bold' : 'normal'); doc.setFontSize(7.5); doc.setTextColor(...(L?.discounted || (off && off.discount && off.kind !== 'reposicao') ? RED : L ? GREEN : INK)); doc.text(String(d), cx + cellW / 2, cy + 3.7, { align: 'center' });
        }
        doc.setFillColor(251, 239, 217); doc.rect(x0, y0 + 6 + 6 * cellH + 1, cw, 9, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...INK);
        doc.text(T(`Total: ${PC.money(MS.value)}${MS.manual ? ' *' : ''}`), x0 + 2, y0 + 6 + 6 * cellH + 4.6); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUT); doc.text(T(`${MS.effective} aulas${MS.discounted ? ` · ${MS.discounted} feriado${MS.discounted > 1 ? 's' : ''} desc.` : ''}${MS.extra ? ` · ${MS.extra} extra` : ''}`), x0 + 2, y0 + 6 + 6 * cellH + 8.2);
      }
      y = y0 + 6 + 6 * cellH + 16;
    }
    para('Verde: dia com aula · Azul: reposição ou aula extra · Vermelho: feriado ou recesso sem atendimento' + (Y.months.some(M => M.manual) ? ' · * valor ajustado manualmente' : ''), 8, MUT);
    newPage(); h2('Valores por mês');
    table(['Mês', 'Previstas', 'Descontadas', 'Extras', 'Aulas', 'Valor do mês'], [...Y.months.map(M => [PC.MONTHS[M.m - 1], M.planned, M.discounted ? '-' + M.discounted : 0, M.extra, M.effective, PC.money(M.value) + (M.manual ? ' *' : '')]), ['Soma dos 12 meses', '', '', '', Y.lessons, PC.money(Y.total)]], [48, 24, 28, 20, 20, 40], { bold: i => i === 12 });
    if (S.fixedMonthly) { need(26); doc.setFillColor(13, 13, 13); doc.roundedRect(M, y - 2, W - 2 * M, 20, 2, 2, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('VALOR MENSAL FIXO', M + 5, y + 5); doc.setFontSize(15); doc.setTextColor(...ACC); doc.text(T(PC.money(Y.fixed)), W - M - 5, y + 7, { align: 'right' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(230, 230, 230); doc.text(T(`${PC.money(Y.total)} ÷ 12 = ${PC.money(Y.fixedCalc)}${Y.fixedManual ? ' · valor ajustado manualmente' : ''} · igual em todos os meses`), M + 5, y + 12.5); y += 24; }
    const offs = (S.offs || []).filter(o => o.kind === 'reposicao' || o.discount || PC.monthLessons(S, +o.date.slice(0, 4), +o.date.slice(5, 7)).some(x => x.date === o.date)).sort((a, b) => a.date.localeCompare(b.date));
    if (offs.length) { h3('Feriados, recessos, pausas e reposições'); table(['Data', 'Dia', 'Descrição', 'Situação'], offs.map(o => { const les = PC.monthLessons(S, +o.date.slice(0, 4), +o.date.slice(5, 7)).find(x => x.date === o.date); return [PC.br(o.date), PC.DOW[PC.dowOf(o.date)], o.name.slice(0, 44), o.kind === 'reposicao' ? 'Reposição' : les && les.discounted ? 'Sem atendimento' : les ? 'Aula mantida' : 'Não é dia de aula']; }), [26, 24, 82, 48]); }
    const notes = Object.entries(S.lessons || {}).filter(([, v]) => v.note).sort(); if (notes.length) { h3('Observações por data'); for (const [d, v] of notes) para(`${PC.br(d)}: ${v.note}`, 9); }
  };
  const partDir = () => { newPage('Diretrizes das aulas de personal'); h2('Manual das aulas — diretrizes do atendimento'); k.guidelines.forEach((g, i) => { h3(`${String(i + 1).padStart(2, '0')}  ${g.title}`); const L = PC.htmlToLines(g.html); if (!L.length) para('—', 9.5, MUT); for (const l of L) para(l, 9.5, INK, l.startsWith('•') ? 3 : 0); y += 2; }); };
  const partProof = () => {
    const sg = k.signing || {};
    newPage('Comprovante de assinatura'); h2('Comprovante de assinatura eletrônica');
    field('Documento', `${k.title} — versão ${k.version}`); field('Aluno', cl?.name || '—'); field('Profissional', `${P.name || '—'}${P.reg ? ' · ' + P.reg : ''}`);
    field('Versão congelada em', sg.frozenAt ? new Date(sg.frozenAt).toLocaleString('pt-BR') : '—'); field('Código da versão (SHA-256)', sg.hash || '—');
    field('Provedor / método', sg.provider || 'pendente');
    for (const s of sg.signers || []) field(`Assinatura — ${s.role}`, `${s.name}${s.at ? ' em ' + new Date(s.at).toLocaleString('pt-BR') : ''}`);
    field('PDF assinado', sg.signedFile ? `${sg.signedFile.name} · SHA-256 ${sg.signedFile.hash}` : '—');
    field('Registrado no app em', sg.signedAt ? new Date(sg.signedAt).toLocaleString('pt-BR') : '—');
    y += 3; para('A validade jurídica e a verificação de identidade dos signatários são as do provedor de assinatura indicado; o PDF assinado e a trilha de auditoria do provedor ficam anexados a este contrato. O código SHA-256 permite conferir que o conteúdo da versão não foi alterado.', 8.5, MUT);
    if ((k.history || []).length) { h3('Histórico'); for (const h of k.history) para(`${new Date(h.at).toLocaleString('pt-BR')} — ${h.event}`, 8.5); }
  };

  if (part === 'contrato') partContrato();
  else if (part === 'calendario') partCal();
  else if (part === 'diretrizes') partDir();
  else if (part === 'comprovante') partProof();
  else { partContrato(); partCal(); partDir(); if (part === 'completo') { newPage(); h2('Assinaturas'); para(k.signing?.hash ? `Código de verificação desta versão (SHA-256): ${k.signing.hash}` : 'Documento em rascunho: congele a versão na aba Assinatura antes de enviar para assinar.', 8.5, MUT); signLines(); } else partProof(); }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(T(`${P.name || ''}${P.name ? ' · ' : ''}Aluno: ${cl?.name || ''}${k.signing?.hash ? ' · versão ' + k.version + ' · ' + k.signing.hash.slice(0, 16) : ''}`), M, H - 8, { maxWidth: W - 2 * M - 30 }); doc.text(`Página ${i} de ${n}`, W - M, H - 8, { align: 'right' }); }
  const names = { contrato: 'contrato', calendario: 'calendario', diretrizes: 'diretrizes', completo: 'contrato-completo', assinado: 'contrato-assinado', comprovante: 'comprovante-assinatura' };
  doc.save(`${names[part]}-${slug(cl?.name || 'aluno')}-${S.year}-v${k.version}.pdf`);
}
