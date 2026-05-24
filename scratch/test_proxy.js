import handler from '../api/image-proxy.js';

// Mock request and response objects
const req = {
    query: {
        url: 'https://assets.shngm.id/chapter/manga_66c09939-2ad6-4d9f-860e-5917af28ed8a/chapter_844ed4b4-bb49-4411-a331-3349492ec231/1-c2b86bb6c21e.jpg'
    }
};

const res = {
    statusCode: 200,
    headers: {},
    status(code) {
        this.statusCode = code;
        return this;
    },
    setHeader(name, value) {
        this.headers[name] = value;
    },
    send(data) {
        console.log('--- RESPONSE RECEIVED ---');
        console.log('Status Code:', this.statusCode);
        console.log('Headers:', this.headers);
        console.log('Data Length (bytes):', data.length);
        if (data.length < 500) {
            console.log('Data (text):', data.toString());
        }
    }
};

console.log('Simulating image-proxy request for:', req.query.url);
handler(req, res).catch(err => {
    console.error('Error in handler:', err);
});
