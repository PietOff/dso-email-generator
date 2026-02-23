import puppeteer from 'puppeteer';
import fs from 'fs';

const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

(async () => {
    console.log('🚀 Starting Historic Dump...');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    let queryIdx = 0;
    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('/public/reports/querydata')) {
            try {
                const json = await res.json();
                fs.writeFileSync(`/tmp/pbi_query_${queryIdx++}.json`, JSON.stringify(json, null, 2));
            } catch(e) {}
        }
    });

    console.log('🔗 Navigating...');
    await page.goto(POWER_BI_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('⏳ Waiting 15s for data to flow in...');
    await new Promise(r => setTimeout(r, 15000));
    
    console.log(`✅ Saved ${queryIdx} queries to /tmp/pbi_query_*.json`);
    await browser.close();
})();
