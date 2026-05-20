import { CosmicScansScraper } from '../../lib/scrapers/cosmicscans.js';

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });
    
    try {
        const data = await CosmicScansScraper.search(q);
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
        res.status(200).json({ data, source: 'cosmicscans' });
    } catch (error) {
        console.error('[CosmicScans Search API Error]:', error.message);
        res.status(500).json({ error: error.message, source: 'cosmicscans', status: 'error' });
    }
}
