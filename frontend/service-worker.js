// pwa.js
const CACHE_NAME = 'billing-app-cache-v10'; // Bumped version again

// Assets to cache on install
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/pos/',
    '/inventory/',
    '/families/',
    '/sales/',
    '/analytics/',
    '/static/css/style.css',
    '/static/js/api.js',
    '/static/js/auth.js',
    '/static/js/pwa.js',
    '/static/icon.png',
    '/manifest.json'
];

// Install event - cache core assets individually so a 404 doesn't kill the worker
self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Cache each URL individually to prevent one 404 from causing the whole install to fail
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(error => {
                            console.error('Failed to cache:', url, error);
                        });
                    })
                );
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip caching API calls directly if needed, for now we cache-first
    if (event.request.url.includes('/api/')) {
       // Network falling back to cache
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    // Tell the active service worker to take control of the page immediately
    event.waitUntil(self.clients.claim());
    
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
