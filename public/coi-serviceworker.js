/*! coi-serviceworker v0.1.7 | MIT License | https://github.com/gzguidoti/coi-serviceworker */
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => {
                    console.error(e);
                })
        );
    });
} else {
    (() => {
        const script = document.currentScript;
        const scriptUrl = script ? script.src : window.location.href;
        
        if (window.crossOriginIsolated !== true) {
            navigator.serviceWorker.register(scriptUrl).then((registration) => {
                registration.addEventListener("updatefound", () => {
                    window.location.reload();
                });
                if (registration.active) {
                    window.location.reload();
                }
            });
        }
    })();
}
