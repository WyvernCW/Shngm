import * as cheerio from 'cheerio';

const BASE_URL = 'https://manhwadesu.com';

/**
 * Manhwadesu Scraper Service
 * Handles data extraction from manhwadesu.tech using cheerio.
 */
export const MWDScraper = {
    async fetchLatest(page = 1) {
        const url = `${BASE_URL}/manga/?page=${page}&order=update`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const series = [];
        $('.listupd .bs').each((i, el) => {
            const $el = $(el);
            series.push({
                manga_id: this._extractSlug($el.find('a').attr('href')),
                title: $el.find('.tt').text().trim(),
                cover_url: $el.find('img').attr('src') || $el.find('img').attr('data-src'),
                latest_chapter_number: $el.find('.epxs').text().replace(/Chapter /i, '').trim(),
                type: $el.find('.type').text().trim() || 'Manhwa',
                source: 'manhwadesu'
            });
        });
        return series;
    },

    async fetchTrending() {
        const html = await this._fetch(BASE_URL);
        const $ = cheerio.load(html);
        const list = [];
        $('.popular .bs').each((i, el) => {
            const $el = $(el);
            list.push({
                manga_id: this._extractSlug($el.find('a').attr('href')),
                title: $el.find('.tt').text().trim(),
                cover_url: $el.find('img').attr('src'),
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
            title: $('.entry-title').text().trim(),
            description: $('.entry-content p').text().trim(),
            cover_url: $('.thumb img').attr('src'),
            status: $('.infotable tr:contains("Status") td:last-child').text().trim() === 'Ongoing' ? 1 : 2,
            type: $('.infotable tr:contains("Type") td:last-child').text().trim(),
            author: $('.infotable tr:contains("Author") td:last-child').text().trim(),
            taxonomy: {
                Genre: [],
                Format: [{ name: $('.infotable tr:contains("Type") td:last-child').text().trim() }]
            },
            source: 'manhwadesu'
        };

        $('.genxed a').each((i, el) => {
            detail.taxonomy.Genre.push({
                name: $(el).text().trim(),
                slug: this._extractSlug($(el).attr('href'))
            });
        });

        // Chapters
        const chapters = [];
        $('#chapterlist li').each((i, el) => {
            const $el = $(el);
            const num = $el.find('.chapternum').text().replace(/Chapter /i, '').trim();
            chapters.push({
                chapter_id: this._extractSlug($el.find('a').attr('href')),
                chapter_number: num,
                release_date: $el.find('.chapterdate').text().trim()
            });
        });

        return { detail, chapters };
    },

    async fetchPages(seriesSlug, chapterSlug) {
        const url = `${BASE_URL}/${chapterSlug}/`; // MWD uses flat structure for chapters
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const images = [];
        $('#readerarea img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !src.includes('lazy')) {
                images.push(src.trim());
            }
        });
        
        return images;
    },

    async search(query) {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const results = [];
        $('.listupd .bs').each((i, el) => {
            const $el = $(el);
            results.push({
                manga_id: this._extractSlug($el.find('a').attr('href')),
                title: $el.find('.tt').text().trim(),
                cover_url: $el.find('img').attr('src'),
                source: 'manhwadesu'
            });
        });
        return results;
    },

    async _fetch(url) {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': '*/*',
                'Accept-Language': 'en-GB,en;q=0.5',
                'Referer': 'https://www.google.com/',
                'Connection': 'keep-alive'
            }
        });
        if (!res.ok) throw new Error(`MWD Scraper Failed: ${res.status}`);
        return res.text();
    },

    _extractSlug(url) {
        if (!url) return '';
        const match = url.match(/\/([^\/]+)\/$/);
        return match ? match[1] : '';
    }
};
