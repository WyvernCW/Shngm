export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    const allowedDomains = [
        'manhwadesu.tech', 'cdn.manhwadesu.tech', 'img.manhwadesu.tech', 
        'manhwaland.land', 'cdn.manhwaland.land', 'img.manhwaland.land',
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

    const referers = [
        'https://shinigami.id/',
        'https://manhwaland.land/',
        'https://manhwadesu.tech/',
        'https://shngm.id/'
    ];

    for (let i = 0; i < 2; i++) {
        try {
            const currentReferer = referers[i % referers.length];
            const response = await fetch(url, {
                headers: {
                    'Referer': currentReferer,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                },
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) {
                if (response.status === 403 || response.status === 404) {
                    if (i === 0) continue; // Try next referer
                }
                throw new Error(`Upstream returned ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            res.setHeader('Content-Type', contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
            
            const buffer = await response.arrayBuffer();
            return res.send(Buffer.from(buffer));
        } catch (error) {
            if (i === 1) {
                console.error('[Image Proxy Final Error]:', error.message, url);
                return res.status(500).send('Error proxying image: ' + error.message);
            }
        }
    }
}
