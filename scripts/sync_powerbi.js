// Standard native fetch in Node 20+

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxSBxwydzP5DZbpd4mI-LK3GPlMwVsTXpMOSnUWqtTXJdbFAMhnwOHubehOF_X67XE3/exec';
const PBI_API = 'https://wabi-west-europe-f-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true';
const RESOURCE_KEY = '385e6016-908c-4d32-aec3-82bf62e9726c';

// Helper to execute DAX queries against PowerBI
async function executeQuery(payload) {
    const response = await fetch(PBI_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-PowerBI-ResourceKey': RESOURCE_KEY
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Power BI request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function fetchRegelingen() {
    const payload = {
        version: "1.0.0",
        queries: [{
            Query: {
                Commands: [{
                    SemanticQueryDataShapeCommand: {
                        Query: {
                            Version: 2,
                            From: [{ Name: "i", Entity: "i6_regelingen" }],
                            Select: [
                                { Column: { Expression: { SourceRef: { Source: "i" } }, Property: "Bevoegd_gezag" }, Name: "gemeente" },
                                { Column: { Expression: { SourceRef: { Source: "i" } }, Property: "soort" }, Name: "soort" }
                            ]
                        }
                    }
                }]
            },
            QueryId: "",
            ApplicationContext: {
                DatasetId: "51c296fc-4353-4b12-bb38-2f39f84731da",
                Sources: [{ ReportId: "c2c5dc44-7f12-4217-bf41-65b161c56ab4", VisualId: "3e593a1cf52bcbb1a986" }]
            }
        }],
        cancelQueries: [],
        modelId: 3009774
    };

    console.log("Fetching Regelingen...");
    const data = await executeQuery(payload);

    const rows = data.results?.[0]?.result?.data?.dsr?.DS?.[0]?.PH?.[0]?.DM0;
    if (!rows) {
        console.warn("Could not find rows in RegExp response");
        return [];
    }

    const parseValue = (val) => {
        if (!val) return '';
        let v = val[0] || val;
        // PBI might return integer dict lookups, so we just take the raw string or rely on the fact that these are often raw strings if no V-dict is present
        return typeof v === 'object' ? String(v.V || v) : String(v);
    };

    const results = {};
    const priority = { 'Omgevingsplan': 1, 'Omgevingsvisie': 2, 'Voorbeschermingsregels': 3, 'Voorbereidingsbesluit': 4 };

    for (const row of rows) {
        let bevoegdGezag = "";
        let soort = "";

        // C logic handles cell data arrays
        if (row.C && Array.isArray(row.C)) {
            bevoegdGezag = typeof row.C[0] === 'string' ? row.C[0] : (row.C[0]?.V || '');
            soort = typeof row.C[1] === 'string' ? row.C[1] : (row.C[1]?.V || '');
        }

        if (!bevoegdGezag || !bevoegdGezag.toLowerCase().startsWith('gemeente')) continue;
        const naam = bevoegdGezag.replace(/^gemeente\s+/i, '').trim();

        const currentPriority = priority[soort] || 5;
        const existingPriority = results[naam]?.priority || 99;

        if (currentPriority < existingPriority) {
            results[naam] = {
                gemeente: naam,
                regelingType: soort,
                priority: currentPriority,
                kpi4: String(currentPriority)
            };
        }
    }
    return Object.values(results);
}

async function fetchBehandeldiensten() {
    const payload = {
        version: "1.0.0",
        queries: [{
            Query: {
                Commands: [{
                    SemanticQueryDataShapeCommand: {
                        Query: {
                            Version: 2,
                            From: [{ Name: "i", Entity: "i3_behandeldiensten" }],
                            Select: [
                                { Column: { Expression: { SourceRef: { Source: "i" } }, Property: "Bevoegd gezag" }, Name: "gemeente" },
                                { Column: { Expression: { SourceRef: { Source: "i" } }, Property: "Behandeldienst" }, Name: "behandeldienst" }
                            ]
                        }
                    }
                }]
            },
            QueryId: "",
            ApplicationContext: {
                DatasetId: "51c296fc-4353-4b12-bb38-2f39f84731da",
                Sources: [{ ReportId: "c2c5dc44-7f12-4217-bf41-65b161c56ab4", VisualId: "3e593a1cf52bcbb1a986" }]
            }
        }],
        cancelQueries: [],
        modelId: 3009774
    };

    console.log("Fetching Behandeldiensten...");
    const data = await executeQuery(payload);
    const rows = data.results?.[0]?.result?.data?.dsr?.DS?.[0]?.PH?.[0]?.DM0;

    if (!rows) {
        console.warn("Could not extract Behandeldiensten data");
        return [];
    }

    const results = {};
    for (const row of rows) {
        let bevoegdGezag = "";
        let behandeldienst = "";

        if (row.C && Array.isArray(row.C)) {
            bevoegdGezag = typeof row.C[0] === 'string' ? row.C[0] : (row.C[0]?.V || '');
            behandeldienst = typeof row.C[1] === 'string' ? row.C[1] : (row.C[1]?.V || '');
        }

        if (!bevoegdGezag.toLowerCase().startsWith('gemeente')) continue;
        const naam = bevoegdGezag.replace(/^gemeente\s+/i, '').trim();

        if (!results[naam]) results[naam] = { gemeente: naam, behandeldiensten: {} };
        if (behandeldienst) {
            results[naam].behandeldiensten[behandeldienst] = (results[naam].behandeldiensten[behandeldienst] || 0) + 1;
        }
    }

    return Object.entries(results).map(([naam, res]) => {
        const sorted = Object.entries(res.behandeldiensten).sort((a, b) => b[1] - a[1]);
        return { gemeente: naam, behandeldienst: sorted[0]?.[0] || '' };
    });
}

async function fetchToepasbaar() {
    const payload = {
        version: "1.0.0",
        queries: [{
            Query: {
                Commands: [{
                    SemanticQueryDataShapeCommand: {
                        Query: {
                            Version: 2,
                            From: [{ Name: "t", Entity: "toepasbareregels" }],
                            Select: [
                                { Column: { Expression: { SourceRef: { Source: "t" } }, Property: "naam" }, Name: "bestuursorgaan" },
                                { Column: { Expression: { SourceRef: { Source: "t" } }, Property: "leverancier" }, Name: "software" },
                                { Column: { Expression: { SourceRef: { Source: "t" } }, Property: "laatsteWijzigingDatum" }, Name: "datum" }
                            ]
                        }
                    }
                }]
            },
            QueryId: "",
            ApplicationContext: {
                DatasetId: "51c296fc-4353-4b12-bb38-2f39f84731da",
                Sources: [{ ReportId: "c2c5dc44-7f12-4217-bf41-65b161c56ab4", VisualId: "3e593a1cf52bcbb1a986" }]
            }
        }],
        cancelQueries: [],
        modelId: 3009774
    };

    console.log("Fetching Toepasbare Regels...");
    const data = await executeQuery(payload);
    const rows = data.results?.[0]?.result?.data?.dsr?.DS?.[0]?.PH?.[0]?.DM0;

    if (!rows) {
        console.warn("Could not extract Toepasbare Regels data");
        return [];
    }

    const results = {};
    for (const row of rows) {
        let bestuursorgaan = "";
        let software = "";
        let wijziging = "";

        if (row.C && Array.isArray(row.C)) {
            bestuursorgaan = typeof row.C[0] === 'string' ? row.C[0] : (row.C[0]?.V || '');
            software = typeof row.C[1] === 'string' ? row.C[1] : (row.C[1]?.V || '');
            wijziging = typeof row.C[2] === 'number' ? new Date(row.C[2]).toISOString().split('T')[0] : (row.C[2]?.V || '');
        }

        if (!bestuursorgaan.toLowerCase().startsWith('gemeente')) continue;
        const naam = bestuursorgaan.replace(/^gemeente\s+/i, '').trim();

        if (!results[naam]) {
            results[naam] = { gemeente: naam, aantalRegels: 0, laatsteWijziging: '', trSoftware: '' };
        }
        results[naam].aantalRegels++;

        if (software && !results[naam].trSoftware) results[naam].trSoftware = software;
        if (wijziging && wijziging > results[naam].laatsteWijziging) results[naam].laatsteWijziging = wijziging;
    }
    return Object.values(results);
}

// --- MAIN ---
(async () => {
    console.log('🚀 Starting Power BI Sync via Native API...');

    try {
        const [regelingen, behandeldiensten, toepasbaar] = await Promise.all([
            fetchRegelingen(),
            fetchBehandeldiensten(),
            fetchToepasbaar()
        ]);

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
        process.exit(1);
    }
})();
