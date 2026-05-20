import * as cheerio from 'cheerio';

const BASE_URL = 'https://lc8.cosmicscans.asia';

/**
 * CosmicScans (Indonesian) Scraper Service
 * Handles advanced extraction for WordPress MangaStream/Themesia themes.
 */
export const CosmicScansScraper = {
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
        const url = `${BASE_URL}/manga/?page=${page}&order=update`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const series = [];
        $('.listupd .bsx').each((i, el) => {
            const $el = $(el);
            const a = $el.find('a');
            const href = a.attr('href');
            if (!href) return;

            const cover = this._getCover($, $el.find('img')[0]);
            
            series.push({
                manga_id: this._extractSlug(href),
                title: a.attr('title') || $el.find('.tt').text().trim(),
                cover_url: cover,
                latest_chapter_number: $el.find('.epxs').text().replace(/Ch\./i, '').trim() || '?',
                type: $el.find('.type').text().trim() || 'Manhwa',
                source: 'cosmicscans'
            });
        });

        // Fallback to home updates layout if search grid page layout is empty
        if (series.length === 0) {
            $('.listupd .utao').each((i, el) => {
                const $el = $(el);
                const a = $el.find('a.series');
                const href = a.attr('href');
                if (!href) return;

                const cover = this._getCover($, $el.find('img')[0]);
                series.push({
                    manga_id: this._extractSlug(href),
                    title: a.attr('title') || $el.find('h3').text().trim(),
                    cover_url: cover,
                    latest_chapter_number: $el.find('.epxs').text().replace(/Ch\./i, '').trim() || '?',
                    type: 'Manhwa',
                    source: 'cosmicscans'
                });
            });
        }

        return series;
    },

    async fetchTrending() {
        const html = await this._fetch(BASE_URL);
        const $ = cheerio.load(html);
        const list = [];
        
        // Match trending carousel or popular list
        $('.listupd .bsx, .wpp-list li').each((i, el) => {
            const $el = $(el);
            const a = $el.find('a');
            const href = a.attr('href');
            if (!href) return;

            const cover = this._getCover($, $el.find('img')[0]);
            list.push({
                manga_id: this._extractSlug(href),
                title: a.attr('title') || $el.find('.tt').text().trim() || $el.find('h4').text().trim(),
                cover_url: cover,
                source: 'cosmicscans'
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
            title: $('.entry-title').text().trim() || $('.allsub').text().trim(),
            description: $('.entry-content p').text().trim() || $('.wd-showmore p').text().trim(),
            cover_url: this._getCover($, $('.thumb img')[0]) || this._getCover($, $('.poster img')[0]) || this._getCover($, $('.wp-post-image')[0]),
            status: $('.infotable').text().includes('Ongoing') ? 1 : 2,
            type: $('.infotable').text().includes('Manhwa') ? 'Manhwa' : 'Manga',
            author: 'Unknown',
            taxonomy: {
                Genre: [],
                Format: [{ name: 'Manhwa' }]
            },
            source: 'cosmicscans'
        };

        // Parse genres
        $('.genres a, .mgen a').each((i, el) => {
            detail.taxonomy.Genre.push({
                name: $(el).text().trim(),
                slug: this._extractSlug($(el).attr('href'))
            });
        });

        // Chapters parsing
        const chapters = [];
        $('.clist ul li, .eplister ul li, #chapterlist li').each((i, el) => {
            const $el = $(el);
            const a = $el.find('a');
            const href = a.attr('href');
            if (!href) return;

            const num = $el.attr('data-num') || $el.find('.chapternum').text().replace(/Chapter /i, '').trim();
            const date = $el.find('.chapterdate').text().trim();
            
            chapters.push({
                chapter_id: this._extractSlug(href),
                chapter_number: num,
                release_date: date
            });
        });

        return { detail, chapters };
    },

    async fetchPages(seriesSlug, chapterSlug) {
        const url = `${BASE_URL}/${chapterSlug}/`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const images = [];

        // Check if there is a ts_reader script block
        let readerJson = null;
        $('script').each((i, el) => {
            const text = $(el).html();
            if (text && text.includes('ts_reader.run')) {
                const match = text.match(/ts_reader\.run\((.*?)\);/);
                if (match) {
                    try {
                        readerJson = JSON.parse(match[1]);
                    } catch (e) {
                        console.error('[CosmicScans] Failed to parse ts_reader JSON:', e);
                    }
                }
            }
        });

        if (readerJson && readerJson.sources?.[0]?.images) {
            const imgs = readerJson.sources[0].images;
            imgs.forEach(img => {
                if (img && !img.includes('.gif') && !img.includes('lazy')) {
                    images.push(img.trim());
                }
            });
        }

        // Fallback: parse directly from DOM
        if (images.length === 0) {
            $('#readerarea img, .reader-area img').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
                if (src && !src.includes('lazy') && !src.includes('.gif')) {
                    images.push(src.trim());
                }
            });
        }
        
        return images;
    },

    async search(query) {
        const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        const results = [];
        $('.listupd .bsx').each((i, el) => {
            const $el = $(el);
            const a = $el.find('a');
            const href = a.attr('href');
            if (!href) return;

            const cover = this._getCover($, $el.find('img')[0]);
            results.push({
                manga_id: this._extractSlug(href),
                title: a.attr('title') || $el.find('.tt').text().trim(),
                cover_url: cover,
                source: 'cosmicscans'
            });
        });
        return results;
    },

    async _fetch(url) {
        console.log(`[CosmicScans Scraper] Fetching: ${url}`);
        const retries = 2;
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
                    signal: AbortSignal.timeout(15000) // 15s timeout
                });
                
                if (res.status === 403 || res.status === 503) {
                    if (i === retries - 1) throw new Error(`CosmicScans Scraper Blocked [${res.status}]: Max retries reached`);
                    console.warn(`[CosmicScans Scraper] Blocked (${res.status}). Retrying...`);
                    await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
                    continue;
                }

                if (!res.ok) throw new Error(`CosmicScans Scraper Failed [${res.status}]: ${url}`);
                const text = await res.text();
                return text;
            } catch (err) {
                if (i === retries - 1) {
                    console.error(`[CosmicScans Scraper] Final Fetch Error: ${err.message}`);
                    throw err;
                }
                console.warn(`[CosmicScans Scraper] Attempt ${i + 1} failed: ${err.message}. Retrying...`);
                await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
            }
        }
        throw new Error('CosmicScans Scraper: Unexpected end of fetch loop');
    },

    _extractSlug(url) {
        if (!url) return '';
        const parts = url.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    }
};
