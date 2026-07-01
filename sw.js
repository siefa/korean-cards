// =============================================
// SERVICE WORKER — Korean Cards
// =============================================

const CACHE_NAME = 'korean-cards-v1';
const ASSETS = [
    './',
    './index.html'
];

// Устанавливаем кеш
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Кешируем ресурсы');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Активация — очищаем старые кеши
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Стратегия: Cache First
self.addEventListener('fetch', event => {
    // Не кешируем запросы к Firebase
    if (event.request.url.includes('firebaseio.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) {
                    // Обновляем кеш в фоне
                    fetch(event.request)
                        .then(response => {
                            if (response && response.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(event.request, response.clone()));
                            }
                        })
                        .catch(() => {});
                    return cached;
                }

                return fetch(event.request)
                    .then(response => {
                        if (response && response.status === 200) {
                            const cloned = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, cloned));
                        }
                        return response;
                    })
                    .catch(() => {
                        return caches.match('./index.html');
                    });
            })
    );
});

// Сообщаем клиентам о новой версии
self.addEventListener('message', event => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Отправляем сообщение всем клиентам об обновлении
self.addEventListener('controllerchange', () => {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'UPDATE_AVAILABLE' });
        });
    });
});

console.log('✅ Service Worker загружен!');
