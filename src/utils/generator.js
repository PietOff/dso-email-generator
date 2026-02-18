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
 * @param {object|null} sheetContent - content from Google Sheets (only for extras)
 */
export function generateEmail(baseStory, figures, options, selectedData, selectedContact, sheetContent) {
    const { kpi1, kpi2, kpi3, kpi4 } = figures;
    const gemeenteNaam = selectedData ? selectedData.bestuursorgaan : '[Gemeente]';
    const afzender = options.afzender || '[Naam]';
    const isInformeel = options.toon === 'informeel';
    const isUrgent = options.toon === 'urgent';

    // ═══════════════════════════════════════════════════
    // AANHEF — Personalized greeting
    // ═══════════════════════════════════════════════════
    let aanhef;
    if (selectedContact) {
        const voornaam = selectedContact.naam.split(' ')[0];
        aanhef = isInformeel ? 'Hoi ' + voornaam : 'Beste ' + selectedContact.naam;
    } else {
        if (selectedData && selectedData.contactpersonen && selectedData.contactpersonen.length > 0) {
            // Auto-select the most relevant contact
            const lead = selectedData.contactpersonen.find(c =>
                c.functie && (c.functie.toLowerCase().includes('projectleider') ||
                    c.functie.toLowerCase().includes('programmamanager') ||
                    c.functie.toLowerCase().includes('coordinator') ||
                    c.functie.toLowerCase().includes('coördinator'))
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

    // ═══════════════════════════════════════════════════
    // OPENING — Base story + context
    // ═══════════════════════════════════════════════════
    if (options.doel === 'follow-up') {
        paragraphs.push('Naar aanleiding van ons eerdere contact neem ik graag opnieuw contact met u op. ' + baseStory);
    } else {
        paragraphs.push(baseStory + (isInformeel
            ? '\n\nIk neem contact met je op omdat we specifiek naar de situatie van ' + gemeenteNaam + ' hebben gekeken.'
            : '\n\nGraag deel ik onze bevindingen specifiek voor ' + gemeenteNaam + ' met u.'));
    }

    // ═══════════════════════════════════════════════════
    // FUNCTIE-SPECIFIEK — Different email per role
    // Always from hardcoded content, rich and detailed
    // ═══════════════════════════════════════════════════
    if (selectedContact && selectedContact.functie) {
        const functie = selectedContact.functie.toLowerCase();
        const functieDisplay = selectedContact.functie;
        let functieParagraaf = null;

        // --- Regelanalist ---
        if (functie.includes('regelanalist')) {
            functieParagraaf = isInformeel
                ? 'Als regelanalist ben jij direct betrokken bij het vertalen van juridische regels naar toepasbare regels in het Omgevingsloket. We werken veel samen met regelanalisten via ons ServiceTeam Regelanalisten — een pool van ervaren specialisten die gemeenten en omgevingsdiensten ondersteunen. Met de SIS8020 toolset kunnen we regels tot 6x sneller verwerken dan met handmatige methoden. Dat betekent minder werkdruk en meer kwaliteit.'
                : 'Als regelanalist bent u direct betrokken bij het vertalen van juridische regels naar toepasbare regels voor het Omgevingsloket. Via ons ServiceTeam Regelanalisten ondersteunen wij regelanalisten bij gemeenten en omgevingsdiensten met een pool van ervaren specialisten. Met onze SIS8020 toolset kunnen regels tot 6x sneller worden verwerkt dan met handmatige methoden, wat resulteert in hogere kwaliteit en lagere werkdruk.';
        }
        // --- Projectleider / Programmamanager ---
        else if (functie.includes('projectleider') || functie.includes('programmamanager') || functie.includes('programma manager')) {
            functieParagraaf = isInformeel
                ? 'Als ' + functieDisplay + ' heb jij het overzicht over de DSO-implementatie en de samenhang tussen juridisch, technisch en organisatorisch. We merken dat veel gemeenten worstelen met het gat tussen het juridische omgevingsplan en de technische implementatie in het DSO — precies daar helpen we. Ons ServiceTeam Regelanalisten kan als flexibele schil fungeren, en met een Quick Scan Toepasbare Regels brengen we snel in kaart waar de quick wins zitten.'
                : 'Als ' + functieDisplay + ' heeft u het overzicht over de Omgevingswet-implementatie en de samenhang tussen juridische, technische en organisatorische aspecten. Ons ServiceTeam Regelanalisten helpt de verbinding tussen juridische en technische afdelingen te leggen. Met een Quick Scan Toepasbare Regels brengen wij snel de quick wins en aandachtspunten in kaart.';
        }
        // --- Functioneel beheerder / Applicatiebeheerder ---
        else if (functie.includes('functioneel beheer') || functie.includes('applicatiebeheer') || functie.includes('informatiebeheer')) {
            functieParagraaf = isInformeel
                ? 'Als functioneel beheerder heb je een sleutelrol in het DSO-landschap. Het traject van "basis op orde" naar "data op orde" is waar veel gemeenten nu staan — en waar wij graag bij helpen. Met SIS8020 ondersteunen we het gestructureerd verwerken van toepasbare regels, en onze regelanalisten kunnen direct in het systeem meewerken zodat jij minder technische complexiteit op je bordje hebt.'
                : 'Als functioneel beheerder speelt u een sleutelrol in het DSO-landschap. Wij ondersteunen het traject van "basis op orde" naar "data op orde" — de essentiële stap die veel gemeenten nu moeten zetten. Met SIS8020 faciliteren wij het gestructureerd verwerken van toepasbare regels, en onze regelanalisten kunnen direct in uw systeem meewerken.';
        }
        // --- Omgevingsplan / Ruimtelijk / Planoloog ---
        else if (functie.includes('omgevingsplan') || functie.includes('ruimtelijke') || functie.includes('planoloog') || functie.includes('beleidsmedewerker')) {
            functieParagraaf = isInformeel
                ? 'Gezien jouw rol bij het omgevingsplan wil ik je graag meenemen in onze analyse. De vertaalslag van het omgevingsplan naar toepasbare regels in het Omgevingsloket is cruciaal — als die regels niet kloppen, merken burgers en bedrijven dat als eerste. Met Tafelberg Advies hebben we een partner die gespecialiseerd is in precies deze vertaalslag.'
                : 'Gezien uw betrokkenheid bij het omgevingsplan deel ik graag onze bevindingen met u. De vertaalslag van het juridische omgevingsplan naar toepasbare regels in het Omgevingsloket is een essentiële stap. In samenwerking met Tafelberg Advies bieden wij expertise op precies dit snijvlak.';
        }
        // --- GEO / GIS ---
        else if (functie.includes('geo') || functie.includes('gis')) {
            functieParagraaf = isInformeel
                ? 'Als GEO/GIS-specialist ben je betrokken bij de ruimtelijke data die ten grondslag ligt aan het omgevingsplan en het DSO. Juist die data moet "op orde" zijn — denk aan werkingsgebieden, geometrieën en GIO\'s. Een goede koppeling tussen ruimtelijke data en toepasbare regels is essentieel voor een werkend stelsel.'
                : 'Als GEO/GIS-specialist bent u betrokken bij de ruimtelijke data die essentieel is voor het omgevingsplan en het DSO. De kwaliteit van werkingsgebieden, geometrieën en GIO\'s bepaalt direct de bruikbaarheid van toepasbare regels in het Omgevingsloket.';
        }
        // --- Vergunningverlener / Milieu ---
        else if (functie.includes('milieu') || functie.includes('vergunning') || functie.includes('vth') || functie.includes('toezicht') || functie.includes('handhaving')) {
            functieParagraaf = isInformeel
                ? 'Vanuit jouw rol in VTH (vergunningverlening, toezicht en handhaving) is de Omgevingswet direct van invloed op je dagelijkse werk. Of het nu gaat om vergunningchecks in het Omgevingsloket of de aansluiting op het DSO — de kwaliteit van toepasbare regels bepaalt hoe soepel het proces loopt. Wij zorgen dat die regels kloppen.'
                : 'Vanuit uw rol in VTH (vergunningverlening, toezicht en handhaving) raakt de Omgevingswet-implementatie uw werkzaamheden direct. De kwaliteit van toepasbare regels in het Omgevingsloket bepaalt de effectiviteit van het vergunningproces. Wij zorgen dat deze regels correct en volledig zijn.';
        }
        // --- ICT / Informatiemanager ---
        else if (functie.includes('ict') || functie.includes('informatiemanager') || functie.includes('informatie manager') || functie.includes('architect')) {
            functieParagraaf = isInformeel
                ? 'Als informatiemanager/ICT heb je te maken met de technische kant van het DSO. Van koppelingen met het Omgevingsloket tot data-integratie — onze SIS8020 toolset is gebouwd om naadloos in jullie architectuur te passen. En met ons ServiceTeam hoef je niet alles zelf op te bouwen.'
                : 'Als verantwoordelijke voor informatiemanagement/ICT heeft u te maken met de technische integratie van het DSO in uw architectuur. Onze SIS8020 toolset is ontworpen voor naadloze integratie, en via ons ServiceTeam Regelanalisten hoeft u de specialistische kennis niet intern op te bouwen.';
        }
        // --- Juridisch / Jurist ---
        else if (functie.includes('jurist') || functie.includes('juridisch')) {
            functieParagraaf = isInformeel
                ? 'Als jurist ben je betrokken bij de juridische kwaliteit van het omgevingsplan en de vertaling naar digitale regels. Die vertaalslag — van juridische tekst naar toepasbare regels — is een vak apart. Onze regelanalisten zijn gespecialiseerd in precies dit snijvlak en werken nauw samen met juristen.'
                : 'Als jurist bent u betrokken bij de juridische kwaliteit van het omgevingsplan. De vertaalslag van juridische tekst naar digitaal toepasbare regels vereist specialistische kennis. Onze regelanalisten zijn gespecialiseerd in dit snijvlak en werken nauw samen met de juridische afdeling.';
        }
        // --- Directie / Management ---
        else if (functie.includes('directeur') || functie.includes('manager') || functie.includes('hoofd') || functie.includes('directie')) {
            functieParagraaf = isInformeel
                ? 'Op jouw niveau is het belangrijk om te weten dat de Omgevingswet-implementatie impact heeft op meerdere afdelingen tegelijk. Wij bieden een totaaloplossing: van ServiceTeam tot tooling tot advies. Zo heb je één aanspreekpunt in plaats van meerdere leveranciers.'
                : 'Op uw niveau is het relevant dat de Omgevingswet-implementatie meerdere afdelingen raakt. Wij bieden een geïntegreerde aanpak: van ons ServiceTeam Regelanalisten tot SIS8020 tooling tot strategisch advies van Tafelberg Advies. Eén aanspreekpunt voor uw gehele DSO-traject.';
        }
        // --- Coordinator ---
        else if (functie.includes('coordinator') || functie.includes('coördinator')) {
            functieParagraaf = isInformeel
                ? 'Als coördinator breng je verschillende disciplines samen rond de Omgevingswet. Onze ervaring leert dat de verbinding tussen juridisch, technisch en organisatorisch vaak de bottleneck is. Met ons ServiceTeam en de Quick Scan helpen we om die verbinding concreet te maken.'
                : 'Als coördinator verbindt u verschillende disciplines rond de Omgevingswet-implementatie. De verbinding tussen juridische, technische en organisatorische aspecten is vaak de grootste uitdaging. Met ons ServiceTeam Regelanalisten en een Quick Scan Toepasbare Regels maken wij die verbinding concreet.';
        }

        if (functieParagraaf) paragraphs.push(functieParagraaf);
    }

    // ═══════════════════════════════════════════════════
    // SCORE-GEBASEERDE CONTENT — per KPI
    // Always hardcoded, rich and specific
    // ═══════════════════════════════════════════════════
    const goedePunten = [];
    const aandachtspunten = [];
    const diensten = [];

    // Convert regelanalist ja/nee to numeric score
    const kpi2Numeric = kpi2 === 'ja' ? 0 : kpi2 === 'nee' ? 5 : parseInt(kpi2) || 0;

    // --- Bruidsschat / Dierlijke Mest ---
    const kpi1Val = parseInt(kpi1);
    if (kpi1 !== '' && !isNaN(kpi1Val)) {
        if (kpi1Val === 0) {
            goedePunten.push('de bruidsschat-aanpassingen voor dierlijke mest correct zijn doorgevoerd');
        } else if (kpi1Val >= 4) {
            aandachtspunten.push('Uit onze analyse blijkt dat de verplichte bruidsschat-aanpassingen voor dierlijke mest nog niet of nauwelijks zijn doorgevoerd in het omgevingsplan. Dit zijn wettelijk verplichte aanpassingen die vóór 1 januari 2032 verwerkt moeten zijn. Het niet tijdig doorvoeren kan leiden tot juridische kwetsbaarheid bij vergunningbesluiten.');
            diensten.push('AbelTalent kan de bruidsschat-aanpassingen projectmatig doorvoeren met SIS8020, tot 6x sneller dan handmatige verwerking');
        } else if (kpi1Val >= 2) {
            aandachtspunten.push('Op het gebied van bruidsschat-aanpassingen voor dierlijke mest zijn er nog stappen te zetten. Een deel is doorgevoerd, maar de implementatie is nog niet volledig.');
            diensten.push('AbelTalent kan de resterende bruidsschat-aanpassingen efficiënt doorvoeren met SIS8020');
        } else if (kpi1Val === 1) {
            goedePunten.push('de bruidsschat-aanpassingen voor dierlijke mest grotendeels zijn doorgevoerd');
        }
    }

    // --- Regelanalist (ja/nee → 0 of 5) ---
    if (kpi2 !== '' && kpi2 !== null && kpi2 !== undefined) {
        if (kpi2Numeric === 0) {
            goedePunten.push('er een regelanalist actief is binnen de organisatie');
        } else {
            aandachtspunten.push('Er is momenteel nog geen regelanalist actief binnen de organisatie. Een regelanalist is essentieel voor het vertalen van het juridische omgevingsplan naar toepasbare regels in het Omgevingsloket. Zonder regelanalist is het risico groot dat vergunningchecks niet of niet correct werken voor burgers en bedrijven.');
            diensten.push('via ons ServiceTeam Regelanalisten kunnen we direct een ervaren regelanalist inzetten — als flexibele schil, zonder vaste aanstelling');
        }
    }

    // --- OLO Activiteiten ---
    const kpi3Val = parseInt(kpi3);
    if (kpi3 !== '' && !isNaN(kpi3Val)) {
        if (kpi3Val === 0) {
            goedePunten.push('alle VNG-aanbevolen topactiviteiten beschikbaar zijn in het Omgevingsloket');
        } else if (kpi3Val >= 4) {
            aandachtspunten.push('In het Omgevingsloket ontbreken nog meerdere VNG-aanbevolen topactiviteiten voor vergunningchecks. Burgers en bedrijven kunnen hierdoor niet digitaal checken of zij een vergunning nodig hebben, wat leidt tot meer telefoontjes en baliebezoekers.');
            diensten.push('AbelTalent en Tafelberg Advies kunnen gezamenlijk de ontbrekende vergunningchecks opstellen en implementeren');
        } else if (kpi3Val >= 2) {
            aandachtspunten.push('Er zijn al vergunningchecks beschikbaar in het Omgevingsloket, maar er ontbreken nog enkele VNG-aanbevolen topactiviteiten. Dit beperkt de digitale dienstverlening aan burgers.');
        } else if (kpi3Val === 1) {
            goedePunten.push('bijna alle topactiviteiten beschikbaar zijn in het Omgevingsloket');
        }
    }

    // --- Omgevingsplan ---
    const kpi4Val = parseInt(kpi4);
    if (kpi4 !== '' && !isNaN(kpi4Val)) {
        if (kpi4Val === 0) {
            goedePunten.push('er een robuust omgevingsplan is gepubliceerd na de bruidsschat');
        } else if (kpi4Val >= 4) {
            aandachtspunten.push('Het omgevingsplan bevindt zich nog in een vroeg stadium na de bruidsschatconversie. De deadline voor een volledig omgevingsplan is 2032, en de ervaring leert dat de vertaling naar toepasbare regels de meeste doorlooptijd vraagt.');
            diensten.push('Tafelberg Advies kan ondersteunen bij de ontwikkeling van het omgevingsplan, en AbelTalent zorgt voor de vertaling naar toepasbare regels');
        } else if (kpi4Val >= 2) {
            aandachtspunten.push('Het omgevingsplan is in ontwikkeling. Het is belangrijk om parallel aan de planantwikkeling al na te denken over de vertaling naar toepasbare regels, om vertraging te voorkomen.');
        } else if (kpi4Val === 1) {
            goedePunten.push('het omgevingsplan goed op weg is na de bruidsschat');
        }
    }

    // --- Goede punten samenvatten ---
    if (goedePunten.length > 0) {
        if (goedePunten.length === 1) {
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + goedePunten[0] + '.');
        } else {
            const copy = [...goedePunten];
            const laatste = copy.pop();
            paragraphs.push((isInformeel ? 'Positief is dat ' : 'Het is goed om te zien dat ') + copy.join(', ') + ' en ' + laatste + '. Complimenten daarvoor.');
        }
    }

    // --- Aandachtspunten als losse alinea's ---
    aandachtspunten.forEach(punt => paragraphs.push(punt));

    // --- Diensten samenvatten ---
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
            const copy = [...diensten];
            const laatsteDienst = copy.pop();
            dienstenParagraaf += copy.join('. Daarnaast kan ') + '. Tot slot kan ' + laatsteDienst + '.';
        }
        paragraphs.push(dienstenParagraaf);
    }

    // ═══════════════════════════════════════════════════
    // EXTRA CONTEXT FROM SHEET (only additions, never replacements)
    // If the Sheet has extra info for this gemeente, append it
    // ═══════════════════════════════════════════════════
    if (sheetContent && sheetContent.algemeen && sheetContent.algemeen.extra_alinea) {
        paragraphs.push(sheetContent.algemeen.extra_alinea);
    }

    // ═══════════════════════════════════════════════════
    // CTA — Call to action (hardcoded per doel)
    // ═══════════════════════════════════════════════════
    let cta;
    if (options.doel === 'quickscan') {
        cta = isInformeel
            ? 'We bieden een gratis Quick Scan Toepasbare Regels aan — een korte analyse met concrete aanbevelingen voor jullie gemeente. Daarin kijken we naar de huidige stand van zaken en waar de quick wins zitten. Lijkt je dat wat?'
            : 'Wij bieden u graag een kosteloze Quick Scan Toepasbare Regels aan. In deze analyse brengen wij de huidige stand van zaken in kaart en identificeren wij concrete verbeterpunten. Heeft u hier interesse in?';
    } else if (options.doel === 'workshop') {
        cta = isInformeel
            ? 'We organiseren binnenkort een praktische workshop over toepasbare regels en het Omgevingsloket, specifiek gericht op gemeenten. Zal ik je de details sturen?'
            : 'Binnenkort organiseren wij een praktische workshop over toepasbare regels en de Omgevingswet-implementatie. Zal ik u de details toesturen?';
    } else if (options.doel === 'follow-up') {
        cta = isInformeel
            ? 'Zullen we een vervolggesprek plannen? Ik kan dan meteen de Quick Scan meenemen als concreet startpunt. Heb je komende week beschikbaarheid?'
            : 'Graag plan ik een vervolggesprek waarin wij de resultaten van een eventuele Quick Scan kunnen bespreken. Heeft u komende weken beschikbaarheid?';
    } else {
        cta = isInformeel
            ? 'Zullen we een keer bellen of koffiedrinken? Ik wissel graag van gedachten over hoe we jullie kunnen ondersteunen. Ik hoor het graag.'
            : 'Ik kom graag langs voor een kennismakingsgesprek om de mogelijkheden voor uw gemeente te bespreken. Wat past u het beste?';
    }
    paragraphs.push(cta);

    // ═══════════════════════════════════════════════════
    // AFSLUITING — Signature
    // ═══════════════════════════════════════════════════
    const groet = isInformeel ? 'Groet' : 'Met vriendelijke groet';

    // Company info: can be overridden from Sheet but defaults are hardcoded
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