/**
 * Shinigami API Service Layer
 * Multi-source integration (Local + Manhwadesu)
 */

const API_BASE = 'https://api.shngm.io/v1';

// Request Queue for chapter lists to avoid 429
const chapterListQueue = [];
let isProcessingQueue = false;
const chapterCache = new Map();

async function processQueue() {
    if (isProcessingQueue || chapterListQueue.length === 0) return;
    isProcessingQueue = true;
    while (chapterListQueue.length > 0) {
        const { mangaId, resolve, reject } = chapterListQueue.shift();
        
        // Check cache first
        if (chapterCache.has(mangaId)) {
            const cached = chapterCache.get(mangaId);
            if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
                resolve(cached.data);
                continue;
            }
        }

        try {
            const response = await fetch(`${API_BASE}/chapter/${mangaId}/list?page=1&page_size=10&sort_by=chapter_number&sort_order=desc`);
            if (response.status === 429) {
                // Backoff and retry later
                chapterListQueue.unshift({ mangaId, resolve, reject });
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            const data = await response.json();
            chapterCache.set(mangaId, { data, timestamp: Date.now() });
            resolve(data);
        } catch (error) {
            reject(error);
        }
        await new Promise(r => setTimeout(r, 400)); // 400ms gap between requests
    }
    isProcessingQueue = false;
}

export const API = {
    // --- Local Source (Legacy API) ---
    async getLatest(page = 1, pageSize = 48, genre = '') {
        try {
            let url = `${API_BASE}/manga/list?type=project&page=${page}&page_size=${pageSize}&is_update=true&sort=latest&sort_order=desc`;
            if (genre) url += `&genre=${encodeURIComponent(genre)}`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching latest:', error);
            return { data: [] };
        }
    },

    /**
     * Fetch ALL series (browse/library view)
     */
    async getAllSeries(page = 1, pageSize = 48, genre = '') {
        try {
            let url = `${API_BASE}/manga/list?type=project&page=${page}&page_size=${pageSize}&sort=latest&sort_order=desc`;
            if (genre) url += `&genre=${encodeURIComponent(genre)}`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching all series:', error);
            return { data: [] };
        }
    },


    /**
     * Fetch trending series
     */
    async getTrending(filter = 'daily', pageSize = 24) {
        try {
            // Fix: Backend might not support 'monthly' or 'monthly' filter name might be different.
            // Some APIs use 'all' instead of 'monthly'.
            const apiFilter = filter === 'monthly' ? 'weekly' : filter; // Fallback weekly if monthly fails or use weekly for now
            const response = await fetch(`${API_BASE}/manga/top?filter=${apiFilter}&page=1&page_size=${pageSize}`);
            if (!response.ok) throw new Error('Trending API failed');
            return await response.json();
        } catch (error) {
            console.error('Error fetching trending:', error);
            return { data: [] };
        }
    },

    async getDetail(mangaId) {
        if (String(mangaId).includes('mwd-')) {
            return this.mwd.getDetail(mangaId.replace('mwd-', ''));
        }
        try {
            const response = await fetch(`${API_BASE}/manga/detail/${mangaId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching details:', error);
            return null;
        }
    },

    async getChapterList(mangaId) {
        if (String(mangaId).includes('mwd-')) {
            return this.mwd.getChapterList(mangaId.replace('mwd-', ''));
        }
        
        return new Promise((resolve, reject) => {
            chapterListQueue.push({ mangaId, resolve, reject });
            processQueue();
        });
    },

    async getChapter(chapterId) {
        if (String(chapterId).includes('mwd-')) {
            const [mangaSlug, chapterSlug] = chapterId.replace('mwd-', '').split('__');
            return this.mwd.getPages(mangaSlug, chapterSlug);
        }
        try {
            const response = await fetch(`${API_BASE}/chapter/detail/${chapterId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching chapter:', error);
            return null;
        }
    },

    async search(query) {
        try {
            const [local, mwd] = await Promise.all([
                fetch(`${API_BASE}/manga/list?page=1&page_size=30&q=${encodeURIComponent(query)}`).then(r => r.json()),
                this.mwd.search(query)
            ]);
            
            const localData = (local.data || []).map(m => ({ ...m, source: 'local' }));
            const mwdData = (mwd.data || []).map(m => ({ 
                ...m, 
                manga_id: `mwd-${m.manga_id}`,
                source: 'manhwadesu' 
            }));
            
            return { data: [...localData, ...mwdData] };
        } catch (error) {
            console.error('Error searching:', error);
            return { data: [] };
        }
    },

    // --- Manhwadesu Source ---
    mwd: {
        async getLatest(page = 1) {
            const res = await fetch(`/api/manhwadesu/series?page=${page}`);
            return res.json();
        },
        async getDetail(slug) {
            const res = await fetch(`/api/manhwadesu/detail?slug=${slug}`);
            const data = await res.json();
            return { data: { ...data.detail, manga_id: `mwd-${slug}` } };
        },
        async getChapterList(slug) {
            const res = await fetch(`/api/manhwadesu/detail?slug=${slug}`);
            const data = await res.json();
            return { data: (data.chapters || []).map(ch => ({ 
                ...ch, 
                chapter_id: `mwd-${slug}__${ch.chapter_id}` 
            })) };
        },
        async getPages(slug, chapter) {
            const res = await fetch(`/api/manhwadesu/pages?slug=${slug}&chapter=${chapter}`);
            const data = await res.json();
            const images = (data.data || []).map(img => `/api/image-proxy?url=${encodeURIComponent(img)}`);
            return { 
                data: { 
                    chapter: { data: images },
                    base_url: '',
                    path: ''
                } 
            };
        },
        async search(q) {
            const res = await fetch(`/api/manhwadesu/search?q=${encodeURIComponent(q)}`);
            return res.json();
        }
    },

    // --- Helpers ---
    resolveImg(m) {
        let finalUrl = '/assets/covers/standard.svg';
        if (m.source === 'manhwadesu' || (m.manga_id && String(m.manga_id).startsWith('mwd-'))) {
            finalUrl = m.cover_url || m.thumbnail || '/assets/covers/standard.svg';
        } else {
            const CDN = 'https://assets.shngm.id/';
            const mid = m.manga_id || m.id;
            const candidates = [m.cover_portrait_url, m.cover_url, m.thumbnail];
            for (const raw of candidates) {
                if (!raw) continue;
                if (raw.startsWith('http')) { finalUrl = raw; break; }
                if (raw.startsWith('thumbnail/')) { finalUrl = CDN + raw; break; }
            }
            if (finalUrl === '/assets/covers/standard.svg' && mid) {
                finalUrl = CDN + 'thumbnail/image/' + mid + '.jpg';
            }
        }
        
        if (finalUrl.startsWith('http')) {
            return `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
        }
        return finalUrl;
    }
};

