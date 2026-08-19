const CACHE_NAME = "erosarium-v3";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./images/icon-192.png",
    "./images/icon-512.png"
];

// Uygulama kurulurken dosyaları cache'e al
self.addEventListener("install", event => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
    );
});

// Eski cache'leri temizle
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// İnternet varsa güncel dosyayı al,
// olmazsa cache'deki sürümü kullan
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseClone);
                    });

                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
