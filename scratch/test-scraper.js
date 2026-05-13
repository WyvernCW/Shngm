import { MWDScraper } from '../lib/scrapers/manhwadesu.js';

async function test() {
    try {
        console.log('Testing fetchLatest...');
        const latest = await MWDScraper.fetchLatest(1);
        console.log('Latest:', latest.length, 'items');
        
        console.log('Testing search...');
        const search = await MWDScraper.search('Bully');
        console.log('Search:', search.length, 'results');
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
