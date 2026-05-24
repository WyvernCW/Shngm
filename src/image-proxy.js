import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CACHE_DIR = path.join(process.cwd(), 'scratch', 'img_cache');

// Ensure cache directory exists
try {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
} catch (e) {
    console.error('[Image Proxy] Failed to create cache directory:', e);
}

const getCachePaths = (url) => {
    const hash = crypto.createHash('sha256').update(url).digest('hex');
    return {
        data: path.join(CACHE_DIR, hash),
        meta: path.join(CACHE_DIR, hash + '.meta')
    };
};

const FALLBACK_SVG = `<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <rect x="2" y="2" width="396" height="596" fill="none" stroke="#21262d" stroke-width="2"/>
  <path d="M150 250 L250 250 L200 180 Z" fill="#8b5cf6" opacity="0.3"/>
  <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#30363d">SHINIGAMI</text>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#30363d">NO COVER AVAILABLE</text>
  <rect x="160" y="560" width="80" height="4" rx="2" fill="#8b5cf6" opacity="0.2"/>
</svg>`;

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    const allowedDomains = [
        'manhwadesu.tech', 'cdn.manhwadesu.tech', 'img.manhwadesu.tech', 
        'manhwaland.land', 'cdn.manhwaland.land', 'img.manhwaland.land',
        'images.shngm.id', 'assets.shngm.id', 'shinigami.id', 'cdn.shinigami.id',
        'shngm.id', 'cosmicscans.asia', 'lc8.cosmicscans.asia', 'cosmicscans.com',
        'wp.com', 'secureservercdn.net', 'googleusercontent.com', 'blogspot.com',
        'gmbr.pro', 'skyfile.me', 'skyfile.cc', 'skyfiles.ms', 'mangas.sky',
        'imagecdn.me', 'cosmictoon.lol', 'dbm.my.id'
    ];
    
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(200).send(FALLBACK_SVG);
    }

    const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain));
    if (!isAllowed) {
        console.warn('[Image Proxy] Blocked domain:', urlObj.hostname);
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(200).send(FALLBACK_SVG);
    }

    // --- High-Performance Local Cache Check ---
    const cachePaths = getCachePaths(url);
    if (fs.existsSync(cachePaths.data) && fs.existsSync(cachePaths.meta)) {
        try {
            const meta = JSON.parse(fs.readFileSync(cachePaths.meta, 'utf8'));
            const data = fs.readFileSync(cachePaths.data);
            res.setHeader('Content-Type', meta.contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
            return res.send(data);
        } catch (e) {
            console.error('[Image Proxy] Error reading cache:', e);
        }
    }

    // Determine smart referrers based on hostname to avoid cascading timeouts
    const referers = [];
    const urlString = String(url);
    if (urlString.includes('shngm.id') || urlString.includes('shinigami.id')) {
        referers.push('https://shngm.id/', 'https://shinigami.id/', '');
    } else if (urlString.includes('manhwadesu') || urlString.includes('manhwaland') || urlString.includes('dbm.my.id') || urlString.includes('gmbr.pro')) {
        referers.push('https://manhwadesu.tech/', 'https://manhwaland.land/', '');
    } else if (urlString.includes('cosmicscans') || urlString.includes('skyfile.me') || urlString.includes('cosmictoon')) {
        referers.push('https://lc8.cosmicscans.asia/', 'https://cosmicscans.asia/', '');
    } else {
        referers.push('');
    }

    for (let i = 0; i < referers.length; i++) {
        const currentReferer = referers[i];
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            };
            if (currentReferer) {
                headers['Referer'] = currentReferer;
            }

            const response = await fetch(url, {
                headers,
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) {
                if (response.status === 403 || response.status === 404) {
                    console.warn(`[Image Proxy] Upstream status ${response.status} with referer "${currentReferer}" for ${url}`);
                    continue; // Try next referer
                }
                throw new Error(`Upstream returned ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            const buffer = await response.arrayBuffer();
            const dataBuffer = Buffer.from(buffer);

            // Save to Cache Asynchronously
            try {
                fs.writeFileSync(cachePaths.data, dataBuffer);
                fs.writeFileSync(cachePaths.meta, JSON.stringify({
                    contentType: contentType || 'image/jpeg',
                    timestamp: Date.now()
                }), 'utf8');
            } catch (err) {
                console.error('[Image Proxy] Error saving cache:', err);
            }

            res.setHeader('Content-Type', contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(dataBuffer);
        } catch (error) {
            console.error(`[Image Proxy] Fetch attempt failed (referer: "${currentReferer}", url: ${url}):`, error.message);
        }
    }

    // If all attempts fail, serve the standard fallback SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(FALLBACK_SVG);
}
