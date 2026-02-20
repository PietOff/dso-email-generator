import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5176;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
    // 1. Handle Power BI Proxy
    if (req.url === '/api/powerbi-proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const pbiRes = await fetch('https://wabi-west-europe-f-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true', {
                    method: 'POST',
                    headers: {
                        'X-PowerBI-ResourceKey': '385e6016-908c-4d32-aec3-82bf62e9726c',
                        'Content-Type': 'application/json'
                    },
                    body: body
                });

                res.writeHead(pbiRes.status, { 'Content-Type': 'application/json' });
                const data = await pbiRes.text();
                res.end(data);
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 2. Serve static files from dist/
    // Default to index.html for SPA routing
    let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);

    // If file doesn't exist, fallback to index.html (SPA)
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'dist', 'index.html');
    }

    const ext = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Vanilla Node server running at http://localhost:${PORT}`);
});
