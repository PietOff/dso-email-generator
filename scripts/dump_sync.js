import puppeteer from 'puppeteer';
import fs from 'fs';

const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

let dumpCount = 0;
function setupNetworkCapture(page) {
    page.on('response', async (response) => {
        const url = response.url();
        try {
            if (url.includes('/public/reports/querydata')) {
                const body = await response.json().catch(() => null);
                if (body) {
                    fs.writeFileSync(`/tmp/pbidump_${dumpCount++}.json`, JSON.stringify(body, null, 2));
                }
            }
        } catch {}
    });
}

(async () => {
    console.log('🚀 Starting PBI Dumper...');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    setupNetworkCapture(page);

    console.log('📄 Loading Initial Page...');
    await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 90000 });
    await new Promise(r => setTimeout(r, 12000));
    
    console.log('📄 Loading Regelingen...');
    await page.goto(`${POWER_BI_URL}&pageName=ReportSection4efefd67f4def87680bb`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 8000));
    
    console.log('✅ Done! Dumping finished.');
    await browser.close();
})();
