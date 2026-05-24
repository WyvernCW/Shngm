/**
 * Shinigami API Service Layer
 * Multi-source integration (Local + Manhwadesu)
 */

const API_BASE = (window.Capacitor ? 'https://shngm.vercel.app' : '') + '/api/shinigami-proxy?path=';

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

// --- API ORCHESTRATOR & PRIORITY QUEUE ---
export const PRIORITY = {
    HIGH: 0,
    LOW: 1
};

const queue = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5; // Max concurrent outgoing server requests

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

const enqueue = (task, priority = PRIORITY.HIGH) => new Promise((resolve, reject) => {
    const item = { task, resolve, reject, priority };
    if (priority === PRIORITY.HIGH) {
        queue.unshift(item); // Fast-track high-priority user actions
    } else {
        queue.push(item); // Queue background processes at the back
    }
    processQueue();
});

/**
 * Enhanced Fetch with Persistent SWR Caching
 * - Instant cache return (24h TTL)
 * - Background revalidation (1h Stale limit)
 */
async function fetchWithRetry(url, options = {}, retries = 2, backoff = 1000, priority = PRIORITY.HIGH) {
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
    }, priority);
}

async function performNetworkFetch(url, options, retries, backoff, cacheKey) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(25000) 
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

// --- DEDUPLICATION & MULTI-SOURCE MERGING UTILITIES ---
const normalizeTitle = (title) => {
    if (!title) return '';
    return title.toLowerCase()
        .replace(/[^\w\s]/g, '') // remove punctuation/non-alphanumeric except spaces
        .replace(/\s+/g, '')     // remove all spaces
        .trim();
};

const mergeChapters = (lists) => {
    const chaptersMap = new Map();
    // Priority: local is highest, followed by cosmicscans, then manhwadesu
    const sourcesPriority = ['manhwadesu', 'cosmicscans', 'local'];
    const allChapters = [];
    
    lists.forEach(({ data, source }) => {
        if (!data || !Array.isArray(data)) return;
        data.forEach(ch => {
            allChapters.push({ ...ch, source });
        });
    });

    // Sort by source priority ascending so higher priority runs last and overwrites
    allChapters.sort((a, b) => sourcesPriority.indexOf(a.source) - sourcesPriority.indexOf(b.source));

    for (const ch of allChapters) {
        let chNumStr = String(ch.chapter_number).replace(/chapter/i, '').trim();
        if (chNumStr.endsWith('.0')) chNumStr = chNumStr.slice(0, -2);
        
        chaptersMap.set(chNumStr, {
            ...ch,
            chapter_number: chNumStr
        });
    }

    const merged = Array.from(chaptersMap.values());
    merged.sort((a, b) => {
        const numA = parseFloat(a.chapter_number) || 0;
        const numB = parseFloat(b.chapter_number) || 0;
        return numB - numA;
    });

    return merged;
};

const localSeriesTitlesSet = new Set();
const localSeriesRawTitles = new Set();
let localSeriesFetchPromise = null;

const ensureLocalSeriesLoaded = () => {
    if (localSeriesTitlesSet.size > 100) return Promise.resolve();
    if (localSeriesFetchPromise) return localSeriesFetchPromise;

    localSeriesFetchPromise = (async () => {
        try {
            // Fetch pages 1 to 15 in parallel to be absolutely sure we retrieve all local titles,
            // completely bypassing any server-side page_size limitation (often capped at 30 or 50)
            const pagesToFetch = Array.from({ length: 15 }, (_, i) => i + 1);
            const promises = pagesToFetch.map(page =>
                fetchWithRetry(`${API_BASE}manga/list&type=project&page=${page}&page_size=100&sort=latest`, {}, 2, 1000, PRIORITY.LOW)
                    .then(res => {
                        if (res && Array.isArray(res.data)) {
                            for (const m of res.data) {
                                if (m && m.title) {
                                    localSeriesTitlesSet.add(normalizeTitle(m.title));
                                    localSeriesRawTitles.add(m.title);
                                }
                            }
                        }
                    }).catch(() => {})
            );
            await Promise.all(promises);
            console.log(`[Deduplicator] Fully preloaded ${localSeriesTitlesSet.size} local series titles across 15 pages.`);
        } catch (e) {
            console.error('[Deduplicator] Failed to preload local series:', e);
        }
    })();
    return localSeriesFetchPromise;
};

// Start background preload
ensureLocalSeriesLoaded();

const getWordSet = (title) => {
    if (!title) return new Set();
    const stopWords = new Set([
        'the', 'who', 'which', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'is', 'are', 'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'season', 'ch', 'chapter', 'manga', 'manhua', 'manhwa'
    ]);
    const clean = title.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
        .split(/\s+/)
        .filter(w => w.length > 0 && !stopWords.has(w));
    return new Set(clean);
};

const doesTitleExistLocally = (title) => {
    if (!title) return false;
    const norm = normalizeTitle(title);
    if (localSeriesTitlesSet.has(norm)) return true;
    
    // 1. Direct normalized string containment check
    for (const localNorm of localSeriesTitlesSet) {
        if (norm.includes(localNorm) || localNorm.includes(norm)) return true;
    }
    
    // 2. Token Jaccard overlap check
    const words1 = getWordSet(title);
    if (words1.size === 0) return false;
    
    for (const localTitleRaw of localSeriesRawTitles) {
        const words2 = getWordSet(localTitleRaw);
        if (words2.size === 0) continue;
        
        let intersectionSize = 0;
        for (const w of words1) {
            if (words2.has(w)) intersectionSize++;
        }
        
        const unionSize = new Set([...words1, ...words2]).size;
        const jaccard = intersectionSize / unionSize;
        
        // If Jaccard is high, they match
        if (jaccard >= 0.6) return true;
        
        // If one is a complete subset of the other and they share at least 1 significant word, they match
        const smallerSize = Math.min(words1.size, words2.size);
        if (intersectionSize === smallerSize && smallerSize >= 1) return true;
    }
    
    // 3. Fallback: Fast Levenshtein distance check (max distance 2) against loaded titles
    for (const localNorm of localSeriesTitlesSet) {
        const len1 = norm.length;
        const len2 = localNorm.length;
        if (Math.abs(len1 - len2) > 2) continue;
        
        const maxDist = 2;
        let prev = Array(len2 + 1).fill(0).map((_, i) => i);
        let curr = [];
        for (let i = 1; i <= len1; i++) {
            curr = [i];
            for (let j = 1; j <= len2; j++) {
                const cost = norm[i - 1] === localNorm[j - 1] ? 0 : 1;
                curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
            }
            prev = curr;
        }
        if (prev[len2] <= maxDist) return true;
    }
    
    return false;
};

const mergeSeriesLists = (localList, cosList, mwdList) => {
    const merged = [];
    const seen = new Set();
    
    // Ensure preload is working or queued
    ensureLocalSeriesLoaded();
    
    // Always add any incoming local items to our local title catalog
    if (localList && Array.isArray(localList)) {
        for (const m of localList) {
            if (m && m.title) {
                localSeriesTitlesSet.add(normalizeTitle(m.title));
                localSeriesRawTitles.add(m.title);
            }
        }
    }
    
    const addItems = (items, source) => {
        if (!items || !Array.isArray(items)) return;
        for (const m of items) {
            if (!m) continue;
            const titleNorm = normalizeTitle(m.title);
            
            if (seen.has(titleNorm)) continue;
            
            // If the item is from an external scraper, check if it already exists globally on local/Shinigami
            if (source !== 'local') {
                if (doesTitleExistLocally(m.title)) {
                    console.log(`[Deduplicator] Filtered out duplicate external series: ${m.title} (${source})`);
                    continue;
                }
            }
            
            seen.add(titleNorm);
            let normalizedItem = { ...m };
            if (source === 'manhwadesu') {
                normalizedItem.manga_id = `mwd-${m.manga_id}`;
                normalizedItem.source = 'manhwadesu';
            } else if (source === 'cosmicscans') {
                normalizedItem.manga_id = `cos-${m.manga_id}`;
                normalizedItem.source = 'cosmicscans';
            } else {
                normalizedItem.manga_id = String(m.manga_id || m.id || m.id_manga);
                normalizedItem.source = 'local';
            }
            merged.push(normalizedItem);
        }
    };

    // Priority: local/Shinigami has the best metadata, followed by CosmicScans, then ManhwaDesu
    addItems(localList, 'local');
    addItems(cosList, 'cosmicscans');
    addItems(mwdList, 'manhwadesu');
    
    return merged;
};

export const API = {
    async getLatest(page = 1, pageSize = 48, genre = '', priority = PRIORITY.HIGH) {
        try {
            let path = `manga/list&type=project&page=${page}&page_size=${pageSize}&is_update=true&sort=latest&sort_order=desc`;
            if (genre) path += `&genre=${encodeURIComponent(genre)}`;
            
            const [localRes, cosRes, mwdRes] = await Promise.allSettled([
                fetchWithRetry(`${API_BASE}${path}`, {}, 2, 1000, priority),
                this.cos.getLatest(page, priority),
                this.mwd.getLatest(page, priority)
            ]);

            const localList = localRes.status === 'fulfilled' ? (localRes.value?.data || []) : [];
            const cosList = cosRes.status === 'fulfilled' ? (cosRes.value?.data || []) : [];
            const mwdList = mwdRes.status === 'fulfilled' ? (mwdRes.value?.data || []) : [];

            const merged = mergeSeriesLists(localList, cosList, mwdList);
            return { data: merged.slice(0, pageSize) };
        } catch (error) {
            console.error('Error fetching latest:', error);
            return { data: [] };
        }
    },

    async getAllSeries(page = 1, pageSize = 48, genre = '', priority = PRIORITY.HIGH) {
        try {
            let path = `manga/list&type=project&page=${page}&page_size=${pageSize}&sort=latest&sort_order=desc`;
            if (genre) path += `&genre=${encodeURIComponent(genre)}`;
            
            const [localRes, cosRes, mwdRes] = await Promise.allSettled([
                fetchWithRetry(`${API_BASE}${path}`, {}, 2, 1000, priority),
                this.cos.getLatest(page, priority),
                this.mwd.getLatest(page, priority)
            ]);

            const localList = localRes.status === 'fulfilled' ? (localRes.value?.data || []) : [];
            const cosList = cosRes.status === 'fulfilled' ? (cosRes.value?.data || []) : [];
            const mwdList = mwdRes.status === 'fulfilled' ? (mwdRes.value?.data || []) : [];

            const merged = mergeSeriesLists(localList, cosList, mwdList);
            
            const localLastPage = localRes.status === 'fulfilled' ? (localRes.value?.meta?.last_page || 1) : 1;
            const maxLastPage = Math.max(localLastPage, 25); // Assume at least 25 pages from external sources

            return { 
                data: merged.slice(0, pageSize), 
                meta: { 
                    last_page: maxLastPage 
                } 
            };
        } catch (error) {
            console.error('Error fetching all series:', error);
            return { data: [], meta: { last_page: 1 } };
        }
    },

    async getTrending(filter = 'daily', pageSize = 24, priority = PRIORITY.HIGH) {
        try {
            return await fetchWithRetry(`${API_BASE}manga/top&filter=${filter}&page=1&page_size=${pageSize}`, {}, 2, 1000, priority);
        } catch (error) {
            console.error('Error fetching trending:', error);
            return { data: [] };
        }
    },

    async getDetail(mangaId, priority = PRIORITY.HIGH) {
        if (!mangaId || mangaId === 'mwd-' || mangaId === 'cos-' || String(mangaId).endsWith('-undefined')) {
            console.warn('[API] getDetail called with empty/invalid ID, skipping fetch:', mangaId);
            return { data: null };
        }
        let primary = null;
        let primarySource = 'local';
        let canonicalSlug = mangaId;
        
        if (String(mangaId).startsWith('mwd-')) {
            canonicalSlug = mangaId.replace('mwd-', '');
            primary = await this.mwd.getDetail(canonicalSlug, priority);
            primarySource = 'manhwadesu';
        } else if (String(mangaId).startsWith('cos-')) {
            canonicalSlug = mangaId.replace('cos-', '');
            primary = await this.cos.getDetail(canonicalSlug, priority);
            primarySource = 'cosmicscans';
        } else {
            primary = await fetchWithRetry(`${API_BASE}manga/detail/${mangaId}`, {}, 2, 1000, priority);
        }

        if (!primary || !primary.data) return primary;

        const title = primary.data.title;
        const normTitle = normalizeTitle(title);

        // Fetch matches in background or in parallel, cache in IndexedDB
        const cacheKey = `manga_matches_${mangaId}`;
        let matches = await dbGet(cacheKey);

        if (!matches) {
            matches = { local: null, mwd: null, cos: null };
            matches[primarySource] = canonicalSlug;

            const searchPromises = [];
            
            if (primarySource !== 'local') {
                searchPromises.push(
                    fetchWithRetry(`${API_BASE}manga/list&page=1&page_size=20&q=${encodeURIComponent(title)}`, {}, 2, 1000, PRIORITY.LOW)
                        .then(res => {
                            const found = (res?.data || []).find(m => normalizeTitle(m.title) === normTitle);
                            if (found) matches.local = found.manga_id || found.id;
                        }).catch(() => {})
                );
            }
            if (primarySource !== 'manhwadesu') {
                searchPromises.push(
                    this.mwd.search(title, PRIORITY.LOW)
                        .then(res => {
                            const found = (res?.data || []).find(m => normalizeTitle(m.title) === normTitle);
                            if (found) matches.mwd = found.manga_id;
                        }).catch(() => {})
                );
            }
            if (primarySource !== 'cosmicscans') {
                searchPromises.push(
                    this.cos.search(title, PRIORITY.LOW)
                        .then(res => {
                            const found = (res?.data || []).find(m => normalizeTitle(m.title) === normTitle);
                            if (found) matches.cos = found.manga_id;
                        }).catch(() => {})
                );
            }

            await Promise.all(searchPromises);
            await dbSet(cacheKey, matches);
        }

        this._runtimeMatches = this._runtimeMatches || {};
        this._runtimeMatches[mangaId] = matches;

        return primary;
    },

    async getChapterList(mangaId, priority = PRIORITY.HIGH) {
        this._runtimeMatches = this._runtimeMatches || {};
        let matches = this._runtimeMatches[mangaId];
        
        if (!matches) {
            const cacheKey = `manga_matches_${mangaId}`;
            matches = await dbGet(cacheKey);
        }

        const lists = [];

        // 1. Fetch Primary Chapter List
        if (String(mangaId).startsWith('mwd-')) {
            const res = await this.mwd.getChapterList(mangaId.replace('mwd-', ''), priority);
            lists.push({ data: res?.data || [], source: 'manhwadesu' });
        } else if (String(mangaId).startsWith('cos-')) {
            const res = await this.cos.getChapterList(mangaId.replace('cos-', ''), priority);
            lists.push({ data: res?.data || [], source: 'cosmicscans' });
        } else {
            const res = await fetchWithRetry(`${API_BASE}chapter/${mangaId}/list&page=1&page_size=500&sort_by=chapter_number&sort_order=desc`, {}, 2, 1000, priority);
            lists.push({ data: res?.data || [], source: 'local' });
        }

        // 2. Fetch Matched lists in parallel
        if (matches) {
            const promises = [];
            
            if (matches.local && !String(mangaId).match(/^\d+$/)) {
                promises.push(
                    fetchWithRetry(`${API_BASE}chapter/${matches.local}/list&page=1&page_size=500&sort_by=chapter_number&sort_order=desc`, {}, 2, 1000, priority)
                        .then(res => {
                            if (res?.data) lists.push({ data: res.data, source: 'local' });
                        }).catch(() => {})
                );
            }
            if (matches.mwd && matches.mwd !== 'undefined' && !String(mangaId).startsWith('mwd-')) {
                promises.push(
                    this.mwd.getChapterList(matches.mwd, priority)
                        .then(res => {
                            if (res?.data) lists.push({ data: res.data, source: 'manhwadesu' });
                        }).catch(() => {})
                );
            }
            if (matches.cos && matches.cos !== 'undefined' && !String(mangaId).startsWith('cos-')) {
                promises.push(
                    this.cos.getChapterList(matches.cos, priority)
                        .then(res => {
                            if (res?.data) lists.push({ data: res.data, source: 'cosmicscans' });
                        }).catch(() => {})
                );
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }
        }

        const merged = mergeChapters(lists);
        return { data: merged };
    },

    async getChapter(chapterId, priority = PRIORITY.HIGH) {
        if (!chapterId || chapterId === 'undefined') {
            console.warn('[API] getChapter called with empty/invalid ID, skipping fetch:', chapterId);
            return { data: { chapter: { data: [] }, base_url: '', path: '' } };
        }
        if (String(chapterId).startsWith('mwd-')) {
            const [slug, ch] = chapterId.replace('mwd-', '').split('__');
            const res = await this.mwd.getPages(slug, ch, priority);
            if (res?.data) {
                res.data.manga_id = `mwd-${slug}`;
            }
            return res;
        }
        if (String(chapterId).startsWith('cos-')) {
            const [slug, ch] = chapterId.replace('cos-', '').split('__');
            const res = await this.cos.getPages(slug, ch, priority);
            if (res?.data) {
                res.data.manga_id = `cos-${slug}`;
            }
            return res;
        }
        try {
            return await fetchWithRetry(`${API_BASE}chapter/detail/${chapterId}`, {}, 2, 1000, priority);
        } catch (error) {
            console.error('Error fetching chapter:', error);
            return null;
        }
    },

    async search(query, priority = PRIORITY.HIGH) {
        try {
            const [local, mwd, cos] = await Promise.all([
                fetchWithRetry(`${API_BASE}manga/list&page=1&page_size=30&q=${encodeURIComponent(query)}`, {}, 2, 1000, priority),
                this.mwd.search(query, priority),
                this.cos.search(query, priority).catch(() => ({ data: [] }))
            ]);
            
            const localData = (local?.data || [])
                .filter(m => m.manga_id || m.id)
                .map(m => ({ ...m, manga_id: String(m.manga_id || m.id), source: 'local' }));
                
            // Ensure local matches are registered in local titles cache
            for (const m of localData) {
                if (m && m.title) {
                    localSeriesTitlesSet.add(normalizeTitle(m.title));
                    localSeriesRawTitles.add(m.title);
                }
            }
                
            const mwdData = (mwd?.data || [])
                .filter(m => m.manga_id && m.manga_id !== 'undefined')
                .map(m => ({ ...m, manga_id: `mwd-${m.manga_id}`, source: 'manhwadesu' }));
                
            const cosData = (cos?.data || [])
                .filter(m => m.manga_id && m.manga_id !== 'undefined')
                .map(m => ({ ...m, manga_id: `cos-${m.manga_id}`, source: 'cosmicscans' }));
            
            const merged = [];
            const seen = new Set();
            for (const item of [...localData, ...mwdData, ...cosData]) {
                const norm = normalizeTitle(item.title);
                if (seen.has(norm)) continue;
                
                // If it is from an external source, check if it already exists globally on local/Shinigami
                if (item.source !== 'local') {
                    if (doesTitleExistLocally(item.title)) {
                        continue;
                    }
                }
                
                if (item.manga_id && !item.manga_id.endsWith('-')) {
                    seen.add(norm);
                    merged.push(item);
                }
            }
            return { data: merged };
        } catch (error) {
            console.error('Error searching:', error);
            return { data: [] };
        }
    },

    mwd: {
        async getLatest(page = 1, priority = PRIORITY.HIGH) {
            return fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/manhwadesu/series?page=${page}`, {}, 2, 1000, priority);
        },
        async getDetail(slug, priority = PRIORITY.HIGH) {
            const clean = String(slug || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            if (!clean || clean === 'undefined' || clean === 'null' || clean === '') {
                return { data: null };
            }
            const data = await fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/manhwadesu/detail?slug=${clean}`, {}, 2, 1000, priority);
            return { data: { ...data?.detail, manga_id: `mwd-${clean}` } };
        },
        async getChapterList(slug, priority = PRIORITY.HIGH) {
            const clean = String(slug || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            if (!clean || clean === 'undefined' || clean === 'null' || clean === '') {
                return { data: [] };
            }
            const data = await fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/manhwadesu/detail?slug=${clean}`, {}, 2, 1000, priority);
            return { data: (data?.chapters || []).map(ch => ({ ...ch, chapter_id: `mwd-${clean}__${ch.chapter_id}` })) };
        },
        async getPages(slug, chapter, priority = PRIORITY.HIGH) {
            const cleanSlug = String(slug || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            const cleanCh = String(chapter || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            if (!cleanSlug || cleanSlug === 'undefined' || cleanSlug === 'null' || !cleanCh || cleanCh === 'undefined' || cleanCh === 'null') {
                console.error('[API] getPages called with invalid parameters:', slug, chapter);
                return { data: { chapter: { data: [] }, base_url: '', path: '' } };
            }
            const res = await fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/manhwadesu/pages?slug=${cleanSlug}&chapter=${cleanCh}`, {}, 2, 1000, priority);
            const images = (res?.data || []).map(img => `${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/image-proxy?url=${encodeURIComponent(img)}`);
            return { data: { chapter: { data: images }, base_url: '', path: '' } };
        },
        async search(q, priority = PRIORITY.HIGH) {
            const cleanQ = String(q || '').trim();
            if (!cleanQ) return { data: [] };
            return fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/manhwadesu/search?q=${encodeURIComponent(cleanQ)}`, {}, 2, 1000, priority);
        }
    },

    cos: {
        async getLatest(page = 1, priority = PRIORITY.HIGH) {
            return fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/cosmicscans/series?page=${page}`, {}, 2, 1000, priority);
        },
        async getDetail(slug, priority = PRIORITY.HIGH) {
            const clean = String(slug || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            if (!clean || clean === 'undefined' || clean === 'null' || clean === '') {
                return { data: null };
            }
            const data = await fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/cosmicscans/detail?slug=${clean}`, {}, 2, 1000, priority);
            return { data: { ...data?.detail, manga_id: `cos-${clean}` } };
        },
        async getChapterList(slug, priority = PRIORITY.HIGH) {
            const clean = String(slug || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            if (!clean || clean === 'undefined' || clean === 'null' || clean === '') {
                return { data: [] };
            }
            const data = await fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/cosmicscans/detail?slug=${clean}`, {}, 2, 1000, priority);
            return { data: (data?.chapters || []).map(ch => ({ ...ch, chapter_id: `cos-${clean}__${ch.chapter_id}` })) };
        },
        async getPages(slug, chapter, priority = PRIORITY.HIGH) {
            const cleanSlug = String(slug || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            const cleanCh = String(chapter || '').trim().replace(/^['"`]+|['"`]+$/g, '');
            if (!cleanSlug || cleanSlug === 'undefined' || cleanSlug === 'null' || !cleanCh || cleanCh === 'undefined' || cleanCh === 'null') {
                console.error('[API] getPages called with invalid parameters:', slug, chapter);
                return { data: { chapter: { data: [] }, base_url: '', path: '' } };
            }
            const res = await fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/cosmicscans/pages?slug=${cleanSlug}&chapter=${cleanCh}`, {}, 2, 1000, priority);
            const images = (res?.data || []).map(img => `${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/image-proxy?url=${encodeURIComponent(img)}`);
            return { data: { chapter: { data: images }, base_url: '', path: '' } };
        },
        async search(q, priority = PRIORITY.HIGH) {
            const cleanQ = String(q || '').trim();
            if (!cleanQ) return { data: [] };
            return fetchWithRetry(`${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/cosmicscans/search?q=${encodeURIComponent(cleanQ)}`, {}, 2, 1000, priority);
        }
    },

    // --- HIGH SPEED FRESHNESS ENGINE ---
    async getChapterDatesParallel(mangaList, callback) {
        const CONCURRENCY = 3;
        const tasks = [];
        
        for (const m of mangaList) {
            if (!m?.manga_id) continue;
            
            // 1. Direct object inspection (Bypass network completely!)
            const directDate = m.latest_chapter_time || m.updated_at || m.release_date || m.created_at || m.real_updated_at;
            if (directDate) {
                const cacheKey = `date_${m.manga_id}`;
                dbSet(cacheKey, { date: directDate, timestamp: Date.now() });
                callback(m.manga_id, directDate);
                continue;
            }
            
            tasks.push(m);
        }
        
        if (tasks.length === 0) return;
        
        const worker = async () => {
            while (tasks.length > 0) {
                const m = tasks.shift();
                if (!m?.manga_id) continue;
                
                // 2. Check persistent date store
                const cacheKey = `date_${m.manga_id}`;
                const cached = await dbGet(cacheKey);
                if (cached && (Date.now() - cached.timestamp < 86400000)) { // 24h date cache
                    callback(m.manga_id, cached.date);
                    continue;
                }

                try {
                    // Only request chapter list as last resort
                    const chRes = await this.getChapterList(m.manga_id, PRIORITY.LOW);
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

        // Start multiple workers for any left-over non-local/uncached tasks
        await Promise.all(Array(Math.min(CONCURRENCY, tasks.length)).fill(0).map(() => worker()));
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
        
        if (m.source === 'manhwadesu' || String(m.manga_id).startsWith('mwd-') || m.source === 'cosmicscans' || String(m.manga_id).startsWith('cos-')) {
            url = m.cover_url || m.thumbnail || m.coverImage || url;
            
            // Normalize protocol-relative paths
            if (url && url.startsWith('//')) {
                url = 'https:' + url;
            }
            // Normalize relative paths
            if (url && url.startsWith('/') && !url.startsWith('//')) {
                if (m.source === 'manhwadesu' || String(m.manga_id).startsWith('mwd-')) {
                    url = 'https://05c.manhwaland.land' + url;
                } else {
                    url = 'https://lc8.cosmicscans.asia' + url;
                }
            }
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
            return `${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    }
};
