export default async function handler(req, res) {
    const { path, ...query } = req.query;
    if (!path) return res.status(400).send('No path provided');

    const API_BASE = 'https://api.shngm.io/v1';
    
    // Construct full URL with remaining query params
    const urlObj = new URL(`${API_BASE}/${path}`);
    Object.entries(query).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
    });

    const url = urlObj.toString();
    const retries = 3;
    const backoff = 1000;

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Shinigami Proxy] Attempt ${i + 1}/${retries}: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Referer': 'https://shinigami.id/'
                }
            });

            if (response.status === 429) {
                const wait = backoff * Math.pow(2, i);
                console.warn(`[Shinigami Proxy] 429 Rate Limit. Waiting ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }

            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            if (i === retries - 1) {
                console.error('[Shinigami Proxy] Final Error:', error.message);
                return res.status(500).json({ error: error.message });
            }
            await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        }
    }
}
