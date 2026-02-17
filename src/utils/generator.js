/**
 * Generates a prompt for ChatGPT based on the user's input.
 */
export function generatePrompt(baseStory, figures, options, selectedData) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const context = Object.entries(options)
        .filter(([_, val]) => val)
        .map(([key]) => key === 'omgevingsplan' ? 'Omgevingsplan is aanwezig' : 'Escalatie niveau')
        .join(", ");

    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const totaalScore = selectedData ? selectedData.totaleScore : 'N/B';

    const contactList = selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0
        ? selectedData.contactpersonen.join(', ')
        : 'Geen contactpersonen bekend';

    return `Je bent een ervaren communicatieadviseur bij de overheid.
Hier is een standaard verhaal over de DSO-lijst:
"${baseStory}"

De mail is gericht aan: ${gemeenteNaam}
Totale score: ${totaalScore}/20

Hier zijn de specifieke scores voor ${gemeenteNaam}:
- Dierlijke Mest Score: ${kpi1 || 'N/B'}/5
- Regelanalist Score: ${kpi2 || 'N/B'}/5
- Score OLO Activiteiten: ${kpi3 || 'N/B'}/5
- Omgevingsplan Score: ${kpi4 || 'N/B'}/5

Extra context: ${context || 'Geen'}.
Contactpersonen: ${contactList}

Opdracht:
Herschrijf het standaard verhaal tot een gepersonaliseerde email gericht aan ${gemeenteNaam}.
Gebruik de scores om het verhaal feitelijk te onderbouwen.
- Als scores laag zijn (0 of lager dan 3), wees dan adviserend en bied hulp aan.
- Als scores hoog zijn (5), wees dan complimenteus en moedig aan.
- Benoem specifiek welke onderdelen goed scoren en welke aandacht nodig hebben.
- Zorg voor een professionele maar toegankelijke toon.
- Eindig met een concrete call-to-action.`;
}

/**
 * Generates a simple template-based email (Plan B).
 */
export function generateTemplate(baseStory, figures, options, selectedData) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const totaalScore = selectedData ? parseInt(selectedData.totaleScore) : 0;

    // Build score paragraphs
    const scoreParts = [];

    if (kpi1 === '5' || kpi1 === 5) {
        scoreParts.push("De Dierlijke Mest Score is volledig op orde (5/5). Goed gedaan!");
    } else if (kpi1 !== '' && kpi1 !== null) {
        scoreParts.push("De Dierlijke Mest Score staat op " + kpi1 + "/5. Hier is nog ruimte voor verbetering.");
    }

    if (kpi2 === '5' || kpi2 === 5) {
        scoreParts.push("De Regelanalist Score is maximaal (5/5). Uitstekend werk!");
    } else if (kpi2 !== '' && kpi2 !== null) {
        scoreParts.push("De Regelanalist Score staat op " + kpi2 + "/5. We raden aan hier extra aandacht aan te besteden.");
    }

    if (kpi3 === '5' || kpi3 === 5) {
        scoreParts.push("De OLO Activiteiten Score is volledig (5/5).");
    } else if (kpi3 !== '' && kpi3 !== null) {
        scoreParts.push("De Score OLO Activiteiten staat op " + kpi3 + "/5. Dit verdient aandacht.");
    }

    if (kpi4 === '5' || kpi4 === 5) {
        scoreParts.push("Het Omgevingsplan Score is maximaal (5/5).");
    } else if (kpi4 !== '' && kpi4 !== null) {
        scoreParts.push("De Omgevingsplan Score staat op " + kpi4 + "/5. Hier liggen nog kansen.");
    }

    // Overall sentiment
    let sentiment = "";
    if (totaalScore >= 18) {
        sentiment = "Over het geheel genomen scoort uw organisatie uitstekend. Complimenten!";
    } else if (totaalScore >= 13) {
        sentiment = "De totaalscore is redelijk, maar er zijn enkele aandachtspunten.";
    } else {
        sentiment = "De totaalscore vraagt om aandacht. Wij helpen u graag om de scores te verbeteren.";
    }

    return `Beste contactpersoon van ${gemeenteNaam},

${baseStory}

Specifiek voor ${gemeenteNaam} zien we de volgende scores (totaal: ${totaalScore || 'N/B'}/20):

${scoreParts.join('\n')}

${sentiment}

${options.escalatie ? '⚠️ Let op: dit betreft een escalatiesituatie. Wij verzoeken u spoedig contact met ons op te nemen.\n' : ''}Mocht u vragen hebben over deze scores, dan horen wij het graag.

Met vriendelijke groet,
[Naam]`;
}
