export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    const allowedDomains = [
        'manhwadesu.tech', 'cdn.manhwadesu.tech', 'img.manhwadesu.tech', 
        'images.shngm.id', 'assets.shngm.id', 'shinigami.id', 'cdn.shinigami.id',
        'shngm.id'
    ];
    
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        return res.status(400).send('Invalid URL');
    }

    const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain));
    if (!isAllowed) {
        return res.status(403).send('Domain not allowed: ' + urlObj.hostname);
    }

    try {
        const isShinigami = urlObj.hostname.includes('shngm.id') || urlObj.hostname.includes('shinigami.id');
        const referer = isShinigami ? 'https://shinigami.id/' : 'https://manhwadesu.tech/';

        const response = await fetch(url, {
            headers: {
                'Referer': referer,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`[Image Proxy] Upstream Error: ${response.status} for ${url}`);
            return res.status(response.status).send(`Upstream returned ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        res.setHeader('Content-Type', contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('[Image Proxy] Execution Error:', error.message);
        res.status(500).send('Error proxying image: ' + error.message);
    }
}
