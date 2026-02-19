import puppeteer from 'puppeteer';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSBxwydzP5DZbpd4mI-LK3GPlMwVsTXpMOSnUWqtTXJdbFAMhnwOHubehOF_X67XE3/exec'; // Value from src/utils/contentService.js
const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

(async () => {
    console.log('🚀 Starting Power BI Sync...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log('📄 Navigating to Power BI Report...');
        await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2' });

        // Wait for the report to render (mid-viewport is the container for visuals)
        try {
            await page.waitForSelector('.mid-viewport', { timeout: 60000 });
            console.log('✅ Dashboard loaded.');
        } catch (e) {
            console.error('❌ Dashboard did not load in time.');
            await browser.close();
            return;
        }

        // --- SCRAPE PAGE R1 (Overview / Regelingen) ---
        // We assume R1 is the default or first page. If not, we'd need navigation logic here.
        // Assuming R1 is active or we are on Startpagina.
        // Based on previous analysis, we need to navigate to R1.

        // Navigation logic (simplified finding of page buttons if needed, but for now we try to scrape what is visible)
        // Note: Power BI navigation is complex to script blindly. 
        // For V1, we will scrape the currently active page or try to hit R1 if possible.
        // Let's assume the report opens on Startpagina and we need to click "R1. Regelingen".

        // Try to click "R1. Regelingen" button if it exists
        // (This is brittle, but necessary if it's not the landing page)
        // For robustness in this MVP script, we will focus on what data is available.
        // If the user runs this, they might need to ensure the report is in a state or we add explicit clicks.

        console.log('🕵️ Scraping data...');
        // Wait a bit for visuals to settle
        await new Promise(r => setTimeout(r, 10000));

        const extractedData = await page.evaluate(() => {
            const rows = document.querySelectorAll('div.row');
            if (rows.length === 0) return [];

            const results = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('.pivotTableCellWrap, .uppercell');
                if (cells.length === 0) return;

                const texts = Array.from(cells).map(c => c.innerText || c.title || c.getAttribute('aria-label') || '');

                // Heuristic mapping based on "R1" structure seen in analysis
                // [Gemeente, ..., Soort, ..., ..., ...]
                // We look for the cell that starts with "gemeente " (case insensitive)
                const gemeentIndex = texts.findIndex(t => t.toLowerCase().startsWith('gemeente '));

                if (gemeentIndex !== -1) {
                    const gemeente = texts[gemeentIndex];

                    // Try to find "Omgevingsplan" status in the same row
                    const validStatuses = ['Omgevingsplan', 'Omgevingsvisie', 'Voorbeschermingsregels', 'Voorbereidingsbesluit'];
                    const status = texts.find(t => validStatuses.some(vs => t.includes(vs))) || '';

                    if (status) {
                        results.push({
                            gemeente: gemeente.replace('gemeente ', '').trim(), // Cleanup "gemeente " prefix case-insensitive
                            kpi4: status.includes('Omgevingsplan') ? '1' : '5' // Simple logic: Plan = good (1), else 5
                        });
                    }
                }
            });
            return results;
        });

        console.log(`📊 Found ${extractedData.length} records.`);

        // --- PUSH TO GOOGLE SHEET ---
        console.log('☁️ Syncing to Google Sheet...');

        for (const record of extractedData) {
            // We map the scraped status to our KPI structure
            // KPI4: Omgevingsplan (1=Good, 4/5=Bad)

            const payload = {
                type: 'Monitor Sync',
                gemeente: record.gemeente,
                kpi4: record.kpi4,
                // Placeholders for other KPIs until we scrape T1/S1
                kpi1: '',
                kpi2: '',
                kpi3: ''
            };

            await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            process.stdout.write('.'); // Progress indicator
        }
        console.log('\n✅ Sync complete!');

    } catch (err) {
        console.error('❌ Error during sync:', err);
    } finally {
        await browser.close();
    }
})();
