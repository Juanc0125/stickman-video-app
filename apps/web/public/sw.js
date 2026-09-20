// Minimal service worker. Its job is to make Stickman installable, not to
// cache: the studio always shows live data from the API, and a stale cache
// would be worse than no cache - it could show a video as still rendering
// after it finished, or hide one that was just created.
//
// Only the app shell is pre-cached, so an offline launch shows the page
// instead of the browser's dinosaur; every request still goes to the network.
const SHELL = 'stickman-shell-v1';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(SHELL).then((cache) => cache.addAll(['/'])).then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== SHELL).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	// Never serve API responses from cache - they are the live state.
	if (url.pathname.startsWith('/api/')) return;

	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(() => caches.match('/').then((hit) => hit ?? Response.error())));
	}
});
