import * as cheerio from 'cheerio';

const BASE_URL = 'https://05c.manhwaland.land';

/**
 * Manhwadesu Scraper Service
 * Handles data extraction from Manhwaland/Manhwadesu using cheerio.
 * Updated 2024-05-13 for new Brutalist structure.
 */
export const MWDScraper = {
    _getCover($, imgEl) {
        if (!imgEl) return '';
        const candidates = [
            $(imgEl).attr('data-lazy-src'),
            $(imgEl).attr('data-src'),
            $(imgEl).attr('data-srcset'),
            $(imgEl).attr('src')
        ];
        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string' && !candidate.startsWith('data:image') && !candidate.includes('lazy')) {
                return candidate.trim();
            }
        }
        for (const candidate of candidates) {
            if (candidate && typeof candidate === 'string' && candidate.trim() !== '') {
                return candidate.trim();
            }
        }
        return '';
    },

    async fetchLatest(page = 1) {
        const url = `${BASE_URL}/latest?page=${page}`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const series = [];
        $('.manga-grid .manga-card').each((i, el) => {
            const $el = $(el);
            series.push({
                manga_id: this._extractSlug($el.attr('href')),
                title: $el.find('.manga-title').text().trim(),
                cover_url: this._getCover($, $el.find('img')[0]),
                latest_chapter_number: '?', // Not available in grid anymore
                type: $el.find('.manga-badge').text().trim() || 'Manhwa',
                source: 'manhwadesu'
            });
        });
        return series;
    },

    async fetchTrending() {
        const html = await this._fetch(BASE_URL);
        const $ = cheerio.load(html);
        const list = [];
        $('.manga-grid .manga-card').each((i, el) => {
            const $el = $(el);
            list.push({
                manga_id: this._extractSlug($el.attr('href')),
                title: $el.find('.manga-title').text().trim(),
                cover_url: this._getCover($, $el.find('img')[0]),
                source: 'manhwadesu'
            });
        });
        return list;
    },

    async fetchDetail(slug) {
        const url = `${BASE_URL}/manga/${slug}/`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const detail = {
            manga_id: slug,
            title: $('.manga-detail-title').text().trim() || $('.entry-title').text().trim(),
            description: $('.manga-synopsis').text().trim() || $('.entry-content p').text().trim(),
            cover_url: this._getCover($, $('.manga-detail-cover img')[0]),
            status: $('.manga-detail-meta').text().includes('Ongoing') ? 1 : 2,
            type: $('.manga-detail-meta').text().includes('Manhwa') ? 'Manhwa' : 'Manga',
            author: 'Unknown',
            taxonomy: {
                Genre: [],
                Format: [{ name: 'Manhwa' }]
            },
            source: 'manhwadesu'
        };

        $('.manga-genres a').each((i, el) => {
            detail.taxonomy.Genre.push({
                name: $(el).text().trim(),
                slug: this._extractSlug($(el).attr('href'))
            });
        });

        // Chapters - New structure
        const chapters = [];
        $('.chapter-list-item').each((i, el) => {
            const $el = $(el);
            const num = $el.find('.chapter-number').text().trim();
            chapters.push({
                chapter_id: this._extractSlug($el.find('a').attr('href')),
                chapter_number: num,
                release_date: $el.find('.chapter-date').text().trim()
            });
        });

        // Fallback for old structure if new fails
        if (chapters.length === 0) {
            $('#chapterlist li').each((i, el) => {
                const $el = $(el);
                chapters.push({
                    chapter_id: this._extractSlug($el.find('a').attr('href')),
                    chapter_number: $el.find('.chapternum').text().replace(/Chapter /i, '').trim(),
                    release_date: $el.find('.chapterdate').text().trim()
                });
            });
        }

        return { detail, chapters };
    },

    async fetchPages(seriesSlug, chapterSlug) {
        const url = `${BASE_URL}/manga/${seriesSlug}/${chapterSlug}/`; 
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const images = [];
        // New reader structure
        $('.reader-area img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !src.includes('lazy')) images.push(src.trim());
        });
        
        if (images.length === 0) {
            $('#readerarea img').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                if (src && !src.includes('lazy')) images.push(src.trim());
            });
        }
        
        return images;
    },

    async search(query) {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const results = [];
        $('.manga-grid .manga-card').each((i, el) => {
            const $el = $(el);
            results.push({
                manga_id: this._extractSlug($el.attr('href')),
                title: $el.find('.manga-title').text().trim(),
                cover_url: this._getCover($, $el.find('img')[0]),
                source: 'manhwadesu'
            });
        });
        return results;
    },

    async _fetch(url) {
        console.log(`[MWD Scraper] Fetching: ${url}`);
        const retries = 2; // Reduced to fit Vercel 10s limit
        const backoff = 1000;

        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': BASE_URL + '/',
                        'Cache-Control': 'no-cache'
                    },
                    redirect: 'follow',
                    signal: AbortSignal.timeout(15000) // 15s timeout per attempt
                });
                
                if (res.status === 403 || res.status === 503) {
                    if (i === retries - 1) throw new Error(`MWD Scraper Blocked [${res.status}]: Max retries reached`);
                    console.warn(`[MWD Scraper] Blocked (${res.status}). Retrying...`);
                    await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
                    continue;
                }

                if (!res.ok) throw new Error(`MWD Scraper Failed [${res.status}]: ${url}`);
                const text = await res.text();
                if (typeof text !== 'string') throw new Error('MWD Scraper returned non-string content');
                return text;
            } catch (err) {
                if (i === retries - 1) {
                    console.error(`[MWD Scraper] Final Fetch Error: ${err.message}`);
                    throw err;
                }
                console.warn(`[MWD Scraper] Attempt ${i + 1} failed: ${err.message}. Retrying...`);
                await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
            }
        }
        throw new Error('MWD Scraper: Unexpected end of fetch loop');
    },

    _extractSlug(url) {
        if (!url) return '';
        const parts = url.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    }
};
