import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CSV files
const scoresRaw = fs.readFileSync(path.join(__dirname, 'Scores regelanalist gemeenten.csv'), 'utf-8');
const functiesRaw = fs.readFileSync(path.join(__dirname, 'Functies.csv'), 'utf-8');

// Parse CSV (handle quoted fields with commas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Parse scores
const scoresLines = scoresRaw.replace(/\r/g, '').split('\n').filter(l => l.trim());
const scoresData = {};

for (let i = 1; i < scoresLines.length; i++) {
    const cols = parseCSVLine(scoresLines[i]);
    const org = cols[0];
    if (!org) continue;
    scoresData[org] = {
        bestuursorgaan: org,
        dierlijkeMestScore: cols[1] || null,
        regelanalistScore: cols[2] || null,
        scoreOLO: cols[3] || null,
        omgevingsplanScore: cols[4] || null,
        totaleScore: cols[5] || null,
    };
}

// Parse Functies (contains name + functie per bestuursorgaan)
const functiesLines = functiesRaw.replace(/\r/g, '').split('\n').filter(l => l.trim());
const contactsMap = {};

for (let i = 1; i < functiesLines.length; i++) {
    const cols = parseCSVLine(functiesLines[i]);
    const org = cols[0];
    const name = cols[1];
    const functie = cols[2] || '';
    if (!org) continue;
    if (!contactsMap[org]) contactsMap[org] = [];
    if (name) {
        contactsMap[org].push({ naam: name, functie: functie });
    }
}

// Merge
const merged = [];
const allOrgs = new Set([...Object.keys(scoresData), ...Object.keys(contactsMap)]);

for (const org of allOrgs) {
    const scores = scoresData[org] || { bestuursorgaan: org };
    const contacts = contactsMap[org] || [];
    merged.push({
        ...scores,
        contactpersonen: contacts,
    });
}

// Sort alphabetically
merged.sort((a, b) => a.bestuursorgaan.localeCompare(b.bestuursorgaan));

// Write as JS module
const output = `// Auto-generated from CSV merge
// Source: "Scores regelanalist gemeenten.csv" + "Functies.csv"
// Generated: ${new Date().toISOString()}

export const gemeenteData = ${JSON.stringify(merged, null, 2)};

export function getGemeente(name) {
  return gemeenteData.find(g => g.bestuursorgaan === name);
}

export function getAllGemeenteNames() {
  return gemeenteData.map(g => g.bestuursorgaan);
}
`;

const outPath = path.join(__dirname, '..', 'src', 'data', 'gemeenteData.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, 'utf-8');
console.log('Merged ' + merged.length + ' organizations into ' + outPath);
console.log('  - Scores entries: ' + Object.keys(scoresData).length);
console.log('  - Contact entries (with functies): ' + Object.keys(contactsMap).length);
