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

    const { algemeen = {}, scoreTeksten = {}, functieTeksten = {}, ctas = {} } = content || {};
    const isInformeel = options.toon === 'informeel';
    const isUrgent = options.toon === 'urgent';

    // --- Helpers ---
    const getGreeting = () => {
        let aanhef = '';
        if (selectedContact) {
            // Check if this contact has a "primary" role (lead) - hardcoded logic for now as sheet doesn't define this
            const isLead = selectedContact.functie && (
                selectedContact.functie.toLowerCase().includes('projectleider') ||
                selectedContact.functie.toLowerCase().includes('programmamanager') ||
                selectedContact.functie.toLowerCase().includes('coordinator') ||
                selectedContact.functie.toLowerCase().includes('coördinator')
            );

            if (isLead) {
                aanhef = isInformeel ? `Hoi ${selectedContact.naam.split(' ')[0]}` : `Beste ${selectedContact.naam}`;
            } else {
                const firstName = selectedContact.naam.split(' ')[0];
                aanhef = isInformeel ? `Hoi ${firstName}` : `Beste ${selectedContact.naam}`;
            }
            return `${aanhef},`;
        }
        return isInformeel ? "Hallo," : "Beste collega,";
    };

    const getOpening = (type) => {
        // 1. Smart Context (High Priority for email1)
        if (smartContext && type === 'email1') {
            return smartContext;
        }

        // 2. Standard openings based on Tone - could also be moved to sheet "Algemeen" if needed
        if (type === 'email1') {
            if (options.doel === 'follow-up') {
                return isInformeel
                    ? 'Naar aanleiding van ons eerdere contact neem ik graag nog een keer contact met je op.'
                    : 'Naar aanleiding van ons eerdere contact neem ik graag opnieuw contact met u op.';
            }
            if (isInformeel) {
                return "Ik zag jullie goede voortgang op de DSO-lijst en dacht: even een berichtje.";
            } else if (isUrgent) {
                return "Met de naderende deadlines voor de Omgevingswet wilde ik kort inchecken.";
            }
            return "Naar aanleiding van de recente DSO-status wilde ik graag contact opnemen.";
        }
        return "";
    };

    // --- KPI Logic ---
    const getKPIContext = () => {
        const paragraphs = [];
        const goedePunten = [];
        const aandachtspunten = [];
        const diensten = [];

        // Helper to find score text
        const findScoreText = (kpi, val) => {
            if (!scoreTeksten[kpi]) return null;
            // Try exact match first
            if (scoreTeksten[kpi][val]) return scoreTeksten[kpi][val];
            // If not found and val is number, maybe check if there's a range or fallback? 
            // For now, we rely on the sheet having specific entries. 
            // (User sheet has "1-4" which we can't easily parse without more logic, so we assume exact matches 0,1,2,3,4,5 for now)
            return null;
        };

        const processKPI = (kpi, val) => {
            const numericVal = kpi === 'regelanalist'
                ? (val === 'ja' ? 0 : val === 'nee' ? 5 : parseInt(val) || 0)
                : parseInt(val);

            if (isNaN(numericVal)) return;

            const scoreData = findScoreText(kpi, numericVal);
            if (scoreData) {
                const tekst = scoreData.tekst;
                const dienst = scoreData.dienst;
                const type = scoreData.type || 'neutraal'; // 'goed', 'fout', 'aandacht'

                if (type === 'goed') goedePunten.push(tekst);
                else if (type === 'fout' || type === 'aandacht') {
                    aandachtspunten.push(tekst);
                    if (dienst) diensten.push(dienst);
                }
            }
        };

        if (figures.kpi1) processKPI('bruidsschat', figures.kpi1);
        if (figures.kpi2) processKPI('regelanalist', figures.kpi2);
        if (figures.kpi3) processKPI('olo', figures.kpi3);
        if (figures.kpi4) processKPI('omgevingsplan', figures.kpi4);

        // Summarize "Good" points
        if (goedePunten.length > 0) {
            const prefix = isInformeel ? 'Positief is dat ' : 'Positief valt op dat ';
            if (goedePunten.length === 1) {
                paragraphs.push(`${prefix}${goedePunten[0]}.`);
            } else {
                const last = goedePunten.pop();
                paragraphs.push(`${prefix}${goedePunten.join(', ')} en ${last}. Complimenten daarvoor.`);
            }
        }

        // Add "Attention" points as separate paragraphs
        aandachtspunten.forEach(p => paragraphs.push(p));

        // Summarize "Services"
        if (diensten.length > 0) {
            let prefix = isUrgent
                ? 'Gezien de urgentie wil ik u laten weten dat '
                : (isInformeel ? 'Mocht je hier hulp bij willen: ' : 'Graag laat ik u weten dat ');

            // Deduplicate services
            const uniqueDiensten = [...new Set(diensten)];

            if (uniqueDiensten.length === 1) {
                paragraphs.push(`${prefix}${uniqueDiensten[0]}.`);
            } else {
                const last = uniqueDiensten.pop();
                paragraphs.push(`${prefix}${uniqueDiensten.join('. Daarnaast kan ')}. Tot slot kan ${last}.`);
            }
        }

        return paragraphs.join('\n\n');
    };

    // --- Role Logic ---
    const getRoleBlock = () => {
        if (!selectedContact || !selectedContact.functie) return "";

        const userRoleLower = selectedContact.functie.toLowerCase();
        // Find matching role in sheet
        // sheetContent.functieTeksten keys are keywords like 'regelanalist', 'projectleider'
        const match = Object.keys(functieTeksten).find(keyword => userRoleLower.includes(keyword.toLowerCase()));

        if (match) {
            const roleData = functieTeksten[match];
            return isInformeel ? roleData.informeel : roleData.professioneel;
        }
        return "";
    };

    // --- CTA Logic ---
    const getCTA = () => {
        const ctaData = ctas[options.doel];
        if (ctaData) {
            const text = isInformeel ? ctaData.informeel : ctaData.professioneel;
            // Clean up any "null" or empty strings
            return text || (isInformeel ? "Zullen we bellen?" : "Graag kom ik met u in contact.");
        }
        // Fallback
        return isInformeel ? "Zullen we binnenkort even bellen?" : "Graag kom ik met u in contact voor een kennismaking.";
    };

    // --- Signature Logic ---
    const getSignature = () => {
        const groet = isInformeel ? 'Groet' : 'Met vriendelijke groet';
        const bedrijfNaam = algemeen.bedrijf_naam || 'AbelTalent';
        const bedrijfAdres = algemeen.bedrijf_adres || 'Kosterijland 70, 3981 AJ Bunnik';
        const bedrijfTelefoon = algemeen.bedrijf_telefoon || '+31 30 225 5660';
        const bedrijfWebsite = algemeen.bedrijf_website || 'www.abeltalent.nl';
        const partnerNaam = algemeen.partner_naam || 'Tafelberg Advies';
        const partnerWebsite = algemeen.partner_website || 'www.tafelbergadvies.nl';

        return `${groet},\n${options.afzender || 'Team'}\n${bedrijfNaam}\n${bedrijfAdres}\n${bedrijfTelefoon}\n${bedrijfWebsite}\n\nIn samenwerking met ${partnerNaam}\n${partnerWebsite}`;
    };

    // --- Email 1 Construction ---
    const generateEmail1 = () => {
        const greeting = getGreeting();
        const openingParagraph = getOpening('email1');

        // Combine baseStory with Opening context
        let contextParagraph = "";
        if (openingParagraph) {
            contextParagraph = `${openingParagraph}\n\n${baseStory || ''}`;
        } else {
            contextParagraph = baseStory || "Wij helpen gemeenten met de laatste stappen.";
        }

        const kpiBlock = getKPIContext(); // Now string (paragraphs separated by \n\n)
        const roleBlock = getRoleBlock();
        const cta = getCTA();
        const signature = getSignature();

        // Extra sheet alinea (if defined)
        const extraInfo = algemeen.extra_alinea || '';

        // Filter empty parts and join
        return [greeting, contextParagraph, roleBlock, kpiBlock, extraInfo, cta, signature]
            .filter(p => p && p.trim() !== "")
            .join('\n\n');
    };

    // --- Email 2 (Nudge) ---
    const generateEmail2 = () => {
        const greeting = getGreeting();
        const body = isInformeel
            ? `Ik wilde even checken of mijn vorige mail goed is aangekomen.\n\nIk begrijp dat het druk is, maar gezien de scores denk ik dat we op korte termijn veel winst kunnen behalen voor ${selectedData.bestuursorgaan}.\n\nHeb je deze week 5 minuten voor een korte afstemming?`
            : `Graag verneem ik of mijn vorige bericht goed is ontvangen.\n\nGezien de huidige status van de DSO-implementatie zie ik concrete mogelijkheden voor ${selectedData.bestuursorgaan}.\n\nHeeft u deze week gelegenheid voor een korte telefonische afstemming?`;

        return `${greeting}\n\n${body}\n\n${options.afzender || 'Team'}`;
    };

    // --- Email 3 (Value) ---
    const generateEmail3 = () => {
        const greeting = getGreeting();
        const body = isInformeel
            ? `Ik wil je niet onnodig blijven mailen, dus dit is mijn laatste berichtje voor nu.\n\nMocht je later toch nog hulp kunnen gebruiken, weet je ons te vinden.\n\nHier is nog een interessant artikel over hoe andere gemeenten dit aanpakken: [Link naar Knowledge Base].\n\nSucces met de laatste loodjes!`
            : `Wellicht is dit niet het juiste moment. Ik zal u voor nu niet verder benaderen.\n\nMocht u in de toekomst ondersteuning wensen, dan vernemen wij dat graag.\n\nTer inspiratie deel ik nog een artikel over aanpakken bij andere gemeenten: [Link naar Knowledge Base].\n\nVeel succes met het vervolg.`;

        return `${greeting}\n\n${body}\n\n${options.afzender || 'Team'}`;
    };

    return {
        email1: generateEmail1(),
        email2: generateEmail2(),
        email3: generateEmail3()
    };
};