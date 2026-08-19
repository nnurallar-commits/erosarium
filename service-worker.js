const CACHE_NAME = "erosarium-v20";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];


/* =========================
   INSTALL
========================= */

self.addEventListener("install", event => {

    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(APP_FILES);
            })
    );

});


/* =========================
   ACTIVATE
   ESKİ CACHE'LERİ SİL
========================= */

self.addEventListener("activate", event => {

    event.waitUntil(
        Promise.all([
            caches.keys().then(keys => {
                return Promise.all(
                    keys.map(key => {

                        if (key !== CACHE_NAME) {
                            return caches.delete(key);
                        }

                    })
                );
            }),

            self.clients.claim()
        ])
    );

});


/* =========================
   FETCH
========================= */

self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);


    /*
       Firebase, hava durumu, harita vb.
       dış servisleri cache'leme.
    */

    if (url.origin !== self.location.origin) {
        return;
    }


    /*
       HTML / JS / CSS:
       Önce internetten en güncel sürümü al.

       İnternet yoksa cache'e dön.
    */

    event.respondWith(

        fetch(request)

            .then(response => {

                if (
                    response &&
                    response.status === 200
                ) {

                    const responseClone =
                        response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(
                                request,
                                responseClone
                            );
                        });

                }

                return response;

            })

            .catch(() => {

                return caches.match(request)
                    .then(cachedResponse => {

                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        if (
                            request.mode === "navigate"
                        ) {
                            return caches.match(
                                "./index.html"
                            );
                        }

                    });

            })

    );

});
