export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    // Security check: only allow manhwadesu.tech and known CDNs
    const allowedDomains = ['manhwadesu.tech', 'cdn.manhwadesu.tech', 'img.manhwadesu.tech', 'images.shngm.id'];
    const urlObj = new URL(url);
    if (!allowedDomains.includes(urlObj.hostname)) {
        return res.status(403).send('Domain not allowed');
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Referer': 'https://manhwadesu.tech/',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch image');

        const contentType = response.headers.get('content-type');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Image Proxy Error:', error);
        res.status(500).send('Error proxying image');
    }
}
