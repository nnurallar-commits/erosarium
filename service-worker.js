const CACHE_NAME =
    "erosarium-v30";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
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
                                    key !==
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
