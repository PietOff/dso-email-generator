/**
 * Populate Contacts — One-time script to sync contact persons from
 * gemeenteData.js to the Google Sheet "Contactpersonen" tab.
 *
 * Usage: node scripts/populate_contacts.js
 */

import { gemeenteData } from '../src/data/gemeenteData.js';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxpHyv27KGUZh72k-wx0qbwVSPdnIE55okwChZedWM5pfyYI0SCOZ_XJ7d_A_A5FnY/exec';

(async () => {
    console.log('📇 Populating Contactpersonen tab from gemeenteData...\n');

    const rows = [];

    for (const g of gemeenteData) {
        const org = g.bestuursorgaan || '';
        if (!org) continue;

        if (g.contactpersonen && g.contactpersonen.length > 0) {
            for (const c of g.contactpersonen) {
                rows.push({
                    organisatie: org,
                    naam: c.naam || '',
                    functie: c.functie || '',
                    email: '',
                    telefoon: '',
                    notities: ''
                });
            }
        }
    }

    console.log(`Found ${rows.length} contact persons across ${gemeenteData.length} organisations.\n`);

    // Send in batches of 200 to avoid payload limits
    const BATCH_SIZE = 200;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const isFirst = i === 0;

        console.log(`📤 Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} contacts, clearFirst=${isFirst})...`);

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Contactpersonen Sync',
                    clearFirst: isFirst,
                    data: batch
                })
            });
            const result = await response.text();
            console.log(`   ✅ Response: ${result}`);
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
        }
    }

    console.log('\n🎉 Done! Check the "Contactpersonen" tab in your Google Sheet.');
})();
