// Mock/Stub Downloader to safely deprecate active download capabilities
export const Downloader = {
    estimateSize(chapterCount) {
        return '';
    },

    formatSize(bytes) {
        return '';
    },

    async downloadChapter(manga, chapter, onProgress = null) {
        return null;
    },

    async isDownloaded(chapterId) {
        return false;
    },

    async getLocalPages(chapterId) {
        return null;
    },

    async getDownloadedLibrary() {
        return [];
    },

    async deleteManga(mangaId) {
        return;
    },
    
    async getDownloadedChapters(mangaId) {
        return [];
    }
};
