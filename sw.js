/* ====================================
   Service Worker - Offline Support & Caching
   ==================================== */

const CACHE_NAME = 'whois-lookup-v1';
const STATIC_CACHE = 'whois-static-v1';
const DYNAMIC_CACHE = 'whois-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/whois.html',
    '/dns.html',
    '/ip.html',
    '/ssl.html',
    '/subdomains.html',
    '/css/style.css',
    '/js/ui.js',
    '/js/whois.js',
    '/js/dns.js',
    '/js/ip.js',
    '/js/ssl.js',
    '/js/subdomains.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css',
    'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js',
    'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    return self.clients.claim();
});

// Fetch Event - Cache-first strategy for static, network-first for API
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // API requests - Network first, cache fallback
    if (url.hostname.includes('hackertarget.com') || 
        url.hostname.includes('cloudflare-dns.com') ||
        url.hostname.includes('ipapi.co') ||
        url.hostname.includes('crt.sh')) {
        
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone the response
                    const responseClone = response.clone();
                    
                    // Cache the API response for offline fallback
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(request);
                })
        );
        return;
    }
    
    // Static assets - Cache first, network fallback
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(request).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                const responseClone = response.clone();
                
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, responseClone);
                });
                
                return response;
            });
        })
    );
});

// Background Sync for failed requests (optional)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-lookups') {
        event.waitUntil(syncLookups());
    }
});

async function syncLookups() {
    console.log('[Service Worker] Syncing lookups...');
    // Implement background sync logic if needed
}

// Push Notifications (optional future feature)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/assets/icon-192x192.png',
        badge: '/assets/icon-72x72.png',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification('WHOIS Lookup', options)
    );
});
