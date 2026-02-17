
/**
 * Generates a prompt for ChatGPT based on the user's input.
 * @param {string} baseStory - The standard story text.
 * @param {object} figures - Key-value pairs of the figures (e.g. { kpi1: 10, kpi2: 50 }).
 * @param {object} options - Context flags (e.g. { omgevingsplan: true }).
 * @returns {string} The formatted prompt.
 */
export function generatePrompt(baseStory, figures, options) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const context = Object.entries(options)
        .filter(([_, val]) => val)
        .map(([key]) => key)
        .join(", ");

    return `
Je bent een ervaren communicatieadviseur bij de overheid.
Hier is een standaard verhaal over de DSO-lijst:
"${baseStory}"

Hier zijn de specifieke cijfers voor deze gemeente/regio:
- Aantal openstaande taken: ${kpi1 || 'N/B'}
- OLO-score: ${kpi2 || 'N/B'}%
- Dagen open: ${kpi3 || 'N/B'}
- Aantal gebruikers: ${kpi4 || 'N/B'}

Extra context: ${context || 'Geen'}.

Opdracht:
Herschrijf het standaard verhaal tot een gepersonaliseerde email.
Gebruik de cijfers om het verhaal feitelijk te onderbouwen.
- Als de OLO-score laag is, wees dan adviserend en hulpvaardig.
- Als de score hoog is, wees dan complimenteus.
- Zorg voor een professionele maar toegankelijke toon.
`.trim();
}

/**
 * Generates a simple template-based email (Plan B).
 * @param {string} baseStory 
 * @param {object} figures 
 * @param {object} options 
 * @returns {string} The generated email text.
 */
export function generateTemplate(baseStory, figures, options) {
    const { kpi2 } = figures; // OLO-score
    let sentimentParams = "";

    if (kpi2 && kpi2 < 60) {
        sentimentParams = "Het valt op dat de OLO-score aan de lage kant is. Wij helpen graag om dit te verbeteren.";
    } else if (kpi2 && kpi2 >= 80) {
        sentimentParams = "Wat goed om te zien dat de OLO-score zo hoog is! Ga zo door.";
    } else {
        sentimentParams = "De scores zijn stabiel, maar er is ruimte voor verbetering.";
    }

    return `
Beste relatie,

${baseStory}

Specifiek voor uw organisatie zien we de volgende cijfers:
- OLO-score: ${kpi2}%

${sentimentParams}

Met vriendelijke groet,
[Naam]
  `.trim();
}
