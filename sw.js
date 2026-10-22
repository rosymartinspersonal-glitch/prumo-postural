// TEAMRM - Posture & Correction — service worker: funciona offline depois da primeira visita.
const VERSION = 'teamrm-v9';
const SHELL = ['./', 'index.html', 'js/config.js', 'js/core.js', 'js/views.js', 'js/detect.js', 'js/draw.js', 'js/exercises.js', 'js/content.js', 'js/screens.js', 'js/screens-ex.js', 'js/home.js', 'js/billing.js', 'js/legal.js', 'js/video.js', 'js/pdf.js', 'js/main.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'assets/logo.png', 'assets/logo-mark.png', 'assets/favicon.png', 'assets/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (/supabase\.co|stripe\.com/.test(req.url)) return;   // conta e pagamento sempre pela rede
  const url = new URL(req.url);
  // Arquivos do próprio app: rede primeiro (pega atualizações), cache se estiver offline.
  if (url.origin === location.origin) {
    // cache: 'no-cache' revalida com o servidor, para nunca servir uma versão antiga guardada pelo navegador
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // Bibliotecas, fontes e modelo de IA (versões fixas): cache primeiro.
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com|storage\.googleapis\.com\/mediapipe-models/.test(url.href)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })));
  }
});
