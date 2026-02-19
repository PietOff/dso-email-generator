/**
 * Content Service — Fetches editable content from Google Sheets + writes notes
 * 
 * Sheet ID: 1FWC_JHiy_fpPKEw7_dPNfpYOIrJBkCTIyBKRCWqd6cs
 * Tabs: Algemeen, Score Teksten, Functie Teksten, CTAs, Gemeente Notities
 * 
 * Web App URL for writing notes:
 * https://script.google.com/macros/s/AKfycbz7FsQQHxWXpV5bf-yZp1VnvyX8VjFT7cVyRdKQ94khIyvcj0ugukKzK8BnV1s0tPo/exec
 */

const SHEET_ID = '1FWC_JHiy_fpPKEw7_dPNfpYOIrJBkCTIyBKRCWqd6cs';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz7FsQQHxWXpV5bf-yZp1VnvyX8VjFT7cVyRdKQ94khIyvcj0ugukKzK8BnV1s0tPo/exec';

export function getGoogleSheetUrl() {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
}

function sheetUrl(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
}

function parseGoogleJson(text) {
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\)/);
    if (!match) throw new Error('Invalid Google Sheets response');
    const data = JSON.parse(match[1]);

    const headers = data.table.cols.map(c => c.label || '');
    const rows = (data.table.rows || []).map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
            obj[headers[i]] = cell ? (cell.f != null ? cell.f : (cell.v != null ? String(cell.v) : '')) : '';
        });
        return obj;
    });
    return rows;
}

// Cache for content (5 min)
let contentCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

// Separate cache for notes (1 min, refreshed more often)
let notesCache = null;
let notesCacheTimestamp = 0;
const NOTES_CACHE_TTL = 60 * 1000;

export async function fetchContent() {
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

        const algemeen = {};
        algemeenRows.forEach(row => {
            const veld = row['Veld'] || row['veld'] || '';
            const waarde = row['Waarde'] || row['waarde'] || '';
            if (veld) algemeen[veld] = waarde;
        });

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
        console.warn('Failed to fetch content from Google Sheets:', err);
        return null;
    }
}

/**
 * Fetch notes for a specific gemeente
 */
export async function fetchNotes(gemeenteNaam) {
    if (!gemeenteNaam) return { notes: [], emailLog: [], status: '', fase: '' };

    // Use cache if fresh
    if (notesCache && notesCache.gemeente === gemeenteNaam && (Date.now() - notesCacheTimestamp < NOTES_CACHE_TTL)) {
        return notesCache.data;
    }

    try {
        const res = await fetch(sheetUrl('Gemeente Notities'));
        const text = await res.text();
        const rows = parseGoogleJson(text);

        // Find rows for this gemeente (case-insensitive match)
        const gemRows = rows.filter(row => (row['Gemeente'] || '').toLowerCase() === gemeenteNaam.toLowerCase());

        // Build notes from Notitie column (column D)
        const notes = gemRows
            .filter(row => row['Notitie'] && row['Notitie'].trim())
            .map(row => ({
                datum: row['Datum'] || '',
                type: row['Type'] || '',
                notitie: row['Notitie'] || '',
                auteur: row['Auteur'] || '',
            }));

        // Build email log from Email Log column (column H)
        const emailLog = gemRows
            .filter(row => row['Email Log'] && row['Email Log'].trim())
            .map(row => row['Email Log'])
            .flatMap(log => log.split('\n').filter(l => l.trim()));

        // Get status and fase from first matching row
        const firstRow = gemRows[0] || {};
        const status = firstRow['Status'] || '';
        const fase = firstRow['Fase'] || '';

        const data = { notes, emailLog, status, fase };
        notesCache = { gemeente: gemeenteNaam, data };
        notesCacheTimestamp = Date.now();
        return data;
    } catch (err) {
        console.warn('Failed to fetch notes:', err);
        return { notes: [], emailLog: [], status: '', fase: '' };
    }
}

/**
 * Add a note for a gemeente via the Apps Script web app
 */
export async function addNote(gemeente, type, notitie, auteur) {
    const datum = new Date().toISOString().split('T')[0];

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Apps Script requires no-cors for cross-origin
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemeente, datum, type, notitie, auteur }),
        });

        // Clear notes cache to force refresh
        notesCache = null;
        notesCacheTimestamp = 0;
        return true;
    } catch (err) {
        console.error('Failed to add note:', err);
        return false;
    }
}

/**
 * Auto-log an email generation event to the Sheet
 * Called automatically when user clicks "Genereer Email"
 */
export async function logEmailGenerated(gemeente, contactNaam, contactFunctie, doel, toon) {
    if (!gemeente) return;

    const datum = new Date().toISOString().split('T')[0];
    const contactInfo = contactNaam
        ? `${contactNaam}${contactFunctie ? ' (' + contactFunctie + ')' : ''}`
        : 'Algemeen (geen specifiek contact)';

    const doelLabels = {
        'eerste-contact': 'Eerste contact',
        'follow-up': 'Follow-up',
        'quickscan': 'Quick Scan aanbod',
        'workshop': 'Workshop uitnodiging',
    };

    const notitie = `Email gegenereerd: ${doelLabels[doel] || doel} (${toon}) → ${contactInfo}`;

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gemeente,
                datum,
                type: 'Mail verstuurd',
                notitie,
                auteur: 'App',
            }),
        });
        // Clear notes cache so it refreshes on next fetch
        notesCache = null;
        notesCacheTimestamp = 0;
    } catch (err) {
        console.warn('Failed to log email generation:', err);
    }
}

export function clearContentCache() {
    contentCache = null;
    cacheTimestamp = 0;
    notesCache = null;
    notesCacheTimestamp = 0;
}
