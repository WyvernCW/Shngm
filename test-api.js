import { MWDScraper } from './lib/scrapers/manhwadesu.js';
import { CosmicScansScraper } from './lib/scrapers/cosmicscans.js';

async function test() {
    try {
        console.log('--- TESTING MANHWADESU ---');
        const latestMWD = await MWDScraper.fetchLatest(1);
        console.log('Manhwadesu latest count:', latestMWD.length);
        if (latestMWD.length > 0) {
            console.log('Sample covers from Manhwadesu:');
            latestMWD.slice(0, 5).forEach((item, idx) => {
                console.log(`  ${idx+1}. ${item.title}: ${item.cover_url}`);
            });
        }

        console.log('\n--- TESTING COSMICSCANS ---');
        const latestCosmic = await CosmicScansScraper.fetchLatest(1);
        console.log('CosmicScans latest count:', latestCosmic.length);
        if (latestCosmic.length > 0) {
            console.log('Sample covers from CosmicScans:');
            latestCosmic.slice(0, 5).forEach((item, idx) => {
                console.log(`  ${idx+1}. ${item.title}: ${item.cover_url}`);
            });
        }
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
