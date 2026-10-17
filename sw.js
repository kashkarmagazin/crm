// Service worker: faqat ilova qobig'i (HTML/JS/CSS/ikonkalar) oflayn ochilishi uchun.
// Supabase API so'rovlari (savdo, qoldiq, hisobot) HECH QACHON keshlanmaydi va soxta "muvaffaqiyat" qaytarilmaydi.
// Yangi versiya chiqqanda CACHE nomini o'zgartirish shart emas: index.html har doim avval tarmoqdan olinadi,
// assets/* fayllar nomida xesh bor (yangi build = yangi fayl nomi).
// Ilova istalgan yo'lda ishlaydi ("/" yoki "/crm/"): barcha yo'llar service worker joylashgan papkaga nisbatan.
const CACHE = "kashkar-crm-v4";
const BASE = new URL("./", self.location.href).pathname; // masalan "/crm/"
const SHELL = ["", "index.html", "offline.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"].map((p) => BASE + p);
const INDEX = BASE + "index.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Faqat o'z domenimizdagi GET; Supabase va boshqa hamma narsa to'g'ridan-to'g'ri tarmoqqa (keshsiz)
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (req.mode === "navigate") {
    // Avval tarmoq; muvaffaqiyatli javob keshdagi index.html'ni yangilaydi (eskirgan qobiq qolmasin).
    // GitHub Pages ichki yo'llarga (masalan /crm/kassa) 404.html = ilova bilan javob beradi — u ham ilova.
    // cache: "no-cache" — brauzerning HTTP keshidagi eski index.html (GitHub Pages 10 daqiqa keshlaydi) ishlatilmasin
    e.respondWith(
      fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(INDEX, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(INDEX)) || (await caches.match(BASE + "offline.html")) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith(BASE + "assets/") || SHELL.includes(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // clone() javob tanasi o'qilishidan OLDIN olinadi (avvalgi xato shu edi)
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
