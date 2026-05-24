// Global fetch is used directly

const url = 'https://api.shngm.io/v1/chapter/detail/844ed4b4-bb49-4411-a331-3349492ec231';
console.log('Fetching chapter detail from:', url);

fetch(url)
    .then(res => res.json())
    .then(data => {
        console.log('--- KEYS ---');
        console.log(Object.keys(data));
        
        console.log('--- META ---');
        console.log('status:', data.status);
        console.log('message:', data.message);
        
        if (data.data) {
            console.log('--- DATA KEYS ---');
            console.log(Object.keys(data.data));
            
            const ch = data.data.chapter;
            if (ch) {
                console.log('--- CHAPTER KEYS ---');
                console.log(Object.keys(ch));
                console.log('chapter.data type:', typeof ch.data);
                if (Array.isArray(ch.data)) {
                    console.log('chapter.data length:', ch.data.length);
                    console.log('chapter.data sample:', ch.data.slice(0, 3));
                } else {
                    console.log('chapter.data:', ch.data);
                }
            } else {
                console.log('No data.chapter found');
            }
            
            console.log('base_url:', data.data.base_url);
            console.log('base_image_url:', data.data.base_image_url);
        } else {
            console.log('No data found');
        }
    })
    .catch(err => {
        console.error('Fetch failed:', err);
    });
