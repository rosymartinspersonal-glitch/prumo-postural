/* TEAMRM - Posture & Correction — senha do app (bloqueio de tela) e botão de mostrar/ocultar senha.
   A senha nunca é guardada: só um resumo PBKDF2-SHA-256 com sal, no armazenamento deste aparelho. */
'use strict';

const AppLock = (() => {
  const ITER = 150000;
  const enc = new TextEncoder();
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const rand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
  async function digest(secret, saltHex, iter = ITER) {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
    const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
  }
  const same = (a, b) => { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = rand(12); return [...r].map(x => A[x % A.length]).join('').replace(/(.{4})(?=.)/g, '$1-'); };

  const get = () => Store.get('settings', 'lock');
  async function isOn() { const L = await get(); return !!(L && L.on && L.hash); }
  async function setPassword(pw, opts = {}) {
    const L = (await get()) || { id: 'lock', after: 0 };
    L.salt = hex(rand(16)); L.hash = await digest(pw, L.salt); L.iter = ITER; L.on = true;
    let code = null;
    if (opts.newCode || !L.recHash) { code = newCode(); L.recSalt = hex(rand(16)); L.recHash = await digest(normCode(code), L.recSalt); }
    if (opts.email !== undefined) L.email = opts.email || '';
    L.fails = 0; L.until = 0; L.changedAt = todayISO();
    await Store.put('settings', L);
    return code;
  }
  async function check(pw) { const L = await get(); return !!L && same(await digest(pw, L.salt, L.iter || ITER), L.hash); }
  async function checkCode(c) { const L = await get(); return !!L?.recHash && same(await digest(normCode(c), L.recSalt, L.iter || ITER), L.recHash); }
  async function disable() { await Store.del('settings', 'lock'); }
  async function setAfter(min) { const L = await get(); if (L) { L.after = min; await Store.put('settings', L); } }

  /* ---------- tela de bloqueio ---------- */
  let showing = null, hiddenAt = 0;
  function gate() {
    if (showing) return showing;
    showing = (async () => {
      const L = await get(); if (!L?.on) return;
      const ov = document.createElement('div'); ov.className = 'lockscreen'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      document.body.appendChild(ov); document.body.classList.add('locked');
      await new Promise(done => {
        const draw = (mode = 'pw', note = '') => {
          ov.innerHTML = `<form class="panel lockbox" autocomplete="off">
            <img src="assets/logo.png" alt="TEAMRM" class="locklogo">
            <h1>${mode === 'pw' ? 'App protegido' : mode === 'code' ? 'Código de recuperação' : 'Entrar com a conta'}</h1>
            <p class="muted" style="margin:0">${mode === 'pw' ? 'Digite a senha do app para continuar.' : mode === 'code' ? 'Digite o código que apareceu quando você criou a senha. Depois você cria uma senha nova.' : 'Entre com o e-mail e a senha da conta TEAMRM usada ao criar o bloqueio.'}</p>
            ${mode === 'pw' ? '<label class="f">Senha<input id="lk-pw" type="password" autocomplete="current-password" required></label>'
              : mode === 'code' ? '<label class="f">Código<input id="lk-code" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" required></label>'
              : `<label class="f">E-mail<input id="lk-em" type="email" value="${esc(L.email || '')}" required></label><label class="f">Senha da conta<input id="lk-ap" type="password" required></label>`}
            <p class="lockmsg" id="lk-msg" role="alert">${esc(note)}</p>
            <button class="btn primary" style="width:100%">${mode === 'pw' ? 'Desbloquear' : mode === 'code' ? 'Conferir código' : 'Entrar'}</button>
            <div class="row" style="justify-content:center;gap:4px;flex-wrap:wrap">
              ${mode !== 'pw' ? '<button type="button" class="btn ghost small" data-m="pw">Usar a senha do app</button>' : ''}
              ${mode !== 'code' ? '<button type="button" class="btn ghost small" data-m="code">Esqueci a senha</button>' : ''}
              ${mode !== 'acc' && L.email && Billing.enabled ? '<button type="button" class="btn ghost small" data-m="acc">Entrar com a conta</button>' : ''}
            </div></form>`;
          $$('[data-m]', ov).forEach(b => b.onclick = () => draw(b.dataset.m));
          const f = $('form', ov), msg = t => $('#lk-msg', ov).textContent = t;
          setTimeout(() => $('input', ov)?.focus(), 50);
          f.onsubmit = async e => {
            e.preventDefault();
            const cur = await get();
            const wait = Math.ceil(((cur.until || 0) - Date.now()) / 1000);
            if (wait > 0) return msg(`Muitas tentativas. Aguarde ${wait} s.`);
            const btn = $('button.primary', f); btn.disabled = true;
            let ok = false;
            try {
              if (mode === 'pw') ok = await check($('#lk-pw', ov).value);
              else if (mode === 'code') ok = await checkCode($('#lk-code', ov).value);
              else { await Billing.signIn($('#lk-em', ov).value.trim(), $('#lk-ap', ov).value); const u = await Billing.user(); ok = !!u && (u.email || '').toLowerCase() === (cur.email || '').toLowerCase(); }
            } catch (err) { ok = false; }
            btn.disabled = false;
            if (!ok) {
              cur.fails = (cur.fails || 0) + 1;
              if (cur.fails >= 5) cur.until = Date.now() + Math.min(300, 30 * 2 ** (cur.fails - 5)) * 1000;
              await Store.put('settings', cur);
              return msg(mode === 'pw' ? 'Senha incorreta.' : mode === 'code' ? 'Código incorreto.' : 'Não foi possível entrar com essa conta.');
            }
            cur.fails = 0; cur.until = 0; await Store.put('settings', cur);
            if (mode === 'pw') return done();
            // recuperação: cria senha nova antes de liberar
            ov.innerHTML = ''; ov.appendChild(passwordForm('Criar nova senha do app', async pw => { const code = await setPassword(pw, { newCode: true }); await showCode(code, ov); done(); }));
          };
        };
        draw();
      });
      ov.remove(); document.body.classList.remove('locked');
    })().finally(() => { showing = null; });
    return showing;
  }
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    const L = await get(); if (!L?.on || showing) return;
    if (Date.now() - hiddenAt >= (L.after || 0) * 60000) gate();
  });

  /* ---------- formulários ---------- */
  function passwordForm(title, onOk, { cancel } = {}) {
    const f = document.createElement('form'); f.className = 'panel lockbox stack';
    f.innerHTML = `<h2 style="margin:0">${esc(title)}</h2>
      <label class="f">Nova senha (mínimo 4 caracteres)<input id="pw1" type="password" autocomplete="new-password" minlength="4" required></label>
      <label class="f">Repita a senha<input id="pw2" type="password" autocomplete="new-password" minlength="4" required></label>
      <p class="lockmsg" id="pwm" role="alert"></p>
      <div class="row" style="justify-content:flex-end">${cancel ? '<button type="button" class="btn ghost" data-cancel>Cancelar</button>' : ''}<button class="btn primary">Salvar senha</button></div>`;
    f.onsubmit = async e => {
      e.preventDefault(); const a = $('#pw1', f).value, b = $('#pw2', f).value;
      if (a.length < 4) return $('#pwm', f).textContent = 'Use pelo menos 4 caracteres.';
      if (a !== b) return $('#pwm', f).textContent = 'As duas senhas não são iguais.';
      $('button.primary', f).disabled = true; await onOk(a);
    };
    if (cancel) $('[data-cancel]', f).onclick = cancel;
    setTimeout(() => $('#pw1', f)?.focus(), 50);
    return f;
  }
  function showCode(code, host) {
    return new Promise(res => {
      if (!code) return res();
      const f = document.createElement('div'); f.className = 'panel lockbox stack';
      f.innerHTML = `<h2 style="margin:0">Guarde este código</h2>
        <p style="margin:0">Se esquecer a senha, é só com ele que você entra de novo sem apagar os dados.</p>
        <p class="num lockcode">${esc(code)}</p>
        <p class="muted" style="margin:0;font-size:.85rem">Anote em papel ou tire um print e guarde fora do celular. Ele não aparece de novo.</p>
        <div class="row" style="justify-content:flex-end"><button class="btn" data-copy>Copiar</button><button class="btn primary" data-ok>Já guardei</button></div>`;
      host.innerHTML = ''; host.appendChild(f);
      $('[data-copy]', f).onclick = () => copyText(code);
      $('[data-ok]', f).onclick = () => res();
    });
  }
  function modal(build) {
    const m = document.createElement('div'); m.className = 'modal'; document.body.appendChild(m);
    const close = () => m.remove();
    build(m, close); return close;
  }
  // Ajustes: ligar (cria senha e mostra o código), trocar, desligar (pede a senha atual)
  async function enableFlow() {
    return new Promise(res => modal((m, close) => {
      m.appendChild(passwordForm('Criar senha do app', async pw => {
        let email = '';
        try { const u = Billing.enabled ? await Billing.user() : null; email = u?.email || ''; } catch { }
        const code = await setPassword(pw, { newCode: true, email });
        await showCode(code, m); close(); res(true);
      }, { cancel: () => { close(); res(false); } }));
    }));
  }
  async function askCurrent(title) {
    return new Promise(res => modal((m, close) => {
      const f = document.createElement('form'); f.className = 'panel lockbox stack';
      f.innerHTML = `<h2 style="margin:0">${esc(title)}</h2><label class="f">Senha atual do app<input id="cp" type="password" autocomplete="current-password" required></label><p class="lockmsg" id="cpm" role="alert"></p>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary">Continuar</button></div>`;
      m.appendChild(f); setTimeout(() => $('#cp', f).focus(), 50);
      $('[data-cancel]', f).onclick = () => { close(); res(false); };
      f.onsubmit = async e => { e.preventDefault(); if (await check($('#cp', f).value)) { close(); res(true); } else $('#cpm', f).textContent = 'Senha incorreta.'; };
    }));
  }
  async function changeFlow() {
    if (!(await askCurrent('Trocar senha do app'))) return false;
    return new Promise(res => modal((m, close) => {
      m.appendChild(passwordForm('Nova senha do app', async pw => { await setPassword(pw); close(); res(true); }, { cancel: () => { close(); res(false); } }));
    }));
  }
  async function newCodeFlow() {
    if (!(await askCurrent('Gerar novo código de recuperação'))) return;
    const L = await get(); const code = newCode(); L.recSalt = hex(rand(16)); L.recHash = await digest(normCode(code), L.recSalt); await Store.put('settings', L);
    modal(async (m, close) => { await showCode(code, m); close(); });
  }
  async function disableFlow() { if (!(await askCurrent('Desligar a senha do app'))) return false; await disable(); return true; }

  return { get, isOn, gate, setAfter, enableFlow, changeFlow, disableFlow, newCodeFlow, lockNow: () => gate(), _test: { digest, normCode, newCode, setPassword, check, checkCode } };
})();

/* ---------- botão de mostrar/ocultar em todo campo de senha ---------- */
(() => {
  const add = inp => {
    if (inp._eye || inp.type !== 'password') return; inp._eye = true;
    const w = document.createElement('span'); w.className = 'pwwrap'; inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pweye'; b.setAttribute('aria-label', 'Mostrar senha'); b.textContent = '👁';
    b.onclick = () => { const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); b.classList.toggle('on', show); inp.focus(); };
    w.appendChild(b);
  };
  const scan = r => r.querySelectorAll?.('input[type="password"]').forEach(add);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches?.('input[type="password"]')) add(n); scan(n); } }))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => scan(document));
})();
