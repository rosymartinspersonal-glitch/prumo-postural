/* TEAMRM — Contratos Personal: assinatura por link enviado pelo WhatsApp.
   A profissional publica a versão congelada (tabela sign_requests do Supabase, com token secreto) e envia o link;
   o aluno abre #assinar=<token>, lê, informa nome e CPF, desenha a assinatura e confirma. Evidências: data/hora
   do servidor, IP, aparelho, imagem da assinatura e o código SHA-256 da versão. Base: Lei 14.063/2020 (assinatura
   eletrônica simples) e MP 2.200-2/2001, art. 10, § 2º. */
'use strict';

const PCSign = (() => {
  const cfg = TEAMRM_CONFIG;
  const randToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('');
  const linkOf = token => `${(cfg.appUrl || location.origin + location.pathname).replace(/#.*$/, '')}#assinar=${token}`;
  const db = () => Billing.client();
  const fmt = d => d ? new Date(d).toLocaleString('pt-BR') : '—';

  // remove marcação perigosa do documento antes de mostrar ao aluno
  function clean(html) {
    const d = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    d.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select').forEach(e => e.remove());
    d.querySelectorAll('*').forEach(e => [...e.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && !/^(https?:|data:image\/)/i.test(a.value.trim()))) e.removeAttribute(a.name); }));
    return d.body.firstChild.innerHTML;
  }

  /* ---------- lado da profissional ---------- */
  async function send(k, cl) {
    if (!Billing.enabled) return toast('Conta do app não configurada');
    const u = await Billing.user();
    if (!u) { toast('Entre na sua conta (Ajustes → Conta) para enviar o link de assinatura', 4500); return; }
    const o = await Store.get('pcContracts', k.id);
    if (!o || o.status !== 'aguardando' || !o.signing?.hash) return toast('Congele a versão antes de enviar');
    let L = o.signing.link;
    if (!L || L.status !== 'pendente') {
      if (!(await confirmBox('Criar link de assinatura?', 'Uma cópia desta versão do contrato (texto, calendário e diretrizes) fica guardada no servidor do app para o aluno ler e assinar pelo link. O link vale 30 dias e só funciona para quem o recebe.', 'Criar link'))) return;
      const P = await pcProfessional(), token = randToken();
      const html = await pcDocHTML(o, cl, 'completo');
      const { data, error } = await (await db()).from('sign_requests').insert({ token, contract_ref: o.id, version: o.version, title: o.title, signer_name: cl?.name || '', professional: [P.name, P.reg].filter(Boolean).join(' · '), doc_html: html, doc_hash: o.signing.hash }).select('id, expires_at').single();
      if (error) { toast('Não foi possível criar o link: ' + (/sign_requests|relation|schema/i.test(error.message) ? 'a tabela de assinaturas ainda não foi criada no Supabase' : error.message), 6000); return; }
      L = { id: data.id, token, url: linkOf(token), createdAt: todayISO(), expiresAt: data.expires_at, status: 'pendente' };
      o.signing.link = L; (o.history ||= []).push({ at: todayISO(), event: 'Link de assinatura criado' });
      await Store.put('pcContracts', o); PCX.draft = null;
    }
    const P = await pcProfessional(), first = (cl?.name || '').trim().split(/\s+/)[0] || '';
    const text = `Olá${first ? ', ' + first : ''}! Segue o link para ler e assinar o seu ${o.title} (versão ${o.version}):\n\n${L.url}\n\nÉ só abrir, conferir o contrato, o calendário e as diretrizes, informar nome e CPF e assinar com o dedo na tela. O link vale até ${new Date(L.expiresAt).toLocaleDateString('pt-BR')}.${P.name ? '\n\n' + P.name : ''}`;
    const wa = (typeof AL !== 'undefined' && cl?.phone && AL.waLink(cl.phone, text)) || `https://wa.me/?text=${encodeURIComponent(text)}`;
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="panel" role="dialog" aria-modal="true" style="max-width:520px"><h2>Enviar link de assinatura</h2>
      <p class="muted" style="margin:0;font-size:.9rem">${cl?.phone ? `O WhatsApp abre na conversa com ${esc(cl.name)} (${esc(cl.phone)}) com a mensagem pronta.` : 'Este aluno não tem telefone cadastrado: o WhatsApp abre para você escolher o contato.'}</p>
      <textarea readonly rows="7" style="width:100%;font-size:.85rem;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--bg);color:var(--ink)">${esc(text)}</textarea>
      <div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn" data-x>Fechar</button><button class="btn" id="sl-copy">Copiar mensagem</button><a class="btn primary" id="sl-wa" href="${esc(wa)}" target="_blank" rel="noopener">Abrir WhatsApp</a></div></div>`;
    document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
    $('#sl-copy', m).onclick = async () => { try { await navigator.clipboard.writeText(text); toast('Mensagem copiada'); } catch (e) { toast('Não foi possível copiar'); } };
    $('#sl-wa', m).onclick = async () => { const x = await Store.get('pcContracts', k.id); if (x?.signing?.link) { x.signing.link.sentAt = todayISO(); (x.history ||= []).push({ at: todayISO(), event: 'Link de assinatura enviado pelo WhatsApp' }); await Store.put('pcContracts', x); } setTimeout(() => { m.remove(); go('pcContrato', { id: k.id }); }, 400); };
  }

  // busca o pedido no servidor; se o aluno já assinou, registra no contrato
  async function check(k, quiet) {
    const o = await Store.get('pcContracts', k.id), L = o?.signing?.link;
    if (!L || L.status !== 'pendente') return false;
    if (!(await Billing.user())) { if (!quiet) toast('Entre na sua conta para verificar a assinatura'); return false; }
    const { data, error } = await (await db()).from('sign_requests').select('status, signed_at, signed_name, signed_cpf, signature_png, signer_ip, signer_ua, doc_hash, expires_at').eq('id', L.id).maybeSingle();
    if (error || !data) { if (!quiet) toast('Não foi possível consultar o link agora'); return false; }
    if (data.status !== 'assinado') { if (!quiet) toast(data.status === 'cancelado' ? 'Link cancelado' : new Date(data.expires_at) < new Date() ? 'Link expirado sem assinatura' : 'O aluno ainda não assinou'); return false; }
    if (data.doc_hash !== o.signing.hash) { toast('O código da versão assinada não confere com este contrato'); return false; }
    const P = await pcProfessional();
    Object.assign(L, { status: 'assinado', signedAt: data.signed_at, name: data.signed_name, cpf: data.signed_cpf, png: data.signature_png, ip: data.signer_ip || '', ua: data.signer_ua || '' });
    o.signing = { ...o.signing, link: L, provider: 'Link de assinatura TEAMRM (WhatsApp) — assinatura eletrônica simples', signedAt: todayISO(),
      signers: [{ role: 'aluno', name: data.signed_name, at: data.signed_at }, { role: 'profissional', name: P.name || 'Profissional', at: L.createdAt }], confirmed: true };
    o.status = 'assinado'; (o.history ||= []).push({ at: todayISO(), event: `Assinado pelo aluno pelo link (${data.signed_name}, ${fmt(data.signed_at)})` });
    await Store.put('pcContracts', o); PCX.draft = null; toast('Contrato assinado pelo aluno', 4000); return true;
  }

  async function cancel(o) {
    const L = o?.signing?.link; if (!L || L.status !== 'pendente') return;
    try { if (await Billing.user()) await (await db()).from('sign_requests').update({ status: 'cancelado' }).eq('id', L.id); } catch (e) { }
    L.status = 'cancelado';
  }

  /* ---------- página do aluno (sem login) ---------- */
  async function page(token) {
    document.title = 'Assinatura de contrato — TEAMRM';
    document.querySelectorAll('header.top nav, header.top #theme-btn, footer.disc').forEach(e => e.remove());
    const app = document.getElementById('app');
    app.innerHTML = `<div class="panel empty"><p>Carregando o contrato…</p></div>`;
    let r = null;
    try { const { data, error } = await (await db()).rpc('sign_get', { p_token: token }); if (error) throw error; r = (data || [])[0] || null; }
    catch (e) { app.innerHTML = `<div class="panel empty"><h2>Não foi possível abrir o contrato</h2><p class="muted">Verifique a internet e abra o link de novo.</p></div>`; return; }
    if (!r) { app.innerHTML = `<div class="panel empty"><h2>Link inválido</h2><p class="muted">Confira se o link foi copiado inteiro ou peça um novo à profissional.</p></div>`; return; }
    if (r.status !== 'pendente') {
      const msg = { assinado: `Este contrato já foi assinado${r.signed_name ? ' por ' + esc(r.signed_name) : ''} em ${esc(fmt(r.signed_at))}.`, cancelado: 'Este link foi cancelado pela profissional. Peça um novo link, se precisar.', expirado: 'Este link expirou. Peça um novo link à profissional.' }[r.status] || 'Este link não está disponível.';
      app.innerHTML = `<div class="panel empty"><h2>${r.status === 'assinado' ? 'Contrato assinado' : 'Link indisponível'}</h2><p class="muted">${msg}</p></div>`; return;
    }
    app.innerHTML = `<section class="stack">
      <div><p class="eyebrow">Assinatura eletrônica de contrato</p><h1 style="margin:4px 0">${esc(r.title)}</h1><p class="muted" style="margin:0">${esc(r.professional || '')}${r.signer_name ? ' · Aluno(a): ' + esc(r.signer_name) : ''} · Versão ${r.version} · link válido até ${esc(new Date(r.expires_at).toLocaleDateString('pt-BR'))}</p></div>
      <div class="banner">Leia o contrato, o calendário e as diretrizes até o fim. Depois, informe seus dados e assine no quadro abaixo.</div>
      <div class="pcdoc" id="sg-doc" style="max-width:100%;overflow-x:auto">${clean(r.doc_html)}</div>
      <p class="muted mono" style="font-size:.75rem;word-break:break-all;margin:0">Código de verificação desta versão (SHA-256): ${esc(r.doc_hash)}</p>
      <form class="panel stack" id="sg-form" novalidate>
        <h2>Seus dados e assinatura</h2>
        <div class="grid-form" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><label class="f">Nome completo *<input id="sg-name" autocomplete="name" value="${esc(r.signer_name || '')}" maxlength="200"></label><label class="f">CPF *<input id="sg-cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14"></label></div>
        <div class="f">Assine com o dedo (ou o mouse) no quadro *
          <canvas id="sg-pad" style="width:100%;height:180px;background:#fff;border:1px dashed var(--muted);border-radius:8px;touch-action:none;cursor:crosshair"></canvas>
          <div class="row spread"><span class="muted" style="font-size:.8rem">A assinatura fica registrada com a data, a hora e o aparelho usado.</span><button type="button" class="btn small" id="sg-clear">Limpar</button></div></div>
        <label class="row" style="gap:8px;align-items:flex-start;font-size:.92rem"><input type="checkbox" id="sg-ok" style="margin-top:4px"> <span>Li e concordo com o contrato, o calendário de aulas e as diretrizes acima (versão ${r.version}) e assino eletronicamente, nos termos da Lei 14.063/2020.</span></label>
        <div class="row" style="justify-content:flex-end"><button class="btn primary" id="sg-go">Assinar contrato</button></div>
      </form></section>`;
    const cpf = $('#sg-cpf'); cpf.oninput = () => { const d = cpf.value.replace(/\D/g, '').slice(0, 11); cpf.value = d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2'); };
    // quadro de assinatura
    const cv = $('#sg-pad'), g = cv.getContext('2d'); let drawing = false, inked = false, last = null;
    const size = () => { const r2 = cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1); const keep = inked ? cv.toDataURL() : null; cv.width = Math.round(r2.width * dpr); cv.height = Math.round(r2.height * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#111'; g.lineWidth = 2.4; if (keep) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, r2.width, r2.height); im.src = keep; } };
    size(); window.addEventListener('resize', size);
    const pos = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; last = pos(e); g.beginPath(); g.arc(last.x, last.y, 1.1, 0, 7); g.fillStyle = '#111'; g.fill(); inked = true; });
    cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; inked = true; });
    const stop = () => { drawing = false; }; cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);
    $('#sg-clear').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); inked = false; };
    // imagem enxuta: recorta as margens vazias e reduz
    const pngOf = () => {
      const w = cv.width, h = cv.height, px = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (px[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return null; const pd = 8; x0 = Math.max(0, x0 - pd); y0 = Math.max(0, y0 - pd); x1 = Math.min(w, x1 + pd); y1 = Math.min(h, y1 + pd);
      const k2 = Math.min(1, 700 / (x1 - x0)), o = document.createElement('canvas'); o.width = Math.round((x1 - x0) * k2); o.height = Math.round((y1 - y0) * k2);
      o.getContext('2d').drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, o.width, o.height); return o.toDataURL('image/png');
    };
    $('#sg-form').onsubmit = async e => {
      e.preventDefault();
      const name = $('#sg-name').value.trim(), c = cpf.value.replace(/\D/g, '');
      if (name.split(/\s+/).length < 2) return toast('Informe o nome completo');
      if (c.length !== 11) return toast('Informe o CPF com 11 números');
      if (!inked) return toast('Assine no quadro');
      if (!$('#sg-ok').checked) return toast('Marque a confirmação de leitura e concordância');
      const png = pngOf(); if (!png) return toast('Assine no quadro');
      const bt = $('#sg-go'); bt.disabled = true; bt.textContent = 'Enviando…';
      try {
        const { data, error } = await (await db()).rpc('sign_submit', { p_token: token, p_name: name, p_cpf: c, p_signature: png, p_ua: navigator.userAgent });
        if (error) throw error;
        $('#sg-form').outerHTML = `<section class="panel stack" style="border-color:var(--ok)"><h2 style="color:var(--ok)">Contrato assinado ✓</h2><p style="margin:0">Assinatura de <b>${esc(name)}</b> registrada em ${esc(fmt(data))}. A profissional recebe a confirmação no app.</p><p class="muted" style="margin:0;font-size:.85rem">Se quiser guardar uma cópia, use o botão abaixo e escolha “Salvar como PDF”.</p><div class="row"><button class="btn" id="sg-print">Imprimir / salvar cópia</button></div></section>`;
        $('#sg-print').onclick = () => window.print(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } catch (err) { bt.disabled = false; bt.textContent = 'Assinar contrato'; toast('Não foi possível assinar: ' + (err.message || 'tente de novo'), 5000); }
    };
  }

  return { send, check, cancel, page, linkOf };
})();
