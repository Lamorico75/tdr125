/* Service worker : garde l'application disponible hors ligne.
   Augmenter VERSION à chaque mise en ligne d'une nouvelle version. */
const VERSION = "tdr125-v2";
const FICHIERS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable.png", "./apple-touch-icon.png",
  "./chakra-400.woff2", "./chakra-500.woff2", "./chakra-600.woff2", "./chakra-700.woff2", "./saira-stencil.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const avecDelai = (promesse, ms) => new Promise((ok, ko) => {
  const t = setTimeout(() => ko(new Error("délai dépassé")), ms);
  promesse.then(v => { clearTimeout(t); ok(v); }, err => { clearTimeout(t); ko(err); });
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  /* La page : réseau d'abord (pour recevoir les mises à jour), copie en cache si hors ligne */
  if(req.mode === "navigate"){
    e.respondWith(
      avecDelai(fetch(req), 4000)
        .then(r => { const copie = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copie)); return r; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  /* Le reste (icônes, polices) : cache d'abord */
  e.respondWith(
    caches.match(req).then(trouve => trouve || fetch(req).then(r => {
      if(r.ok){ const copie = r.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return r;
    }))
  );
});
