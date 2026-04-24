import { MWDScraper } from '../../lib/scrapers/manhwadesu.js';

export default async function handler(req, res) {
    const { slug, chapter } = req.query;
    if (!slug || !chapter) return res.status(400).json({ error: 'Slug and chapter are required' });
    
    try {
        const data = await MWDScraper.fetchPages(slug, chapter);
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour cache
        res.status(200).json({ data, source: 'manhwadesu' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
