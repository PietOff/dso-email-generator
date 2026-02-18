/**
 * DSO Email Generator — Generates complete, personalized emails
 * 
 * Uses content from Google Sheets when available (via contentService),
 * falls back to hardcoded defaults otherwise.
 * 
 * COMPANIES:
 * - AbelTalent: Capacity solutions & talent development for physical living environment.
 * - Tafelberg Advies (partner): Expert in regelanalyse, toepasbare regels.
 */

/**
 * Generate a personalized email
 * @param {string} baseStory
 * @param {object} figures - { kpi1, kpi2, kpi3, kpi4 }
 * @param {object} options - { toon, doel, afzender }
 * @param {object} selectedData - gemeente data
 * @param {object|null} selectedContact - optional contact person
 * @param {object|null} sheetContent - content from Google Sheets (null = use hardcoded)
 */
export function generateEmail(baseStory, figures, options, selectedData, selectedContact, sheetContent) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const afzender = options.afzender || '[Naam]';
    const isInformeel = options.toon === 'informeel';
    const isUrgent = options.toon === 'urgent';
    const toonKey = isInformeel ? 'informeel' : 'professioneel';

    // --- Greeting ---
    let aanhef;
    if (selectedContact) {
        const voornaam = selectedContact.naam.split(' ')[0];
        aanhef = isInformeel ? 'Hoi ' + voornaam : 'Beste ' + selectedContact.naam;
    } else {
        if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
            const lead = selectedData.contactpersonen.find(c =>
                c.functie && (c.functie.toLowerCase().includes('projectleider') ||
                    c.functie.toLowerCase().includes('programmamanager') ||
                    c.functie.toLowerCase().includes('coordinator'))
            );
            if (lead) {
                aanhef = isInformeel ? 'Hoi ' + lead.naam.split(' ')[0] : 'Beste ' + lead.naam;
            } else {
                const first = selectedData.contactpersonen[0];
                aanhef = isInformeel ? 'Hoi ' + first.naam.split(' ')[0] : 'Beste ' + first.naam;
            }
        } else {
            aanhef = isInformeel ? 'Hallo' : 'Geachte heer/mevrouw';
        }
    }

    const paragraphs = [];

    // --- Opening ---
    if (options.doel === 'follow-up') {
        paragraphs.push('Naar aanleiding van ons eerdere contact neem ik graag opnieuw contact met u op. ' + baseStory);
    } else {
        paragraphs.push(baseStory + (isInformeel
            ? '\n\nIk neem contact met je op omdat we specifiek naar de situatie van ' + gemeenteNaam + ' hebben gekeken.'
            : '\n\nGraag deel ik onze bevindingen specifiek voor ' + gemeenteNaam + ' met u.'));
    }

    // --- Function-specific personal touch (from Sheet or hardcoded) ---
    if (selectedContact && selectedContact.functie) {
        const functie = selectedContact.functie.toLowerCase();
        let functieParagraaf = null;

        if (sheetContent && sheetContent.functieTeksten) {
            // Try to match from Google Sheets content
            for (const [keyword, texts] of Object.entries(sheetContent.functieTeksten)) {
                const keywords = [keyword];
                // Also check the opmerkingen for aliases (e.g. "Ook voor programmamanager")
                if (texts.opmerkingen) {
                    const aliases = texts.opmerkingen.replace(/ook\s*(voor)?\s*/gi, '').split(/[,;]/);
                    aliases.forEach(a => { if (a.trim()) keywords.push(a.trim().toLowerCase()); });
                }
                if (keywords.some(kw => functie.includes(kw.toLowerCase()))) {
                    functieParagraaf = texts[toonKey] || texts.professioneel;
                    break;
                }
            }
        }

        // Fallback to hardcoded if no Sheet match
        if (!functieParagraaf) {
            functieParagraaf = getHardcodedFunctieTekst(functie, selectedContact.functie, isInformeel);
        }

        if (functieParagraaf) paragraphs.push(functieParagraaf);
    }

    // --- Score-based content ---
    const goedePunten = [];
    const aandachtspunten = [];
    const diensten = [];

    // Convert regelanalist ja/nee to numeric score
    const kpi2Numeric = kpi2 === 'ja' ? '0' : kpi2 === 'nee' ? '5' : kpi2;

    const kpiMapping = [
        { key: 'bruidsschat', value: kpi1 },
        { key: 'regelanalist', value: kpi2Numeric },
        { key: 'olo', value: kpi3 },
        { key: 'omgevingsplan', value: kpi4 },
    ];

    kpiMapping.forEach(({ key, value }) => {
        if (value === '' || value === null || value === undefined) return;
        const numValue = parseInt(value);
        const scoreStr = String(value);

        if (sheetContent && sheetContent.scoreTeksten && sheetContent.scoreTeksten[key]) {
            const kpiData = sheetContent.scoreTeksten[key];
            // Try exact match first, then range match
            let match = kpiData[scoreStr];
            if (!match) {
                // Try range matches like "1-4"
                for (const [range, data] of Object.entries(kpiData)) {
                    if (range.includes('-')) {
                        const [min, max] = range.split('-').map(Number);
                        if (numValue >= min && numValue <= max) {
                            match = data;
                            break;
                        }
                    }
                }
            }

            if (match) {
                if (match.type === 'goed') {
                    goedePunten.push(match.tekst);
                } else {
                    if (match.tekst) aandachtspunten.push(match.tekst);
                    if (match.dienst) diensten.push(match.dienst);
                }
                return;
            }
        }

        // Fallback to hardcoded
        addHardcodedScoreContent(key, numValue, scoreStr, goedePunten, aandachtspunten, diensten);
    });

    // --- Good news ---
    if (goedePunten.length > 0) {
        if (goedePunten.length === 1) {
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedePunten[0] + '.');
        } else {
            const goedeCopy = [...goedePunten];
            const laatste = goedeCopy.pop();
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedeCopy.join(', ') + ' en ' + laatste + '. Complimenten daarvoor.');
        }
    }

    aandachtspunten.forEach(punt => paragraphs.push(punt));

    // --- Services ---
    if (diensten.length > 0) {
        let dienstenParagraaf = isUrgent
            ? 'Gezien de tijdsdruk willen wij u erop wijzen dat '
            : isInformeel
                ? 'Mocht je hier hulp bij kunnen gebruiken: '
                : 'Wij kunnen u hierbij concreet ondersteunen. ';

        if (diensten.length === 1) {
            dienstenParagraaf += diensten[0] + '.';
        } else if (diensten.length === 2) {
            dienstenParagraaf += diensten[0] + '. Daarnaast kan ' + diensten[1] + '.';
        } else {
            const dienstenCopy = [...diensten];
            const laatsteDienst = dienstenCopy.pop();
            dienstenParagraaf += dienstenCopy.join('. Daarnaast kan ') + '. Tot slot kan ' + laatsteDienst + '.';
        }
        paragraphs.push(dienstenParagraaf);
    }

    // --- CTA (from Sheet or hardcoded) ---
    let cta = '';
    if (sheetContent && sheetContent.ctas && sheetContent.ctas[options.doel]) {
        cta = sheetContent.ctas[options.doel][toonKey] || sheetContent.ctas[options.doel].professioneel;
    }
    if (!cta) {
        cta = getHardcodedCta(options.doel, isInformeel);
    }
    paragraphs.push(cta);

    const groet = isInformeel ? 'Groet' : 'Met vriendelijke groet';

    // Get company info from sheet or hardcoded
    const bedrijfNaam = sheetContent?.algemeen?.bedrijf_naam || 'AbelTalent';
    const bedrijfAdres = sheetContent?.algemeen?.bedrijf_adres || 'Kosterijland 70, 3981 AJ Bunnik';
    const bedrijfTelefoon = sheetContent?.algemeen?.bedrijf_telefoon || '+31 30 225 5660';
    const bedrijfWebsite = sheetContent?.algemeen?.bedrijf_website || 'www.abeltalent.nl';
    const partnerNaam = sheetContent?.algemeen?.partner_naam || 'Tafelberg Advies';
    const partnerWebsite = sheetContent?.algemeen?.partner_website || 'www.tafelbergadvies.nl';

    return `${aanhef},

${paragraphs.join('\n\n')}

${groet},
${afzender}
${bedrijfNaam}
${bedrijfAdres}
${bedrijfTelefoon}
${bedrijfWebsite}

In samenwerking met ${partnerNaam}
${partnerWebsite}`;
}


// ============= HARDCODED FALLBACKS =============

function getHardcodedFunctieTekst(functie, functieDisplay, isInformeel) {
    if (functie.includes('regelanalist')) {
        return isInformeel
            ? 'Als regelanalist ben jij direct betrokken bij de toepasbare regels in het Omgevingsloket. We werken veel samen met regelanalisten via ons ServiceTeam Regelanalisten.'
            : 'Als regelanalist bent u direct betrokken bij de toepasbare regels voor het Omgevingsloket. Via ons ServiceTeam Regelanalisten ondersteunen wij regelanalisten bij gemeenten en omgevingsdiensten.';
    }
    if (functie.includes('projectleider') || functie.includes('programmamanager')) {
        return isInformeel
            ? 'Als ' + functieDisplay + ' heb jij het overzicht over de DSO-implementatie. We merken dat veel gemeenten worstelen met het gat tussen juridisch en technisch — precies daar helpen we.'
            : 'Als ' + functieDisplay + ' heeft u het overzicht over de Omgevingswet-implementatie. Ons ServiceTeam helpt de verbinding tussen juridische en technische afdelingen te leggen.';
    }
    if (functie.includes('functioneel beheer') || functie.includes('applicatiebeheer')) {
        return isInformeel
            ? 'Als functioneel beheerder heb je een sleutelrol in het DSO. Van "basis op orde" naar "data op orde" — dat is het traject waar we graag bij helpen.'
            : 'Als functioneel beheerder speelt u een sleutelrol bij het DSO. Wij ondersteunen het traject van "basis op orde" naar "data op orde".';
    }
    if (functie.includes('omgevingsplan') || functie.includes('ruimtelijke') || functie.includes('planoloog')) {
        return isInformeel
            ? 'Gezien jouw rol bij het omgevingsplan wil ik je graag meenemen in onze analyse.'
            : 'Gezien uw betrokkenheid bij het omgevingsplan deel ik graag onze bevindingen met u.';
    }
    if (functie.includes('geo') || functie.includes('gis')) {
        return isInformeel
            ? 'Als GEO/GIS-specialist ben je betrokken bij de ruimtelijke data. Juist die data moet "op orde" zijn.'
            : 'Als GEO/GIS-specialist bent u betrokken bij de ruimtelijke data die essentieel is voor het omgevingsplan en het DSO.';
    }
    if (functie.includes('milieu') || functie.includes('vergunning')) {
        return isInformeel
            ? 'Vanuit jouw rol in milieu en vergunningverlening is de Omgevingswet direct van invloed op je werk.'
            : 'Vanuit uw rol in milieu en vergunningverlening raakt de Omgevingswet-implementatie uw werkzaamheden direct.';
    }
    return null;
}

function addHardcodedScoreContent(key, numValue, scoreStr, goedePunten, aandachtspunten, diensten) {
    if (key === 'bruidsschat') {
        if (numValue === 0) goedePunten.push('de bruidsschat-aanpassingen voor dierlijke mest correct zijn doorgevoerd');
        else if (numValue === 5) {
            aandachtspunten.push('Uit onze analyse blijkt dat de verplichte bruidsschat-aanpassingen voor dierlijke mest nog niet zijn doorgevoerd. Dit zijn wettelijk verplichte aanpassingen die vóór 1 januari 2032 verwerkt moeten zijn.');
            diensten.push('AbelTalent kan de bruidsschat-aanpassingen projectmatig doorvoeren met SIS8020, tot 6x sneller');
        } else if (numValue > 0) {
            aandachtspunten.push('Op het gebied van bruidsschat-aanpassingen zien we nog verbeterpunten.');
            diensten.push('AbelTalent kan helpen met SIS8020');
        }
    } else if (key === 'regelanalist') {
        if (numValue === 0) goedePunten.push('er een regelanalist actief is');
        else if (numValue === 5) {
            aandachtspunten.push('Er is nog geen regelanalist actief. Een regelanalist is essentieel voor toepasbare regels in het Omgevingsloket.');
            diensten.push('via ons ServiceTeam Regelanalisten kunnen we direct ervaren regelanalisten inzetten');
        } else if (numValue > 0) {
            aandachtspunten.push('Op het vlak van regelanalyse zijn er nog stappen te zetten.');
            diensten.push('ons ServiceTeam kan ondersteunen');
        }
    } else if (key === 'olo') {
        if (numValue === 0) goedePunten.push('alle VNG-aanbevolen topactiviteiten beschikbaar zijn');
        else if (numValue === 5) {
            aandachtspunten.push('Er zijn nog geen vergunningchecks beschikbaar in het Omgevingsloket.');
            diensten.push('AbelTalent en Tafelberg Advies kunnen gezamenlijk de checks opstellen');
        } else if (numValue > 0) {
            aandachtspunten.push('Er zijn nog vergunningchecks die ontbreken in het Omgevingsloket.');
        }
    } else if (key === 'omgevingsplan') {
        if (numValue === 0) goedePunten.push('er een robuust omgevingsplan is gepubliceerd');
        else if (numValue === 5) {
            aandachtspunten.push('Er is nog geen omgevingsplan na de bruidsschat. Deadline: 2032.');
            diensten.push('Tafelberg Advies kan ondersteunen bij de ontwikkeling');
        } else if (numValue > 0) {
            aandachtspunten.push('Het omgevingsplan is nog in ontwikkeling.');
        }
    }
}

function getHardcodedCta(doel, isInformeel) {
    if (doel === 'quickscan') {
        return isInformeel
            ? 'We bieden een gratis Quick Scan Toepasbare Regels aan — een korte analyse met concrete aanbevelingen. Lijkt je dat wat?'
            : 'Wij bieden u graag een kosteloze Quick Scan Toepasbare Regels aan. Heeft u hier interesse in?';
    }
    if (doel === 'workshop') {
        return isInformeel
            ? 'We organiseren binnenkort een workshop over de Omgevingswet. Zal ik je de details sturen?'
            : 'Binnenkort organiseren wij een workshop. Zal ik u de details toesturen?';
    }
    if (doel === 'follow-up') {
        return isInformeel
            ? 'Zullen we een vervolggesprek plannen? Heb je komende week beschikbaarheid?'
            : 'Graag plan ik een vervolggesprek. Heeft u komende weken beschikbaarheid?';
    }
    return isInformeel
        ? 'Zullen we een keer bellen of koffiedrinken? Ik hoor het graag.'
        : 'Ik kom graag langs voor een kennismakingsgesprek. Wat past u het beste?';
}