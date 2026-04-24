import { MWDScraper } from './lib/scrapers/manhwadesu.js';

async function test() {
    try {
        console.log('Fetching Latest...');
        const latest = await MWDScraper.fetchLatest(1);
        console.log('Latest count:', latest.length);
        if (latest.length > 0) {
            console.log('First Item:', JSON.stringify(latest[0], null, 2));
        } else {
            console.warn('Scraper returned 0 results!');
        }
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
