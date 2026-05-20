import { CosmicScansScraper } from '../../lib/scrapers/cosmicscans.js';

export default async function handler(req, res) {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug is required' });
    
    try {
        const data = await CosmicScansScraper.fetchDetail(slug);
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate'); // 10min cache
        res.status(200).json({ ...data, source: 'cosmicscans' });
    } catch (error) {
        console.error('[CosmicScans Detail API Error]:', error.message);
        res.status(200).json({ data: null, error: error.message, source: 'cosmicscans', status: 'error' });
    }
}
