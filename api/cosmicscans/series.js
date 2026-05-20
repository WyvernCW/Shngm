import { CosmicScansScraper } from '../../lib/scrapers/cosmicscans.js';

export default async function handler(req, res) {
    const { page } = req.query;
    try {
        const data = await CosmicScansScraper.fetchLatest(page || 1);
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600'); // 24h Edge Cache
        res.status(200).json({ data, source: 'cosmicscans', timestamp: Date.now() });
    } catch (error) {
        console.error('[CosmicScans API Error]:', error.message);
        res.status(500).json({ error: error.message, source: 'cosmicscans', status: 'error' });
    }
}
