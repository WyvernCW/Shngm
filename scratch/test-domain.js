const allowedDomains = [
    'manhwadesu.tech', 'cdn.manhwadesu.tech', 'img.manhwadesu.tech', 
    'manhwaland.land', 'cdn.manhwaland.land', 'img.manhwaland.land',
    'images.shngm.id', 'assets.shngm.id', 'shinigami.id', 'cdn.shinigami.id',
    'shngm.id', 'cosmicscans.asia', 'lc8.cosmicscans.asia', 'cosmicscans.com',
    'wp.com', 'secureservercdn.net', 'googleusercontent.com', 'blogspot.com',
    'gmbr.pro', 'skyfile.me', 'skyfile.cc', 'skyfiles.ms', 'mangas.sky',
    'imagecdn.me', 'cosmictoon.lol', 'dbm.my.id'
];

const url = 'https://csid.skyfile.me/wp-content/uploads/images/m/my-bias-gets-on-the-last-train/chapter-1/1.png';
const urlObj = new URL(url);

const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain));
console.log('isAllowed for', urlObj.hostname, ':', isAllowed);
