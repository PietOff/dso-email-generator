/**
 * Server-side API endpoint for GROQ email enhancement
 * Uses ALL Google Sheets tabs as grounding for the LLM:
 *   - Algemeen (bedrijfsinfo, whitepaper, beschrijvingen)
 *   - Email Teksten (per key: professioneel/informeel)
 *   - Score Teksten (KPI interpretaties per score waarde)
 *   - Functie Teksten (rol-specifieke alinea's)
 *   - CTAs (call-to-action per doel)
 *   - Monitor Data (KPI1-6, regelingType, behandeldienst, aantalRegels, trSoftware)
 *   - Gemeente Notities (status, fase, notes, emailLog)
 *   - Handmatige Aanvullingen (overrides per gemeente)
 *   - Contactpersonen (naam, functie, email, telefoon, notities)
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Build a richly grounded system prompt using ALL available sheet data.
 * Every tab feeds Groq so the output is maximally specific to this
 * gemeente, this contact, and this moment in the Omgevingswet journey.
 */
function buildSystemPrompt(context) {
    const {
          tone,
          gemeente,
          recipientName,
          contactFunctie,
          contactEmail,
          contactTelefoon,
          contactNotities,
          figures,
          monitorEnriched,
          gemeenteNotities,
          handmatigeAanvullingen,
          sheetContent,
          doel,
          emailDoel,
    } = context;

  const isInformeel = tone === 'informal';
    const pronounRule = isInformeel
      ? 'Gebruik informeel Nederlands: "je", "jij", "jouw", "jullie". NOOIT "u" of "uw".'
          : 'Gebruik formeel Nederlands: "u", "uw". NOOIT "je", "jij", "jouw".';

  const sc = sheetContent || {};
    const emailTeksten  = sc.emailTeksten  || {};
    const scoreTeksten  = sc.scoreTeksten  || {};
    const functieTeksten = sc.functieTeksten || {};
    const ctas          = sc.ctas          || {};
    const baseStory     = sc.baseStory     || '';
    const algemeen      = sc.algemeen      || {};
    const toonKey       = isInformeel ? 'informeel' : 'professioneel';

  // ── KPI labels (all 6) ──────────────────────────────────────────────────────
  const kpiLabels = {
        bruidsschat:   'KPI1 Bruidsschat/Dierlijke Mest',
        regelanalist:  'KPI2 Regelanalist',
        olo:           'KPI3 OLO Activiteiten',
        omgevingsplan: 'KPI4 Omgevingsplan',
        ontwerp:       'KPI5 Ontwerp-besluiten',
        bopa:          'KPI6 BOPA-besluiten',
  };

  // ── Map figures → kpi keys ──────────────────────────────────────────────────
  const figureMap = {
        bruidsschat:   figures?.kpi1,
        regelanalist:  figures?.kpi2,
        olo:           figures?.kpi3,
        omgevingsplan: figures?.kpi4,
  };

  let sheetRef = '';

  // ── 1. Bedrijfsinformatie (Algemeen tab) ────────────────────────────────────
  sheetRef += `\n## Bedrijfsinformatie (Algemeen tab)\n`;
    sheetRef += `Bedrijf: ${algemeen.bedrijf_naam || 'AbelTalent'}\n`;
    sheetRef += `Adres: ${algemeen.bedrijf_adres || 'Kosterijland 70, 3981 AJ Bunnik'}\n`;
    sheetRef += `Telefoon: ${algemeen.bedrijf_telefoon || '+31 30 225 5660'}\n`;
    sheetRef += `Website: ${algemeen.bedrijf_website || 'www.AbelTalent.nl'}\n`;
    sheetRef += `Partner: ${algemeen.partner_naam || 'Tafelberg Advies'} (${algemeen.partner_website || 'www.tafelbergadvies.nl'})\n`;
    if (algemeen.bedrijf_omschrijving) sheetRef += `Over AbelTalent: ${algemeen.bedrijf_omschrijving}\n`;
    if (algemeen.partner_omschrijving) sheetRef += `Over partner: ${algemeen.partner_omschrijving}\n`;
    if (algemeen.serviceteam_beschrijving) sheetRef += `ServiceTeam: ${algemeen.serviceteam_beschrijving}\n`;
    if (algemeen.sis8020_beschrijving) sheetRef += `SIS8020: ${algemeen.sis8020_beschrijving}\n`;
    if (algemeen.basis_op_orde) sheetRef += `Basis op Orde: ${algemeen.basis_op_orde}\n`;
    if (algemeen.data_op_orde) sheetRef += `Data op Orde: ${algemeen.data_op_orde}\n`;
    if (algemeen.whitepaper_url) sheetRef += `Whitepaper URL: ${algemeen.whitepaper_url}\n`;

  // ── 2. Standaard verhaal ────────────────────────────────────────────────────
  if (baseStory) {
        sheetRef += `\n## Standaard verhaal (basis voor elke email)\n${baseStory}\n`;
  }

  // ── 3. Monitor Data (KPI1-6, regelingType, behandeldienst, etc.) ────────────
  const mon = monitorEnriched || {};
    sheetRef += `\n## Monitor Data voor ${gemeente} (Power BI sync)\n`;
    sheetRef += `KPI1 Bruidsschat/Dierlijke Mest: ${figures?.kpi1 ?? mon.kpi1 ?? 'onbekend'}\n`;
    sheetRef += `KPI2 Regelanalist: ${figures?.kpi2 ?? mon.kpi2 ?? 'onbekend'}\n`;
    sheetRef += `KPI3 OLO Activiteiten: ${figures?.kpi3 ?? mon.kpi3 ?? 'onbekend'}\n`;
    sheetRef += `KPI4 Omgevingsplan: ${figures?.kpi4 ?? mon.kpi4 ?? 'onbekend'}\n`;
    sheetRef += `KPI5 Ontwerp-besluiten: ${mon.kpi5 ?? 'onbekend'}\n`;
    sheetRef += `KPI6 BOPA-besluiten: ${mon.kpi6 ?? 'onbekend'}\n`;
    if (mon.regelingType) sheetRef += `Regeling Type: ${mon.regelingType}\n`;
    if (mon.behandeldienst) sheetRef += `Behandeldienst: ${mon.behandeldienst}\n`;
    if (mon.aantalRegels) sheetRef += `Aantal toepasbare regels: ${mon.aantalRegels}\n`;
    if (mon.trSoftware) sheetRef += `TR Software: ${mon.trSoftware}\n`;
    if (mon.lastUpdate) sheetRef += `Laatste update: ${mon.lastUpdate}\n`;

  // Score thresholds explanation
  sheetRef += `\nScore schaal uitleg:\n`;
    sheetRef += `- KPI1 (Mest): 0=correct doorgevoerd (goed), 1=grotendeels doorgevoerd (goed), >1=nog stappen te zetten (fout)\n`;
    sheetRef += `- KPI2 (Regelanalist): 0=regelanalist actief (goed), 4-1=geen regelanalist (fout/risico)\n`;
    sheetRef += `- KPI3 (OLO): 0=alle VNG-activiteiten beschikbaar (goed), 1=bijna alle (goed), 2=ontbreken enkele (fout), 4=ontbreken meerdere (fout)\n`;
    sheetRef += `- KPI4 (Omgevingsplan): 0=gepubliceerd na bruidsschat (goed), 1=goed op weg (goed), 2=in ontwikkeling (fout), 4=vroeg stadium (fout)\n`;
    sheetRef += `- KPI5 (Ontwerp): aantal ontwerp-besluiten in voorbereiding (meer = actiever)\n`;
    sheetRef += `- KPI6 (BOPA): aantal BOPA-besluiten (buitenplanse omgevingsplan activiteiten)\n`;

  // ── 4. Score Teksten (KPI interpretaties uit sheet) ─────────────────────────
  if (Object.keys(scoreTeksten).length > 0) {
        sheetRef += `\n## Score Teksten (KPI interpretaties uit Score Teksten tab)\n`;
        sheetRef += `(Gebruik deze teksten letterlijk als basis voor de KPI-alinea's)\n`;
        for (const [kpi, scores] of Object.entries(scoreTeksten)) {
                const figVal = figureMap[kpi];
                if (figVal === undefined || figVal === null || figVal === '') continue;
                const scoreEntry = scores[String(figVal)] || scores[figVal];
                if (scoreEntry?.tekst) {
                          const label = kpiLabels[kpi] || kpi;
                          sheetRef += `\n[${label} = ${figVal}] type: ${scoreEntry.type}\n`;
                          sheetRef += `Tekst: ${scoreEntry.tekst}\n`;
                          if (scoreEntry.dienst) sheetRef += `Dienstaanbod: ${scoreEntry.dienst}\n`;
                }
        }
  }

  // ── 5. Email Teksten (alle keys uit Email Teksten tab) ──────────────────────
  if (Object.keys(emailTeksten).length > 0) {
        sheetRef += `\n## Email Teksten (uit Email Teksten tab - gebruik als bouwstenen)\n`;
        for (const [key, entry] of Object.entries(emailTeksten)) {
                const tekst = entry[toonKey] || entry.professioneel || '';
                if (tekst) sheetRef += `\n[${key}]:\n${tekst}\n`;
        }
  }

  // ── 6. Functie Teksten (rol-specifieke alinea) ──────────────────────────────
  if (contactFunctie && Object.keys(functieTeksten).length > 0) {
        const roleLower = contactFunctie.toLowerCase();
        const matchKey = Object.keys(functieTeksten).find(k => roleLower.includes(k.toLowerCase()));
        if (matchKey) {
                const roleTekst = functieTeksten[matchKey]?.[toonKey] || functieTeksten[matchKey]?.professioneel || '';
                if (roleTekst) {
                          sheetRef += `\n## Rol-specifieke tekst voor functie "${contactFunctie}" (keyword: ${matchKey})\n`;
                          sheetRef += `(Verwerk deze alinea als die past bij de ontvanger)\n${roleTekst}\n`;
                }
        }
  }

  // ── 7. CTAs (uit CTAs tab) ──────────────────────────────────────────────────
  if (Object.keys(ctas).length > 0) {
        sheetRef += `\n## Beschikbare CTA teksten (uit CTAs tab)\n`;
        for (const [ctaDoel, ctaEntry] of Object.entries(ctas)) {
                const tekst = ctaEntry[toonKey] || ctaEntry.professioneel || '';
                if (tekst) sheetRef += `[${ctaDoel}]: ${tekst}\n`;
        }
  }

  // ── 8. Gemeente Notities (status, fase, notes) ──────────────────────────────
  const gn = gemeenteNotities || {};
    if (gn.status || gn.fase || (gn.notes && gn.notes.length > 0) || (gn.emailLog && gn.emailLog.length > 0)) {
          sheetRef += `\n## Gemeente Notities voor ${gemeente} (uit Gemeente Notities tab)\n`;
          if (gn.status) sheetRef += `CRM Status: ${gn.status}\n`;
          if (gn.fase) sheetRef += `Sales Fase: ${gn.fase}\n`;
          if (gn.notes && gn.notes.length > 0) {
                  sheetRef += `Notities:\n`;
                  gn.notes.slice(0, 5).forEach(n => {
                            sheetRef += `  - [${n.datum || ''}] ${n.type || ''}: ${n.notitie || ''}\n`;
                  });
          }
          if (gn.emailLog && gn.emailLog.length > 0) {
                  sheetRef += `Email Log (eerder contact):\n`;
                  gn.emailLog.slice(0, 3).forEach(log => {
                            sheetRef += `  - ${log}\n`;
                  });
          }
    }

  // ── 9. Handmatige Aanvullingen (overrides) ──────────────────────────────────
  const ha = handmatigeAanvullingen || {};
    const hasOverrides = ha.kpi1Override || ha.kpi2Override || ha.kpi3Override ||
                             ha.kpi4Override || ha.stadiumOverride || ha.behandeldienstOverride ||
                             ha.softwareOverride || ha.uitleg;
    if (hasOverrides) {
          sheetRef += `\n## Handmatige Aanvullingen voor ${gemeente} (handmatige overrides)\n`;
          if (ha.kpi1Override) sheetRef += `KPI1 override: ${ha.kpi1Override}\n`;
          if (ha.kpi2Override) sheetRef += `KPI2 override: ${ha.kpi2Override}\n`;
          if (ha.kpi3Override) sheetRef += `KPI3 override: ${ha.kpi3Override}\n`;
          if (ha.kpi4Override) sheetRef += `KPI4 override: ${ha.kpi4Override}\n`;
          if (ha.stadiumOverride) sheetRef += `Stadium override: ${ha.stadiumOverride}\n`;
          if (ha.behandeldienstOverride) sheetRef += `Behandeldienst override: ${ha.behandeldienstOverride}\n`;
          if (ha.softwareOverride) sheetRef += `Software override: ${ha.softwareOverride}\n`;
          if (ha.uitleg) sheetRef += `Toelichting: ${ha.uitleg}\n`;
    }

  // ── Build recipient line ────────────────────────────────────────────────────
  let recipientLine = recipientName
      ? `${recipientName}${contactFunctie ? ` (${contactFunctie})` : ''}`
        : 'Algemeen contact (geen specifieke persoon geselecteerd)';
    if (contactEmail) recipientLine += ` — email: ${contactEmail}`;
    if (contactTelefoon) recipientLine += ` — tel: ${contactTelefoon}`;
    if (contactNotities) recipientLine += `\n  Notities over contact: ${contactNotities}`;

  const doelLabel = emailDoel || doel || 'eerste-contact';

  // ── Final system prompt ─────────────────────────────────────────────────────
  return `Je bent een expert Nederlandse e-mailschrijver voor AbelTalent, een organisatie die gemeenten ondersteunt bij de Omgevingswet implementatie.

  CONTEXT VAN DEZE EMAIL:
  - Gemeente: ${gemeente}
  - Ontvanger: ${recipientLine}
  - Toon: ${isInformeel ? 'Informeel & direct (vriendelijk, toegankelijk)' : 'Professioneel & adviserend (warm maar zakelijk)'}
  - Email doel: ${doelLabel}

  STRIKTE TAAL REGELS:
  1. ${pronounRule}
  2. Gebruik NOOIT placeholder-syntax zoals {gemeente}, {type}, {software}, {behandeldienst}. Gebruik altijd de echte waarde of laat het weg.
  3. Verzin GEEN contactgegevens, links of data die niet in de originele email staan.
  4. Bewaar het handtekeningblok EXACT zoals het is.
  5. Geef ALLEEN de verbeterde email terug — geen uitleg, geen meta-commentaar, geen "Hier is de verbeterde versie:".

  INHOUD UIT DE GOOGLE SHEETS (gebruik dit als volledige kennisbasis):
  ${sheetRef}

  VERBETERINSTRUCTIES:
  - Verwerk de specifieke KPI-scores voor ${gemeente} concreet en persoonlijk (gebruik de Score Teksten uit de sheet)
  - Sluit aan op de CRM status/fase als die beschikbaar is (${gn?.status || 'onbekend'} / ${gn?.fase || 'onbekend'})
  - Gebruik de rol-specifieke alinea als die past bij ${contactFunctie || 'de ontvanger'}
  - Maak de opening persoonlijker met de gemeente-specifieke data (regelingType, behandeldienst, KPI scores)
  - Verbeter de flow en samenhang tussen alinea's
  - Maak de CTA concreter maar houd dezelfde vraag
  - ${isInformeel ? 'Houd een vriendelijke, directe en energieke toon.' : 'Houd een professionele, warme en zelfverzekerde toon.'}
  - Als KPI5 (ontwerpen=${mon.kpi5 ?? '?'}) of KPI6 (BOPA=${mon.kpi6 ?? '?'}) relevant zijn, verwerk ze subtiel
  - Als er eerdere contactgeschiedenis is (emailLog), zorg dan dat de email daarnaar verwijst`;
}

async function enhanceSingleEmail(email, key, groqApiKey, systemPrompt, gemeente) {
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
                  { role: 'user', content: `Verbeter deze email (type: ${key}):\n\n${email}` },
                        ],
                temperature: 0.35,
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

  // Safety net: replace any leftover {placeholder} patterns
  if (gemeente) enhanced = enhanced.replace(/\{gemeente\}/gi, gemeente);
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
        const systemPrompt = buildSystemPrompt(context || {});
        const gemeente = context?.gemeente || '';

      // Enhance all emails in parallel with the same rich system prompt
      const entries = Object.entries(emails);
        const enhanced = await Promise.all(
                entries.map(([key, email]) =>
                          enhanceSingleEmail(email, key, groqApiKey, systemPrompt, gemeente)
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
