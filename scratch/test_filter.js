
async function testGenreFilter() {
    const API_BASE = 'https://api.shngm.io/v1';
    console.log("--- TESTING GENRE FILTER (Action) ---");
    // Try passing genre slug in various ways
    const urls = [
        `${API_BASE}/manga/list?type=project&genre=action&page_size=5`,
        `${API_BASE}/manga/list?type=project&genres=action&page_size=5`,
        `${API_BASE}/manga/list?type=project&category=action&page_size=5`
    ];
    
    for (const url of urls) {
        const res = await fetch(url);
        const data = await res.json();
        console.log(`URL: ${url} -> Count: ${data.data ? data.data.length : 0}`);
        if (data.data && data.data.length > 0) {
            console.log("First item genres:", data.data[0].taxonomy.Genre.map(g => g.slug));
        }
    }
}

testGenreFilter();
