import puppeteer from 'puppeteer';
import fs from 'fs';

const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

(async () => {
    console.log('🚀 Starting Test...');
    try {
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        console.log('Browser launched.');
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });

        let count = 0;
        page.on('response', async (res) => {
            const url = res.url();
            if (url.includes('/public/reports/querydata')) {
                try {
                    const json = await res.json();
                    fs.writeFileSync(`/tmp/test_query_${count++}.json`, JSON.stringify(json, null, 2));
                    console.log(`Saved /tmp/test_query_${count}.json`);
                } catch (e) { }
            }
        });

        console.log('Navigating...');
        await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log('Waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));
        await browser.close();
        console.log('Done.');
    } catch (e) {
        console.error('FAILED:', e);
    }
})();
