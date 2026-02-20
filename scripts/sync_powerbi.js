import puppeteer from 'puppeteer';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSBxwydzP5DZbpd4mI-LK3GPlMwVsTXpMOSnUWqtTXJdbFAMhnwOHubehOF_X67XE3/exec';
const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

// --- HELPERS ---

async function waitForPBI(page) {
    // Wait for either the old or new Power BI containers, or just let it timeout and rely on the 8s sleep
    await page.waitForSelector('.visualContainer, .explorationContainer, .mid-viewport, [aria-label="Startpagina"]', { timeout: 30000 }).catch(() => { });
    await new Promise(r => setTimeout(r, 10000)); // Let visuals render fully
}

async function navigateToPage(page, pageName) {
    console.log(`  📄 Navigating to "${pageName}"...`);

    const clicked = await page.evaluate((target) => {
        // Find text node matching target
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue.trim() === target || node.nodeValue.trim().startsWith(target)) {
                // Find clickable parent
                let el = node.parentElement;
                while (el && el !== document.body) {
                    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'A') {
                        el.click();
                        return true;
                    }
                    el = el.parentElement;
                }
                // Fallback: click the direct parent element
                node.parentElement.click();
                return true;
            }
        }
        return false;
    }, pageName);

    if (clicked) {
        console.log(`  ✅ Clicked: "${pageName}"`);
        await new Promise(r => setTimeout(r, 8000)); // wait for page to load
    } else {
        console.log(`  ⚠️ Could not find page "${pageName}"`);
    }
}


async function scrapeVisibleRows(page) {
    return page.evaluate(() => {
        const rows = document.querySelectorAll('[role="row"]');
        const data = [];
        rows.forEach(row => {
            const cells = row.querySelectorAll('[role="gridcell"], [role="columnheader"], [role="rowheader"]');
            if (cells.length === 0) return;
            const rowData = Array.from(cells).map(c => (c.textContent || '').trim());
            if (rowData.some(t => t.length > 0)) {
                data.push(rowData);
            }
        });
        return data;
    });
}

async function scrapeAllRows(page) {
    // Power BI virtualizes tables — only ~25 rows visible at a time.
    // We scroll the table container to load all rows.
    const allRows = new Map(); // key = first cell text to dedupe

    // Get the grid container
    const hasGrid = await page.evaluate(() => !!document.querySelector('[role="grid"]'));
    if (!hasGrid) {
        console.log('    ⚠️ No grid found on this page');
        return [];
    }

    let previousSize = 0;
    let scrollAttempts = 0;
    const MAX_SCROLLS = 50; // safety limit

    while (scrollAttempts < MAX_SCROLLS) {
        const visible = await scrapeVisibleRows(page);

        for (const row of visible) {
            const key = row.join('|');
            if (!allRows.has(key)) {
                allRows.set(key, row);
            }
        }

        if (allRows.size === previousSize) {
            scrollAttempts++;
            if (scrollAttempts > 3) break; // no new data after 3 scrolls
        } else {
            scrollAttempts = 0;
            previousSize = allRows.size;
        }

        // Scroll the grid container down
        await page.evaluate(() => {
            const grid = document.querySelector('[role="grid"]');
            if (grid) {
                grid.scrollTop += 500;
            }
            // Also try scrolling the scrollbar region
            const scrollRegion = document.querySelector('.bodyCells, .scroll-region, .innerContainer');
            if (scrollRegion) {
                scrollRegion.scrollTop += 500;
            }
        });
        await new Promise(r => setTimeout(r, 1500));
    }

    return Array.from(allRows.values());
}

// --- SCRAPERS PER PAGE ---

function parseR1(rows) {
    // R1 columns: Bevoegd gezag, Bestuurslaag, Citeertitel, Versie, Soort, Registratietijdstip, Geldig op, Inwerking op, AKN
    // We want: { gemeente, soort (Omgevingsplan/Omgevingsvisie/etc) }
    const results = {};

    for (const row of rows) {
        const bevoegdGezag = row[0] || '';
        const soort = row[4] || ''; // Column index 4 = "Soort"

        if (!bevoegdGezag.toLowerCase().startsWith('gemeente')) continue;

        const naam = bevoegdGezag.replace(/^gemeente\s+/i, '').trim();
        if (!naam) continue;

        // Determine regulation type priority: Omgevingsplan > Omgevingsvisie > Voorbeschermingsregels
        const priority = { 'Omgevingsplan': 1, 'Omgevingsvisie': 2, 'Voorbeschermingsregels': 3, 'Voorbereidingsbesluit': 4 };
        const currentPriority = priority[soort] || 5;
        const existingPriority = results[naam]?.priority || 99;

        if (currentPriority < existingPriority) {
            results[naam] = {
                gemeente: naam,
                regelingType: soort,
                priority: currentPriority,
                kpi4: String(currentPriority) // 1=best, 5=worst
            };
        }
    }
    return Object.values(results);
}

function parseI3(rows) {
    // I3 columns: id, Begindatum, Bevoegd gezag, Activiteit, Behandeldienst, Toestemming, Bevoegd gezag (locatie)
    // We want: { gemeente, behandeldienst }
    const results = {};

    for (const row of rows) {
        const bevoegdGezag = row[2] || ''; // Column 2 = "Bevoegd gezag"
        const behandeldienst = row[4] || ''; // Column 4 = "Behandeldienst"

        if (!bevoegdGezag.toLowerCase().startsWith('gemeente')) continue;

        const naam = bevoegdGezag.replace(/^gemeente\s+/i, '').trim();
        if (!naam || !behandeldienst) continue;

        // Store most common behandeldienst per gemeente
        if (!results[naam]) {
            results[naam] = { gemeente: naam, behandeldiensten: {} };
        }
        results[naam].behandeldiensten[behandeldienst] = (results[naam].behandeldiensten[behandeldienst] || 0) + 1;
    }

    return Object.entries(results).map(([naam, data]) => {
        // Pick most common behandeldienst
        const sorted = Object.entries(data.behandeldiensten).sort((a, b) => b[1] - a[1]);
        return {
            gemeente: naam,
            behandeldienst: sorted[0]?.[0] || ''
        };
    });
}

function parseT1(rows) {
    // T1 columns: Bestuursorgaan, STTR ID, STTR versie, Wijzigingsdatum, Startdatum, Einddatum, Activiteit, Act. tot, Soort STTR, TR Software
    // We want: { gemeente, aantalRegels, laatsteWijziging, trSoftware }
    const results = {};

    for (const row of rows) {
        const bestuursorgaan = row[0] || '';
        const wijzigingsdatum = row[3] || '';
        const activiteit = row[6] || '';
        const trSoftware = row[9] || '';

        if (!bestuursorgaan.toLowerCase().startsWith('gemeente')) continue;

        const naam = bestuursorgaan.replace(/^gemeente\s+/i, '').trim();
        if (!naam) continue;

        if (!results[naam]) {
            results[naam] = { gemeente: naam, aantalRegels: 0, laatsteWijziging: '', trSoftware: '' };
        }
        results[naam].aantalRegels++;

        // Track latest wijzigingsdatum
        if (wijzigingsdatum > results[naam].laatsteWijziging) {
            results[naam].laatsteWijziging = wijzigingsdatum;
        }
        if (trSoftware && !results[naam].trSoftware) {
            results[naam].trSoftware = trSoftware;
        }
    }
    return Object.values(results);
}

// --- MAIN ---

(async () => {
    console.log('🚀 Starting Power BI Sync V2...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('📄 Loading Power BI Report...');
        await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 90000 });
        await waitForPBI(page);
        console.log('✅ Dashboard loaded.');

        // =====================
        // SCRAPE R1: Regelingen
        // =====================
        console.log('\n📊 [R1] Scraping Regelingen...');
        await navigateToPage(page, 'R1.');
        const r1Rows = await scrapeAllRows(page);
        console.log(`   Found ${r1Rows.length} raw rows`);
        const regelingen = parseR1(r1Rows);
        console.log(`   Parsed ${regelingen.length} gemeenten`);

        // =====================
        // SCRAPE I3: Behandeldiensten
        // =====================
        console.log('\n📊 [I3] Scraping Behandeldiensten...');
        await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 90000 });
        await waitForPBI(page);
        await navigateToPage(page, 'I3.');
        const i3Rows = await scrapeAllRows(page);
        console.log(`   Found ${i3Rows.length} raw rows`);
        const behandeldiensten = parseI3(i3Rows);
        console.log(`   Parsed ${behandeldiensten.length} gemeenten`);

        // =====================
        // SCRAPE T1: Toepasbare regels
        // =====================
        console.log('\n📊 [T1] Scraping Toepasbare regels...');
        await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 90000 });
        await waitForPBI(page);
        await navigateToPage(page, 'T1.');
        const t1Rows = await scrapeAllRows(page);
        console.log(`   Found ${t1Rows.length} raw rows`);
        const toepasbaar = parseT1(t1Rows);
        console.log(`   Parsed ${toepasbaar.length} gemeenten`);

        // =====================
        // MERGE & PUSH
        // =====================
        console.log('\n☁️ Merging and syncing to Google Sheet...');

        // Build a combined lookup by gemeente
        const merged = {};

        for (const r of regelingen) {
            if (!merged[r.gemeente]) merged[r.gemeente] = { gemeente: r.gemeente };
            merged[r.gemeente].kpi4 = r.kpi4;
            merged[r.gemeente].regelingType = r.regelingType;
        }
        for (const b of behandeldiensten) {
            if (!merged[b.gemeente]) merged[b.gemeente] = { gemeente: b.gemeente };
            merged[b.gemeente].behandeldienst = b.behandeldienst;
        }
        for (const t of toepasbaar) {
            if (!merged[t.gemeente]) merged[t.gemeente] = { gemeente: t.gemeente };
            merged[t.gemeente].aantalRegels = t.aantalRegels;
            merged[t.gemeente].laatsteWijziging = t.laatsteWijziging;
            merged[t.gemeente].trSoftware = t.trSoftware;
        }

        const records = Object.values(merged);
        console.log(`   Total unique gemeenten: ${records.length}`);

        // Push to Google Sheet
        let successCount = 0;
        for (const record of records) {
            const payload = {
                type: 'Monitor Sync',
                gemeente: record.gemeente,
                kpi4: record.kpi4 || '',
                regelingType: record.regelingType || '',
                behandeldienst: record.behandeldienst || '',
                aantalRegels: String(record.aantalRegels || ''),
                laatsteWijziging: record.laatsteWijziging || '',
                trSoftware: record.trSoftware || '',
                // Placeholders for KPIs we don't scrape yet
                kpi1: '',
                kpi2: '',
                kpi3: ''
            };

            try {
                await fetch(WEB_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                successCount++;
                process.stdout.write('.');
            } catch (e) {
                process.stdout.write('x');
            }

            // Rate limit: 100ms between requests
            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`\n✅ Sync complete! ${successCount}/${records.length} records pushed.`);

    } catch (err) {
        console.error('❌ Error during sync:', err);
    } finally {
        await browser.close();
    }
})();
