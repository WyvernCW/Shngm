/**
 * Shinigami API Service Layer
 * Multi-source integration (Local + Manhwadesu)
 */

const API_BASE = '/api/shinigami-proxy?path=';

const queue = [];
let activeRequests = 0;
const MAX_CONCURRENT = 3;
const cache = new Map();
const CACHE_TTL = 300000;

const processQueue = async () => {
    if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;
    activeRequests++;
    const { task, resolve, reject, cacheKey } = queue.shift();
    try {
        const result = await task();
        if (cacheKey && result) cache.set(cacheKey, { data: result, timestamp: Date.now() });
        resolve(result);
    } catch (e) {
        reject(e);
    } finally {
        activeRequests--;
        processQueue();
    }
};

const enqueue = (task, cacheKey) => new Promise((resolve, reject) => {
    if (cacheKey && cache.has(cacheKey)) {
        const entry = cache.get(cacheKey);
        if (Date.now() - entry.timestamp < CACHE_TTL) return resolve(entry.data);
    }
    queue.push({ task, resolve, reject, cacheKey });
    processQueue();
});

async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    const cacheKey = url + JSON.stringify(options);
    return enqueue(async () => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                
                if (response.status === 429) {
                    const wait = backoff * Math.pow(2, i);
                    console.warn(`[API] 429 Rate Limited. Retry ${i+1}/${retries} in ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                if (i === retries - 1) throw err;
                const wait = backoff * Math.pow(2, i);
                console.warn(`[API] Network Error (${err.message}). Retry ${i+1}/${retries} in ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
            }
        }
    }, cacheKey);
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

    resolveImg(m) {
        if (!m) return '/assets/covers/standard.svg';
        let url = '/assets/covers/standard.svg';
        
        // Manhwadesu source
        if (m.source === 'manhwadesu' || String(m.manga_id).startsWith('mwd-')) {
            url = m.cover_url || m.thumbnail || m.coverImage || url;
        } else {
            // Shinigami / Shngm source
            const CDN = 'https://images.shngm.id/'; // Updated CDN
            const mid = m.manga_id || m.id || m.id_manga;
            
            const cands = [
                m.cover_portrait_url, m.cover_url, m.cover, 
                m.thumbnail, m.coverImage, m.poster_url, m.image_url
            ];

            for (const c of cands) {
                if (c && typeof c === 'string') {
                    if (c.startsWith('http')) {
                        url = c;
                        break;
                    }
                    if (c.startsWith('thumbnail/') || c.startsWith('manga/')) {
                        url = CDN + c;
                        break;
                    }
                }
            }

            // UUID fallback - try manga path
            if ((url === '/assets/covers/standard.svg' || url.includes('placeholder')) && mid) {
                url = `${CDN}manga/image/${mid}.jpg`;
            }
        }

        // Apply proxy to all external URLs
        if (url && url.startsWith('http')) {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    }
};
