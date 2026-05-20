import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const API_CACHE_DIR = path.join(process.cwd(), 'scratch', 'api_cache');

// Ensure cache directory exists
try {
    if (!fs.existsSync(API_CACHE_DIR)) {
        fs.mkdirSync(API_CACHE_DIR, { recursive: true });
    }
} catch (e) {
    console.error('[Shinigami Proxy] Failed to create cache directory:', e);
}

const getCachePath = (url) => {
    const hash = crypto.createHash('sha256').update(url).digest('hex');
    return path.join(API_CACHE_DIR, hash);
};

export default async function handler(req, res) {
    const { path: apiPath, ...query } = req.query;
    if (!apiPath) return res.status(400).send('No path provided');

    const API_BASE = 'https://api.shngm.io/v1';
    
    // Construct full URL with remaining query params
    const urlObj = new URL(`${API_BASE}/${apiPath}`);
    Object.entries(query).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
    });

    const url = urlObj.toString();
    const cachePath = getCachePath(url);

    // Smart TTL definition
    const isList = url.includes('/list') || url.includes('page=') || url.includes('q=');
    const TTL = isList ? 5 * 60 * 1000 : 30 * 60 * 1000; // 5 min for lists, 30 min for details

    // 1. Try reading valid cache
    if (fs.existsSync(cachePath)) {
        try {
            const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            if (Date.now() - cached.timestamp < TTL) {
                console.log(`[Shinigami Proxy] Cache HIT (fresh): ${url}`);
                return res.status(200).json(cached.data);
            }
        } catch (e) {
            console.error('[Shinigami Proxy] Error reading cache:', e);
        }
    }

    const retries = 3;
    const backoff = 1000;

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Shinigami Proxy] Fetching (${i + 1}/${retries}): ${url}`);
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Referer': 'https://shinigami.id/'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (response.status === 429) {
                // If we get 429 but have an expired cache entry, serve it immediately!
                if (fs.existsSync(cachePath)) {
                    try {
                        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                        console.warn(`[Shinigami Proxy] 429 Rate Limit. Serving expired cache fallback: ${url}`);
                        return res.status(200).json(cached.data);
                    } catch (e) {}
                }
                const wait = backoff * Math.pow(2, i);
                console.warn(`[Shinigami Proxy] 429 Rate Limit. Waiting ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }

            if (!response.ok) {
                throw new Error(`Upstream returned status ${response.status}`);
            }

            const data = await response.json();

            // Save to local cache
            try {
                fs.writeFileSync(cachePath, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }), 'utf8');
            } catch (err) {
                console.error('[Shinigami Proxy] Error saving cache:', err);
            }

            return res.status(response.status).json(data);
        } catch (error) {
            console.warn(`[Shinigami Proxy] Attempt ${i + 1} failed:`, error.message);
            
            // On final failure, check if we have any cached data (even expired) to serve
            if (i === retries - 1) {
                if (fs.existsSync(cachePath)) {
                    try {
                        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                        console.warn(`[Shinigami Proxy] Final failure. Serving expired cache fallback: ${url}`);
                        return res.status(200).json(cached.data);
                    } catch (e) {}
                }
                console.error('[Shinigami Proxy] Final Error:', error.message);
                return res.status(500).json({ error: error.message });
            }
            await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        }
    }
}
