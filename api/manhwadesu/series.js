import { MWDScraper } from '../../lib/scrapers/manhwadesu.js';

export default async function handler(req, res) {
    const { page } = req.query;
    try {
        const data = await MWDScraper.fetchLatest(page || 1);
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // 5min cache
        res.status(200).json({ data, source: 'manhwadesu', timestamp: Date.now() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
