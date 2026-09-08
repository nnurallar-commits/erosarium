const CACHE_NAME =
    "erosarium-v47-logo-fixed-v10";

const APP_FILES = [
    "./",
    "./index.html",
    "./style-v5.css?v=9",
    "./images/erosarium-blue-32-v10.png",
    "./images/erosarium-blue-192-v10.png",
    "./images/erosarium-blue-512-v10.png",
    "./images/erosarium-blue-180-v10.png",
    "./script.js?v=6",
    "./manifest.json?v=10"
];


self.addEventListener(
    "install",
    event => {

        self.skipWaiting();

        event.waitUntil(
            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )
        );

    }
);


self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            Promise.all([

                caches
                    .keys()
                    .then(keys => {

                        return Promise.all(

                            keys.map(key => {

                                if (
                                    key.startsWith("erosarium-") && key !==
                                    CACHE_NAME
                                ) {

                                    return caches
                                        .delete(
                                            key
                                        );

                                }

                            })

                        );

                    }),

                self.clients.claim()

            ])

        );

    }
);


self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        if (
            request.method !==
            "GET"
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        event.respondWith(

            fetch(request)

                .then(response => {

                    if (
                        response &&
                        response.status ===
                        200
                    ) {

                        const copy =
                            response.clone();


                        caches
                            .open(
                                CACHE_NAME
                            )
                            .then(
                                cache => {

                                    cache.put(
                                        request,
                                        copy
                                    );

                                }
                            );

                    }


                    return response;

                })

                .catch(
                    async () => {

                        const cached =
                            await caches
                                .match(
                                    request
                                );


                        if (cached) {

                            return cached;

                        }


                        if (
                            request.mode ===
                            "navigate"
                        ) {

                            return caches
                                .match(
                                    "./index.html"
                                );

                        }

                    }
                )

        );

    }
);
