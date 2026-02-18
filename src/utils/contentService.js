/**
 * Content Service — Fetches editable content from Google Sheets
 * 
 * Sheet ID: 1FWC_JHiy_fpPKEw7_dPNfpYOIrJBkCTIyBKRCWqd6cs
 * Tabs: Algemeen, Score Teksten, Functie Teksten, CTAs
 * 
 * Uses the Google Sheets published JSON feed (no API key needed).
 * Falls back to hardcoded defaults if fetch fails.
 */

const SHEET_ID = '1FWC_JHiy_fpPKEw7_dPNfpYOIrJBkCTIyBKRCWqd6cs';

function sheetUrl(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

function parseGoogleJson(text) {
    // Google wraps the JSON in a callback: google.visualization.Query.setResponse({...})
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\)/);
    if (!match) throw new Error('Invalid Google Sheets response');
    const data = JSON.parse(match[1]);

    const headers = data.table.cols.map(c => c.label || '');
    const rows = (data.table.rows || []).map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
            obj[headers[i]] = cell ? (cell.v || '') : '';
        });
        return obj;
    });
    return rows;
}

// Cache to avoid fetching on every email generation
let contentCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchContent() {
    // Return cache if fresh
    if (contentCache && (Date.now() - cacheTimestamp < CACHE_TTL)) {
        return contentCache;
    }

    try {
        const [algemeenRes, scoreRes, functieRes, ctaRes] = await Promise.all([
            fetch(sheetUrl('Algemeen')).then(r => r.text()),
            fetch(sheetUrl('Score Teksten')).then(r => r.text()),
            fetch(sheetUrl('Functie Teksten')).then(r => r.text()),
            fetch(sheetUrl('CTAs')).then(r => r.text()),
        ]);

        const algemeenRows = parseGoogleJson(algemeenRes);
        const scoreRows = parseGoogleJson(scoreRes);
        const functieRows = parseGoogleJson(functieRes);
        const ctaRows = parseGoogleJson(ctaRes);

        // Parse Algemeen into key-value map
        const algemeen = {};
        algemeenRows.forEach(row => {
            const veld = row['Veld'] || row['veld'] || '';
            const waarde = row['Waarde'] || row['waarde'] || '';
            if (veld) algemeen[veld] = waarde;
        });

        // Parse Score Teksten into structured lookup
        const scoreTeksten = {};
        scoreRows.forEach(row => {
            const kpi = row['kpi'] || '';
            const score = row['score'] || '';
            if (kpi) {
                if (!scoreTeksten[kpi]) scoreTeksten[kpi] = {};
                scoreTeksten[kpi][score] = {
                    type: row['type'] || '',
                    tekst: row['tekst'] || row['tekst_professioneel'] || '',
                    dienst: row['dienst'] || '',
                    opmerkingen: row['opmerkingen'] || '',
                };
            }
        });

        // Parse Functie Teksten
        const functieTeksten = {};
        functieRows.forEach(row => {
            const keyword = row['functie_keyword'] || '';
            if (keyword) {
                functieTeksten[keyword] = {
                    professioneel: row['tekst_professioneel'] || '',
                    informeel: row['tekst_informeel'] || '',
                    opmerkingen: row['opmerkingen'] || '',
                };
            }
        });

        // Parse CTAs
        const ctas = {};
        ctaRows.forEach(row => {
            const doel = row['doel'] || '';
            if (doel) {
                ctas[doel] = {
                    professioneel: row['tekst_professioneel'] || '',
                    informeel: row['tekst_informeel'] || '',
                    opmerkingen: row['opmerkingen'] || '',
                };
            }
        });

        contentCache = { algemeen, scoreTeksten, functieTeksten, ctas };
        cacheTimestamp = Date.now();
        return contentCache;
    } catch (err) {
        console.warn('Failed to fetch content from Google Sheets, using fallback:', err);
        return null; // Will use hardcoded fallback
    }
}

export function clearContentCache() {
    contentCache = null;
    cacheTimestamp = 0;
}
