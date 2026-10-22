/* TEAMRM - Posture & Correction — inicialização. */
'use strict';
(async () => {
  for (const [id, name] of [['go-home', 'patients'], ['nav-patients', 'patients'], ['nav-ex', 'exercises'], ['nav-help', 'help'], ['nav-settings', 'settings']]) {
    const b = document.getElementById(id); if (b) b.onclick = () => go(name);
  }
  await Store.open();
  const S = await getSettings();
  // migração para a identidade TEAMRM (quem usava as cores antigas padrão)
  if ((S.brandV || 0) < 2) { if (!S.palette || S.palette === 'indigo') S.palette = 'teamrm'; if (S.pdfColor === '#1D2A6B') S.pdfColor = '#0D0D0D'; S.brandV = 2; S.theme ||= 'auto'; await Store.put('settings', S); }
  applyPalette(S);
  const tb = document.getElementById('theme-btn');
  if (tb) tb.onclick = async () => { const s = await getSettings(); s.theme = { auto: 'light', light: 'dark', dark: 'auto' }[s.theme || 'auto']; await Store.put('settings', s); applyPalette(s); toast(THEME_LABEL[s.theme]); const sel = document.getElementById('s-theme'); if (sel) sel.value = s.theme; };
  if (!S.seeded) {
    const pts = await Store.all('patients');
    if (!pts.length) await seedExample();
    S.seeded = true; await Store.put('settings', S);
  }
  go('patients');
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { await navigator.serviceWorker.register('sw.js'); } catch { /* sem modo offline neste ambiente */ }
  }
})();
