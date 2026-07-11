const CACHE_NAME = 'vibe-offline-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/metadata.json',
  '/api/courses'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Offline Accessibility Layer...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching lightweight learning assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Sync & Storage Interfaces...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Pruning obsolete cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event with offline fallback routing
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For API endpoints, try network first, then fallback to cached JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Network failed, serving cached API data for:', url.pathname);
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Return an offline-friendly fallback JSON if not cached
            if (url.pathname === '/api/courses') {
              return new Response(JSON.stringify([
                {
                  id: "vibe-typescript",
                  name: "TypeScript Scroll Mastery",
                  instructor: "Acharya Manya (Core Creator)",
                  category: "Typescript",
                  description: "The ancient vow of type safety and robust software structures",
                  lessons: [
                    "1.1 Introduction to Typescript.md",
                    "2.1 Basic Syntax in Typescript.md",
                    "3.1 Variables in Typescript.md",
                    "4.1 let & const.md",
                    "5.1 Any type in Typescript.md",
                    "6.1 Built in Types in Typescript.md",
                    "7.1 User defined Types in Typescript.md",
                    "8.1 Null vs Undefined.md",
                    "9. Classes & Access Modifiers.md",
                    "Type Aliases.md",
                    "Conditional Logic in TypeScript.md",
                    "10. Generics.md",
                    "11. Advanced Types.md",
                    "Mastering Loops in TypeScript.md",
                    "12. Decorators.md",
                    "Mastering Functions in TypeScript.md",
                    "13. Design Patterns.md",
                    "Optional and Default Parameters in TypeScript.md",
                    "14. Dependency Injection.md",
                    "15. IoC Containers & Advanced Dependency Management.md"
                  ]
                },
                {
                  id: "vibe-express",
                  name: "Express Core Architecture",
                  instructor: "Scribe of the Sovereign Gateway",
                  category: "Express",
                  description: "Constructing robust server pipelines, middleware gates, and controllers",
                  lessons: [
                    "1. Getting Started with Express.md",
                    "2. Organizing Your Express Project for scalability.md",
                    "3. HTTP Methods & Status Codes.md",
                    "4. Request_Response.md",
                    "5. Routing Controllers.md",
                    "6. Middleware.md",
                    "7. Request Validation.md",
                    "8. MVC Pattern.md",
                    "9. Repository Pattern.md",
                    "10. Dependency Injection.md"
                  ]
                },
                {
                  id: "vibe-react",
                  name: "React Temporal Interfaces",
                  instructor: "Master of the Siddha UI Canvas",
                  category: "React",
                  description: "Dynamic visual rendering, state management chronologies, and optimization",
                  lessons: [
                    "Advanced State Management with Zustand.md",
                    "Zustand Slices and Modular State Architecture.md",
                    "State Management in React.md",
                    "Lazy Loading.md",
                    "Memoization.md",
                    "Routing.md",
                    "TSX & Typed Components_.md",
                    "TSX & Typed Components_Type  Safety.md",
                    "Testing & Debugging React Apps with TypeScript.md",
                    "Bundle Analysis.md"
                  ]
                },
                {
                  id: "vibe-mongodb",
                  name: "MongoDB Karmic Ledgers",
                  instructor: "Keeper of the Golden Record",
                  category: "Mongo DB",
                  description: "Flexible document databases, aggregation chronicles, and transaction security",
                  lessons: [
                    "CRUD Operations.md",
                    "Aggregation Framework.md",
                    "Transactions.md"
                  ]
                },
                {
                  id: "vibe-github",
                  name: "GitHub Co-op Guild",
                  instructor: "Coordinator of the Synergy Pacts",
                  category: "Github Tutorial",
                  description: "Collaborative code branches, revision histories, and synergistic reviews",
                  lessons: [
                    "Github Tutorial 1.md",
                    "Github Tutorial 2.md",
                    "Github Tutorial 3.md",
                    "Github Tutorial 4.md",
                    "Github Tutorial 5.md"
                  ]
                }
              ]), { headers: { 'Content-Type': 'application/json' } });
            }

            if (url.pathname === '/api/lesson-content') {
              const category = url.searchParams.get('category') || 'General';
              const lesson = url.searchParams.get('lesson') || 'Scroll';
              return new Response(JSON.stringify({
                content: `# 📜 ${lesson}\n\n*Behold! Vikram, your offline Service Worker guardian has successfully retrieved this scroll from your on-device cache database.*\n\n## 🌿 Welcome to Offline Study Mode\n\nEven though you are disconnected from the remote repository gates of **vicharanashala/vibe**, you can read this lesson, complete a study activity, and preserve your sacred **Daily Active Streak**.\n\n### 💡 Key Concept of ${category}\n- **Local Independence**: Running without external web servers protects your focus and ensures access anywhere.\n- **Unbroken Continuity**: Spending 5 minutes a day reviewing these concepts deepens your developer wisdom and keeps Betaal satisfied.\n\n### ⚔️ Challenge Question\nWhen your device is offline, what ensures your user state remains preserved until connection is restored?\n- **Answer**: On-device *IndexedDB* timestamps coupled with *PouchDB* local replication! Ask Betaal in the chat below to learn more.`
              }), { headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({ error: "Offline: Network unavailable" }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // For normal page/asset requests, do Network-First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache the fresh asset for subsequent offline support
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: try to serve the resource from the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback for document navigation when completely offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline Content Unavailable', { status: 404 });
        });
      })
  );
});

// Sync Event for background processing
self.addEventListener('sync', (event) => {
  if (event.tag === 'vibe-sync-logs') {
    console.log('[Service Worker] Background sync triggered: syncing local learning logs...');
    // In a full implementation, we could perform the sync directly in SW, 
    // but the modern and robust standard is to let the client-side PouchSync instance 
    // coordinate with full security credentials and state updates upon connection.
  }
});
