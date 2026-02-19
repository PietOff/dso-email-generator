/**
 * Power BI Public Report — Client-Side Data Service
 * 
 * Fetches live data directly from the public Power BI report API.
 * Uses a Vercel proxy to bypass CORS restrictions.
 * No Puppeteer, no server-side scraping — runs in the browser.
 */

// Use proxy in production/dev to bypass CORS
const PBI_PROXY = '/api/powerbi-proxy';
const RESOURCE_KEY = '385e6016-908c-4d32-aec3-82bf62e9726c';
const MODEL_ID = 1324965;

// Cache: store results for 10 minutes
let cache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Build a Power BI semantic query payload
 */
function buildQuery(entity, properties, filters = []) {
    const source = entity.charAt(0); // first letter as source alias

    const select = properties.map(prop => ({
        Column: {
            Expression: { SourceRef: { Source: source } },
            Property: prop
        }
    }));

    const from = [{ Name: source, Entity: entity, Type: 0 }];

    const query = {
        Commands: [{
            SemanticQueryDataShapeCommand: {
                Query: {
                    Version: 2,
                    From: from,
                    Select: select,
                    Where: filters
                },
                Binding: {
                    Primary: { Groupings: [{ Projections: select.map((_, i) => i) }] },
                    DataReduction: { DataVolume: 4, Primary: { Top: { Count: 1000 } } },
                    Version: 1
                }
            }
        }]
    };

    return {
        version: '1.0.0',
        queries: [{
            Query: query,
            QueryId: '',
            ApplicationContext: {
                DatasetId: '2945b321-bcf9-4461-a051-506ea17d3718',
                Sources: [{ ReportId: 'c11d642a-ed72-4201-9fc6-287bbaae9ccb' }]
            }
        }],
        cancelQueries: [],
        modelId: MODEL_ID
    };
}

/**
 * Execute a query via our proxy
 */
async function executeQuery(payload) {
    const response = await fetch(PBI_PROXY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Power BI API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Parse Power BI response into simple row objects
 */
function parseResponse(data, columnNames) {
    try {
        const results = data?.results?.[0]?.result?.data;
        if (!results) return [];

        const dsr = results.dsr;
        if (!dsr?.DS?.[0]?.PH?.[0]?.DM0) return [];

        const rows = dsr.DS[0].PH[0].DM0;
        const valueDict = dsr.DS[0].ValueDicts || {};

        return rows.map(row => {
            const obj = {};
            const values = row.C || [];
            columnNames.forEach((name, i) => {
                let val = values[i];
                // Power BI may use value dictionaries for repeated strings
                if (typeof val === 'number' && valueDict[`D${i}`]) {
                    val = valueDict[`D${i}`][val];
                }
                obj[name] = val ?? '';
            });
            return obj;
        }).filter(obj => Object.values(obj).some(v => v !== ''));
    } catch (e) {
        console.warn('Failed to parse PBI response:', e);
        return [];
    }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Fetch R1 Regelingen data for all gemeenten
 * Entity: regelingen, Columns: voorkeursnaam, soort, titel
 */
export async function fetchRegelingen() {
    const columns = ['voorkeursnaam', 'soort', 'titel'];
    const payload = buildQuery('regelingen', columns);
    const data = await executeQuery(payload);
    return parseResponse(data, ['bevoegdGezag', 'soort', 'titel']);
}

/**
 * Fetch I3 Behandeldiensten 
 * Entity: behandeldiensten, Columns: Bevoegd gezag, Activiteit, Behandeldienst
 */
export async function fetchBehandeldiensten() {
    const columns = ['Bevoegd gezag', 'Activiteit', 'Behandeldienst'];
    const payload = buildQuery('behandeldiensten', columns);
    const data = await executeQuery(payload);
    return parseResponse(data, ['bevoegdGezag', 'activiteit', 'behandeldienst']);
}

/**
 * Fetch T1 Toepasbare regels
 * Entity: toepasbareregels, Columns: naam, activiteitnaam, laatsteWijzigingDatum, leverancier
 */
export async function fetchToepasbaar() {
    const columns = ['naam', 'activiteitnaam', 'laatsteWijzigingDatum', 'leverancier'];
    const payload = buildQuery('toepasbareregels', columns);
    const data = await executeQuery(payload);
    return parseResponse(data, ['bestuursorgaan', 'activiteit', 'wijzigingsdatum', 'trSoftware']);
}

/**
 * Fetch ALL enriched Power BI data for a specific gemeente
 * This is the main function called by the app
 * 
 * @param {string} gemeenteNaam - e.g. "gemeente Utrecht"
 * @returns {object} Enriched data object
 */
export async function fetchPowerBIData(gemeenteNaam) {
    if (!gemeenteNaam) return null;

    const key = gemeenteNaam.toLowerCase();

    // Check cache
    if (cache[key] && (Date.now() - cacheTimestamp < CACHE_TTL)) {
        return cache[key];
    }

    try {
        // Fetch all three datasets in parallel
        const [regelingen, behandeldiensten, toepasbaar] = await Promise.all([
            fetchRegelingen(),
            fetchBehandeldiensten(),
            fetchToepasbaar()
        ]);

        // Build enriched lookup for ALL gemeenten (amortize cost)
        const enriched = {};

        // Process R1: Regelingen
        for (const r of regelingen) {
            const naam = (r.bevoegdGezag || '').toLowerCase();
            if (!naam.includes('gemeente')) continue;
            if (!enriched[naam]) enriched[naam] = {};

            const soort = r.soort || '';
            const priority = { 'Omgevingsplan': 1, 'Omgevingsvisie': 2, 'Voorbeschermingsregels': 3 };
            const p = priority[soort] || 5;

            if (!enriched[naam].regelingType || p < (enriched[naam]._regelingPriority || 99)) {
                enriched[naam].regelingType = soort;
                enriched[naam]._regelingPriority = p;
                enriched[naam].kpi4 = String(p);
            }
        }

        // Process I3: Behandeldiensten
        const bdCounts = {};
        for (const b of behandeldiensten) {
            const naam = (b.bevoegdGezag || '').toLowerCase();
            if (!naam.includes('gemeente')) continue;
            if (!bdCounts[naam]) bdCounts[naam] = {};
            const bd = b.behandeldienst || '';
            if (bd) bdCounts[naam][bd] = (bdCounts[naam][bd] || 0) + 1;
        }
        for (const [naam, counts] of Object.entries(bdCounts)) {
            if (!enriched[naam]) enriched[naam] = {};
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            enriched[naam].behandeldienst = sorted[0]?.[0] || '';
        }

        // Process T1: Toepasbare regels
        const trCounts = {};
        for (const t of toepasbaar) {
            const naam = (t.bestuursorgaan || '').toLowerCase();
            if (!naam.includes('gemeente')) continue;
            if (!trCounts[naam]) trCounts[naam] = { count: 0, latestDate: '', software: '' };
            trCounts[naam].count++;
            if (t.wijzigingsdatum > trCounts[naam].latestDate) {
                trCounts[naam].latestDate = t.wijzigingsdatum;
            }
            if (t.trSoftware && !trCounts[naam].software) {
                trCounts[naam].software = t.trSoftware;
            }
        }
        for (const [naam, data] of Object.entries(trCounts)) {
            if (!enriched[naam]) enriched[naam] = {};
            enriched[naam].aantalRegels = String(data.count);
            enriched[naam].laatsteWijziging = data.latestDate;
            enriched[naam].trSoftware = data.software;
        }

        // Clean up internal fields, add lastUpdate
        for (const data of Object.values(enriched)) {
            delete data._regelingPriority;
            data.lastUpdate = new Date().toISOString();
        }

        // Cache everything
        cache = enriched;
        cacheTimestamp = Date.now();

        return enriched[key] || null;
    } catch (err) {
        console.warn('Failed to fetch Power BI data:', err);
        return null;
    }
}

/**
 * Get all cached Power BI data (after first fetch)
 */
export function getCachedPowerBIData() {
    if (Date.now() - cacheTimestamp < CACHE_TTL) {
        return cache;
    }
    return {};
}
