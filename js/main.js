/* TEAMRM - Posture & Correction — inicialização. */
'use strict';
(async () => {
  for (const [id, name] of [['go-home', 'patients'], ['nav-patients', 'patients'], ['nav-ex', 'exercises'], ['nav-help', 'help'], ['nav-settings', 'settings']]) {
    const b = document.getElementById(id); if (b) b.onclick = () => go(name);
  }
  await Store.open();
  const S = await getSettings();
  applyPalette(S);
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
