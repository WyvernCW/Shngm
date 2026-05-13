/**
 * Shinigami API Service Layer
 * Multi-source integration (Local + Manhwadesu)
 */

const API_BASE = '/api/shinigami-proxy?path=';

// --- PERSISTENT CACHE ENGINE (IndexedDB) ---
const DB_NAME = 'VRTWEL_CACHE';
const STORE_NAME = 'api_responses';
const CACHE_VERSION = 1;

const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CACHE_VERSION);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
});

const dbGet = async (key) => {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
};

const dbSet = async (key, val) => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(val, key);
    } catch (e) {}
};

// --- API ORCHESTRATOR ---
const queue = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5; // Increased for speed

const processQueue = async () => {
    if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;
    activeRequests++;
    const { task, resolve, reject } = queue.shift();
    try {
        const result = await task();
        resolve(result);
    } catch (e) {
        reject(e);
    } finally {
        activeRequests--;
        processQueue();
    }
};

const enqueue = (task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    processQueue();
});

/**
 * Enhanced Fetch with Persistent SWR Caching
 * - Instant cache return (24h TTL)
 * - Background revalidation (1h Stale limit)
 */
async function fetchWithRetry(url, options = {}, retries = 2, backoff = 1000) {
    const cacheKey = `vrtwel_cache_${url}_${JSON.stringify(options)}`;
    
    // 1. Check Persistent Cache
    const cached = await dbGet(cacheKey);
    const now = Date.now();
    const STALE_LIMIT = 3600000; // 1 Hour (Background update if older)
    const MAX_AGE = 86400000; // 24 Hours (Full expire)

    if (cached) {
        const age = now - cached.timestamp;
        
        // If not expired (24h), return immediately
        if (age < MAX_AGE) {
            // If stale (> 1h), trigger background refresh
            if (age > STALE_LIMIT) {
                console.log(`[SWR] Stale Cache for ${url}. Background refreshing...`);
                triggerBackgroundFetch(url, options, cacheKey);
            }
            return cached.data;
        }
    }

    // 2. Network Fetch if no cache or expired
    return enqueue(async () => {
        return await performNetworkFetch(url, options, retries, backoff, cacheKey);
    });
}

async function performNetworkFetch(url, options, retries, backoff, cacheKey) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(10000) 
            });
            
            if (response.status === 429) {
                const wait = backoff * Math.pow(2, i);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // Persist to IndexedDB
            await dbSet(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        }
    }
}

// Quietly update cache in background
async function triggerBackgroundFetch(url, options, cacheKey) {
    try {
        const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
        if (response.ok) {
            const data = await response.json();
            await dbSet(cacheKey, { data, timestamp: Date.now() });
            console.log(`[SWR] Cache Updated for ${url}`);
        }
    } catch (e) {}
}

export const API = {
    async getLatest(page = 1, pageSize = 48, genre = '') {
        try {
            let path = `manga/list&type=project&page=${page}&page_size=${pageSize}&is_update=true&sort=latest&sort_order=desc`;
            if (genre) path += `&genre=${encodeURIComponent(genre)}`;
            return await fetchWithRetry(`${API_BASE}${path}`);
        } catch (error) {
            console.error('Error fetching latest:', error);
            return { data: [] };
        }
    },

    async getAllSeries(page = 1, pageSize = 48, genre = '') {
        try {
            let path = `manga/list&type=project&page=${page}&page_size=${pageSize}&sort=latest&sort_order=desc`;
            if (genre) path += `&genre=${encodeURIComponent(genre)}`;
            return await fetchWithRetry(`${API_BASE}${path}`);
        } catch (error) {
            console.error('Error fetching all series:', error);
            return { data: [] };
        }
    },

    async getTrending(filter = 'daily', pageSize = 24) {
        try {
            return await fetchWithRetry(`${API_BASE}manga/top&filter=${filter}&page=1&page_size=${pageSize}`);
        } catch (error) {
            console.error('Error fetching trending:', error);
            return { data: [] };
        }
    },

    async getDetail(mangaId) {
        if (String(mangaId).includes('mwd-')) return this.mwd.getDetail(mangaId.replace('mwd-', ''));
        try {
            return await fetchWithRetry(`${API_BASE}manga/detail/${mangaId}`);
        } catch (error) {
            console.error('Error fetching details:', error);
            return null;
        }
    },

    async getChapterList(mangaId) {
        if (String(mangaId).includes('mwd-')) return this.mwd.getChapterList(mangaId.replace('mwd-', ''));
        try {
            return await fetchWithRetry(`${API_BASE}chapter/${mangaId}/list&page=1&page_size=500&sort_by=chapter_number&sort_order=desc`);
        } catch (error) {
            console.error('Error fetching chapter list:', error);
            return { data: [] };
        }
    },

    async getChapter(chapterId) {
        if (String(chapterId).includes('mwd-')) {
            const [slug, ch] = chapterId.replace('mwd-', '').split('__');
            return this.mwd.getPages(slug, ch);
        }
        try {
            return await fetchWithRetry(`${API_BASE}chapter/detail/${chapterId}`);
        } catch (error) {
            console.error('Error fetching chapter:', error);
            return null;
        }
    },

    async search(query) {
        try {
            const [local, mwd] = await Promise.all([
                fetchWithRetry(`${API_BASE}manga/list&page=1&page_size=30&q=${encodeURIComponent(query)}`),
                this.mwd.search(query)
            ]);
            const localData = (local?.data || []).map(m => ({ ...m, source: 'local' }));
            const mwdData = (mwd?.data || []).map(m => ({ ...m, manga_id: `mwd-${m.manga_id}`, source: 'manhwadesu' }));
            return { data: [...localData, ...mwdData] };
        } catch (error) {
            console.error('Error searching:', error);
            return { data: [] };
        }
    },

    mwd: {
        async getLatest(page = 1) {
            return fetchWithRetry(`/api/manhwadesu/series?page=${page}`);
        },
        async getDetail(slug) {
            const data = await fetchWithRetry(`/api/manhwadesu/detail?slug=${slug}`);
            return { data: { ...data.detail, manga_id: `mwd-${slug}` } };
        },
        async getChapterList(slug) {
            const data = await fetchWithRetry(`/api/manhwadesu/detail?slug=${slug}`);
            return { data: (data.chapters || []).map(ch => ({ ...ch, chapter_id: `mwd-${slug}__${ch.chapter_id}` })) };
        },
        async getPages(slug, chapter) {
            const data = await fetchWithRetry(`/api/manhwadesu/pages?slug=${slug}&chapter=${chapter}`);
            const images = (data || []).map(img => `/api/image-proxy?url=${encodeURIComponent(img)}`);
            return { data: { chapter: { data: images }, base_url: '', path: '' } };
        },
        async search(q) {
            return fetchWithRetry(`/api/manhwadesu/search?q=${encodeURIComponent(q)}`);
        }
    },

    // --- HIGH SPEED FRESHNESS ENGINE ---
    async getChapterDatesParallel(mangaList, callback) {
        const CONCURRENCY = 5;
        const tasks = [...mangaList];
        
        const worker = async () => {
            while (tasks.length > 0) {
                const m = tasks.shift();
                if (!m?.manga_id) continue;
                
                // 1. Check persistent date store
                const cacheKey = `date_${m.manga_id}`;
                const cached = await dbGet(cacheKey);
                if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1h date cache
                    callback(m.manga_id, cached.date);
                    continue;
                }

                try {
                    const chRes = await this.getChapterList(m.manga_id);
                    const chapters = chRes?.data || [];
                    const latestCh = chapters[0];
                    const realDate = latestCh?.release_date || latestCh?.created_at;
                    if (realDate) {
                        await dbSet(cacheKey, { date: realDate, timestamp: Date.now() });
                        callback(m.manga_id, realDate);
                    }
                } catch (e) {}
            }
        };

        // Start multiple workers
        await Promise.all(Array(CONCURRENCY).fill(0).map(() => worker()));
    },

    // --- IMAGE PIPELINE OPTIMIZATION ---
    prefetchImages(urls) {
        if (!urls || !Array.isArray(urls)) return;
        urls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    },

    resolveImg(m) {
        if (!m) return '/assets/covers/standard.svg';
        let url = '/assets/covers/standard.svg';
        
        if (m.source === 'manhwadesu' || String(m.manga_id).startsWith('mwd-')) {
            url = m.cover_url || m.thumbnail || m.coverImage || url;
        } else {
            const CDN = 'https://assets.shngm.id/'; // Updated to active assets subdomain
            const mid = m.manga_id || m.id || m.id_manga;
            const cands = [m.cover_portrait_url, m.cover_url, m.cover, m.thumbnail, m.coverImage, m.poster_url, m.image_url];
            for (const c of cands) {
                if (c && typeof c === 'string') {
                    if (c.startsWith('http')) { 
                        url = c.replace('images.shngm.id', 'assets.shngm.id'); // Fix stale domains
                        break; 
                    }
                    if (c.startsWith('thumbnail/') || c.startsWith('manga/')) { url = CDN + c; break; }
                }
            }
            // UUID fallback - try active thumbnail path
            if ((url === '/assets/covers/standard.svg' || url.includes('placeholder')) && mid) {
                url = `${CDN}thumbnail/image/${mid}.jpg`;
            }
        }

        if (url && url.startsWith('http')) {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    }
};
