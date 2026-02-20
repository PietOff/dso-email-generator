import puppeteer from 'puppeteer';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSBxwydzP5DZbpd4mI-LK3GPlMwVsTXpMOSnUWqtTXJdbFAMhnwOHubehOF_X67XE3/exec';
const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

// ============================================================================
// APPROACH: Network Interception
// ============================================================================
// Power BI renders its UI in a canvas/WebGL context. DOM-based clicking and
// scraping does NOT work reliably. Instead, we intercept the internal REST API
// calls that Power BI makes to load its data. These calls return structured
// JSON that we can parse directly — no DOM scraping needed.
//
// For navigation between report pages, we append "&pageName=..." to the URL
// and reload, which is far more reliable than trying to click canvas tabs.
// ============================================================================

// --- HELPERS ---

/**
 * Collect all Power BI querydata API responses from network traffic.
 * Returns a Map of URL → parsed JSON body.
 */
function setupNetworkCapture(page) {
    const captured = { queries: [], pages: [], config: null };

    page.on('response', async (response) => {
        const url = response.url();
        try {
            if (url.includes('/public/reports/querydata')) {
                const body = await response.json().catch(() => null);
                if (body) captured.queries.push({ url, body });
            }
            // Capture the report config to discover page names
            if (url.includes('/public/reports/') && !url.includes('querydata') && !url.includes('modelsAndExploration')) {
                const body = await response.json().catch(() => null);
                if (body?.sections || body?.pages) {
                    captured.pages = body.sections || body.pages || [];
                }
            }
            // The exploration/model config often has page info
            if (url.includes('modelsAndExploration')) {
                const body = await response.json().catch(() => null);
                if (body) {
                    captured.config = body;
                    // Extract page names from exploration model
                    const sections = body?.exploration?.sections;
                    if (sections && sections.length > 0) {
                        captured.pages = sections;
                    }
                }
            }
        } catch {
            // Ignore parse errors on non-JSON responses
        }
    });

    return captured;
}

/**
 * Extract tabular data from Power BI querydata API responses.
 * Power BI uses a DSR (Data Shape Result) format where:
 * - ValueDicts contains lookup dictionaries (D0, D1, etc.) with actual text values
 * - DM0 entries have C arrays with indices into these dictionaries
 * - The S (select) metadata tells which columns use which dictionary
 *
 * This function resolves the lookups and returns human-readable row arrays.
 */
function extractRowsFromQueryData(queryResponses) {
    const allRows = [];

    for (const { body } of queryResponses) {
        try {
            const results = body?.results;
            if (!results) continue;

            for (const result of results) {
                const data = result?.result?.data;
                if (!data) continue;

                const dsr = data.dsr;
                if (!dsr?.DS) continue;

                // === RAW STRUCTURE DUMP (first query only) ===
                if (allRows.length === 0) {
                    console.log(`    🔍 DSR top-level keys: ${Object.keys(dsr).join(', ')}`);
                    console.log(`    🔍 DSR.DS length: ${dsr.DS.length}`);
                    if (dsr.IC) console.log(`    🔍 DSR.IC: ${JSON.stringify(dsr.IC).substring(0, 200)}`);

                    // Dump ValueDicts structure
                    if (dsr.ValueDicts) {
                        console.log(`    🔍 DSR.ValueDicts keys: ${Object.keys(dsr.ValueDicts).join(', ')}`);
                    } else {
                        console.log(`    🔍 DSR has NO ValueDicts!`);
                    }

                    // Dump first DS entry structure
                    const ds0 = dsr.DS[0];
                    console.log(`    🔍 DS[0] keys: ${Object.keys(ds0).join(', ')}`);
                    if (ds0.ValueDicts) console.log(`    🔍 DS[0].ValueDicts keys: ${Object.keys(ds0.ValueDicts).join(', ')}`);
                    if (ds0.S) console.log(`    🔍 DS[0].S: ${JSON.stringify(ds0.S).substring(0, 300)}`);

                    // Dump PH structure
                    if (ds0.PH && ds0.PH[0]) {
                        const ph0 = ds0.PH[0];
                        console.log(`    🔍 PH[0] keys: ${Object.keys(ph0).join(', ')}`);
                        if (ph0.DM0 && ph0.DM0[0]) {
                            console.log(`    🔍 PH[0].DM0 length: ${ph0.DM0.length}`);
                            console.log(`    🔍 DM0[0] keys: ${Object.keys(ph0.DM0[0]).join(', ')}`);
                            console.log(`    🔍 DM0[0] FULL: ${JSON.stringify(ph0.DM0[0]).substring(0, 500)}`);
                            if (ph0.DM0.length > 1) {
                                console.log(`    🔍 DM0[1] FULL: ${JSON.stringify(ph0.DM0[1]).substring(0, 500)}`);
                            }
                        }
                    }
                }
                // === END DUMP ===

                // Extract ValueDicts for lookup resolution
                const valueDicts = dsr.ValueDicts || {};

                for (const ds of dsr.DS) {
                    if (!ds.PH) continue;

                    // Get column metadata from S (select) array if available
                    const selectInfo = ds.S || [];
                    console.log(`    📊 DataSet has ${ds.PH.length} PH groups, S has ${selectInfo.length} column descriptors`);

                    // Log column info
                    if (selectInfo.length > 0) {
                        selectInfo.forEach((s, i) => {
                            const dictIdx = s.DN;
                            console.log(`       Col ${i}: GroupKeys=${JSON.stringify(s.GroupKeys || [])}, DN=${dictIdx}, Kind=${s.Kind}`);
                        });
                    }

                    for (const ph of ds.PH) {
                        if (!ph.DM0) continue;

                        // Track the "running" values for repeat-suppression (R field)
                        let prevValues = [];

                        for (const dm of ph.DM0) {
                            if (!dm.C) continue;

                            const resolvedRow = dm.C.map((cellValue, colIdx) => {
                                // Check if this column has a dictionary lookup
                                // In Power BI DSR, columns with string data use ValueDicts
                                // The cell value is an index into the dictionary
                                if (typeof cellValue === 'number') {
                                    // Try to find the right dictionary for this column
                                    // Power BI typically uses D0, D1 etc. mapped to column order
                                    const dictKey = `D${colIdx}`;
                                    if (valueDicts[dictKey] && valueDicts[dictKey][cellValue] !== undefined) {
                                        return String(valueDicts[dictKey][cellValue]);
                                    }
                                }
                                return String(cellValue ?? '');
                            });

                            // Handle repeat suppression: if dm.R is set, some values
                            // carry over from the previous row
                            if (dm.R !== undefined && prevValues.length > 0) {
                                // R is a bitmask indicating which columns repeat
                                for (let i = 0; i < resolvedRow.length; i++) {
                                    if (dm.R & (1 << i)) {
                                        resolvedRow[i] = prevValues[i] || resolvedRow[i];
                                    }
                                }
                            }

                            prevValues = [...resolvedRow];
                            allRows.push(resolvedRow);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`    ⚠️ Error parsing query response: ${e.message}`);
        }
    }

    return allRows;
}

/**
 * Navigate to a specific Power BI report page by name.
 * Uses URL parameter approach which is more reliable than clicking canvas elements.
 */
async function navigateToPage(page, pageName, captured) {
    console.log(`  📄 Navigating to "${pageName}"...`);

    // Strategy 1: Find the page section name from the captured config
    let sectionName = null;
    if (captured.pages && captured.pages.length > 0) {
        console.log(`    📑 Known pages: ${captured.pages.map(p => p.displayName || p.name || 'unnamed').join(', ')}`);
        const match = captured.pages.find(p =>
            (p.displayName || '').startsWith(pageName) ||
            (p.name || '').startsWith(pageName)
        );
        if (match) {
            sectionName = match.name;
            console.log(`    ✅ Matched page: "${match.displayName}" (section: ${sectionName})`);
        }
    }

    // Strategy 2: Try URL-based navigation
    if (sectionName) {
        const navUrl = `${POWER_BI_URL}&pageName=${encodeURIComponent(sectionName)}`;
        console.log(`    🔗 Loading page via URL parameter...`);
        // Clear old queries
        captured.queries = [];
        await page.goto(navUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, 8000)); // Let visuals render
        console.log(`    ✅ Page loaded. Captured ${captured.queries.length} new API queries.`);
        return;
    }

    // Strategy 3: If no config, try clicking (fallback, but likely won't work)
    console.log(`    ⚠️ No page config found, attempting DOM click fallback...`);
    const clicked = await page.evaluate((target) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.trim().startsWith(target)) {
                let el = node.parentElement;
                // Try to find a clickable ancestor
                while (el && el !== document.body) {
                    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'A') {
                        el.click();
                        return true;
                    }
                    el = el.parentElement;
                }
                node.parentElement.click();
                return true;
            }
        }
        return false;
    }, pageName);

    if (clicked) {
        console.log(`    ⚠️ DOM click attempted (may not work with canvas). Waiting...`);
        captured.queries = [];
        await new Promise(r => setTimeout(r, 8000));
    } else {
        console.log(`    ❌ Could not find any element matching "${pageName}"`);
    }
}

// --- PARSERS (unchanged from original) ---

function parseR1(rows) {
    const results = {};
    for (const row of rows) {
        const bevoegdGezag = row[0] || '';
        const soort = row[4] || '';
        if (!bevoegdGezag.toLowerCase().startsWith('gemeente')) continue;
        const naam = bevoegdGezag.replace(/^gemeente\s+/i, '').trim();
        if (!naam) continue;
        const priority = { 'Omgevingsplan': 1, 'Omgevingsvisie': 2, 'Voorbeschermingsregels': 3, 'Voorbereidingsbesluit': 4 };
        const currentPriority = priority[soort] || 5;
        const existingPriority = results[naam]?.priority || 99;
        if (currentPriority < existingPriority) {
            results[naam] = { gemeente: naam, regelingType: soort, priority: currentPriority, kpi4: String(currentPriority) };
        }
    }
    return Object.values(results);
}

function parseI3(rows) {
    const results = {};
    for (const row of rows) {
        const bevoegdGezag = row[2] || '';
        const behandeldienst = row[4] || '';
        if (!bevoegdGezag.toLowerCase().startsWith('gemeente')) continue;
        const naam = bevoegdGezag.replace(/^gemeente\s+/i, '').trim();
        if (!naam || !behandeldienst) continue;
        if (!results[naam]) results[naam] = { gemeente: naam, behandeldiensten: {} };
        results[naam].behandeldiensten[behandeldienst] = (results[naam].behandeldiensten[behandeldienst] || 0) + 1;
    }
    return Object.entries(results).map(([naam, data]) => {
        const sorted = Object.entries(data.behandeldiensten).sort((a, b) => b[1] - a[1]);
        return { gemeente: naam, behandeldienst: sorted[0]?.[0] || '' };
    });
}

function parseT1(rows) {
    const results = {};
    for (const row of rows) {
        const bestuursorgaan = row[0] || '';
        const wijzigingsdatum = row[3] || '';
        const trSoftware = row[9] || '';
        if (!bestuursorgaan.toLowerCase().startsWith('gemeente')) continue;
        const naam = bestuursorgaan.replace(/^gemeente\s+/i, '').trim();
        if (!naam) continue;
        if (!results[naam]) results[naam] = { gemeente: naam, aantalRegels: 0, laatsteWijziging: '', trSoftware: '' };
        results[naam].aantalRegels++;
        if (wijzigingsdatum > results[naam].laatsteWijziging) results[naam].laatsteWijziging = wijzigingsdatum;
        if (trSoftware && !results[naam].trSoftware) results[naam].trSoftware = trSoftware;
    }
    return Object.values(results);
}

// --- MAIN ---

(async () => {
    console.log('🚀 Starting Power BI Sync V3 (Network Interception)...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        // Set up network capture BEFORE navigating
        const captured = setupNetworkCapture(page);

        console.log('📄 Loading Power BI Report (initial page)...');
        await page.goto(POWER_BI_URL, { waitUntil: 'networkidle2', timeout: 90000 });
        // Extra wait to let all API calls complete
        await new Promise(r => setTimeout(r, 12000));

        console.log(`✅ Dashboard loaded. Captured ${captured.queries.length} API queries so far.`);

        // Log discovered pages
        if (captured.pages.length > 0) {
            console.log(`📑 Discovered ${captured.pages.length} report pages:`);
            captured.pages.forEach((p, i) => {
                console.log(`   [${i}] ${p.displayName || p.name || 'unnamed'} (section: ${p.name || '?'})`);
            });
        } else {
            console.log('⚠️ No page config found in API responses. Will try DOM click fallback.');
        }

        // Log all API data found on the initial page for diagnostics
        if (captured.queries.length > 0) {
            const initialRows = extractRowsFromQueryData(captured.queries);
            console.log(`📊 Initial page data: ${initialRows.length} rows from ${captured.queries.length} queries`);
            if (initialRows.length > 0) {
                console.log(`   Sample row [0]: ${JSON.stringify(initialRows[0].slice(0, 5))}`);
            }
        }

        // =====================
        // SCRAPE R1: Regelingen
        // =====================
        console.log('\n📊 [R1] Scraping Regelingen...');
        captured.queries = []; // Clear for fresh capture
        await navigateToPage(page, 'R1.', captured);
        const r1Rows = extractRowsFromQueryData(captured.queries);
        console.log(`   Found ${r1Rows.length} raw rows from API`);
        if (r1Rows.length > 0) {
            console.log(`   Sample: ${JSON.stringify(r1Rows[0].slice(0, 6))}`);
        }
        const regelingen = parseR1(r1Rows);
        console.log(`   Parsed ${regelingen.length} gemeenten`);

        // =====================
        // SCRAPE I3: Behandeldiensten
        // =====================
        console.log('\n📊 [I3] Scraping Behandeldiensten...');
        captured.queries = [];
        await navigateToPage(page, 'I3.', captured);
        const i3Rows = extractRowsFromQueryData(captured.queries);
        console.log(`   Found ${i3Rows.length} raw rows from API`);
        if (i3Rows.length > 0) {
            console.log(`   Sample: ${JSON.stringify(i3Rows[0].slice(0, 6))}`);
        }
        const behandeldiensten = parseI3(i3Rows);
        console.log(`   Parsed ${behandeldiensten.length} gemeenten`);

        // =====================
        // SCRAPE T1: Toepasbare regels
        // =====================
        console.log('\n📊 [T1] Scraping Toepasbare regels...');
        captured.queries = [];
        await navigateToPage(page, 'T1.', captured);
        const t1Rows = extractRowsFromQueryData(captured.queries);
        console.log(`   Found ${t1Rows.length} raw rows from API`);
        if (t1Rows.length > 0) {
            console.log(`   Sample: ${JSON.stringify(t1Rows[0].slice(0, 6))}`);
        }
        const toepasbaar = parseT1(t1Rows);
        console.log(`   Parsed ${toepasbaar.length} gemeenten`);

        // =====================
        // MERGE & PUSH
        // =====================
        console.log('\n☁️ Merging and syncing to Google Sheet...');
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
                kpi1: '', kpi2: '', kpi3: ''
            };

            try {
                await fetch(WEB_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                successCount++;
                process.stdout.write('.');
            } catch {
                process.stdout.write('x');
            }

            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`\n✅ Sync complete! ${successCount}/${records.length} records pushed.`);

    } catch (err) {
        console.error('❌ Error during sync:', err);
    } finally {
        await browser.close();
    }
})();
