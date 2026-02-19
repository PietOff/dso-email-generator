/**
 * DSO Email Generator — Generates complete, personalized emails
 * 
 * PHILOSOPHY: All core content is HARDCODED in this file.
 * Google Sheets is ONLY used for:
 * - Adding extra info per gemeente (notes, status)
 * - Overriding company contact details if they change
 * - The Sheet does NOT replace the email content logic.
 * 
 * COMPANIES:
 * - AbelTalent: Capacity solutions & talent for fysieke leefomgeving.
 *   - ServiceTeam Regelanalisten: dedicated pool of regelanalisten
 *   - SIS8020 toolset: 6x snellere verwerking toepasbare regels
 *   - Quick Scan Toepasbare Regels: kosteloze analyse
 * - Tafelberg Advies (partner): Expert in regelanalyse, omgevingsplan, toepasbare regels.
 */

/**
 * Generate a personalized email
 * @param {string} baseStory
 * @param {object} figures - { kpi1, kpi2 (ja/nee), kpi3, kpi4 }
 * @param {object} options - { toon, doel, afzender }
 * @param {object} selectedData - gemeente data
 * @param {object|null} selectedContact - optional contact person
 * @param {object|null} sheetContent - content from Google Sheet
 */
export const generateEmail = (baseStory, figures, options, selectedData, selectedContact, content, smartContext = '') => {
    if (!selectedData) return { email1: '', email2: '', email3: '' };

    // --- Helpers ---
    const getGreeting = () => {
        if (selectedContact) {
            return `Beste ${selectedContact.naam.split(' ')[0]},`; // First name only
        }
        return "Beste collega,";
    };

    const getOpening = (type) => {
        // 1. Smart Context (High Priority)
        if (smartContext && type === 'email1') {
            return smartContext;
        }

        // 2. Standard openings based on Tone
        if (options.toon === 'informeel') {
            return "Ik zag jullie goede voortgang op de DSO-lijst en dacht: even een berichtje.";
        } else if (options.toon === 'urgent') {
            return "Met de naderende deadlines voor de Omgevingswet wilde ik kort inchecken.";
        }
        return "Naar aanleiding van de recente DSO-status wilde ik graag contact opnemen.";
    };

    const getKPIBlock = () => {
        const scores = [];
        if (figures.kpi1) scores.push(`- Bruidsschat: ${figures.kpi1}/5`);
        if (figures.kpi2) scores.push(`- Regelanalist: ${figures.kpi2 === 'ja' || figures.kpi2 === '0' ? 'Aanwezig' : 'Nog niet aanwezig'}`);
        if (figures.kpi3) scores.push(`- OLO: ${figures.kpi3}/5`);
        if (figures.kpi4) scores.push(`- Omgevingsplan: ${figures.kpi4}/5`);

        // Alleen tonen als er data is
        if (scores.length === 0) return "";

        return `Ik heb even naar de cijfers voor ${selectedData.bestuursorgaan} gekeken:\n${scores.join('\n')}`;
    };

    // --- Email 1: The "Hook" (Value + Context) ---
    const generateEmail1 = () => {
        const greeting = getGreeting();
        const opening = getOpening('email1');
        const kpiBlock = getKPIBlock();

        // Use baseStory but allow it to be optional if user cleared it
        const story = baseStory ? baseStory : "Wij helpen gemeenten met de laatste stappen.";

        let cta = "Zullen we binnenkort even bellen?";
        if (options.doel === 'quickscan') cta = "Zullen we een kosteloze Quickscan inplannen?";
        if (options.doel === 'workshop') cta = "Ik nodig je graag uit voor onze eerstvolgende workshop.";

        return `${greeting}\n\n${opening}\n\n${kpiBlock}\n\n${story}\n\n${cta}\n\nMet vriendelijke groet,\n\n${options.afzender || 'Team'}`;
    };

    // --- Email 2: The "Nudge" (T+3 days) ---
    const generateEmail2 = () => {
        const greeting = getGreeting();
        return `${greeting}\n\nIk wilde even checken of mijn vorige mail goed is aangekomen.\n\nIk begrijp dat het druk is, maar gezien de scores denk ik dat we op korte termijn veel winst kunnen behalen voor ${selectedData.bestuursorgaan}.\n\nHeb je deze week 5 minuten voor een korte afstemming?\n\nGroet,\n${options.afzender || 'Team'}`;
    };

    // --- Email 3: The "Break-up / Value" (T+7 days) ---
    const generateEmail3 = () => {
        const greeting = getGreeting();
        return `${greeting}\n\nIk wil je niet onnodig blijven mailen, dus dit is mijn laatste berichtje voor nu.\n\nMocht je later toch nog hulp kunnen gebruiken bij het Omgevingsplan of de regelanalist, weet je ons te vinden.\n\nHier is nog een interessant artikel over hoe andere gemeenten dit aanpakken: [Link naar Knowledge Base].\n\nSucces met de laatste loodjes!\n\nGroet,\n${options.afzender || 'Team'}`;
    };

    return {
        email1: generateEmail1(),
        email2: generateEmail2(),
        email3: generateEmail3()
    };
};