import { Filesystem, Directory } from '@capacitor/filesystem';
import { CapacitorHttp } from '@capacitor/core';
import { API } from './api.js';

const DB_NAME = 'shngm_downloads';
const STORE_MANGA = 'downloaded_manga';
const STORE_CHAPTERS = 'downloaded_chapters';

// IndexedDB Initialization
const initDB = () => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_MANGA)) {
                db.createObjectStore(STORE_MANGA, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
                const chapterStore = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'chapter_id' });
                chapterStore.createIndex('manga_id', 'manga_id', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const _dbAction = async (storeName, action, value) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, action === 'get' || action === 'getAll' ? 'readonly' : 'readwrite');
        const store = tx.objectStore(storeName);
        let req;
        if (action === 'put') req = store.put(value);
        if (action === 'get') req = store.get(value);
        if (action === 'getAll') req = store.getAll();
        if (action === 'delete') req = store.delete(value);
        
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const _dbIndexGetAll = async (storeName, indexName, value) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.getAll(value);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

// Convert remote image blob to base64
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const Downloader = {
    /**
     * Estimates file size (Assume ~15MB per chapter on average)
     * @param {number} chapterCount 
     * @returns {string} Formatted size (e.g. "150 MB")
     */
    estimateSize(chapterCount) {
        const sizeMB = chapterCount * 15;
        if (sizeMB > 1024) return (sizeMB / 1024).toFixed(2) + ' GB';
        return sizeMB.toFixed(0) + ' MB';
    },

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const mb = bytes / (1024 * 1024);
        if (mb > 1024) return (mb / 1024).toFixed(2) + ' GB';
        return mb.toFixed(1) + ' MB';
    },

    /**
     * Downloads a single chapter
     */
    async downloadChapter(manga, chapter, onProgress = null) {
        if (!window.Capacitor) throw new Error("Offline downloading is only available on native Android/iOS.");
        
        const mangaId = manga.id || manga.slug;
        const chapterId = chapter.chapter_id || chapter.id;
        
        // 1. Get all image URLs for chapter
        let pagesReq;
        if (manga.source === 'manhwadesu' || window.location.href.includes('manhwadesu')) {
             pagesReq = await API.getPages(manga.slug || manga.id, chapter.chapter_number);
        } else {
             pagesReq = await API.getPages(manga.slug || manga.id, chapter.chapter_number);
        }
        
        const images = (pagesReq?.data || []);
        if (images.length === 0) throw new Error("No images found for chapter.");

        const localPaths = [];
        let totalSize = 0;

        for (let i = 0; i < images.length; i++) {
            const imgUrl = `${window.Capacitor ? 'https://shngm.vercel.app' : ''}/api/image-proxy?url=${encodeURIComponent(images[i])}`;
            
            // Download as blob
            const res = await fetch(imgUrl);
            const blob = await res.blob();
            totalSize += blob.size;
            const b64 = await blobToBase64(blob);

            const path = `shngm/${mangaId}/${chapterId}/page_${i}.jpg`;
            
            // Save using Filesystem plugin
            await Filesystem.writeFile({
                path: path,
                data: b64,
                directory: Directory.Data,
                recursive: true
            });

            const uriObj = await Filesystem.getUri({
                directory: Directory.Data,
                path: path
            });
            localPaths.push(uriObj.uri);

            if (onProgress) onProgress(i + 1, images.length);
        }

        // Save Metadata
        await _dbAction(STORE_MANGA, 'put', {
            id: mangaId,
            title: manga.title,
            poster: manga.poster || manga.image,
            source: manga.source
        });

        const chapMeta = {
            chapter_id: chapterId,
            manga_id: mangaId,
            chapter_number: chapter.chapter_number,
            pages: localPaths,
            sizeBytes: totalSize,
            downloadedAt: Date.now()
        };
        await _dbAction(STORE_CHAPTERS, 'put', chapMeta);
        
        return chapMeta;
    },

    /**
     * Checks if a chapter is downloaded
     */
    async isDownloaded(chapterId) {
        const ch = await _dbAction(STORE_CHAPTERS, 'get', chapterId);
        return !!ch;
    },

    /**
     * Gets local URI paths for a chapter
     */
    async getLocalPages(chapterId) {
        const ch = await _dbAction(STORE_CHAPTERS, 'get', chapterId);
        if (!ch) return null;
        
        // Capacitor convertFileSrc transforms file:/// to http://localhost/_capacitor_file_/
        if (window.Capacitor) {
            return ch.pages.map(p => window.Capacitor.convertFileSrc(p));
        }
        return ch.pages;
    },

    /**
     * Get all downloaded manga
     */
    async getDownloadedLibrary() {
        const mangas = await _dbAction(STORE_MANGA, 'getAll') || [];
        for (const m of mangas) {
            const chaps = await _dbIndexGetAll(STORE_CHAPTERS, 'manga_id', m.id);
            m.chapterCount = chaps.length;
            m.totalSize = chaps.reduce((acc, c) => acc + (c.sizeBytes || 0), 0);
        }
        return mangas.filter(m => m.chapterCount > 0);
    },

    /**
     * Delete a downloaded manga
     */
    async deleteManga(mangaId) {
        try {
            await Filesystem.rmdir({
                directory: Directory.Data,
                path: `shngm/${mangaId}`,
                recursive: true
            });
        } catch(e) {
            console.warn("Folder might not exist or already deleted.", e);
        }
        
        const chaps = await _dbIndexGetAll(STORE_CHAPTERS, 'manga_id', mangaId);
        for (const c of chaps) {
            await _dbAction(STORE_CHAPTERS, 'delete', c.chapter_id);
        }
        await _dbAction(STORE_MANGA, 'delete', mangaId);
    },
    
    /**
     * Get downloaded chapters for a manga
     */
    async getDownloadedChapters(mangaId) {
        return await _dbIndexGetAll(STORE_CHAPTERS, 'manga_id', mangaId);
    }
};
