/**
 * Shinigami API Service Layer
 * Multi-source integration (Local + Manhwadesu)
 */

const API_BASE = 'https://api.shngm.io/v1';

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
            const response = await fetch(`${API_BASE}/manga/top?filter=${filter}&page=1&page_size=${pageSize}`);
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
        try {
            const response = await fetch(`${API_BASE}/chapter/${mangaId}/list?page=1&page_size=500&sort_by=chapter_number&sort_order=desc`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching chapter list:', error);
            return { data: [] };
        }
    },

    async getChapter(chapterId) {
        if (String(chapterId).includes('mwd-')) {
            // Chapter ID for MWD might be "slug/chapter-number" or similar
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
            
            // Merge and tag
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

    // --- Manhwadesu Source (Vercel API) ---
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
            // Wrap images in proxy
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
        if (m.source === 'manhwadesu' || (m.manga_id && String(m.manga_id).startsWith('mwd-'))) {
            return m.cover_url || m.thumbnail || '/assets/covers/standard.svg';
        }
        const CDN = 'https://assets.shngm.id/';
        const mid = m.manga_id || m.id;
        const candidates = [m.cover_portrait_url, m.cover_url, m.thumbnail];
        for (const raw of candidates) {
            if (!raw) continue;
            if (raw.startsWith('http')) return raw;
            if (raw.startsWith('thumbnail/')) return CDN + raw;
        }
        // Fallback to CDN or default
        if (mid) return CDN + 'thumbnail/image/' + mid + '.jpg';
        return '/assets/covers/standard.svg';
    }
};
