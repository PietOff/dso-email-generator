/**
 * Server-side API endpoint for GROQ email enhancement
 * Uses full Google Sheets content as grounding for the LLM
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Build a system prompt that grounds GROQ fully in the sheet content.
 * This is the key function — GROQ sees ALL the relevant sheet texts
 * so it can write emails that are truly driven by the sheet data.
 */
function buildSystemPrompt(context) {
                const {
                                    tone,
                                    gemeente,
                                    recipientName,
                                    contactFunctie,
                                    figures,
                                    sheetContent,
                } = context;

    const isInformeel = tone === 'informal';
                const pronounRule = isInformeel
                    ? 'Use informal Dutch throughout: "je", "jij", "jouw", "jullie". NEVER use "u" or "uw".'
                                    : 'Use formal Dutch throughout: "u", "uw". NEVER use "je", "jij", "jouw".';

    const sc = sheetContent || {};
                const emailTeksten = sc.emailTeksten || {};
                const scoreTeksten = sc.scoreTeksten || {};
                const functieTeksten = sc.functieTeksten || {};
                const ctas = sc.ctas || {};
                const baseStory = sc.baseStory || '';
                const algemeen = sc.algemeen || {};

    const toonKey = isInformeel ? 'informeel' : 'professioneel';

    // Build the sheet text reference block
    let sheetRef = '';

    // Base story
    if (baseStory) {
                        sheetRef += `\n## Standaard verhaal (basis voor elke email)\n${baseStory}\n`;
    }

    // Email teksten from sheet
    if (Object.keys(emailTeksten).length > 0) {
                        sheetRef += `\n## Teksten uit Google Sheet (Email Teksten tab)\n`;
                        for (const [key, entry] of Object.entries(emailTeksten)) {
                                                const tekst = entry[toonKey] || entry.professioneel || '';
                                                if (tekst) {
                                                                            sheetRef += `\n[${key}]\n${tekst}\n`;
                                                }
                        }
    }

    // Score teksten — what the KPI scores mean
    if (Object.keys(scoreTeksten).length > 0) {
                        sheetRef += `\n## Score Teksten (KPI interpretaties uit sheet)\n`;
                        const kpiLabels = { bruidsschat: 'Bruidsschat/Dierlijke Mest', regelanalist: 'Regelanalist', olo: 'OLO Activiteiten', omgevingsplan: 'Omgevingsplan' };
                        for (const [kpi, scores] of Object.entries(scoreTeksten)) {
                                                const figVal = figures?.[kpi === 'bruidsschat' ? 'kpi1' : kpi === 'regelanalist' ? 'kpi2' : kpi === 'olo' ? 'kpi3' : 'kpi4'];
                                                if (!figVal && figVal !== 0) continue;
                                                const scoreEntry = scores[String(figVal)] || scores[figVal];
                                                if (scoreEntry?.tekst) {
                                                                            const label = kpiLabels[kpi] || kpi;
                                                                            sheetRef += `\n[Score ${label} = ${figVal}] type: ${scoreEntry.type}\n${scoreEntry.tekst}`;
                                                                            if (scoreEntry.dienst) sheetRef += `\nDienstaanbod: ${scoreEntry.dienst}`;
                                                                            sheetRef += '\n';
                                                }
                        }
    }

    // Functie teksten — role-specific paragraph if contact role is known
    if (contactFunctie && Object.keys(functieTeksten).length > 0) {
                        const roleLower = contactFunctie.toLowerCase();
                        const matchKey = Object.keys(functieTeksten).find(k => roleLower.includes(k.toLowerCase()));
                        if (matchKey) {
                                                const roleTekst = functieTeksten[matchKey]?.[toonKey] || functieTeksten[matchKey]?.professioneel || '';
                                                if (roleTekst) {
                                                                            sheetRef += `\n## Rol-specifieke tekst voor "${contactFunctie}" (functie_keyword: ${matchKey})\n${roleTekst}\n`;
                                                }
                        }
    }

    // CTAs
    if (Object.keys(ctas).length > 0) {
                        sheetRef += `\n## Beschikbare CTA teksten\n`;
                        for (const [doel, ctaEntry] of Object.entries(ctas)) {
                                                const tekst = ctaEntry[toonKey] || ctaEntry.professioneel || '';
                                                if (tekst) sheetRef += `[${doel}]: ${tekst}\n`;
                        }
    }

    // Bedrijfsinfo
    if (algemeen.bedrijf_naam || algemeen.partner_naam) {
                        sheetRef += `\n## Bedrijfsinformatie\nBedrijf: ${algemeen.bedrijf_naam || 'AbelTalent'}\nPartner: ${algemeen.partner_naam || 'Tafelberg Advies'}\n`;
    }

    const recipientLine = recipientName ? `Ontvanger: ${recipientName}${contactFunctie ? ` (${contactFunctie})` : ''}` : 'Ontvanger: Algemeen (geen specifiek contact)';

    return `Je bent een expert Nederlandse e-mailschrijver voor AbelTalent, een organisatie die gemeenten ondersteunt bij de Omgevingswet.

    CONTEXT:
    - Gemeente: ${gemeente}
    - ${recipientLine}
    - Toon: ${isInformeel ? 'Informeel & toegankelijk' : 'Professioneel & adviserend'}

    STRIKTE REGELS:
    1. ${pronounRule}
    2. Gebruik NOOIT placeholder-syntax zoals {gemeente}, {type}, {software}. Gebruik altijd de echte waarde of laat het weg.
    3. Verzin GEEN contactgegevens, links of data die niet in de originele email staan.
    4. Bewaar de handtekeningblok exact zoals die is.
    5. Geef ALLEEN de verbeterde email terug. Geen uitleg of meta-commentaar.

    INHOUD UIT DE GOOGLE SHEET (gebruik dit als basis en inspiratie):
    ${sheetRef}

    WAT TE VERBETEREN:
    - Zorg dat de sheet-teksten goed verwerkt zijn (opening, situatie, KPI-observaties, rol-alinea, CTA)
    - Maak de opening persoonlijker en scherper
    - Verbeter de flow en samenhang tussen alinea's
    - Maak de call-to-action concreter (zelfde vraag, beter geformuleerd)
    - Corrigeer eventueel onhandige formuleringen
    - ${isInformeel ? 'Houd een vriendelijke, directe toon.' : 'Houd een professionele, warme en zelfverzekerde toon.'}`;
}

async function enhanceSingleEmail(email, key, groqApiKey, systemPrompt) {
                if (!email) return email;

    const response = await fetch(GROQ_API_URL, {
                        method: 'POST',
                        headers: {
                                                'Authorization': `Bearer ${groqApiKey}`,
                                                'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                                                model: GROQ_MODEL,
                                                messages: [
                                                            { role: 'system', content: systemPrompt },
                                                            { role: 'user', content: `Verbeter deze email:\n\n${email}` },
                                                                        ],
                                                temperature: 0.4,
                                                max_tokens: 2000,
                        }),
    });

    if (!response.ok) {
                        const errBody = await response.text().catch(() => '');
                        console.warn(`GROQ API error for ${key}: ${response.status}`, errBody);
                        return email;
    }

    const data = await response.json();
                if (!data.choices?.[0]?.message?.content) {
                                    console.warn(`Invalid GROQ response for ${key}`);
                                    return email;
                }

    let enhanced = data.choices[0].message.content.trim();

    // Safety net: replace any remaining {placeholder} patterns
    const gemeenteVal = systemPrompt.match(/Gemeente: (.+)/)?.[1] || '';
                if (gemeenteVal) enhanced = enhanced.replace(/\{gemeente\}/gi, gemeenteVal);
                enhanced = enhanced.replace(/\{[a-z_]+\}/gi, '');

    return enhanced;
}

export default async function handler(req, res) {
                if (req.method !== 'POST') {
                                    return res.status(405).json({ error: 'Method not allowed' });
                }

    const { emails, context } = req.body;
                const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
                        console.warn('GROQ_API_KEY not configured on server');
                        return res.status(200).json(emails);
    }

    try {
                        // Build one system prompt shared across all 3 emails (same gemeente/contact/sheet context)
                    const systemPrompt = buildSystemPrompt(context || {});

                    // Enhance all emails in parallel
                    const entries = Object.entries(emails);
                        const enhanced = await Promise.all(
                                                entries.map(([key, email]) =>
                                                                            enhanceSingleEmail(email, key, groqApiKey, systemPrompt)
                                                                                .catch(err => {
                                                                                                                    console.error(`Error enhancing ${key}:`, err);
                                                                                                                    return email;
                                                                                            })
                                                                        )
                                            );

                    const enhancedEmails = Object.fromEntries(
                                            entries.map(([key], i) => [key, enhanced[i]])
                                        );

                    return res.status(200).json(enhancedEmails);
    } catch (error) {
                        console.error('Error in enhancement API:', error);
                        return res.status(500).json({ error: 'Enhancement failed' });
    }
}
