async function run() {
    const url = 'https://csid.skyfile.me/wp-content/uploads/images/m/my-bias-gets-on-the-last-train/chapter-1/1.png';
    const referers = [
        'https://lc8.cosmicscans.asia/',
        'https://cosmicscans.asia/',
        'https://cosmicscans.com/',
        'https://shngm.id/',
        ''
    ];

    for (const ref of referers) {
        try {
            console.log(`Testing referer: "${ref}"`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    ...(ref ? { 'Referer': ref } : {})
                }
            });
            console.log(`  Status: ${res.status}`);
            console.log(`  Headers:`, Object.fromEntries(res.headers.entries()));
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }
}

run();
