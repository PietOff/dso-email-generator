import puppeteer from 'puppeteer';
import { gemeenteData } from '../src/data/gemeenteData.js';
import { overigeData } from '../src/data/overigeData.js';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyAWP1F-q4ActHk93AYRjmB8VlWBf5DhXTtAt0hrONlbX_CLjpSU9rwmmtBMQgzjnIy/exec';
const POWER_BI_URL = 'https://app.fabric.microsoft.com/view?r=eyJrIjoiMzg1ZTYwMTYtOTA4Yy00ZDMyLWFlYzMtODJiZjYyZTk3MjZjIiwidCI6IjUxYzI5NmZjLTQzNTMtNGIxMi1iYjM4LTJmMzlmODQ3MzFkYSIsImMiOjl9';

// Helper to normalize names
function cleanEntityName(rawName) {
    if (!rawName) return '';
    // Strip "gemeente " prefix, but leave "Provincie ", "Waterschap ", "Omgevingsdienst " intact if they are standardized
    let name = rawName.replace(/^gemeente\s+/i, '');
    // Fix CBS variations like (NH.) to (NH)
    name = name.replace(/\(\s*([A-Za-z]+)\.\s*\)/g, '($1)').trim();
    return name;
}

// Build KPI lookup from static gemeenteData and overigeData
const kpiLookup = {};
for (const g of gemeenteData) {
    const naam = cleanEntityName(g.bestuursorgaan);
    if (naam) {
        kpiLookup[naam.toLowerCase()] = {
            kpi1: g.dierlijkeMestScore || '',
            kpi2: g.regelanalistScore || '',
            kpi3: g.scoreOLO || '',
            type: 'Gemeente'
        };
    }
}
for (const o of overigeData) {
    const naam = cleanEntityName(o.bestuursorgaan);
    if (naam) {
        kpiLookup[naam.toLowerCase()] = {
            kpi1: '',
            kpi2: '',
            kpi3: '',
            type: o.type || 'Overig'
        };
    }
}
console.log(`📋 Loaded ${Object.keys(kpiLookup).length} valid entities from static KPI data`);
console.log(`📋 Loaded ${Object.keys(kpiLookup).length} gemeenten from static KPI data`);

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
 *
 * Power BI DSR format (discovered via diagnostic dumps):
 * - dsr.DS[].ValueDicts = { D0: [...], D1: [...], ... } — lookup dictionaries
 * - dsr.DS[].PH[].DM0[0].S = column schema, e.g. [{N:"G0",T:1,DN:"D0"}, {N:"G1",T:7}, ...]
 *   - DN="D0" means this column's values are indices into ValueDicts.D0
 *   - T:7 = timestamp, T:4 = number, T:1 = string (via dict or literal)
 * - dsr.DS[].PH[].DM0[].C = cell values (indices into dicts, or literal numbers)
 * - dsr.DS[].PH[].DM0[].R = repeat suppression bitmask (carry values from prev row)
 * - dsr.DS[].PH[].DM0[].Ø = null bitmask (which cells are null)
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

                for (const ds of dsr.DS) {
                    if (!ds.PH) continue;

                    // ValueDicts are at the DS level, not the DSR level!
                    const valueDicts = ds.ValueDicts || {};

                    for (const ph of ds.PH) {
                        if (!ph.DM0 || ph.DM0.length === 0) continue;

                        // The first DM0 entry contains the column schema in its S field
                        const firstEntry = ph.DM0[0];
                        const schema = firstEntry.S || [];

                        if (schema.length === 0) continue; // No schema = card/KPI visual, skip it

                        // Build the column-to-dict mapping from the schema
                        // Each schema entry: { N: "G0", T: 1, DN: "D0" }
                        // DN tells us which dictionary to use for this column
                        const colDictMap = {};
                        for (let i = 0; i < schema.length; i++) {
                            if (schema[i].DN) {
                                colDictMap[i] = schema[i].DN; // e.g., col 0 → "D0"
                            }
                        }

                        const numCols = schema.length;

                        // Track running values for repeat suppression
                        let prevValues = new Array(numCols).fill('');

                        for (const dm of ph.DM0) {
                            // Skip entries that are just schema (no C array)
                            // Actually, the first entry has both S and C
                            const C = dm.C;
                            if (!C) continue;

                            // The C array may be SHORTER than numCols if repeat suppression is active
                            // We need to reconstruct the full row using R (repeat bitmask)
                            const R = dm.R || 0; // repeat bitmask
                            const nullMask = dm['Ø'] || 0; // null bitmask

                            const fullRow = new Array(numCols).fill('');
                            let cIdx = 0; // index into the C array

                            for (let col = 0; col < numCols; col++) {
                                // Check if this column repeats from previous row
                                if (R & (1 << col)) {
                                    fullRow[col] = prevValues[col];
                                } else {
                                    // This column has a new value from C
                                    const rawVal = (cIdx < C.length) ? C[cIdx] : null;
                                    cIdx++;

                                    // Check null mask
                                    if (nullMask & (1 << col)) {
                                        fullRow[col] = '';
                                    } else if (rawVal === null || rawVal === undefined) {
                                        fullRow[col] = '';
                                    } else {
                                        // Resolve via dictionary if this column has a dict mapping
                                        const dictName = colDictMap[col];
                                        if (dictName && valueDicts[dictName] && typeof rawVal === 'number') {
                                            fullRow[col] = String(valueDicts[dictName][rawVal] ?? rawVal);
                                        } else {
                                            fullRow[col] = String(rawVal);
                                        }
                                    }
                                }
                            }

                            prevValues = [...fullRow];
                            allRows.push(fullRow);
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

/**
 * Scroll the page to trigger Power BI to load more data in tables.
 */
async function scrollVisuals(page, captured) {
    console.log('    🖱️ Scrolling to fetch paginated data...');
    // Move mouse to center of the viewport (usually where the main visual is)
    await page.mouse.move(700, 450);

    let previousQueryCount = captured.queries.length;
    let noNewDataCount = 0;

    // Scroll down multiple times with delays
    for (let i = 0; i < 50; i++) { // Increased max scrolls safely
        await page.mouse.wheel({ deltaY: 5000 });
        await new Promise(r => setTimeout(r, 4000));

        let currentQueryCount = captured.queries.length;
        if (currentQueryCount === previousQueryCount) {
            noNewDataCount++;
            if (noNewDataCount >= 5) {
                console.log(`    🛑 Stopping scroll, no new data after 5 attempts. (Total queries: ${currentQueryCount})`);
                break;
            }
        } else {
            noNewDataCount = 0; // reset
        }
        previousQueryCount = currentQueryCount;
    }
}

// --- PARSERS (unchanged from original) ---

function parseR1(rows) {
    if (rows.length > 0) {
        console.log('    🔍 R1 Sample Row [0]:', JSON.stringify(rows[0]));
    }
    const results = {};
    for (const row of rows) {
        // [0] Bevoegd gezag (e.g. "gemeente Zutphen")
        // [4] Soort (e.g. "Omgevingsplan")
        const bevoegdGezag = row[0] || '';
        const soort = row[4] || '';

        const naam = cleanEntityName(bevoegdGezag);
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
    if (rows.length > 0) {
        console.log('    🔍 I3 Sample Row [0]:', JSON.stringify(rows[0]));
    }
    const results = {};
    for (const row of rows) {
        const bevoegdGezag = row[2] || '';
        const behandeldienst = row[4] || '';
        const naam = cleanEntityName(bevoegdGezag);
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
    if (rows.length > 0) {
        console.log('    🔍 T1 Sample Row [0]:', JSON.stringify(rows[0]));
    }
    const results = {};
    const now = new Date();

    for (const row of rows) {
        // [0] Bestuursorgaan
        // [1] STTR ID
        // [3] Wijzigingsdatum (bijv. "24-02-2026")
        // [5] Einddatum (bijv. "24-02-2026" of "")
        // [9] TR Software

        const bestuursorgaan = row[0] || '';
        const sttrId = row[1];
        const wijzigingsdatumStr = row[3] || '';
        const einddatumStr = row[5] || '';
        const trSoftware = row[9] || '';

        const naam = cleanEntityName(bestuursorgaan);
        if (!naam) continue;

        // Helper function to safely parse PowerBI date strings which can be DD-MM-YYYY or YYYY-MM-DD
        const parseDateString = (dateStr) => {
            if (!dateStr) return null;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return null;

            // If the first part is 4 digits, it's YYYY-MM-DD
            if (parts[0].length === 4) {
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
            // Otherwise assume DD-MM-YYYY
            else {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
        };

        // Filter: Check if rule is still active
        if (einddatumStr) {
            const eindDatum = parseDateString(einddatumStr);
            if (eindDatum && eindDatum < now) continue; // Rule has expired
        }

        if (!results[naam]) {
            results[naam] = {
                gemeente: naam,
                sttrIds: new Set(),
                laatsteWijziging: '',
                trSoftware: ''
            };
        }

        if (sttrId) results[naam].sttrIds.add(sttrId);

        // Update latest modification date
        if (wijzigingsdatumStr) {
            const currentWijziging = parseDateString(wijzigingsdatumStr);
            if (currentWijziging) {
                let existingWijziging = parseDateString(results[naam].laatsteWijziging);

                if (!existingWijziging || currentWijziging > existingWijziging) {
                    results[naam].laatsteWijziging = wijzigingsdatumStr;
                }
            }
        }

        // Capture software (usually the same for all rows of a BG)
        if (trSoftware && !results[naam].trSoftware) {
            results[naam].trSoftware = trSoftware;
        }
    }

    return Object.values(results).map(r => ({
        gemeente: r.gemeente,
        aantalRegels: r.sttrIds.size,
        laatsteWijziging: r.laatsteWijziging,
        trSoftware: r.trSoftware
    }));
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
        await scrollVisuals(page, captured);
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
        await scrollVisuals(page, captured);
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
        await scrollVisuals(page, captured);
        const t1Rows = extractRowsFromQueryData(captured.queries);
        console.log(`   Found ${t1Rows.length} raw rows from API`);
        if (t1Rows.length > 0) {
            console.log(`   Sample: ${JSON.stringify(t1Rows[0].slice(0, 6))}`);
        }
        const toepasbaar = parseT1(t1Rows);
        console.log(`   Parsed ${toepasbaar.length} gemeenten`);

        // =====================
        console.log('\n☁️ Merging and syncing to Google Sheet...');
        const merged = {};

        // PREPOPULATE ALL 342 MUNICIPALITIES
        // This ensures no municipality is ever "missing" from the map/sheet
        for (const g of gemeenteData) {
            const naam = (g.bestuursorgaan || '').replace(/^gemeente\s+/i, '').replace(/\(\s*([A-Za-z]+)\.\s*\)/g, '($1)').trim();
            if (naam) {
                const key = naam.toLowerCase();
                merged[key] = { gemeente: naam };
            }
        }

        for (const r of regelingen) {
            const key = r.gemeente.toLowerCase();
            if (!merged[key]) merged[key] = { gemeente: r.gemeente };
            merged[key].kpi4 = r.kpi4;
            merged[key].regelingType = r.regelingType;
        }
        for (const b of behandeldiensten) {
            const key = b.gemeente.toLowerCase();
            if (!merged[key]) merged[key] = { gemeente: b.gemeente };
            merged[key].behandeldienst = b.behandeldienst;
        }
        for (const t of toepasbaar) {
            const key = t.gemeente.toLowerCase();
            if (!merged[key]) merged[key] = { gemeente: t.gemeente };
            merged[key].aantalRegels = t.aantalRegels;
            merged[key].laatsteWijziging = t.laatsteWijziging;
            merged[key].trSoftware = t.trSoftware;
        }

        const records = Object.values(merged);
        console.log(`   Total unique entities locally merged: ${records.length}`);

        // Push to Google Sheet in a single batch
        let skippedCount = 0;
        const validGemeentenKeys = Object.keys(kpiLookup);
        const batchData = [];

        for (const record of records) {
            const key = record.gemeente.toLowerCase();

            // Only push if it's a recognized municipality or other entity from static data
            if (!validGemeentenKeys.includes(key)) {
                skippedCount++;
                continue;
            }

            // Look up static KPI1-3 scores from kpiLookup
            const staticKpis = kpiLookup[key] || {};

            batchData.push({
                gemeente: record.gemeente, // Keeping 'gemeente' key for backwards compatibility in spreadsheet
                kpi1: staticKpis.kpi1 || '',
                kpi2: staticKpis.kpi2 || '',
                kpi3: staticKpis.kpi3 || '',
                kpi4: record.kpi4 || '',
                regelingType: record.regelingType || '',
                behandeldienst: record.behandeldienst || '',
                aantalRegels: String(record.aantalRegels || ''),
                laatsteWijziging: record.laatsteWijziging || '',
                trSoftware: record.trSoftware || '',
            });
        }

        try {
            console.log(`\n📤 Sending batch of ${batchData.length} records to Google Apps Script...`);
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Monitor Sync Batch',
                    data: batchData
                })
            });
            const result = await response.text();
            console.log(`✅ Sync complete! Server response: ${result}`);
        } catch (err) {
            console.error('❌ Error during sync:', err);
        }

    } catch (err) {
        console.error('❌ Error during sync:', err);
    } finally {
        await browser.close();
    }
})();
