import { MWDScraper } from '../../lib/scrapers/manhwadesu.js';

export default async function handler(req, res) {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug is required' });
    
    try {
        const data = await MWDScraper.fetchDetail(slug);
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate'); // 10min cache
        res.status(200).json({ ...data, source: 'manhwadesu' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
