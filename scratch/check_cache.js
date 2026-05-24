import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CACHE_DIR = path.join(process.cwd(), 'scratch', 'img_cache');

const testUrls = [
    'https://assets.shngm.id/chapter/manga_66c09939-2ad6-4d9f-860e-5917af28ed8a/chapter_844ed4b4-bb49-4411-a331-3349492ec231/1-c2b86bb6c21e.jpg',
    'https://assets.shngm.id/chapter/manga_66c09939-2ad6-4d9f-860e-5917af28ed8a/chapter_844ed4b4-bb49-4411-a331-3349492ec231/2-cf88722f9c3d.jpg'
];

testUrls.forEach(url => {
    const hash = crypto.createHash('sha256').update(url).digest('hex');
    const dataPath = path.join(CACHE_DIR, hash);
    const metaPath = path.join(CACHE_DIR, hash + '.meta');
    
    console.log(`Checking cache for: ${url}`);
    console.log(`Hash: ${hash}`);
    if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath);
        const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
        console.log(`- File size: ${data.length} bytes`);
        console.log(`- Meta Content-Type:`, meta ? meta.contentType : 'None');
        
        // Print first 20 bytes in hex
        const hex = data.slice(0, 20).toString('hex');
        console.log(`- First 20 bytes (hex): ${hex}`);
        
        // Check if it's JPEG (starts with ffd8)
        if (data[0] === 0xff && data[1] === 0xd8) {
            console.log(`- [OK] Valid JPEG header (ffd8)`);
        } else if (data.slice(0, 5).toString() === '<html' || data.slice(0, 15).toString().includes('<!DOCTYPE')) {
            console.log(`- [ERROR] Cached file contains HTML instead of JPEG!`);
        } else {
            console.log(`- [UNKNOWN] Non-JPEG file signature.`);
        }
    } else {
        console.log(`- Cache file does not exist.`);
    }
});
