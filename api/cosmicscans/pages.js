import { CosmicScansScraper } from '../../lib/scrapers/cosmicscans.js';

export default async function handler(req, res) {
    const { slug, chapter } = req.query;
    if (!slug || !chapter) return res.status(400).json({ error: 'Slug and chapter are required' });
    
    try {
        const data = await CosmicScansScraper.fetchPages(slug, chapter);
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour cache
        res.status(200).json({ data, source: 'cosmicscans' });
    } catch (error) {
        console.error('[CosmicScans Pages API Error]:', error.message);
        res.status(500).json({ error: error.message, source: 'cosmicscans', status: 'error' });
    }
}
