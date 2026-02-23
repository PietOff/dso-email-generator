const puppeteer = require('puppeteer');
const fs = require('fs');

const POWER_BI_URL = "https://app.powerbi.com/view?r=eyJrIjoiMDFlMWQwMDQtNmMzYS00NjljLThhOTktYTdlYWRmZGM5NjhhIiwidCI6IjRiMWY5OTY4LWJmOGEtNDhiZi05ZjIyLWYxODY1OWVmOGRkMyIsImMiOjh9";

(async () => {
    console.log('Starting puppeteer...');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();

    let queryNum = 1;
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/public/roaming/concepts/queryData') || url.includes('/explore/concepts/queryData')) {
            try {
                const text = await response.text();
                fs.writeFileSync(`powerbi_dump_${queryNum}.json`, text);
                console.log(`Saved payload ${queryNum}`);
                queryNum++;
            } catch (e) {
                console.log('Failed to read response', e.message);
            }
        }
    });

    console.log('Navigating...');
    await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 90000 });

    // Also try navigating to KPI tab
    console.log('Navigating to KPIs tab...');
    await page.goto(`${POWER_BI_URL}&pageName=ReportSection91ee2cf05d3b1ddcd9aa`, { waitUntil: 'networkidle2' });

    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    console.log('Done.');
})();
