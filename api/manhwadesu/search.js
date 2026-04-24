import { MWDScraper } from '../../lib/scrapers/manhwadesu.js';

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });
    
    try {
        const data = await MWDScraper.search(q);
        res.status(200).json({ data, source: 'manhwadesu' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
