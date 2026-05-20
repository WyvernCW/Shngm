async function test() {
    const url = 'https://assets.shngm.id/thumbnail/image/bd13e0c5-64e4-4daa-8a89-226ddbc6b1c9.jpg';
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://shngm.id/'
            }
        });
        console.log('Status:', res.status);
        console.log('Headers:', Object.fromEntries(res.headers.entries()));
    } catch (e) {
        console.error('Error fetching:', e);
    }
}

test();
